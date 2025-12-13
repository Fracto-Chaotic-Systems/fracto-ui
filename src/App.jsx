import { Link, Routes, Route } from 'react-router-dom'
import './App.css'

import Admin from './pages/Admin.jsx'
import Data from './pages/Data.jsx'
import Assets from './pages/Assets.jsx'
import Tiles from './pages/Tiles.jsx'

function App() {

  return (
    <div className="app-root">
      <nav>
        <ul>
          <li><Link to="/admin">Admin</Link></li>
          <li><Link to="/data">Data</Link></li>
          <li><Link to="/assets">Assets</Link></li>
          <li><Link to="/tiles">Tiles</Link></li>
        </ul>
      </nav>

      <main>
        <Routes>
          <Route path="/admin" element={<Admin />} />
          <Route path="/data" element={<Data />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/tiles" element={<Tiles />} />

          {/* keep the existing sample content available at root */}
          <Route path="/" element={(
              <h1>Fracto</h1>
          )} />
        </Routes>
      </main>
    </div>
  )
}

export default App
