import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import { VoiceProvider } from './contexts/VoiceContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <VoiceProvider>
        <App />
      </VoiceProvider>
    </AuthProvider>
  </StrictMode>,
)
