'use client'

import { useEffect, useState } from 'react'
import { adminApi, User, CreateDriverUserDto } from '@/lib/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const IconX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

const IconPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const IconUserCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="8.5" cy="7" r="4"/>
    <polyline points="17 11 19 13 23 9"/>
  </svg>
)

const IconUserX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="8.5" cy="7" r="4"/>
    <line x1="18" y1="8" x2="23" y2="13"/>
    <line x1="23" y1="8" x2="18" y2="13"/>
  </svg>
)

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState<CreateDriverUserDto>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    vehicleType: '',
    vehiclePlate: '',
  })
  const [creating, setCreating] = useState(false)
  const [adminMode, setAdminMode] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminPasswordValid, setAdminPasswordValid] = useState(false)
  const [showAdminPassword, setShowAdminPassword] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const { data } = await adminApi.getUsers({ limit: 100 })
      setUsers(data.data)
    } catch (err) {
      console.error('Failed to load users', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault()
    if (creating) return
    
    try {
      setCreating(true)
      if (adminMode) {
        // Créer un admin
        await adminApi.createUser({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          role: 'ADMIN'
        })
      } else {
        // Créer un chauffeur
        await adminApi.createDriverUser(formData)
      }
      setShowCreateModal(false)
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        vehicleType: '',
        vehiclePlate: '',
      })
      setAdminMode(false)
      setAdminPassword('')
      setAdminPasswordValid(false)
      setShowAdminPassword(false)
      loadUsers()
    } catch (err: any) {
      console.error('Failed to create user', err)
      alert(err.response?.data?.message || `Erreur lors de la création du ${adminMode ? 'compte admin' : 'chauffeur'}`)
    } finally {
      setCreating(false)
    }
  }

  const handleAdminPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Mot de passe admin fixe pour la démo - à remplacer par une vérification sécurisée
    if (adminPassword === 'admin123') {
      setAdminPasswordValid(true)
      setAdminMode(true)
      setShowAdminPassword(false)
    } else {
      alert('Mot de passe admin incorrect')
    }
  }

  const handleToggleActive = async (user: User) => {
    try {
      if (user.isActive) {
        await adminApi.deactivateUser(user.id)
      } else {
        await adminApi.activateUser(user.id)
      }
      loadUsers()
    } catch (err: any) {
      console.error('Failed to toggle user status', err)
      alert(err.response?.data?.message || 'Erreur lors de la modification du statut')
    }
  }

  return (
    <div className="bg-gray-50 pb-6">
      <div className="max-w-6xl mx-auto px-4 pt-6">
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
            <p className="text-sm text-gray-500 mt-1">Administrateurs et chauffeurs</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors"
          >
            <IconPlus />
            Nouveau chauffeur
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]" />
          </div>
        ) : (
          <div className="space-y-3">
            {users.map(user => (
              <div key={user.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-base font-bold text-gray-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        user.role === 'ADMIN' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role}
                      </span>
                      {!user.isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800">
                          Désactivé
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Créé le {format(new Date(user.createdAt), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  
                  {user.role === 'DRIVER' && (
                    <button
                      onClick={() => handleToggleActive(user)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        user.isActive
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      }`}
                    >
                      {user.isActive ? <IconUserX /> : <IconUserCheck />}
                      {user.isActive ? 'Désactiver' : 'Activer'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal création chauffeur/admin */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 my-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {adminMode ? 'Nouveau compte admin' : 'Nouveau chauffeur'}
                </h3>
                <button 
                  onClick={() => {
                    setShowCreateModal(false)
                    setAdminMode(false)
                    setAdminPassword('')
                    setAdminPasswordValid(false)
                    setShowAdminPassword(false)
                  }} 
                  className="text-gray-400 hover:text-gray-600"
                >
                  <IconX />
                </button>
              </div>

              {!showAdminPassword && !adminPasswordValid && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(true)}
                    className="w-full py-2 px-4 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors border border-purple-200"
                  >
                    🔐 Créer un compte admin
                  </button>
                </div>
              )}

              {showAdminPassword && !adminPasswordValid && (
                <form onSubmit={handleAdminPasswordSubmit} className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="text-sm font-semibold text-purple-900 mb-2">Validation admin requise</h4>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    placeholder="Mot de passe admin"
                    className="w-full px-3 py-2 rounded-lg border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3"
                    required
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(false)}
                      className="flex-1 py-2 border border-purple-200 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                    >
                      Valider
                    </button>
                  </div>
                </form>
              )}

              <form onSubmit={handleCreateDriver} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Prénom</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className={`w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 ${
                      adminMode ? 'focus:ring-purple-500' : 'focus:ring-emerald-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Nom</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className={`w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 ${
                      adminMode ? 'focus:ring-purple-500' : 'focus:ring-emerald-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className={`w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 ${
                      adminMode ? 'focus:ring-purple-500' : 'focus:ring-emerald-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Mot de passe</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className={`w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 ${
                      adminMode ? 'focus:ring-purple-500' : 'focus:ring-emerald-500'
                    }`}
                  />
                  <p className="text-xs text-gray-400 mt-1">Minimum 8 caractères</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Téléphone</label>
                  <input
                    type="tel"
                    required
                    placeholder="+221771234567"
                    value={formData.phone}
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className={`w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 ${
                      adminMode ? 'focus:ring-purple-500' : 'focus:ring-emerald-500'
                    }`}
                  />
                  <p className="text-xs text-gray-400 mt-1">Format international: +221...</p>
                </div>

                {!adminMode && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Type de véhicule</label>
                      <input
                        type="text"
                        required
                        placeholder="ex: Berline, SUV, Van..."
                        value={formData.vehicleType}
                        onChange={e => setFormData(prev => ({ ...prev, vehicleType: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                        Plaque d'immatriculation (optionnel)
                      </label>
                      <input
                        type="text"
                        placeholder="ex: DK-1234-AB"
                        value={formData.vehiclePlate}
                        onChange={e => setFormData(prev => ({ ...prev, vehiclePlate: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </>
                )}

                {adminPasswordValid && (
                  <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-700 font-medium">✅ Mode admin activé</p>
                    <p className="text-xs text-purple-600 mt-1">Création d'un compte administrateur</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      setAdminMode(false)
                      setAdminPassword('')
                      setAdminPasswordValid(false)
                      setShowAdminPassword(false)
                    }}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className={`flex-1 py-2.5 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                      adminMode 
                        ? 'bg-purple-600 hover:bg-purple-700' 
                        : 'bg-[var(--primary)] hover:bg-[var(--primary-hover)]'
                    }`}
                  >
                    {creating ? 'Création...' : `Créer ${adminMode ? 'l\'admin' : 'le chauffeur'}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
