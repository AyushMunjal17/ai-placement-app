import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { 
  LayoutDashboard, 
  User, 
  Code, 
  Trophy, 
  Clock, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  Calendar,
  Target,
  Award,
  Activity
} from 'lucide-react'

const Dashboard = () => {
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    acceptedSubmissions: 0,
    problemsSolved: 0,
    recentActivity: []
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/submissions/my-submissions')
      const allSubmissions = response.data.submissions || []
      
      setSubmissions(allSubmissions.slice(0, 10)) // Latest 10
      
      // Calculate stats
      const accepted = allSubmissions.filter(s => s.status === 'Accepted').length
      const uniqueProblems = new Set(allSubmissions.filter(s => s.status === 'Accepted').map(s => s.problemId))
      
      setStats({
        totalSubmissions: allSubmissions.length,
        acceptedSubmissions: accepted,
        problemsSolved: uniqueProblems.size,
        acceptanceRate: allSubmissions.length > 0 ? Math.round((accepted / allSubmissions.length) * 100) : 0
      })
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const statsCards = [
    {
      title: "Problems Solved",
      value: stats.problemsSolved,
      icon: Trophy,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Total Submissions",
      value: stats.totalSubmissions,
      icon: Code,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Accepted",
      value: stats.acceptedSubmissions,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Acceptance Rate",
      value: `${stats.acceptanceRate}%`,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.firstName}! Here's your progress overview.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Full Name</p>
              <p className="text-lg">{user?.firstName} {user?.lastName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Username</p>
              <p className="text-lg">@{user?.username}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Member Since</p>
            <p className="text-lg">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'N/A'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Submissions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Submissions
              </CardTitle>
              <CardDescription>
                Your latest submission attempts
              </CardDescription>
            </div>
            <Link to="/problems">
              <Button variant="outline" size="sm">
                Solve More Problems
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading submissions...
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-8">
              <Code className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No submissions yet</p>
              <Link to="/problems">
                <Button>Start Solving Problems</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((submission) => (
                <div 
                  key={submission._id} 
                  className={`p-4 border rounded-lg ${
                    submission.status === 'Accepted' 
                      ? 'border-green-200 bg-green-50/50' 
                      : 'border-red-200 bg-red-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {submission.status === 'Accepted' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <Link 
                          to={`/problems/${submission.problemId}`}
                          className="font-medium hover:text-blue-600"
                        >
                          {submission.problemTitle ? submission.problemTitle.replace(/<[^>]*>/g, '').trim() : 'Untitled Problem'}
                        </Link>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(submission.createdAt).toLocaleDateString()}
                        </span>
                        <span className="capitalize">{submission.language}</span>
                        <span>
                          {submission.passedTestCases || 0}/{submission.totalTestCases || 0} test cases
                        </span>
                        <span>{submission.executionTime || 0}s</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded text-sm font-medium ${
                      submission.status === 'Accepted'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {submission.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Tracking */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Progress Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Acceptance Rate</span>
                <span className="font-medium">{stats.acceptanceRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${stats.acceptanceRate}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Problems Solved</span>
                <span className="font-medium">{stats.problemsSolved}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((stats.problemsSolved / 50) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Goal: 50 problems</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className={`flex items-center gap-3 p-3 rounded-lg ${
              stats.problemsSolved >= 1 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
            }`}>
              <Trophy className={`h-6 w-6 ${
                stats.problemsSolved >= 1 ? 'text-green-600' : 'text-gray-400'
              }`} />
              <div>
                <p className="font-medium">First Problem</p>
                <p className="text-xs text-muted-foreground">Solve your first problem</p>
              </div>
            </div>
            
            <div className={`flex items-center gap-3 p-3 rounded-lg ${
              stats.problemsSolved >= 10 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'
            }`}>
              <Trophy className={`h-6 w-6 ${
                stats.problemsSolved >= 10 ? 'text-blue-600' : 'text-gray-400'
              }`} />
              <div>
                <p className="font-medium">Problem Solver</p>
                <p className="text-xs text-muted-foreground">Solve 10 problems</p>
              </div>
            </div>
            
            <div className={`flex items-center gap-3 p-3 rounded-lg ${
              stats.acceptanceRate >= 50 ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50 border border-gray-200'
            }`}>
              <Trophy className={`h-6 w-6 ${
                stats.acceptanceRate >= 50 ? 'text-purple-600' : 'text-gray-400'
              }`} />
              <div>
                <p className="font-medium">Consistent Performer</p>
                <p className="text-xs text-muted-foreground">50%+ acceptance rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard
