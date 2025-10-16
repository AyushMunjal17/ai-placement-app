import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './ui/button'
import { 
  Code, 
  User, 
  LogOut, 
  Home, 
  PlusCircle, 
  LayoutDashboard,
  Brain,
  FileText
} from 'lucide-react'

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <Link to="/" className="flex items-center space-x-2">
            <Code className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">AI Placement System</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <Link 
              to="/" 
              className="flex items-center space-x-1 text-sm font-medium transition-colors hover:text-primary"
            >
              <Home className="h-4 w-4" />
              <span>Home</span>
            </Link>
            
            <Link 
              to="/problems" 
              className="flex items-center space-x-1 text-sm font-medium transition-colors hover:text-primary"
            >
              <Code className="h-4 w-4" />
              <span>Problems</span>
            </Link>

            {isAuthenticated && (
              <>
                <Link 
                  to="/create-problem" 
                  className="flex items-center space-x-1 text-sm font-medium transition-colors hover:text-primary"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Create Problem</span>
                </Link>
                
                <Link 
                  to="/dashboard" 
                  className="flex items-center space-x-1 text-sm font-medium transition-colors hover:text-primary"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
              </>
            )}

            {/* Coming Soon Links */}
            <div className="flex items-center space-x-1 text-sm font-medium text-muted-foreground cursor-not-allowed">
              <Brain className="h-4 w-4" />
              <span>AI Interview</span>
              <span className="text-xs bg-muted px-2 py-1 rounded">Coming Soon</span>
            </div>
            
            <div className="flex items-center space-x-1 text-sm font-medium text-muted-foreground cursor-not-allowed">
              <FileText className="h-4 w-4" />
              <span>Resume Maker</span>
              <span className="text-xs bg-muted px-2 py-1 rounded">Coming Soon</span>
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {user?.firstName} {user?.lastName}
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout}
                  className="flex items-center space-x-1"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/login')}
                >
                  Login
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => navigate('/register')}
                >
                  Sign Up
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-4">
          <div className="flex flex-wrap gap-2">
            <Link to="/">
              <Button variant="ghost" size="sm">Home</Button>
            </Link>
            <Link to="/problems">
              <Button variant="ghost" size="sm">Problems</Button>
            </Link>
            {isAuthenticated && (
              <>
                <Link to="/create-problem">
                  <Button variant="ghost" size="sm">Create</Button>
                </Link>
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm">Dashboard</Button>
                </Link>
              </>
            )}
            <Button variant="ghost" size="sm" disabled>
              AI Interview <span className="ml-1 text-xs">(Soon)</span>
            </Button>
            <Button variant="ghost" size="sm" disabled>
              Resume <span className="ml-1 text-xs">(Soon)</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
