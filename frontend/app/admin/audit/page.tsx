'use client'

import { useEffect, useState } from 'react'
import { auditApi, AuditLog } from '@/lib/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const IconFilter = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
)

export default function AdminAudit() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterEntityType, setFilterEntityType] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadLogs()
  }, [filterEntityType, filterAction, page])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const response = await auditApi.getAll({
        page,
        limit: 50,
        entityType: filterEntityType || undefined,
        action: filterAction || undefined,
      })
      setLogs(response.data.data)
      setTotal(response.data.total)
    } catch (err) {
      console.error('Failed to load audit logs', err)
    } finally {
      setLoading(false)
    }
  }

  const actionColors: Record<string, string> = {
    CREATE: 'bg-green-100 text-green-800',
    UPDATE: 'bg-blue-100 text-blue-800',
    DELETE: 'bg-red-100 text-red-800',
    ASSIGN_DRIVER: 'bg-purple-100 text-purple-800',
    UPDATE_STATUS: 'bg-amber-100 text-amber-800',
    CANCEL: 'bg-red-100 text-red-800',
  }

  const actionLabels: Record<string, string> = {
    CREATE: 'Création',
    UPDATE: 'Modification',
    DELETE: 'Suppression',
    ASSIGN_DRIVER: 'Assignation',
    UPDATE_STATUS: 'Changement statut',
    CANCEL: 'Annulation',
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      <div className="max-w-6xl mx-auto px-4 pt-6">
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Historique des modifications</h1>
          <p className="text-sm text-gray-500 mt-1">Audit trail de toutes les actions système</p>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <IconFilter />
            <span className="text-sm font-semibold text-gray-700">Filtres</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Type d'entité</label>
              <select
                value={filterEntityType}
                onChange={(e) => setFilterEntityType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous</option>
                <option value="Reservation">Réservations</option>
                <option value="Driver">Chauffeurs</option>
                <option value="User">Utilisateurs</option>
                <option value="Zone">Zones</option>
                <option value="Tariff">Tarifs</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Action</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Toutes</option>
                <option value="CREATE">Création</option>
                <option value="UPDATE">Modification</option>
                <option value="DELETE">Suppression</option>
                <option value="ASSIGN_DRIVER">Assignation</option>
                <option value="UPDATE_STATUS">Changement statut</option>
                <option value="CANCEL">Annulation</option>
              </select>
            </div>
          </div>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]" />
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Aucun log trouvé</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map(log => (
              <div key={log.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${actionColors[log.action] || 'bg-gray-100 text-gray-800'}`}>
                      {actionLabels[log.action] || log.action}
                    </span>
                    <span className="text-xs font-semibold text-gray-700">{log.entityType}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {format(new Date(log.createdAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                  </span>
                </div>

                <p className="text-sm text-gray-900 mb-2">{log.description}</p>

                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span>{log.user?.email || 'Système'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                    <span className="font-mono">{log.entityId.slice(0, 8)}...</span>
                  </div>
                </div>

                {/* Détails des changements */}
                {(log.oldData || log.newData) && (
                  <details className="mt-3">
                    <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-700">
                      Voir les détails
                    </summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs">
                      {log.oldData && (
                        <div className="mb-2">
                          <p className="font-semibold text-gray-700 mb-1">Avant :</p>
                          <pre className="text-gray-600 overflow-x-auto">{JSON.stringify(log.oldData, null, 2)}</pre>
                        </div>
                      )}
                      {log.newData && (
                        <div>
                          <p className="font-semibold text-gray-700 mb-1">Après :</p>
                          <pre className="text-gray-600 overflow-x-auto">{JSON.stringify(log.newData, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 50 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              Page {page} sur {Math.ceil(total / 50)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / 50)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
