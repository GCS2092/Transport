'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'

interface Contact {
  id: string
  label: string
  value: string
  subtitle?: string
  href?: string
  icon?: string
  order: number
  active: boolean
}

interface Faq {
  id: string
  question: string
  answer: string
  language: 'fr' | 'en'
  order: number
  active: boolean
}

export default function AdminContactFaqPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [contacts, setContacts] = useState<Contact[]>([])
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'contacts' | 'faqs'>('contacts')
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showFaqModal, setShowFaqModal] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'ADMIN') {
      router.replace('/')
      return
    }
    fetchData()
  }, [authLoading, user, router])

  const fetchData = async () => {
    try {
      const [contactsRes, faqsRes] = await Promise.all([
        api.get('/settings/contacts/all'),
        api.get('/settings/faqs/all'),
      ])
      setContacts(contactsRes.data)
      setFaqs(faqsRes.data)
    } catch (error) {
      console.error('Erreur chargement données:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveContact = async (data: Partial<Contact>) => {
    try {
      if (editingContact?.id) {
        await api.put(`/settings/contacts/${editingContact.id}`, data)
      } else {
        await api.post('/settings/contacts', data)
      }
      fetchData()
      setShowContactModal(false)
      setEditingContact(null)
    } catch (error) {
      console.error('Erreur sauvegarde contact:', error)
      alert('Erreur lors de la sauvegarde')
    }
  }

  const deleteContact = async (id: string) => {
    if (!confirm('Supprimer ce contact ?')) return
    try {
      await api.delete(`/settings/contacts/${id}`)
      fetchData()
    } catch (error) {
      console.error('Erreur suppression contact:', error)
    }
  }

  const saveFaq = async (data: Partial<Faq>) => {
    try {
      if (editingFaq?.id) {
        await api.put(`/settings/faqs/${editingFaq.id}`, data)
      } else {
        await api.post('/settings/faqs', data)
      }
      fetchData()
      setShowFaqModal(false)
      setEditingFaq(null)
    } catch (error) {
      console.error('Erreur sauvegarde FAQ:', error)
      alert('Erreur lors de la sauvegarde')
    }
  }

  const deleteFaq = async (id: string) => {
    if (!confirm('Supprimer cette FAQ ?')) return
    try {
      await api.delete(`/settings/faqs/${id}`)
      fetchData()
    } catch (error) {
      console.error('Erreur suppression FAQ:', error)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion Contact & FAQ</h1>
        <p className="text-sm text-gray-500 mt-1">Gérer les informations de contact et les questions fréquentes</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('contacts')}
          className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'contacts'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📞 Contacts ({contacts.length})
        </button>
        <button
          onClick={() => setActiveTab('faqs')}
          className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'faqs'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          ❓ FAQ ({faqs.length})
        </button>
      </div>

      {/* Contacts Tab */}
      {activeTab === 'contacts' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">Contacts</h2>
            <button
              onClick={() => {
                setEditingContact(null)
                setShowContactModal(true)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              + Ajouter un contact
            </button>
          </div>

          <div className="grid gap-4">
            {contacts.map(contact => (
              <div key={contact.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900">{contact.label}</span>
                    {!contact.active && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Inactif</span>}
                  </div>
                  <p className="text-sm text-gray-600">{contact.value}</p>
                  {contact.subtitle && <p className="text-xs text-gray-400 mt-0.5">{contact.subtitle}</p>}
                  {contact.href && <p className="text-xs text-blue-500 mt-0.5">🔗 {contact.href}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Ordre: {contact.order}</span>
                  <button
                    onClick={() => {
                      setEditingContact(contact)
                      setShowContactModal(true)
                    }}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-semibold hover:bg-gray-200 transition-colors"
                  >
                    ✏️ Modifier
                  </button>
                  <button
                    onClick={() => deleteContact(contact.id)}
                    className="px-3 py-1.5 bg-red-50 text-red-600 rounded text-xs font-semibold hover:bg-red-100 transition-colors"
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAQs Tab */}
      {activeTab === 'faqs' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">Questions Fréquentes</h2>
            <button
              onClick={() => {
                setEditingFaq(null)
                setShowFaqModal(true)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              + Ajouter une FAQ
            </button>
          </div>

          <div className="grid gap-4">
            {faqs.map(faq => (
              <div key={faq.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-500 uppercase">{faq.language}</span>
                      {!faq.active && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Inactif</span>}
                    </div>
                    <p className="font-bold text-gray-900 mb-2">{faq.question}</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-xs text-gray-400">Ordre: {faq.order}</span>
                    <button
                      onClick={() => {
                        setEditingFaq(faq)
                        setShowFaqModal(true)
                      }}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-semibold hover:bg-gray-200 transition-colors"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteFaq(faq.id)}
                      className="px-3 py-1.5 bg-red-50 text-red-600 rounded text-xs font-semibold hover:bg-red-100 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <ContactModal
          key={editingContact?.id ?? 'new'}
          contact={editingContact}
          onSave={saveContact}
          onClose={() => {
            setShowContactModal(false)
            setEditingContact(null)
          }}
        />
      )}

      {/* FAQ Modal */}
      {showFaqModal && (
        <FaqModal
          key={editingFaq?.id ?? 'new'}
          faq={editingFaq}
          onSave={saveFaq}
          onClose={() => {
            setShowFaqModal(false)
            setEditingFaq(null)
          }}
        />
      )}
    </div>
  )
}

function ContactModal({ contact, onSave, onClose }: { contact: Contact | null; onSave: (data: Partial<Contact>) => void; onClose: () => void }) {
  const [formData, setFormData] = useState({
    label: contact?.label || '',
    value: contact?.value || '',
    subtitle: contact?.subtitle || '',
    href: contact?.href || '',
    icon: contact?.icon || '',
    order: contact?.order || 0,
    active: contact?.active ?? true,
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">{contact ? 'Modifier' : 'Ajouter'} un contact</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Label *</label>
            <input
              type="text"
              value={formData.label}
              onChange={e => setFormData({ ...formData, label: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Téléphone"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Valeur *</label>
            <input
              type="text"
              value={formData.value}
              onChange={e => setFormData({ ...formData, value: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+221 77 000 00 00"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Sous-titre</label>
            <input
              type="text"
              value={formData.subtitle}
              onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Disponible 24h/24"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Lien (href)</label>
            <input
              type="text"
              value={formData.href}
              onChange={e => setFormData({ ...formData, href: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="tel:+221770000000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Ordre</label>
              <input
                type="number"
                value={formData.order}
                onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={e => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-gray-700">Actif</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onSave(formData)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}

function FaqModal({ faq, onSave, onClose }: { faq: Faq | null; onSave: (data: Partial<Faq>) => void; onClose: () => void }) {
  const [formData, setFormData] = useState({
    question: faq?.question || '',
    answer: faq?.answer || '',
    language: (faq?.language === 'en' ? 'en' : 'fr') as 'fr' | 'en',
    order: faq?.order || 0,
    active: faq?.active ?? true,
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-gray-900 mb-4">{faq ? 'Modifier' : 'Ajouter'} une FAQ</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Question *</label>
            <input
              type="text"
              value={formData.question}
              onChange={e => setFormData({ ...formData, question: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Comment réserver ?"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Réponse *</label>
            <textarea
              value={formData.answer}
              onChange={e => setFormData({ ...formData, answer: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Pour réserver, cliquez sur..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Langue</label>
              <select
                value={formData.language}
                onChange={e => setFormData({ ...formData, language: e.target.value as 'fr' | 'en' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="fr">🇫🇷 Français</option>
                <option value="en">🇬🇧 English</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Ordre</label>
              <input
                type="number"
                value={formData.order}
                onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={e => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-gray-700">Actif</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onSave(formData)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}
