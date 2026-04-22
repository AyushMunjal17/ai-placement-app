import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Button } from './ui/button'
import { 
  Code, 
  User, 
  LogOut, 
  Home, 
  PlusCircle, 
  LayoutDashboard,
  Brain,
  FileText,
  Shield,
  Sun,
  Moon
} from 'lucide-react'

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth()
  const { theme, toggleTheme, isDark } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="p-2 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Code className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-black tracking-tight uppercase italic pr-1">
              AI <span className="text-gradient">Placement</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden lg:flex items-center space-x-2">
            <Link 
              to="/" 
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:bg-white/5 flex items-center gap-2"
            >
              <Home className="h-4 w-4 text-muted-foreground" />
              <span>Home</span>
            </Link>
            
            <Link 
              to="/problems" 
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:bg-white/5 flex items-center gap-2"
            >
              <Code className="h-4 w-4 text-muted-foreground" />
              <span>Problems</span>
            </Link>

            {isAuthenticated && (
              <>
                {user?.role === 'admin' ? (
                  <>
                    <Link 
                      to="/create-problem" 
                      className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:bg-white/5 flex items-center gap-2"
                    >
                      <PlusCircle className="h-4 w-4 text-muted-foreground" />
                      <span>Create</span>
                    </Link>
                    
                    <Link 
                      to="/admin" 
                      className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:bg-white/5 flex items-center gap-2"
                    >
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span>Admin</span>
                    </Link>
                  </>
                ) : (
                  <Link 
                    to="/dashboard" 
                    className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:bg-white/5 flex items-center gap-2"
                  >
                    <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                    <span>Dashboard</span>
                  </Link>
                )}
              </>
            )}

            <div className="h-4 w-[1px] bg-white/10 mx-2"></div>

            {/* Premium Features */}
            <Link 
              to="/ai-interview" 
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:bg-primary/10 hover:text-primary flex items-center gap-2 bg-white/5"
            >
              <Brain className="h-4 w-4" />
              <span>AI Interview</span>
            </Link>
            
            {isAuthenticated ? (
              <Link 
                to="/resume-builder" 
                className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:bg-accent/10 hover:text-accent flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                <span>Resume Analyzer</span>
              </Link>
            ) : (
              <div className="px-4 py-2 text-sm font-bold text-muted-foreground/40 flex items-center gap-2 cursor-not-allowed">
                <FileText className="h-4 w-4" />
                <span>Resume Analyzer</span>
              </div>
            )}
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="flex items-center gap-2"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <>
                  <Sun className="h-4 w-4" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </Button>

            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <div className="hidden sm:flex items-center gap-3 bg-white/5 py-1.5 pl-1.5 pr-4 rounded-full border border-white/10">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold">
                    {user?.firstName}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLogout}
                  className="rounded-xl px-4 hover:bg-red-500/10 hover:text-red-500 transition-all font-bold"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/login')}
                  className="font-bold text-sm h-10 px-6 rounded-xl hover:bg-white/5"
                >
                  Log In
                </Button>
                <Button 
                  variant="premium"
                  size="sm" 
                  onClick={() => navigate('/register')}
                  className="h-10 px-6 font-bold"
                >
                  Join Now
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
                {user?.role === 'admin' ? (
                  <>
                    <Link to="/create-problem">
                      <Button variant="ghost" size="sm">Create</Button>
                    </Link>
                    <Link to="/admin">
                      <Button variant="ghost" size="sm">Admin</Button>
                    </Link>
                  </>
                ) : (
                  <Link to="/dashboard">
                    <Button variant="ghost" size="sm">Dashboard</Button>
                  </Link>
                )}
              </>
            )}
            <Link to="/ai-interview">
              <Button variant="ghost" size="sm">AI Interview</Button>
            </Link>
            <Link to="/resume-builder">
              <Button variant="ghost" size="sm">Resume Analyzer</Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
