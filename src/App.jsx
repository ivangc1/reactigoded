import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    <Container className="py-5 text-center">
      <h1 className="mb-4">reactigoded + React-Bootstrap</h1>
      <p className="lead">
        Hola, esto ya está usando componentes de React-Bootstrap.
      </p>
      <Button variant="primary" size="lg">
        Botón bonito
      </Button>
    </Container>
    </>
  )
}

export default App
