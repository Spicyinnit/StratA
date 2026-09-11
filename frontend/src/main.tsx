import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import LoginPage from './pages/LoginPage.tsx'
import { UserSessionProvider, useUserSession } from './UserSession.tsx'
import { AppThemeProvider } from './Theme.tsx'

// auth gate 
function Root() {
  const { user } = useUserSession()
  return user ? <App /> : <LoginPage />
}

createRoot(document.getElementById('root')!).render(
  // StrictMode = dev mode 
  <StrictMode>
    <AppThemeProvider>
      <UserSessionProvider>
        <Root />
      </UserSessionProvider>
    </AppThemeProvider>
  </StrictMode>,
)