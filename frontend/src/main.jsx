import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App/>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { background:'#0D2137', color:'#fff', borderRadius:'12px', fontSize:'13px' },
          success: { iconTheme: { primary:'#E8920A', secondary:'#0D2137' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
