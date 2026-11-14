import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { AppProvider } from './store/AppStore'
import { AppLoader } from './components/brand/AppLoader'

function Root() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Show the branded loader briefly on first mount, then reveal the app
    const timer = window.setTimeout(() => setLoading(false), 1600)
    return () => clearTimeout(timer)
  }, [])

  return loading ? <AppLoader /> : <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <Root />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
)
