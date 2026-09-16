import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

/**
 * Email reset links must land on BrowserRouter path `/reset-password`.
 * Older Capacitor builds emailed `/#/reset-password`, which the live site
 * ignores (shows Landing). Also rescue recovery tokens parked on `/`.
 */
function rescuePasswordResetLanding() {
  if (typeof window === 'undefined') return
  const { pathname, search, hash } = window.location
  const hashBody = hash.startsWith('#') ? hash.slice(1) : hash

  // `/#/reset-password` or `/#/reset-password?code=…`
  if (hashBody.startsWith('/reset-password') || hashBody.startsWith('/ResetPassword')) {
    const rest = hashBody.replace(/^\/ResetPassword/i, '/reset-password')
    const qIndex = rest.indexOf('?')
    const path = qIndex >= 0 ? rest.slice(0, qIndex) : rest
    const hashQuery = qIndex >= 0 ? rest.slice(qIndex) : ''
    const next = `${path}${search || ''}${hashQuery}`
    window.history.replaceState(null, '', next)
    return
  }

  // Implicit recovery tokens on Site URL / homepage hash
  if (
    (pathname === '/' || pathname === '') &&
    (hashBody.includes('type=recovery') || hashBody.includes('access_token='))
  ) {
    window.history.replaceState(null, '', `/reset-password${search}${hash}`)
    return
  }

  // PKCE code on homepage with leftover hash route
  if (
    (pathname === '/' || pathname === '') &&
    new URLSearchParams(search).get('code') &&
    hashBody.startsWith('/reset-password')
  ) {
    window.history.replaceState(null, '', `/reset-password${search}`)
  }
}

rescuePasswordResetLanding()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
