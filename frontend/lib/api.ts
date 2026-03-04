import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Types
export interface Zone {
  id: string
  name: string
  description: string
  isActive: boolean
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
  paymentStatus: string
  cancelToken: string
  pickupZone: Zone
  dropoffZone: Zone
  driver?: {
    id: string
    firstName: string
    lastName: string
    phone: string
    vehicleType: string
    vehiclePlate: string
    status: string
  }
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
}

// API Calls
export const zonesApi = {
  getActive: () => api.get<Zone[]>('/zones/active'),
}

export const tariffsApi = {
  getPrice: (from: string, to: string) => 
    api.get<Tariff>('/tariffs/price', { params: { from, to } }),
}

export const reservationsApi = {
  create: (data: CreateReservationDto) => 
    api.post<Reservation>('/reservations', data),
  
  getByCode: (code: string) => 
    api.get<Reservation>(`/reservations/code/${code}`),
  
  cancel: (code: string, token: string) => 
    api.post('/reservations/cancel', { code, token }),

  getById: (id: string) =>
    api.get<Reservation>(`/reservations/${id}`),

  updateStatus: (id: string, status: string) =>
    api.put<Reservation>(`/reservations/${id}/status`, { status }),
}

export const driverApi = {
  getMe: () => api.get<Driver>('/drivers/me'),
  updateMyProfile: (data: Partial<Pick<Driver, 'phone' | 'vehiclePlate' | 'email'>>) =>
    api.put<Driver>('/drivers/me', data),
  updateMyStatus: (status: 'DISPONIBLE' | 'EN_COURSE' | 'HORS_LIGNE') =>
    api.put<Driver>('/drivers/me/status', { status }),
  getMyRides: () => api.get<Reservation[]>('/reservations/driver/my'),
}
