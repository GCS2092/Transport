import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Intercepteur pour ajouter le token JWT
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('vtc_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Intercepteur de réponse — refresh automatique sur 401
let isRefreshing = false
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token!))
  failedQueue = []
}

api.interceptors.response.use(
  res => res,
  async (error) => {
    const original = error.config
    const status = error.response?.status

    // Network error ou 401 → tenter le refresh
    if ((status === 401 || !error.response) && !original._retry && typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('vtc_refresh_token')
      const userId      = localStorage.getItem('vtc_user_id')

      if (!refreshToken || !userId) {
        // Pas de refresh token → déconnecter seulement si l'utilisateur était connecté
        const wasLoggedIn = !!localStorage.getItem('vtc_token')
        localStorage.removeItem('vtc_token')
        localStorage.removeItem('vtc_user')
        localStorage.removeItem('vtc_refresh_token')
        localStorage.removeItem('vtc_user_id')
        if (wasLoggedIn) window.location.href = '/login'
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { userId, refreshToken })
        const newToken = data.accessToken
        localStorage.setItem('vtc_token', newToken)
        if (data.refreshToken) localStorage.setItem('vtc_refresh_token', data.refreshToken)
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
        processQueue(null, newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        localStorage.removeItem('vtc_token')
        localStorage.removeItem('vtc_user')
        localStorage.removeItem('vtc_refresh_token')
        localStorage.removeItem('vtc_user_id')
        window.location.href = '/login'
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// Types
export interface Zone {
  id: string
  name: string
  description?: string
  isActive: boolean
  latitude?: number
  longitude?: number
  address?: string
}

export interface Tariff {
  price: number
  zoneFromId: string
  zoneToId: string
}

export interface CreateReservationDto {
  clientFirstName: string
  clientLastName: string
  clientEmail: string
  clientPhone: string
  tripType: 'ALLER_SIMPLE' | 'RETOUR_SIMPLE' | 'ALLER_RETOUR'
  pickupZoneId: string
  dropoffZoneId: string
  pickupDateTime: string
  returnDateTime?: string
  passengers: number
  flightNumber?: string
  notes?: string
  language: 'fr' | 'en'
}

export interface Reservation {
  id: string
  code: string
  status: 'EN_ATTENTE' | 'ASSIGNEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE'
  clientFirstName: string
  clientLastName: string
  clientEmail: string
  clientPhone: string
  tripType: string
  pickupDateTime: string
  returnDateTime?: string
  passengers: number
  flightNumber?: string
  notes?: string
  amount: number
  discount?: number
  promoCode?: string
  paymentStatus: string
  cancelToken: string
  pickupZone?: Zone | null
  dropoffZone?: Zone | null
  pickupCustomAddress?: string
  pickupLatitude?: number
  pickupLongitude?: number
  clientLatitude?: number
  clientLongitude?: number
  dropoffCustomAddress?: string
  dropoffLatitude?: number
  dropoffLongitude?: number
  driver?: {
    id: string
    firstName: string
    lastName: string
    phone: string
    vehicleType: string
    vehiclePlate: string
    status: string
  }
  startedAt?: string
  completedAt?: string
  createdAt: string
}

export interface Driver {
  id: string
  firstName: string
  lastName: string
  phone: string
  vehicleType: string
  vehiclePlate: string
  email: string
  status: 'DISPONIBLE' | 'EN_COURSE' | 'HORS_LIGNE'
  isActive: boolean
  userId: string
}

export interface User {
  id: string
  email: string
  role: 'ADMIN' | 'DRIVER'
  firstName: string
  lastName: string
  isActive: boolean
  createdAt: string
}

export interface AdminStats {
  total: number
  byStatus: Record<string, number>
  revenue: {
    total: number
    thisMonth: number
  }
  thisMonth: number
  drivers: {
    DISPONIBLE: number
    EN_COURSE: number
    HORS_LIGNE: number
    total: number
    actifs: number
  }
  driversDetails?: Array<{
    id: string
    firstName: string
    lastName: string
    status: string
    vehicleType: string
    vehiclePlate: string
    activeCourse: {
      code: string
      status: string
      pickupZone: string
      dropoffZone: string
    } | null
  }>
  activeDrivers?: Array<{
    id: string
    firstName: string
    lastName: string
    phone: string
    vehicleType: string
    vehiclePlate: string
    status: string
    currentRide?: {
      code: string
      clientName: string
      pickup: string
      dropoff: string
      amount: number
    }
  }>
  alerts: {
    failedEmails: number
  }
}

export interface EmailLog {
  id: string
  to: string
  subject: string
  notificationType: string
  status: 'ENVOYE' | 'ECHEC'
  sentAt: string
  errorMessage?: string
}

export interface AuditLog {
  id: string
  userId: string
  user: User
  action: string
  entityType: string
  entityId: string
  oldData: any
  newData: any
  description: string
  ipAddress?: string
  createdAt: string
}

export interface CreateDriverUserDto {
  email: string
  password: string
  firstName: string
  lastName: string
  phone: string
  vehicleType: string
  vehiclePlate?: string
}

export interface CreateZoneDto {
  name: string
  description: string
  isActive: boolean
}

export interface CreateTariffDto {
  zoneFromId: string
  zoneToId: string
  price: number
  isActive: boolean
}

// API Calls
export const zonesApi = {
  getActive: () => api.get<Zone[]>('/zones/active'),
  getAll: () => api.get<Zone[]>('/zones'),
  create: (data: CreateZoneDto) => api.post<Zone>('/zones', data),
  update: (id: string, data: Partial<CreateZoneDto>) => api.put<Zone>(`/zones/${id}`, data),
  delete: (id: string) => api.delete(`/zones/${id}`),
}

export const tariffsApi = {
  getPrice: (from: string, to: string) => 
    api.get<Tariff>('/tariffs/price', { params: { from, to } }),
  getAll: () => api.get<Tariff[]>('/tariffs'),
  create: (data: CreateTariffDto) => api.post<Tariff>('/tariffs', data),
  update: (id: string, data: Partial<CreateTariffDto>) => api.put<Tariff>(`/tariffs/${id}`, data),
  delete: (id: string) => api.delete(`/tariffs/${id}`),
}

export const reservationsApi = {
  create: (data: CreateReservationDto) => 
    api.post<Reservation>('/reservations', data),
  
  getByCode: (code: string) => 
    api.get<Reservation>(`/reservations/code/${code}`),
  
  cancel: (code: string, token: string) => 
    api.post('/reservations/cancel', { code, token }),

  updateByClient: (code: string, cancelToken: string, updates: any) =>
    api.patch<Reservation>(`/reservations/code/${code}`, { cancelToken, ...updates }),

  getDriverLocation: (code: string) =>
    api.get<DriverLocation | null>(`/reservations/code/${code}/driver-location`),

  getById: (id: string) =>
    api.get<Reservation>(`/reservations/${id}`),

  updateStatus: (id: string, status: string) =>
    api.put<Reservation>(`/reservations/${id}/status`, { status }),

  updatePaymentStatus: (id: string, paymentStatus: string) =>
    api.put<Reservation>(`/reservations/${id}/status`, { paymentStatus }),

  getAll: (params?: { page?: number; limit?: number; status?: string; driverId?: string; dateFrom?: string; dateTo?: string }) =>
    api.get<{ data: Reservation[]; total: number }>('/reservations', { params }),

  assignDriver: (id: string, driverId: string) =>
    api.put<Reservation>(`/reservations/${id}/assign`, { driverId }),

  autoAssignDriver: (id: string) => api.post(`/reservations/${id}/auto-assign`),

  cancelByAdmin: (id: string) =>
    api.put<Reservation>(`/reservations/${id}/cancel`, {}),

  exportCsv: (params?: { status?: string; driverId?: string; dateFrom?: string; dateTo?: string }) =>
    api.get('/reservations/export/csv', { params, responseType: 'blob' }),

  archiveCompleted: (olderThanDays?: number) =>
    api.delete<{ archived: number }>('/reservations/archive/completed', { params: { olderThanDays } }),
  
  updateReservation: (id: string, updates: Partial<CreateReservationDto>) =>
    api.patch<Reservation>(`/reservations/${id}`, updates),
}

export interface DriverLocation {
  latitude: number
  longitude: number
  accuracy?: number
  speed?: number
  heading?: number
  updatedAt: string
}

export const driverApi = {
  getMe: () => api.get<Driver>('/drivers/me'),
  updateMyProfile: (data: Partial<Pick<Driver, 'phone' | 'vehiclePlate' | 'email'>>) =>
    api.put<Driver>('/drivers/me', data),
  updateMyStatus: (status: 'DISPONIBLE' | 'EN_COURSE' | 'HORS_LIGNE') =>
    api.put<Driver>('/drivers/me/status', { status }),
  updateMyLocation: (location: { latitude: number; longitude: number; accuracy?: number; speed?: number; heading?: number }) =>
    api.post<DriverLocation>('/drivers/me/location', location),
  getLocation: (driverId: string) =>
    api.get<DriverLocation | null>(`/drivers/${driverId}/location`),
  getMyRides: () => api.get<Reservation[]>('/reservations/driver/my'),
  getAll: () => api.get<Driver[]>('/drivers'),
  getAvailable: () => api.get<Driver[]>('/drivers/available'),
  getStats: (id: string) => api.get<{
    driver: Driver;
    stats: {
      totalRides: number;
      completedRides: number;
      cancelledRides: number;
      totalRevenue: number;
      todayRides: number;
      todayRevenue: number;
      monthRides: number;
      monthRevenue: number;
      averageRideValue: number;
      completionRate: number;
    };
    recentRides: Reservation[];
  }>(`/drivers/${id}/stats`),
}

export interface Client {
  email: string
  firstName: string
  lastName: string
  phone: string
  totalRides: number
  completedRides: number
  cancelledRides: number
  totalSpent: number
  lastRide: string
}

export interface PromoCode {
  id: string
  code: string
  description: string
  type: 'PERCENTAGE' | 'FIXED'
  value: number
  minAmount: number | null
  maxDiscount: number | null
  usageLimit: number | null
  usageCount: number
  validFrom: string | null
  validUntil: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreatePromoCodeDto {
  code: string
  description: string
  type: 'PERCENTAGE' | 'FIXED'
  value: number
  minAmount?: number
  maxDiscount?: number
  usageLimit?: number
  validFrom?: string
  validUntil?: string
}

export const adminApi = {
  getStats: () => api.get<AdminStats>('/admin/stats'),
  getUsers: (params?: { page?: number; limit?: number; role?: string }) =>
    api.get<{ data: User[]; total: number }>('/admin/users', { params }),
  createUser: (dto: { email: string; password: string; firstName: string; lastName: string; phone: string; role: string }) =>
    api.post<User>('/admin/users', dto),
  createDriverUser: (dto: CreateDriverUserDto) =>
    api.post<User>('/admin/users/driver', dto),
  deactivateUser: (id: string) =>
    api.post(`/admin/users/${id}/deactivate`),
  activateUser: (id: string) =>
    api.put(`/admin/users/${id}/activate`),
  getEmailLogs: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<{ data: EmailLog[]; total: number }>('/admin/email-logs', { params }),
  getClients: (params?: { page?: number; limit?: number }) =>
    api.get<{ data: Client[]; total: number }>('/admin/clients', { params }),
  getClientHistory: (email: string) =>
    api.get<{
      client: { email: string; firstName: string; lastName: string; phone: string } | null;
      stats: { totalRides: number; completedRides: number; cancelledRides: number; totalSpent: number };
      reservations: Reservation[];
    }>(`/admin/clients/${encodeURIComponent(email)}/history`),
  getFinancialStats: () =>
    api.get<{
      dailyRevenue: { date: string; revenue: number }[];
      monthlyRevenue: { month: string; revenue: number }[];
      topDrivers: { name: string; revenue: number }[];
      paymentStats: { completed: number; pending: number; totalCompleted: number; totalPending: number };
      totalRevenue: number;
      totalRides: number;
      averageRideValue: number;
    }>('/admin/financial-stats'),
  getAnalytics: () =>
    api.get<{
      topPickupZones: { name: string; count: number; revenue: number }[];
      topDropoffZones: { name: string; count: number; revenue: number }[];
      peakHours: { hour: number; count: number }[];
      hourlyDistribution: number[];
      weekdayStats: { day: string; count: number }[];
      statusDistribution: { total: number; completed: number; cancelled: number; pending: number; assigned: number; inProgress: number };
    }>('/admin/analytics'),
  getSettings: () =>
    api.get<{ id: string; key: string; value: string; description: string }[]>('/settings'),
  updateSetting: (key: string, dto: { value: string; description?: string }) =>
    api.put(`/settings/${key}`, dto),
}

export const auditApi = {
  getAll: (params?: { page?: number; limit?: number; userId?: string; entityType?: string; entityId?: string; action?: string }) =>
    api.get<{ data: AuditLog[]; total: number }>('/audit', { params }),
  getByEntity: (entityType: string, entityId: string) =>
    api.get<AuditLog[]>('/audit/entity', { params: { entityType, entityId } }),
}

// Payment Supervision API
export interface PaymentSupervisionFilters {
  paymentStatus?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export interface PaymentSupervisionResponse {
  reservations: Reservation[]
  total: number
  page: number
  limit: number
}

export const paymentSupervisionApi = {
  // Vérifier le mot de passe et obtenir le token de supervision
  verifyPassword: (password: string) =>
    api.post<{ supervisionToken: string; expiresAt: string }>('/auth/verify-password', { password }),

  // Lister les courses avec filtres de paiement (nécessite X-Supervision-Token)
  getSupervisionList: (filters?: PaymentSupervisionFilters, supervisionToken?: string) =>
    api.get<PaymentSupervisionResponse>('/reservations/payment/supervision', {
      params: filters,
      headers: supervisionToken ? { 'X-Supervision-Token': supervisionToken } : undefined,
    }),

  // Mettre à jour le statut de paiement par admin (nécessite X-Supervision-Token)
  updatePaymentStatus: (id: string, paymentStatus: string, supervisionToken?: string) =>
    api.patch<Reservation>(`/reservations/${id}/payment-status/admin`, { paymentStatus }, {
      headers: supervisionToken ? { 'X-Supervision-Token': supervisionToken } : undefined,
    }),
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ accessToken: string; user: { id: string; email: string; role: string } }>('/auth/login', { email, password }),
  refresh: () =>
    api.post<{ accessToken: string }>('/auth/refresh'),
}

export const promoCodesApi = {
  getAll: () => api.get<PromoCode[]>('/promo-codes'),
  getById: (id: string) => api.get<PromoCode>(`/promo-codes/${id}`),
  create: (dto: CreatePromoCodeDto) => api.post<PromoCode>('/promo-codes', dto),
  update: (id: string, dto: Partial<CreatePromoCodeDto>) => api.put<PromoCode>(`/promo-codes/${id}`, dto),
  toggleActive: (id: string) => api.put<PromoCode>(`/promo-codes/${id}/toggle`),
  delete: (id: string) => api.delete(`/promo-codes/${id}`),
  validate: (code: string, amount: number) => 
    api.post<{ valid: boolean; discount: number; message?: string }>('/promo-codes/validate', { code, amount }),
}
