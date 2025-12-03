import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/igoded-design.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div data-theme="dark" className="ig-min-h-screen ig-flex ig-flex-col ig-items-center ig-justify-center ig-bg-base">
      <h1 className="ig-text-4xl ig-font-bold ig-text-heading ig-mb-8">Igoded Design System</h1>
      <a
        href="/storybook"
        className="ig-inline-flex ig-items-center ig-justify-center ig-px-8 ig-py-3 ig-text-lg ig-font-semibold ig-rounded-lg ig-transition-all ig-bg-brand ig-text-white hover:ig-brightness-110"
        style={{ textDecoration: 'none' }}
      >
        Ver Storybook
      </a>
    </div>
  </React.StrictMode>,
)
