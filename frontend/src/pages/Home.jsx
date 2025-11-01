import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { 
  Code, 
  Brain, 
  FileText, 
  ArrowRight, 
  CheckCircle, 
  Clock,
  Users,
  Trophy
} from 'lucide-react'

const Home = () => {
  const { isAuthenticated, user } = useAuth()
  const [stats, setStats] = useState({
    totalProblems: 0,
    totalUsers: 0,
    totalSubmissions: 0,
    averageAcceptance: 0
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await axios.get('/problems/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const modules = [
    {
      id: 1,
      title: "LeetCode-Style Coding Platform",
      description: "Practice coding problems, submit solutions, and get real-time feedback with our Judge0-powered execution engine.",
      icon: Code,
      status: "active",
      link: "/problems",
      features: [
        "Real-time code execution",
        "Multiple programming languages",
        "Problem creation and sharing",
        "Detailed test case feedback"
      ]
    },
    {
      id: 2,
      title: "One-to-One AI Interview",
      description: "Experience realistic technical interviews with our AI interviewer. Get personalized feedback and improve your interview skills.",
      icon: Brain,
      status: "coming-soon",
      link: "#",
      features: [
        "AI-powered mock interviews",
        "Real-time feedback",
        "Performance analytics",
        "Industry-specific questions"
      ]
    },
    {
      id: 3,
      title: "AI Resume Maker",
      description: "Create professional resumes tailored to your target roles using our AI-powered resume builder.",
      icon: FileText,
      status: "coming-soon",
      link: "#",
      features: [
        "AI-powered content suggestions",
        "Industry-specific templates",
        "ATS-friendly formats",
        "Real-time optimization tips"
      ]
    }
  ]

  const statsDisplay = [
    { label: "Active Problems", value: stats.totalProblems || 0, icon: Code },
    { label: "Registered Users", value: stats.totalUsers || 0, icon: Users },
    { label: "Solutions Submitted", value: stats.totalSubmissions || 0, icon: CheckCircle },
    { label: "Average Acceptance", value: `${stats.averageAcceptance || 0}%`, icon: Trophy }
  ]

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-6">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            AI Placement Readiness System
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Master your coding interviews with our comprehensive platform featuring 
            coding challenges, AI interviews, and resume optimization tools.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {isAuthenticated ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Welcome back, {user?.firstName}!
              </p>
              <div className="flex gap-4 justify-center">
                <Link to="/problems">
                  <Button size="lg" className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Start Coding
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button variant="outline" size="lg">
                    View Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="flex items-center gap-2">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {statsDisplay.map((stat, index) => (
          <Card key={index} className="text-center">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-2">
                <stat.icon className="h-8 w-8 text-primary" />
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Modules Section */}
      <section className="space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">Three Powerful Modules</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to ace your technical interviews and land your dream job.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {modules.map((module) => (
            <Card key={module.id} className="relative overflow-hidden">
              {module.status === 'coming-soon' && (
                <div className="absolute top-4 right-4 z-10">
                  <div className="flex items-center gap-1 bg-muted text-muted-foreground px-2 py-1 rounded-full text-xs">
                    <Clock className="h-3 w-3" />
                    Coming Soon
                  </div>
                </div>
              )}
              
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    module.status === 'active' 
                      ? 'bg-primary/10 text-primary' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    <module.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{module.title}</CardTitle>
                  </div>
                </div>
                <CardDescription className="text-sm">
                  {module.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {module.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {module.status === 'active' ? (
                  <Link to={module.link}>
                    <Button className="w-full flex items-center gap-2">
                      Get Started
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <Button disabled className="w-full">
                    Coming Soon
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center space-y-6 bg-muted/50 rounded-lg p-8">
        <h2 className="text-2xl font-bold">Ready to Start Your Journey?</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Join thousands of developers who are already improving their coding skills 
          and interview performance with our platform.
        </p>
        {!isAuthenticated && (
          <Link to="/register">
            <Button size="lg" className="flex items-center gap-2 mx-auto">
              Create Free Account
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </section>
    </div>
  )
}

export default Home
