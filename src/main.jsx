import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Polyfill window.storage using localStorage so the app works in a browser
if (!window.storage) {
  window.storage = {
    async get(key) {
      const value = localStorage.getItem(key)
      return value !== null ? { value } : {}
    },
    async set(key, value) {
      localStorage.setItem(key, value)
    },
    async delete(key) {
      localStorage.removeItem(key)
    }
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
