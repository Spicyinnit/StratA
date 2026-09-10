import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import LoginPage from './LoginPage.tsx'
import { AuthProvider, useAuth } from './UserSession.tsx'
import { AppThemeProvider } from './Theme.tsx'

// auth gate: logged in → the app, not logged in → login page
function Root() {
  const { user } = useAuth()
  return user ? <App /> : <LoginPage />
}

createRoot(document.getElementById('root')!).render(
  // StrictMode = React's dev-only checks, does nothing in production
  <StrictMode>
    <AppThemeProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </AppThemeProvider>
  </StrictMode>,
)