import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './AuthContext.tsx'
import { AppThemeProvider } from './Themes.tsx'

//here dude

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </AppThemeProvider>
  </StrictMode>,
)

// <StrictMode> is reacts paranoid dev mode

