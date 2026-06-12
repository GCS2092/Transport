'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Zone } from '@/lib/api'

const IconMapPin = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
)

const IconGps = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
)

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export interface AddressSelection {
  type: 'zone' | 'custom' | 'gps'
  zoneId?: string
  text: string
}

interface AddressSearchInputProps {
  zones: Zone[]
  value: string
  selectedZoneId?: string
  gpsState: 'idle' | 'loading' | 'ok' | 'denied'
  geocoding?: boolean
  geocoded?: boolean
  placeholder?: string
  inputCls: string
  onChange: (selection: AddressSelection) => void
  onGpsCapture: () => void
}

export function AddressSearchInput({
  zones,
  value,
  selectedZoneId,
  gpsState,
  geocoding,
  geocoded,
  placeholder = 'Rechercher une adresse ou zone…',
  inputCls,
  onChange,
  onGpsCapture,
}: AddressSearchInputProps) {
  const [query, setQuery] = useState(value)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = useMemo(() => {
    const q = normalizeText(query.trim())
    if (!q) return zones.slice(0, 20)
    return zones.filter(z =>
      normalizeText(z.name).includes(q) ||
      (z.description && normalizeText(z.description).includes(q)),
    ).slice(0, 15)
  }, [query, zones])

  const { grouped, flatItems } = useMemo(() => {
    const groups = new Map<string, Zone[]>()
    for (const zone of filtered) {
      const cat = zone.description || 'Autres'
      if (!groups.has(cat)) groups.set(cat, [])
      groups.get(cat)!.push(zone)
    }

    const items: Array<{ type: 'zone'; zone: Zone } | { type: 'custom'; text: string }> = []
    for (const [, zoneList] of groups) {
      for (const zone of zoneList) {
        items.push({ type: 'zone', zone })
      }
    }
    const trimmed = query.trim()
    if (trimmed.length >= 3) {
      const exactMatch = zones.some(z => normalizeText(z.name) === normalizeText(trimmed))
      if (!exactMatch) {
        items.push({ type: 'custom', text: trimmed })
      }
    }

    return { grouped: groups, flatItems: items }
  }, [filtered, query, zones])

  const selectZone = (zone: Zone) => {
    setQuery(zone.name)
    setIsOpen(false)
    onChange({ type: 'zone', zoneId: zone.id, text: zone.name })
  }

  const selectCustom = (text: string) => {
    setQuery(text)
    setIsOpen(false)
    onChange({ type: 'custom', text })
  }

  const handleInputChange = (text: string) => {
    setQuery(text)
    setIsOpen(true)
    setHighlightIndex(0)

    if (selectedZoneId) {
      const zone = zones.find(z => z.id === selectedZoneId)
      if (zone && zone.name !== text) {
        onChange({ type: 'custom', text })
      }
    } else if (text.trim().length >= 3) {
      onChange({ type: 'custom', text })
    } else if (!text.trim()) {
      onChange({ type: 'custom', text: '' })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || flatItems.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex(i => Math.min(i + 1, flatItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = flatItems[highlightIndex]
      if (item?.type === 'zone') selectZone(item.zone)
      else if (item?.type === 'custom') selectCustom(item.text)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const zoneIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    flatItems.forEach((item, idx) => {
      if (item.type === 'zone') map.set(item.zone.id, idx)
    })
    return map
  }, [flatItems])

  const customIndex = flatItems.findIndex(item => item.type === 'custom')

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <IconMapPin />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleInputChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={inputCls + ' pl-9 pr-3'}
            autoComplete="off"
          />
        </div>
        <button
          type="button"
          onClick={onGpsCapture}
          title="Utiliser ma position GPS"
          className={`flex-shrink-0 w-11 h-[46px] rounded-lg border flex items-center justify-center transition-all ${
            gpsState === 'ok'
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
              : gpsState === 'loading'
                ? 'border-blue-300 bg-blue-50 text-blue-600'
                : gpsState === 'denied'
                  ? 'border-red-300 bg-red-50 text-red-600'
                  : 'border-gray-200 text-gray-500 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          {gpsState === 'loading' ? (
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle className="opacity-20" cx="12" cy="12" r="10"/><path className="opacity-75" d="M4 12a8 8 0 018-8"/></svg>
          ) : (
            <IconGps />
          )}
        </button>
      </div>

      {isOpen && flatItems.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {Array.from(grouped.entries()).map(([category, zoneList]) => (
            <div key={category}>
              <p className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 sticky top-0">
                {category}
              </p>
              {zoneList.map(zone => (
                <button
                  key={zone.id}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); selectZone(zone) }}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                    highlightIndex === zoneIndexMap.get(zone.id) ? 'bg-emerald-50 text-emerald-800' : 'text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  {zone.name}
                </button>
              ))}
            </div>
          ))}
          {customIndex >= 0 && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); selectCustom(query.trim()) }}
              className={`w-full text-left px-3 py-2.5 text-sm border-t border-gray-100 transition-colors ${
                highlightIndex === customIndex ? 'bg-emerald-50 text-emerald-800' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-emerald-600 font-semibold">Utiliser :</span> « {query.trim()} »
            </button>
          )}
        </div>
      )}

      {gpsState === 'ok' && (
        <p className="text-xs text-emerald-600 mt-1">✓ Position GPS enregistrée</p>
      )}
      {gpsState === 'denied' && (
        <p className="text-xs text-red-600 mt-1">GPS refusé — saisissez une adresse manuellement</p>
      )}
      {geocoding && (
        <p className="text-xs text-blue-600 mt-1">🔍 Localisation de l&apos;adresse…</p>
      )}
      {!geocoding && geocoded && gpsState !== 'ok' && (
        <p className="text-xs text-emerald-600 mt-1">✓ Adresse localisée</p>
      )}
    </div>
  )
}
