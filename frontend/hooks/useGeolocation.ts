import { useState, useEffect } from 'react'

interface GeolocationState {
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  error: string | null
  loading: boolean
  permission: 'prompt' | 'granted' | 'denied' | null
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  watch?: boolean
  autoStart?: boolean
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 5000,
    maximumAge = 0,
    watch = false,
    autoStart = false,
  } = options

  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
    permission: null,
  })

  const [isActive, setIsActive] = useState(autoStart)

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
        loading: false,
        permission: 'denied',
      }))
      return
    }

    // Vérifier la permission
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        setState(prev => ({ ...prev, permission: result.state as any }))
      })
    }

    if (!isActive) return

    setState(prev => ({ ...prev, loading: true }))

    const onSuccess = (position: GeolocationPosition) => {
      setState(prev => ({
        ...prev,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        error: null,
        loading: false,
        permission: 'granted',
      }))
    }

    const onError = (error: GeolocationPositionError) => {
      setState(prev => ({
        ...prev,
        error: error.message,
        loading: false,
        permission: 'denied',
      }))
    }

    const geoOptions: PositionOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge,
    }

    if (watch) {
      const watchId = navigator.geolocation.watchPosition(
        onSuccess,
        onError,
        geoOptions
      )
      return () => navigator.geolocation.clearWatch(watchId)
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, geoOptions)
    }
  }, [enableHighAccuracy, timeout, maximumAge, watch, isActive])

  const requestPermission = () => {
    setIsActive(true)
  }

  const stopTracking = () => {
    setIsActive(false)
  }

  return { ...state, requestPermission, stopTracking, isActive }
}
