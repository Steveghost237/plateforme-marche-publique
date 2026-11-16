import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './styles/globals.css'


// Google Translate réécrit les noeuds du DOM ; sans ce patch, React plante
// (« removeChild / insertBefore ») quand il re-render sur du texte traduit.
if (typeof Node === 'function' && Node.prototype) {
  const origRemove = Node.prototype.removeChild
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) return child
    return origRemove.apply(this, arguments)
  }
  const origInsert = Node.prototype.insertBefore
  Node.prototype.insertBefore = function (newNode, refNode) {
    if (refNode && refNode.parentNode !== this) return refNode
    return origInsert.apply(this, arguments)
  }
}

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
