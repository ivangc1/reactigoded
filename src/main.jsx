import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/igoded-design.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div data-theme="dark" style={{ textAlign: 'center', marginTop: '2rem' }}>
      <h1>Igoded Design System</h1>
      <a href="/storybook" className="ig-btn ig-btn-brand">
        Ver Storybook
      </a>
    </div>
  </React.StrictMode>,
)
