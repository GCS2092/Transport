'use client'

import { useEffect, useState } from 'react'
import { adminApi, Client } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'

export default function AdminClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      setLoading(true)
      const response = await adminApi.getClients({ limit: 200 })
      setClients(response.data.data)
    } catch (err) {
      console.error('Failed to load clients', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients.filter(client => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      client.email.toLowerCase().includes(query) ||
      `${client.firstName} ${client.lastName}`.toLowerCase().includes(query) ||
      client.phone.includes(query)
    )
  })

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      <div className="max-w-6xl mx-auto px-4 pt-6">
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">Liste et statistiques des clients</p>
        </div>

        {/* Barre de recherche */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, email ou téléphone..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {searchQuery && (
            <p className="text-xs text-gray-500 mt-2">
              {filteredClients.length} client(s) trouvé(s)
            </p>
          )}
        </div>

        {/* Stats globales */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Total clients</p>
            <p className="text-xl font-bold text-gray-900">{clients.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Total courses</p>
            <p className="text-xl font-bold text-gray-900">
              {clients.reduce((sum, c) => sum + c.totalRides, 0)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">CA Total</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(clients.reduce((sum, c) => sum + c.totalSpent, 0))}
            </p>
          </div>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]" />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Aucun client trouvé</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClients.map(client => (
              <Link
                key={client.email}
                href={`/admin/clients/${encodeURIComponent(client.email)}`}
                className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xs font-bold">
                        {client.firstName[0]}{client.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {client.firstName} {client.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{client.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(client.totalSpent)}</p>
                    <p className="text-xs text-gray-500">{client.totalRides} courses</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500 text-[10px] sm:text-xs">Terminées</p>
                    <p className="font-semibold text-emerald-600">{client.completedRides}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-[10px] sm:text-xs">Annulées</p>
                    <p className="font-semibold text-red-600">{client.cancelledRides}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-[10px] sm:text-xs">Dernière</p>
                    <p className="font-semibold text-gray-900">
                      {format(new Date(client.lastRide), 'dd MMM', { locale: fr })}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
