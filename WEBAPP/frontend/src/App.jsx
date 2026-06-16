import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import './styles/App.css'
import { AppProvider } from './context/AppContext'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import Toast from './components/layout/Toast'
import Home from './pages/Home'
import Simulation from './pages/Simulation'
import Scenarios from './pages/Scenarios'
import WeeklyProgramming from './pages/WeeklyProgramming'

function AppShell() {
  const location = useLocation()
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Topbar pathname={location.pathname} />
        <div className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/simulazione" element={<Simulation />} />
            <Route path="/scenari" element={<Scenarios />} />
            <Route path="/programmazione" element={<WeeklyProgramming />} />
          </Routes>
        </div>
      </div>
      <Toast />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AppProvider>
  )
}

