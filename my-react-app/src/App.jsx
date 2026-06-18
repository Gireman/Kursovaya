import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    fetch('/api/db-status')
      .then((res) => res.ok ? setConnected(true) : null)
      .catch(() => null)
  }, [])

  return (
    <div className="app">
      {connected && <p>Успешное подключение</p>}
    </div>
  )
}

export default App
