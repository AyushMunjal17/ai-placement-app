import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { 
  Users, 
  FileText, 
  CheckCircle, 
  TrendingUp, 
  Shield,
  Trash2,
  Eye,
  EyeOff,
  Plus,
  BarChart3,
  UserCheck,
  XCircle,
  Clock
} from 'lucide-react'

const AdminDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [dashboardData, setDashboardData] = useState({
    problems: [],
    admins: [],
    statistics: {}
  })
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [loadingStudentDetail, setLoadingStudentDetail] = useState(false)
  const [pendingApprovals, setPendingApprovals] = useState([])
  const [loadingApprovals, setLoadingApprovals] = useState(false)
  
  // Check if user is main admin (by email only for flexibility)
  const isMainAdmin = user?.email === 'ayushmunjal17@gmail.com'
  
  // Debug: Log user data to check
  useEffect(() => {
    if (user) {
      console.log('Current user data:', {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isMainAdmin: isMainAdmin
      })
    }
  }, [user, isMainAdmin])

  useEffect(() => {
    // Redirect if not admin
    if (user && user.role !== 'admin') {
      navigate('/problems')
      return
    }
    
    fetchDashboardData()
    if (isMainAdmin) {
      fetchPendingApprovals()
    }
  }, [user, navigate, isMainAdmin])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [dashboardRes, studentsRes] = await Promise.all([
        axios.get('/admin/dashboard'),
        axios.get('/admin/students/stats')
      ])
      setDashboardData(dashboardRes.data)
      setStudents(studentsRes.data.students || [])
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStudentDetail = async (studentId) => {
    try {
      setLoadingStudentDetail(true)
      const response = await axios.get(`/admin/students/${studentId}`)
      setSelectedStudent(response.data)
    } catch (error) {
      console.error('Failed to fetch student details:', error)
    } finally {
      setLoadingStudentDetail(false)
    }
  }

  const toggleProblemStatus = async (problemId) => {
    try {
      await axios.put(`/admin/problems/${problemId}/toggle-status`)
      fetchDashboardData()
    } catch (error) {
      console.error('Failed to toggle problem status:', error)
    }
  }

  const deleteProblem = async (problemId) => {
    if (!window.confirm('Are you sure you want to delete this problem?')) {
      return
    }

    try {
      await axios.delete(`/admin/problems/${problemId}`)
      fetchDashboardData()
    } catch (error) {
      console.error('Failed to delete problem:', error)
    }
  }

  const fetchPendingApprovals = async () => {
    try {
      setLoadingApprovals(true)
      const response = await axios.get('/admin/pending-approvals')
      setPendingApprovals(response.data.pendingRequests || [])
    } catch (error) {
      console.error('Failed to fetch pending approvals:', error)
    } finally {
      setLoadingApprovals(false)
    }
  }

  const handleApprove = async (userId) => {
    if (!window.confirm('Are you sure you want to approve this admin request?')) {
      return
    }

    try {
      await axios.post(`/admin/approve/${userId}`)
      fetchPendingApprovals()
      fetchDashboardData() // Refresh to show new admin
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to approve request')
    }
  }

  const handleReject = async (userId) => {
    if (!window.confirm('Are you sure you want to reject this admin request?')) {
      return
    }

    try {
      await axios.post(`/admin/reject/${userId}`)
      fetchPendingApprovals()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to reject request')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const { problems, admins, statistics } = dashboardData

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-sm shadow-xl">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-500">
              <Shield className="h-8 w-8" />
            </div>
            Admin <span className="text-gradient">Dashboard</span>
          </h1>
          <p className="text-muted-foreground font-medium">
            Manage problems, view analytics, and monitor platform activity
          </p>
        </div>
        <Button onClick={() => navigate('/create-problem')} variant="premium" className="h-12 px-8 rounded-xl font-bold">
          <Plus className="h-5 w-5 mr-2" />
          Create New Problem
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {[
          { label: 'Total Problems', value: statistics.totalProblems, icon: FileText, color: 'blue' },
          { label: 'Active Problems', value: statistics.activeProblems, icon: CheckCircle, color: 'green' },
          { label: 'Total Students', value: statistics.totalStudents, icon: Users, color: 'purple' },
          { label: 'Total Admins', value: statistics.totalAdmins, icon: Shield, color: 'indigo' },
          { label: 'Total Submissions', value: statistics.totalSubmissions, icon: TrendingUp, color: 'pink' }
        ].map((stat, idx) => (
          <Card key={idx} className="glass-card hover:scale-105 transition-all duration-300 border-none shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div className="text-3xl font-black">{stat.value || 0}</div>
                <div className={`p-2 rounded-lg bg-${stat.color}-500/10 text-${stat.color}-500`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-white/5 rounded-2xl border border-white/10 max-w-max">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'problems', label: `Problems (${problems.length})`, icon: FileText },
          { id: 'students', label: `Students (${students.length})`, icon: Users },
          { id: 'admins', label: `Admins (${admins.length})`, icon: Users }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
        {isMainAdmin && (
          <button
            onClick={() => {
              setActiveTab('approvals')
              fetchPendingApprovals()
            }}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              activeTab === 'approvals'
                ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/20 scale-105'
                : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Approvals ({pendingApprovals.length})
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Problems */}
            <Card className="glass-card border-none shadow-xl transition-all duration-500">
              <CardHeader>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Recent Problems
                </CardTitle>
                <CardDescription className="font-medium">Latest problems created by admins</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {problems.slice(0, 5).map((problem) => {
                    const stripHtml = (str) => str ? String(str).replace(/<[^>]*>/g, '').trim() : ''
                    const cleanTitle = stripHtml(problem.title)
                    return (
                      <div key={problem._id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group">
                        <div className="flex-1">
                          <h4 className="font-bold group-hover:text-primary transition-colors">{cleanTitle || 'Untitled Problem'}</h4>
                          <p className="text-xs text-muted-foreground font-medium mt-1">
                            By {problem.publishedBy?.username || 'Unknown'}
                          </p>
                        </div>
                        <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg border ${
                          problem.difficulty === 'Easy' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                          problem.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                          'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>
                          {problem.difficulty}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Admin List Preview */}
            <Card className="glass-card border-none shadow-xl transition-all duration-500">
              <CardHeader>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-500" />
                  Admin Users
                </CardTitle>
                <CardDescription className="font-medium">Platform administrators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {admins.slice(0, 5).map((admin) => (
                    <div key={admin._id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                      <div>
                        <h4 className="font-bold">{admin.firstName} {admin.lastName}</h4>
                        <p className="text-xs text-muted-foreground font-medium">@{admin.username}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-primary">{admin.problemsPublished || 0}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Problems</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'problems' && (
          <Card className="glass-card border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">All Problems</CardTitle>
              <CardDescription className="font-medium">Manage all problems on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {problems.map((problem) => {
                  const stripHtml = (str) => str ? String(str).replace(/<[^>]*>/g, '').trim() : ''
                  const cleanTitle = stripHtml(problem.title)
                  
                  let processedTags = []
                  if (Array.isArray(problem.tags)) {
                    processedTags = problem.tags.map(tag => stripHtml(tag)).filter(tag => tag)
                  } else if (problem.tags) {
                    const tagsStr = stripHtml(problem.tags)
                    processedTags = tagsStr.split(',').map(t => t.trim()).filter(t => t)
                  }
                  
                  return (
                    <div key={problem._id} className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h4 className="text-lg font-bold group-hover:text-primary transition-colors">{cleanTitle || 'Untitled Problem'}</h4>
                          <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase rounded-lg border ${
                            problem.difficulty === 'Easy' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                            problem.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                            'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}>
                            {problem.difficulty}
                          </span>
                          {problem.isActive ? (
                            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase bg-primary/10 text-primary border border-primary/20 rounded-lg flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              Active
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase bg-white/10 text-muted-foreground border border-white/10 rounded-lg flex items-center gap-1">
                              <EyeOff className="h-3 w-3" />
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 font-medium">
                          By <span className="text-foreground">{problem.publishedBy?.username || 'Unknown'}</span> • {new Date(problem.createdAt).toLocaleDateString()}
                        </p>
                        {processedTags.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {processedTags.slice(0, 3).map((tag, idx) => (
                              <span key={idx} className="px-2 py-0.5 text-[10px] font-bold bg-primary/5 text-primary/70 rounded-md border border-primary/10">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleProblemStatus(problem._id)}
                          className="rounded-xl hover:bg-white/10 h-10 w-10 p-0"
                        >
                          {problem.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/problems/${problem._id}`)}
                          className="rounded-xl font-bold bg-white/5 hover:bg-white/10"
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteProblem(problem._id)}
                          className="rounded-xl font-bold text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'students' && (
          <Card className="glass-card border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Students</CardTitle>
              <CardDescription className="font-medium">View student progress and performance</CardDescription>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground font-medium">No students found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {students.map((student) => (
                    <div key={student._id} className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="text-lg font-bold group-hover:text-primary transition-colors">
                            {student.firstName} {student.lastName}
                          </h4>
                          <span className="px-2.5 py-0.5 text-[10px] font-black uppercase bg-primary/10 text-primary border border-primary/20 rounded-lg">
                            Student
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 font-medium">
                          @{student.username} • {student.email}
                        </p>
                        <div className="flex flex-wrap gap-6 mt-3">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Solved</p>
                            <p className="font-bold text-foreground">{student.problemsSolved}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Submissions</p>
                            <p className="font-bold text-foreground">{student.totalSubmissions}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Accuracy</p>
                            <p className="font-bold text-green-500">{student.accuracy}%</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                          Last activity: {new Date(student.lastActivity).toLocaleDateString()}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => fetchStudentDetail(student._id)}
                          className="rounded-xl font-bold bg-white/5 hover:bg-white/10 px-6"
                        >
                          View Profile
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'admins' && (
          <Card className="glass-card border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Admin Users</CardTitle>
              <CardDescription className="font-medium">All administrators on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {admins.map((admin) => (
                  <div key={admin._id} className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="text-lg font-bold group-hover:text-primary transition-colors">{admin.firstName} {admin.lastName}</h4>
                        <span className="px-2.5 py-0.5 text-[10px] font-black uppercase bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-lg">
                          Admin
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 font-medium">@{admin.username} • {admin.email}</p>
                      <p className="text-xs text-muted-foreground/60 mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Joined {new Date(admin.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right bg-primary/10 p-4 rounded-xl border border-primary/20">
                      <p className="text-2xl font-black text-primary">{admin.problemsPublished || 0}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Problems Published</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'approvals' && isMainAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Pending Admin Approvals</CardTitle>
              <CardDescription>Review and approve or reject admin account requests</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingApprovals ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : pendingApprovals.length === 0 ? (
                <div className="text-center py-8">
                  <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending admin approval requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingApprovals.map((request) => (
                    <div key={request._id} className="flex items-center justify-between p-6 glass-card rounded-2xl border-l-4 border-l-yellow-500 overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 blur-2xl -mr-12 -mt-12"></div>
                      <div className="flex-1 relative z-10">
                        <h4 className="text-lg font-bold text-foreground">{request.firstName} {request.lastName}</h4>
                        <p className="text-sm text-muted-foreground font-medium">@{request.username} • {request.email}</p>
                        <p className="text-xs text-muted-foreground/60 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Requested on {new Date(request.requestedAdminRoleAt || request.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 relative z-10">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReject(request._id)}
                          className="rounded-xl px-6 font-bold text-red-500 hover:bg-red-500/10 transition-all"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(request._id)}
                          className="bg-green-600 hover:bg-green-700 rounded-xl px-6 font-bold shadow-lg shadow-green-600/20"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {selectedStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex justify-end z-50">
          <div className="bg-background w-full max-w-3xl h-full shadow-2xl flex flex-col border-l border-white/10 animate-slide-in-right">
            <div className="flex items-center justify-between p-8 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary text-2xl font-black">
                  {selectedStudent.student.firstName[0]}{selectedStudent.student.lastName[0]}
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight">
                    {selectedStudent.student.firstName} {selectedStudent.student.lastName}
                  </h2>
                  <p className="text-muted-foreground font-medium flex items-center gap-2">
                    <span className="text-primary font-bold">@{selectedStudent.student.username}</span> • {selectedStudent.student.email}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedStudent(null)}
                disabled={loadingStudentDetail}
                className="h-12 w-12 rounded-xl hover:bg-white/10"
              >
                <XCircle className="h-6 w-6" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Problems Solved', value: selectedStudent.student.problemsSolved, color: 'green' },
                  { label: 'Total Submissions', value: selectedStudent.student.totalSubmissions, color: 'blue' },
                  { label: 'Accuracy', value: `${selectedStudent.student.accuracy}%`, color: 'purple' }
                ].map((stat, idx) => (
                  <Card key={idx} className="glass-card border-none shadow-lg">
                    <CardHeader className="pb-1">
                      <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{stat.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-black text-${stat.color}-500 transition-colors`}>{stat.value}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedStudent.bestProblem && (
                <Card className="glass-card border-none shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">Best Performing Problem</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-bold text-lg">
                      {selectedStudent.bestProblem.title ? selectedStudent.bestProblem.title.replace(/<[^>]*>/g, '').trim() : 'Untitled Problem'}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                      Attempts until first accept: <span className="text-foreground font-bold">{selectedStudent.bestProblem.attemptsUntilFirstAccept}</span>
                    </p>
                  </CardContent>
                </Card>
              )}

              {selectedStudent.worstProblem && (
                <Card className="glass-card border-none shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">Most Challenging Problem</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-bold text-lg">
                      {selectedStudent.worstProblem.title ? selectedStudent.worstProblem.title.replace(/<[^>]*>/g, '').trim() : 'Untitled Problem'}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                      Total submissions: <span className="text-foreground font-bold">{selectedStudent.worstProblem.totalSubmissions}</span>
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card className="glass-card border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">Problems Solved</CardTitle>
                  <CardDescription className="font-medium">All successfully solved challenges</CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedStudent.problems.filter(p => p.acceptedSubmissions > 0).length === 0 ? (
                    <p className="text-sm text-muted-foreground font-medium italic">No problems solved yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedStudent.problems
                        .filter(p => p.acceptedSubmissions > 0)
                        .map((p) => (
                          <div key={p.problemId} className="flex items-center justify-between p-4 bg-green-500/5 rounded-xl border border-green-500/10 hover:bg-green-500/10 transition-all">
                            <div>
                              <p className="font-bold">
                                {p.title ? p.title.replace(/<[^>]*>/g, '').trim() : 'Untitled Problem'}
                              </p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-1">
                                {p.difficulty} • Solved in {p.totalSubmissions} {p.totalSubmissions !== 1 ? 'attempts' : 'attempt'}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="px-2 py-1 bg-green-500/20 text-green-500 text-[10px] font-black uppercase rounded-md border border-green-500/20">
                                ✓ ACCEPTED
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-card border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">Full Performance Log</CardTitle>
                  <CardDescription className="font-medium">Submission history for all attempt categories</CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedStudent.problems.length === 0 ? (
                    <p className="text-sm text-muted-foreground font-medium italic">No submissions yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedStudent.problems.map((p) => (
                        <div key={p.problemId} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                          p.acceptedSubmissions > 0 
                            ? 'bg-green-500/5 border-green-500/10 hover:bg-green-500/10' 
                            : 'bg-red-500/5 border-red-500/10 hover:bg-red-500/10'
                        }`}>
                          <div>
                            <p className="font-bold">
                              {p.title ? p.title.replace(/<[^>]*>/g, '').trim() : 'Untitled Problem'}
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-1">
                              {p.difficulty}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex gap-2 mb-1">
                              <span className="px-1.5 py-0.5 bg-white/5 text-muted-foreground text-[10px] font-black rounded border border-white/5 uppercase">
                                Attempts: {p.totalSubmissions}
                              </span>
                              <span className={`px-1.5 py-0.5 text-[10px] font-black rounded border uppercase ${
                                p.acceptedSubmissions > 0 ? 'bg-green-500/20 text-green-500 border-green-500/20' : 'bg-red-500/20 text-red-500 border-red-500/20'
                              }`}>
                                {p.acceptedSubmissions > 0 ? 'Solved' : 'Unsolved'}
                              </span>
                            </div>
                            {p.lastStatus && (
                              <p className={`text-[10px] font-black uppercase tracking-widest ${p.lastStatus === 'Accepted' ? 'text-green-500' : 'text-red-500'}`}>
                                Last Status: {p.lastStatus}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
