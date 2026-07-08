import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import './styles/App.css'
import { AppProvider } from './context/AppContext'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import Toast from './components/layout/Toast'

const Home = lazy(() => import('./pages/Home'))
const Simulation = lazy(() => import('./pages/Simulation'))
const Scenarios = lazy(() => import('./pages/Scenarios'))
const WeeklyProgramming = lazy(() => import('./pages/WeeklyProgramming'))

function AppShell() {
  const location = useLocation()
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Topbar pathname={location.pathname} />
        <div className="content">
          <Suspense fallback={<div className="card">Caricamento pagina...</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/simulazione" element={<Simulation />} />
              <Route path="/scenari" element={<Scenarios />} />
              <Route path="/programmazione" element={<WeeklyProgramming />} />
            </Routes>
          </Suspense>
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

