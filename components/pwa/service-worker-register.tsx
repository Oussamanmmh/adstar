'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '::1'
    const shouldRegister = process.env.NODE_ENV === 'production' || isLocalhost

    if (!shouldRegister) {
      return
    }

    if (!('serviceWorker' in navigator)) {
      return
    }

    const registerServiceWorker = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      } catch (error) {
        console.error('Failed to register service worker', error)
      }
    }

    void registerServiceWorker()
  }, [])

  return null
}
