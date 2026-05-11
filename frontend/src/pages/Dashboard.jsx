import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
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
  Activity,
  X
} from 'lucide-react'

const Dashboard = () => {
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState([])
  const [allSubmissions, setAllSubmissions] = useState([])
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    acceptedSubmissions: 0,
    problemsSolved: 0,
    recentActivity: []
  })
  const [calendarData, setCalendarData] = useState({})
  const [problemTypeData, setProblemTypeData] = useState([])
  const [languageData, setLanguageData] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedDateSubmissions, setSelectedDateSubmissions] = useState([])
  const [showDateModal, setShowDateModal] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')

  useEffect(() => {
    fetchDashboardData()
    fetchProblems()
  }, [])

  useEffect(() => {
    processCalendarData()
    processChartsData()
  }, [allSubmissions, problems])

  const fetchProblems = async () => {
    try {
      const response = await axios.get('/problems')
      setProblems(response.data.problems || [])
    } catch (error) {
      console.error('Failed to fetch problems:', error)
    }
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/submissions/my-submissions')
      const submissionsData = response.data.submissions || []
      
      setAllSubmissions(submissionsData)
      setSubmissions(submissionsData.slice(0, 10)) // Latest 10
      
      // Calculate stats
      const accepted = submissionsData.filter(s => s.status === 'Accepted').length
      const uniqueProblems = new Set(submissionsData.filter(s => s.status === 'Accepted').map(s => s.problemId))
      
      setStats({
        totalSubmissions: submissionsData.length,
        acceptedSubmissions: accepted,
        problemsSolved: uniqueProblems.size,
        acceptanceRate: submissionsData.length > 0 ? Math.round((accepted / submissionsData.length) * 100) : 0
      })
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Process calendar data (LeetCode-style heatmap)
  const processCalendarData = () => {
    const calendar = {}
    
    allSubmissions.forEach(submission => {
      const date = new Date(submission.createdAt)
      const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
      
      if (!calendar[dateStr]) {
        calendar[dateStr] = { count: 0, accepted: 0, submissions: [] }
      }
      
      calendar[dateStr].count++
      calendar[dateStr].submissions.push(submission)
      if (submission.status === 'Accepted') {
        calendar[dateStr].accepted++
      }
    })
    
    setCalendarData(calendar)
  }

  const handleDateClick = (dayData) => {
    if (!dayData || dayData.count === 0) return
    
    const daySubmissions = dayData.submissions || []
    // Get unique problems solved (Accepted status) for that day
    const uniqueProblems = new Map()
    
    daySubmissions.forEach(submission => {
      if (submission.status === 'Accepted' && submission.problemId) {
        if (!uniqueProblems.has(submission.problemId)) {
          uniqueProblems.set(submission.problemId, submission)
        }
      }
    })
    
    setSelectedDateSubmissions(Array.from(uniqueProblems.values()))
    setSelectedDate(dayData.date)
    setShowDateModal(true)
  }

  // Process chart data for problem types and languages
  const processChartsData = () => {
    // Problem types/tags chart
    const acceptedSubmissions = allSubmissions.filter(s => s.status === 'Accepted')
    const problemIdToTags = {}
    
    problems.forEach(problem => {
      const stripHtml = (str) => {
        if (!str) return ''
        return String(str).replace(/<[^>]*>/g, '').trim()
      }
      
      let tags = []
      if (Array.isArray(problem.tags)) {
        tags = problem.tags.map(tag => stripHtml(tag)).filter(tag => tag)
      } else if (problem.tags) {
        const tagsStr = stripHtml(problem.tags)
        tags = tagsStr.split(',').map(t => t.trim()).filter(t => t)
      }
      
      problemIdToTags[problem._id] = tags
    })
    
    const tagCounts = {}
    acceptedSubmissions.forEach(submission => {
      const tags = problemIdToTags[submission.problemId] || []
      tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    })
    
    const problemTypeChart = Object.entries(tagCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10) // Top 10
    
    setProblemTypeData(problemTypeChart)
    
    // Language chart
    const languageCounts = {}
    acceptedSubmissions.forEach(submission => {
      const lang = submission.language || 'unknown'
      languageCounts[lang] = (languageCounts[lang] || 0) + 1
    })
    
    const languageChart = Object.entries(languageCounts)
      .map(([name, value]) => ({ name: name.toUpperCase(), value }))
      .sort((a, b) => b.value - a.value)
    
    setLanguageData(languageChart)
  }

  // Generate calendar grid for current month
  const generateCalendarGrid = () => {
    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const weeks = []
    let currentWeek = []
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      currentWeek.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateStr = date.toISOString().split('T')[0]
      const dayData = calendarData[dateStr] || { count: 0, accepted: 0 }
      
      currentWeek.push({
        date,
        dateStr,
        day,
        count: dayData.count,
        accepted: dayData.accepted,
        submissions: dayData.submissions || []
      })
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    }
    
    // Add remaining empty cells
    while (currentWeek.length < 7 && currentWeek.length > 0) {
      currentWeek.push(null)
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }
    
    return weeks
  }

  const getIntensityColor = (count) => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800'
    if (count === 1) return 'bg-green-200 dark:bg-green-900/30'
    if (count <= 3) return 'bg-green-400 dark:bg-green-700/50'
    if (count <= 5) return 'bg-green-600 dark:bg-green-600/70'
    return 'bg-green-800 dark:bg-green-500'
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0']

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December']
  
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const statsCards = [
    {
      title: "Problems Solved",
      value: stats.problemsSolved,
      icon: Trophy,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-900/20"
    },
    {
      title: "Total Submissions",
      value: stats.totalSubmissions,
      icon: Code,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20"
    },
    {
      title: "Accepted",
      value: stats.acceptedSubmissions,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-900/20"
    },
    {
      title: "Acceptance Rate",
      value: `${stats.acceptanceRate}%`,
      icon: TrendingUp,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-900/20"
    }
  ]

  const dashboardSections = [
    {
      id: 'overview',
      title: 'Overview',
      description: 'Quick stats and latest submissions',
      icon: LayoutDashboard
    },
    {
      id: 'insights',
      title: 'Insights',
      description: 'Calendar heatmap and charts',
      icon: TrendingUp
    }
  ]

  return (
    <div className="space-y-10 py-6">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          User <span className="text-gradient">Dashboard</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Welcome back, {user?.firstName}! Here's your progress overview.
        </p>
      </div>

      {/* Section Switcher */}
      <div className="flex flex-wrap gap-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        {dashboardSections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex-1 min-w-[220px] rounded-2xl border p-5 text-left transition-all duration-300 ${
              activeSection === section.id
                ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.1)]'
                : 'border-white/5 bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-xl ${
                activeSection === section.id ? 'bg-primary text-white' : 'bg-white/10 text-muted-foreground'
              }`}>
                <section.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-lg">{section.title}</p>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            {statsCards.map((stat, index) => (
              <Card key={index} className="glass-card overflow-hidden group">
                <CardContent className="p-6 relative">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <stat.icon className="h-20 w-20" />
                  </div>
                  <div className="flex flex-col justify-between h-full relative z-10">
                    <p className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
                      {stat.title}
                    </p>
                    <div className="flex items-end gap-3">
                      <p className="text-4xl font-black">{stat.value}</p>
                      {stat.title === "Acceptance Rate" && (
                        <div className="flex items-center gap-1 text-green-500 text-xs font-bold mb-1.5">
                          <TrendingUp className="h-3 w-3" />
                          +2%
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* User Info */}
          <Card className="glass-card animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl font-bold">
                <div className="p-2 rounded-lg bg-primary/20 text-primary">
                  <User className="h-5 w-5" />
                </div>
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 rounded-xl bg-primary/5 dark:bg-white/5 border border-primary/10 dark:border-white/10">
                  <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">Full Name</p>
                  <p className="text-xl font-bold">{user?.firstName} {user?.lastName}</p>
                </div>
                <div className="p-4 rounded-xl bg-primary/5 dark:bg-white/5 border border-primary/10 dark:border-white/10">
                  <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">Username</p>
                  <p className="text-xl font-bold text-primary">@{user?.username}</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-primary/5 dark:bg-white/5 border border-primary/10 dark:border-white/10">
                <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">Member Since</p>
                <p className="text-xl font-bold">
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
          <Card className="glass-card animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/20 text-accent">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold">Recent Activity</CardTitle>
                    <CardDescription className="text-muted-foreground font-medium">
                      Your latest submission attempts
                    </CardDescription>
                  </div>
                </div>
                <Link to="/problems">
                  <Button variant="outline" size="sm" className="hidden sm:flex border-primary/10 dark:border-white/10 bg-primary/5 dark:bg-white/5 hover:bg-primary/10 dark:hover:bg-white/10">
                    Solve More Problems
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-muted-foreground font-medium">Synchronizing data...</p>
                </div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-12 glass-card rounded-2xl border-dashed border-2 border-primary/10 dark:border-white/10">
                  <Code className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-xl font-bold mb-4">No submissions yet</p>
                  <Link to="/problems">
                    <Button variant="premium">Start Solving Problems</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {submissions.map((submission) => (
                    <div 
                      key={submission._id} 
                      className={`p-5 glass-card rounded-2xl border-l-4 transition-transform hover:translate-x-1 ${
                        submission.status === 'Accepted' 
                          ? 'border-l-green-500' 
                          : 'border-l-red-500'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            {submission.status === 'Accepted' ? (
                              <div className="h-8 w-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              </div>
                            ) : (
                              <div className="h-8 w-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                                <XCircle className="h-5 w-5 text-red-500" />
                              </div>
                            )}
                            <Link 
                              to={`/problems/${submission.problemId}`}
                              className="font-bold text-lg hover:text-primary transition-colors truncate block"
                            >
                              {submission.problemTitle ? submission.problemTitle.replace(/<[^>]*>/g, '').trim() : 'Untitled Problem'}
                            </Link>
                          </div>
                          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-muted-foreground font-medium">
                            <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(submission.createdAt).toLocaleDateString()}
                            </span>
                            <span className="capitalize bg-white/5 px-2.5 py-1 rounded-md">{submission.language}</span>
                            <span className="bg-white/5 px-2.5 py-1 rounded-md">
                              {submission.passedTestCases || 0}/{submission.totalTestCases || 0} test cases
                            </span>
                            <span className="bg-white/5 px-2.5 py-1 rounded-md">{submission.executionTime || 0}s</span>
                          </div>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
                          submission.status === 'Accepted'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/20'
                            : 'bg-red-500/20 text-red-400 border border-red-500/20'
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
        </div>
      )}

      {activeSection === 'insights' && (
        <div className="space-y-6">
          {/* Monthly Calendar & Problem Types */}
          <div className="grid lg:grid-cols-3 gap-8 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            {/* Monthly Submission Calendar */}
            <Card className="lg:col-span-2 glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                      <Calendar className="h-5 w-5" />
                    </div>
                    Submission Activity
                  </CardTitle>
                  <div className="flex gap-2 bg-white/5 p-1 rounded-lg border border-white/5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        const prevMonth = new Date(selectedMonth)
                        prevMonth.setMonth(prevMonth.getMonth() - 1)
                        setSelectedMonth(prevMonth)
                      }}
                    >
                      ←
                    </Button>
                    <span className="px-3 py-1 text-sm font-bold min-w-[120px] text-center">
                      {monthNames[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        const nextMonth = new Date(selectedMonth)
                        nextMonth.setMonth(nextMonth.getMonth() + 1)
                        setSelectedMonth(nextMonth)
                      }}
                    >
                      →
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Week day headers */}
                  <div className="grid grid-cols-7 gap-1">
                    {weekDays.map(day => (
                      <div key={day} className="text-[10px] font-black uppercase tracking-tighter text-center text-muted-foreground/60">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {generateCalendarGrid().flat().map((dayData, index) => (
                      <div
                        key={index}
                        className={`h-10 rounded-lg transition-all duration-300 ${
                          dayData 
                            ? getIntensityColor(dayData.count) + ' cursor-pointer hover:ring-2 hover:ring-primary border border-white/5'
                            : 'bg-transparent'
                        } flex items-center justify-center text-xs p-1`}
                        onClick={() => handleDateClick(dayData)}
                        title={dayData ? `${dayData.date.toLocaleDateString()}: ${dayData.count} submission(s)` : ''}
                      >
                        {dayData && (
                          <span className={`font-bold ${dayData.count === 0 ? 'text-muted-foreground/40' : 'text-white'}`}>
                            {dayData.day}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Legend */}
                  <div className="flex items-center justify-end gap-3 text-[10px] font-bold text-muted-foreground pt-4 border-t border-white/5">
                    <span>LESS</span>
                    <div className="flex gap-1">
                      {[0, 1, 3, 5, 8].map((c) => (
                        <div key={c} className={`w-3 h-3 rounded-sm ${getIntensityColor(c)} border border-white/5`}></div>
                      ))}
                    </div>
                    <span>MORE</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Problem Types Pie Chart */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Topics Mastered</CardTitle>
              </CardHeader>
              <CardContent>
                {problemTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={problemTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {problemTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="stroke-none" />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '12px', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm font-medium italic">
                    No activity recorded yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Languages Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Languages Used</CardTitle>
            </CardHeader>
            <CardContent>
              {languageData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={languageData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {languageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                  No data available
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
                  stats.problemsSolved >= 1 
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                    : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                }`}>
                  <Trophy className={`h-6 w-6 ${
                    stats.problemsSolved >= 1 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
                  }`} />
                  <div>
                    <p className="font-medium text-foreground">First Problem</p>
                    <p className="text-xs text-muted-foreground">Solve your first problem</p>
                  </div>
                </div>
                
                <div className={`flex items-center gap-3 p-3 rounded-lg ${
                  stats.problemsSolved >= 10 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                    : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                }`}>
                  <Trophy className={`h-6 w-6 ${
                    stats.problemsSolved >= 10 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                  }`} />
                  <div>
                    <p className="font-medium text-foreground">Problem Solver</p>
                    <p className="text-xs text-muted-foreground">Solve 10 problems</p>
                  </div>
                </div>
                
                <div className={`flex items-center gap-3 p-3 rounded-lg ${
                  stats.acceptanceRate >= 50 
                    ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800' 
                    : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                }`}>
                  <Trophy className={`h-6 w-6 ${
                    stats.acceptanceRate >= 50 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'
                  }`} />
                  <div>
                    <p className="font-medium text-foreground">Consistent Performer</p>
                    <p className="text-xs text-muted-foreground">50%+ acceptance rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Date Modal - Show problems solved on selected day */}
      {showDateModal && selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-800/20">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-lg">Problems Solved</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDateModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {selectedDateSubmissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No problems were solved on this day</p>
                  <p className="text-sm mt-2">Check other days for solved problems</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground mb-4">
                    {selectedDateSubmissions.length} problem{selectedDateSubmissions.length !== 1 ? 's' : ''} solved on this day:
                  </p>
                  {selectedDateSubmissions.map((submission) => {
                    const stripHtml = (str) => {
                      if (!str) return ''
                      return String(str).replace(/<[^>]*>/g, '').trim()
                    }
                    
                    const title = stripHtml(submission.problemTitle || 'Untitled Problem')
                    
                    return (
                      <div
                        key={submission._id}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <Link
                              to={`/problems/${submission.problemId}`}
                              className="font-semibold text-base hover:text-primary block mb-2"
                            >
                              {title}
                            </Link>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="capitalize">{submission.language}</span>
                              <span>{submission.executionTime || 0}s</span>
                              <span className="text-green-600 font-medium">
                                <CheckCircle className="h-4 w-4 inline mr-1" />
                                Accepted
                              </span>
                            </div>
                          </div>
                          <Link to={`/problems/${submission.problemId}`}>
                            <Button variant="outline" size="sm">
                              View Problem
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 dark:bg-gray-900 flex justify-end">
              <Button onClick={() => setShowDateModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
