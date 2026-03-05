# 🚀 Tests de Charge K6 - WEND'D Transport API

## 📋 Qu'est-ce que K6 ?

**K6** est un outil open-source de tests de charge moderne pour tester la performance de ton API. Il permet de :
- ✅ Simuler des milliers d'utilisateurs simultanés
- ✅ Mesurer les temps de réponse (latence)
- ✅ Détecter les goulots d'étranglement
- ✅ Vérifier la stabilité sous charge
- ✅ Identifier les limites de ton infrastructure

---

## 🎯 Ce que teste ce script

### Endpoints testés

#### **Publics (sans authentification)**
- `GET /api/v1/health` - Health check
- `GET /api/v1/zones/active` - Zones actives
- `GET /api/v1/tariffs/active` - Tarifs actifs
- `GET /api/v1/settings/contacts/all` - Contacts
- `GET /api/v1/settings/faqs/all?language=FR` - FAQ

#### **Réservations**
- `POST /api/v1/reservations` - Créer une réservation
- `GET /api/v1/reservations/code/:code` - Récupérer par code

#### **Admin (authentifié)**
- `POST /api/v1/auth/login` - Login admin
- `GET /api/v1/admin/stats` - Statistiques
- `GET /api/v1/admin/reservations` - Liste réservations
- `GET /api/v1/admin/drivers` - Liste chauffeurs
- `GET /api/v1/settings` - Paramètres

#### **Chauffeur (authentifié)**
- `POST /api/v1/auth/login` - Login chauffeur
- `GET /api/v1/drivers/me` - Profil
- `GET /api/v1/drivers/reservations` - Courses

---

## 🔧 Configuration du test

### Scénario de montée en charge

```javascript
stages: [
  { duration: '30s', target: 10 },   // 0 → 10 utilisateurs (warm-up)
  { duration: '1m', target: 50 },    // 10 → 50 utilisateurs
  { duration: '2m', target: 50 },    // Maintien à 50 utilisateurs
  { duration: '30s', target: 100 },  // 50 → 100 utilisateurs (pic)
  { duration: '1m', target: 100 },   // Maintien du pic
  { duration: '30s', target: 0 },    // Descente progressive
]
```

**Durée totale :** ~5 minutes 30 secondes

### Seuils de performance (thresholds)

```javascript
thresholds: {
  http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
  http_req_failed: ['rate<0.05'],                  // Taux d'erreur < 5%
  errors: ['rate<0.1'],                            // Erreurs métier < 10%
}
```

### Distribution des utilisateurs simulés

- **60%** : Clients (consultent + réservent)
- **25%** : Visiteurs (consultent uniquement)
- **10%** : Chauffeurs
- **5%** : Admins

---

## 🚀 Lancer les tests

### 1. Prérequis

Assure-toi que ton backend est lancé :
```bash
cd c:\Transport\backend
npm run start:dev
```

### 2. Lancer le test

```bash
cd c:\Transport\load-tests
k6 run api-test.js
```

### 3. Avec URL personnalisée

```bash
k6 run --env API_URL=http://192.168.1.127:3000/api/v1 api-test.js
```

### 4. Test rapide (smoke test)

```bash
k6 run --vus 10 --duration 30s api-test.js
```

### 5. Test de stress (plus agressif)

```bash
k6 run --vus 200 --duration 2m api-test.js
```

---

## 📊 Interpréter les résultats

### Exemple de sortie

```
     ✓ health check status 200
     ✓ zones status 200
     ✓ reservation created (200/201)
     ✓ admin stats status 200

     checks.........................: 98.45% ✓ 1234    ✗ 19
     data_received..................: 2.3 MB 45 kB/s
     data_sent......................: 1.1 MB 21 kB/s
     http_req_duration..............: avg=234ms min=12ms med=189ms max=1.2s p(95)=456ms p(99)=789ms
     http_req_failed................: 1.23%  ✓ 15      ✗ 1204
     http_reqs......................: 1219   24.38/s
     iteration_duration.............: avg=2.1s  min=1.2s med=2.0s max=4.5s
     iterations.....................: 245    4.9/s
     vus............................: 1      min=1     max=100
     vus_max........................: 100    min=100   max=100
```

### Métriques clés

| Métrique | Signification | Objectif |
|----------|---------------|----------|
| `http_req_duration (p95)` | 95% des requêtes < X ms | **< 500ms** ✅ |
| `http_req_duration (p99)` | 99% des requêtes < X ms | **< 1000ms** ✅ |
| `http_req_failed` | Taux d'erreur HTTP | **< 5%** ✅ |
| `checks` | Assertions réussies | **> 95%** ✅ |
| `http_reqs` | Requêtes/seconde | Plus c'est élevé, mieux c'est |

### Indicateurs de problèmes

🔴 **Problème de performance** si :
- `p(95) > 500ms` ou `p(99) > 1000ms`
- `http_req_failed > 5%`
- `checks < 95%`

🟡 **Attention** si :
- `http_req_duration` augmente avec la charge
- Erreurs sporadiques (timeouts, 500)

---

## 🛠️ Personnaliser les tests

### Modifier les identifiants de test

Édite les lignes 35-44 dans `api-test.js` :

```javascript
const TEST_USERS = {
  admin: {
    email: 'ton-admin@wendd-transport.com',
    password: 'TonMotDePasse',
  },
  driver: {
    email: 'ton-chauffeur@wendd-transport.com',
    password: 'TonMotDePasse',
  },
};
```

### Ajuster la charge

Modifie les `stages` (lignes 16-23) :

```javascript
stages: [
  { duration: '10s', target: 5 },    // Test léger
  { duration: '30s', target: 20 },   // Charge moyenne
  { duration: '10s', target: 0 },    // Descente
]
```

---

## 📈 Scénarios de test recommandés

### 1. **Smoke Test** (vérification rapide)
```bash
k6 run --vus 5 --duration 30s api-test.js
```
**But :** Vérifier que tout fonctionne avant un déploiement

### 2. **Load Test** (charge normale)
```bash
k6 run api-test.js
```
**But :** Tester la performance sous charge réaliste

### 3. **Stress Test** (charge extrême)
```bash
k6 run --vus 500 --duration 5m api-test.js
```
**But :** Trouver les limites de ton système

### 4. **Spike Test** (pic soudain)
```bash
k6 run --stage 0s:0,10s:100,10s:0 api-test.js
```
**But :** Tester la résilience face à un pic de trafic

---

## 🐛 Résolution de problèmes

### Erreur : "Admin login failed"
➡️ Vérifie que l'utilisateur admin existe dans ta base de données

### Erreur : "Connection refused"
➡️ Assure-toi que le backend est lancé sur `http://localhost:3000`

### Taux d'erreur élevé
➡️ Vérifie les logs du backend pour identifier les erreurs

### Performance dégradée
➡️ Vérifie :
- Connexion base de données (pool size)
- Logs excessifs
- Requêtes SQL non optimisées

---

## 📚 Ressources

- [Documentation K6](https://k6.io/docs/)
- [Métriques K6](https://k6.io/docs/using-k6/metrics/)
- [Exemples K6](https://k6.io/docs/examples/)

---

## ✅ Checklist avant production

- [ ] Smoke test passe (5 VUs, 30s)
- [ ] Load test passe (50 VUs, 2min)
- [ ] p(95) < 500ms
- [ ] p(99) < 1000ms
- [ ] Taux d'erreur < 5%
- [ ] Aucune fuite mémoire détectée
- [ ] Base de données optimisée (index)
- [ ] CORS configuré pour production

**Bon test ! 🚀**
