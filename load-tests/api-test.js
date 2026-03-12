import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION K6 - WEND'D TRANSPORT API LOAD TESTING
// ══════════════════════════════════════════════════════════════════════════════

const BASE_URL = __ENV.API_URL || 'http://localhost:3000/api/v1';

// Métriques personnalisées
const errorRate = new Rate('errors');

// ══════════════════════════════════════════════════════════════════════════════
// CACHE TOKENS PAR VU (évite un login à chaque itération)
// ══════════════════════════════════════════════════════════════════════════════
let _adminToken = null;
let _driverToken = null;
let _tokenExpiry = 0;
const TOKEN_TTL_MS = 4 * 60 * 1000; // renouveler toutes les 4 minutes

// Scénarios de charge
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Montée progressive à 10 utilisateurs
    { duration: '1m', target: 50 },    // Montée à 50 utilisateurs
    { duration: '2m', target: 50 },    // Maintien à 50 utilisateurs
    { duration: '30s', target: 100 },  // Pic à 100 utilisateurs
    { duration: '1m', target: 100 },   // Maintien du pic
    { duration: '30s', target: 0 },    // Descente progressive
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000', 'p(99)<8000'], // Seuils réalistes sous charge (100 VUs)
    http_req_failed: ['rate<0.05'],                   // Taux d'erreur HTTP < 5%
    errors: ['rate<0.1'],                             // Taux d'erreur métier < 10%
  },
}; 

// ══════════════════════════════════════════════════════════════════════════════
// DONNÉES DE TEST
// ══════════════════════════════════════════════════════════════════════════════

