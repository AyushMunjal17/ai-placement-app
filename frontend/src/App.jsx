import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Problems from './pages/Problems'
import ProblemDetail from './pages/ProblemDetail'
import CreateProblem from './pages/CreateProblem'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import ResumeBuilder from './pages/ResumeBuilder'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background">
          <Navbar />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route 
                path="/verify-email" 
                element={
                  <ProtectedRoute>
                    <VerifyEmail />
                  </ProtectedRoute>
                } 
              />
              <Route path="/problems" element={<Problems />} />
              <Route path="/problems/:id" element={<ProblemDetail />} />
              <Route 
                path="/create-problem" 
                element={
                  <ProtectedRoute>
                    <CreateProblem />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/resume-builder" 
                element={
                  <ProtectedRoute>
                    <ResumeBuilder />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
