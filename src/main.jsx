import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/igoded-design.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div data-theme="dark" className="ig-min-h-screen ig-flex ig-flex-col ig-items-center ig-justify-center ig-bg-base">
      <h1 className="ig-text-4xl ig-font-bold ig-text-heading ig-mb-8">Igoded Design System</h1>
      <a
        href="/storybook"
        className="ig-btn ig-px-8 ig-py-3 ig-text-lg ig-font-semibold ig-rounded-lg ig-transition-all"
        style={{
          background: 'var(--ig-vitreus)',
          color: '#ffffff',
          boxShadow: '0 4px 14px rgba(var(--ig-vitreus-rgb, 0, 200, 150), 0.4)',
          textDecoration: 'none'
        }}
      >
        Ver Storybook
      </a>
    </div>
  </React.StrictMode>,
)