const TEST_USERS = {
  admin: {
    email: 'admin@vtcdakar.com',
    password: 'Admin_VTC_2024!',
  },
  driver: {
    email: 'moussa.diallo@vtcdakar.com',
    password: 'Driver_2024!',
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES
// ══════════════════════════════════════════════════════════════════════════════

// Génère un email unique par VU + itération + timestamp
// Garantit l'unicité même avec 100 VUs en parallèle et plusieurs itérations
function uniqueEmail() {
  const ts = Date.now();
  return `load-test.vu${__VU}.iter${__ITER}.${ts}@test-wendd.local`;
}

// Génère un téléphone sénégalais valide unique par VU
function uniquePhone() {
  // Format: +221 7X XXX XX XX  (VU entre 0-99, padded)
  const base = 70000000 + (__VU % 10000) * 100 + (__ITER % 100);
  return `+221${base}`;
}

function getCachedToken(role) {
  const now = Date.now();
  if (role === 'admin') {
    if (!_adminToken || now > _tokenExpiry) {
      _adminToken = login(TEST_USERS.admin.email, TEST_USERS.admin.password);
      _tokenExpiry = now + TOKEN_TTL_MS;
    }
    return _adminToken;
  }
  if (role === 'driver') {
    if (!_driverToken || now > _tokenExpiry) {
      _driverToken = login(TEST_USERS.driver.email, TEST_USERS.driver.password);
      _tokenExpiry = now + TOKEN_TTL_MS;
    }
    return _driverToken;
  }
  return null;
}

function login(email, password) {
  const payload = JSON.stringify({ email, password });
  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(`${BASE_URL}/auth/login`, payload, params);
  
  if (res.status === 200 || res.status === 201) {
    const body = JSON.parse(res.body);
    return body.accessToken;
  }
  
  console.error(`Login failed: ${res.status} - ${res.body}`);
  return null;
}

function getAuthHeaders(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// TESTS ENDPOINTS PUBLICS
// ══════════════════════════════════════════════════════════════════════════════

function testPublicEndpoints() {
  group('Public Endpoints', () => {
    
    // Health check
    group('Health Check', () => {
      const res = http.get(`${BASE_URL}/health`);
      check(res, {
        'health check status 200': (r) => r.status === 200,
        'health check has status field': (r) => JSON.parse(r.body).status === 'ok',
      }) || errorRate.add(1);
    });

    // Zones actives
    group('Get Active Zones', () => {
      const res = http.get(`${BASE_URL}/zones/active`);
      const ok = check(res, {
        'zones status 200': (r) => r.status === 200,
        'zones is array': (r) => Array.isArray(JSON.parse(r.body)),
      });
      check(res, { 'zones response time < 300ms': (r) => r.timings.duration < 300 });
      if (!ok) errorRate.add(1);
    });

    // Tarifs actifs
    group('Get Active Tariffs', () => {
      const res = http.get(`${BASE_URL}/tariffs/active`);
      const ok = check(res, {
        'tariffs status 200': (r) => r.status === 200,
        'tariffs is array': (r) => Array.isArray(JSON.parse(r.body)),
      });
      check(res, { 'tariffs response time < 300ms': (r) => r.timings.duration < 300 });
      if (!ok) errorRate.add(1);
    });

    // Contacts
    group('Get Contacts', () => {
      const res = http.get(`${BASE_URL}/settings/contacts/all`);
      check(res, {
        'contacts status 200': (r) => r.status === 200,
        'contacts is array': (r) => Array.isArray(JSON.parse(r.body)),
      }) || errorRate.add(1);
    });

    // FAQ
    group('Get FAQ (FR)', () => {
      const res = http.get(`${BASE_URL}/settings/faqs/all?language=fr`);
      check(res, {
        'faq status 200': (r) => r.status === 200,
        'faq is array': (r) => Array.isArray(JSON.parse(r.body)),
      }) || errorRate.add(1);
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// TESTS RÉSERVATIONS (CLIENT)
// ══════════════════════════════════════════════════════════════════════════════

function testReservationFlow() {
  group('Reservation Flow', () => {
    
    // Email et téléphone uniques pour éviter le throttle (10 résa/h par IP)
    // __VU = ID du virtual user (1-100), __ITER = numéro d'itération
    const email = uniqueEmail();
    const phone = uniquePhone();

    // Créer une réservation
    const reservationPayload = JSON.stringify({
      tripType: 'ALLER_SIMPLE',
      clientFirstName: 'LoadTest',
      clientLastName: `VU${__VU}`,
      clientEmail: email,
      clientPhone: phone,
      pickupCustomAddress: 'Aéroport AIBD, Dakar',
      dropoffCustomAddress: 'Plateau, Dakar',
      pickupDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      passengers: 1,
      language: 'fr',
      notes: `K6 load test - VU:${__VU} ITER:${__ITER}`,
    });

    const params = {
      headers: { 'Content-Type': 'application/json' },
    };

    group('Create Reservation', () => {
      const res = http.post(`${BASE_URL}/reservations`, reservationPayload, params);
      
      // Évaluer le statut HTTP directement (pas via check() pour éviter que
      // l'échec d'un check de perf ne pollue errorRate)
      const httpOk = res.status === 200 || res.status === 201;

      check(res, {
        'reservation created (200/201)': (r) => r.status === 200 || r.status === 201,
        'reservation response time < 1s': (r) => r.timings.duration < 1000,
      });

      // Récupérer le code (vérification séparée du check de statut)
      let reservationCode = null;
      try {
        const body = JSON.parse(res.body);
        reservationCode = body.code || null;
      } catch (_) {}

      check(res, {
        'reservation has code': () => reservationCode !== null && reservationCode.length > 0,
      });

      // errorRate = uniquement les vraies erreurs HTTP (4xx/5xx)
      if (!httpOk) {
        errorRate.add(1);
        console.error(`Reservation HTTP error: ${res.status} - ${res.body}`);
        return;
      }

      // Utiliser le code récupéré ci-dessus

      // Vérifier la réservation par code
      sleep(1);
      group('Get Reservation by Code', () => {
        const getRes = http.get(`${BASE_URL}/reservations/code/${reservationCode}`);
        check(getRes, {
          'get reservation status 200': (r) => r.status === 200,
          'get reservation has correct code': (r) => {
            try {
              return JSON.parse(r.body).code === reservationCode;
            } catch {
              return false;
            }
          },
        });
      });
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// TESTS ADMIN 
// ══════════════════════════════════════════════════════════════════════════════

function testAdminEndpoints() {
  group('Admin Endpoints', () => {
    
    const token = getCachedToken('admin');
    
    if (!token) {
      console.error('Admin login failed, skipping admin tests');
      errorRate.add(1);
      return;
    }

    const authParams = getAuthHeaders(token);

    // Statistiques admin
    group('Get Admin Stats', () => {
      const res = http.get(`${BASE_URL}/admin/stats`, authParams);
      const ok = check(res, {
        'admin stats status 200': (r) => r.status === 200,
        'admin stats has revenue': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.revenue !== undefined;
          } catch {
            return false;
          }
        },
      });
      check(res, { 'admin stats response time < 500ms': (r) => r.timings.duration < 500 });
      if (!ok) errorRate.add(1);
    });

    // Statistiques financières
    group('Get Financial Stats', () => {
      const res = http.get(`${BASE_URL}/admin/financial-stats`, authParams);
      check(res, {
        'financial stats status 200': (r) => r.status === 200,
        'financial stats has dailyRevenue': (r) => {
          try {
            return Array.isArray(JSON.parse(r.body).dailyRevenue);
          } catch {
            return false;
          }
        },
      }) || errorRate.add(1);
    });

    // Liste des réservations — route: GET /reservations (admin uniquement)
    group('Get All Reservations', () => {
      const res = http.get(`${BASE_URL}/reservations?limit=10`, authParams);
      const ok = check(res, {
        'reservations list status 200': (r) => r.status === 200,
        'reservations is array or paginated': (r) => {
          try {
            const b = JSON.parse(r.body);
            return Array.isArray(b) || Array.isArray(b.data);
          } catch { return false; }
        },
      });
      if (!ok) errorRate.add(1);
    });

    // Liste des chauffeurs — route: GET /drivers (admin uniquement)
    group('Get All Drivers', () => {
      const res = http.get(`${BASE_URL}/drivers`, authParams);
      const ok = check(res, {
        'drivers list status 200': (r) => r.status === 200,
        'drivers is array or paginated': (r) => {
          try {
            const b = JSON.parse(r.body);
            return Array.isArray(b) || Array.isArray(b.data);
          } catch { return false; }
        },
      });
      if (!ok) errorRate.add(1);
    });

    // Liste des clients
    group('Get All Clients', () => {
      const res = http.get(`${BASE_URL}/admin/clients`, authParams);
      check(res, {
        'clients list status 200': (r) => r.status === 200,
        'clients has data': (r) => {
          try {
            return Array.isArray(JSON.parse(r.body).data);
          } catch {
            return false;
          }
        },
      }) || errorRate.add(1);
    });

    // Email logs
    group('Get Email Logs', () => {
      const res = http.get(`${BASE_URL}/admin/email-logs`, authParams);
      check(res, {
        'email logs status 200': (r) => r.status === 200,
        'email logs has data': (r) => {
          try {
            return Array.isArray(JSON.parse(r.body).data);
          } catch {
            return false;
          }
        },
      }) || errorRate.add(1);
    });

    // Settings
    group('Get Settings', () => {
      const res = http.get(`${BASE_URL}/settings`, authParams);
      check(res, {
        'settings status 200': (r) => r.status === 200,
      }) || errorRate.add(1);
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// TESTS CHAUFFEUR
// ══════════════════════════════════════════════════════════════════════════════

function testDriverEndpoints() {
  group('Driver Endpoints', () => {
    
    const token = getCachedToken('driver');
    
    if (!token) {
      console.error('Driver login failed, skipping driver tests');
      errorRate.add(1);
      return;
    }

    const authParams = getAuthHeaders(token);

    // Profil chauffeur
    group('Get Driver Profile', () => {
      const res = http.get(`${BASE_URL}/drivers/me`, authParams);
      check(res, {
        'driver profile status 200': (r) => r.status === 200,
        'driver has firstName': (r) => {
          try {
            return JSON.parse(r.body).firstName !== undefined;
          } catch {
            return false;
          }
        },
      }) || errorRate.add(1);
    });

    // Courses du chauffeur
    group('Get Driver Reservations', () => {
      const res = http.get(`${BASE_URL}/reservations/driver/my`, authParams);
      check(res, {
        'driver reservations status 200': (r) => r.status === 200,
        'driver reservations is array': (r) => Array.isArray(JSON.parse(r.body)),
      }) || errorRate.add(1);
    });

    // Mettre à jour localisation (simulation)
    group('Update Driver Location', () => {
      const locationPayload = JSON.stringify({
        latitude: 14.6937 + (Math.random() - 0.5) * 0.1,
        longitude: -17.4441 + (Math.random() - 0.5) * 0.1,
      });
      const res = http.post(`${BASE_URL}/drivers/me/location`, locationPayload, authParams);
      check(res, {
        'location update status 200/201': (r) => r.status === 200 || r.status === 201,
      }) || errorRate.add(1);
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SCÉNARIO PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════

export default function () {
  // Simuler différents types d'utilisateurs
  const userType = Math.random();

  if (userType < 0.6) {
    // 60% des utilisateurs : clients qui consultent et réservent
    testPublicEndpoints();
    sleep(1);
    testReservationFlow();
    sleep(2);
  } else if (userType < 0.85) {
    // 25% des utilisateurs : consultent uniquement
    testPublicEndpoints();
    sleep(1);
  } else if (userType < 0.95) {
    // 10% des utilisateurs : chauffeurs
    testDriverEndpoints();
    sleep(2);
  } else {
    // 5% des utilisateurs : admins
    testAdminEndpoints();
    sleep(2);
  }

  sleep(1); // Pause entre les itérations
}
