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
  BarChart3
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

  useEffect(() => {
    // Redirect if not admin
    if (user && user.role !== 'admin') {
      navigate('/problems')
      return
    }
    
    fetchDashboardData()
  }, [user, navigate])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const { problems, admins, statistics } = dashboardData

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage problems, view analytics, and monitor platform activity
          </p>
        </div>
        <Button onClick={() => navigate('/create-problem')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Problem
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Problems
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalProblems || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <FileText className="h-3 w-3 inline mr-1" />
              All problems
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Problems
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statistics.activeProblems || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <CheckCircle className="h-3 w-3 inline mr-1" />
              Published & Active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalStudents || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <Users className="h-3 w-3 inline mr-1" />
              Registered users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalAdmins || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <Shield className="h-3 w-3 inline mr-1" />
              Admin users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalSubmissions || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              All time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'overview'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="h-4 w-4 inline mr-2" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('problems')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'problems'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileText className="h-4 w-4 inline mr-2" />
          Problems ({problems.length})
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'students'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="h-4 w-4 inline mr-2" />
          Students ({students.length})
        </button>
        <button
          onClick={() => setActiveTab('admins')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'admins'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="h-4 w-4 inline mr-2" />
          Admins ({admins.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Problems */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Problems</CardTitle>
                <CardDescription>Latest problems created by admins</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {problems.slice(0, 5).map((problem) => {
                    const stripHtml = (str) => str ? String(str).replace(/<[^>]*>/g, '').trim() : ''
                    const cleanTitle = stripHtml(problem.title)
                    return (
                    <div key={problem._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{cleanTitle || 'Untitled Problem'}</h4>
                        <p className="text-sm text-muted-foreground">
                          By {problem.publishedBy?.username || 'Unknown'}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        problem.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                        problem.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
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
            <Card>
              <CardHeader>
                <CardTitle>Admin Users</CardTitle>
                <CardDescription>Platform administrators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {admins.slice(0, 5).map((admin) => (
                    <div key={admin._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{admin.firstName} {admin.lastName}</h4>
                        <p className="text-sm text-muted-foreground">@{admin.username}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{admin.problemsPublished || 0}</p>
                        <p className="text-xs text-muted-foreground">Problems</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'problems' && (
          <Card>
            <CardHeader>
              <CardTitle>All Problems</CardTitle>
              <CardDescription>Manage all problems on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {problems.map((problem) => {
                  // Helper to strip HTML
                  const stripHtml = (str) => {
                    if (!str) return ''
                    return String(str).replace(/<[^>]*>/g, '').trim()
                  }
                  
                  const cleanTitle = stripHtml(problem.title)
                  
                  // Process tags - handle both array and string formats
                  let processedTags = []
                  if (Array.isArray(problem.tags)) {
                    processedTags = problem.tags
                      .map(tag => stripHtml(tag))
                      .filter(tag => tag)
                  } else if (problem.tags) {
                    const tagsStr = stripHtml(problem.tags)
                    processedTags = tagsStr.split(',').map(t => t.trim()).filter(t => t)
                  }
                  
                  return (
                  <div key={problem._id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium">{cleanTitle || 'Untitled Problem'}</h4>
                        <span className={`px-2 py-1 text-xs rounded ${
                          problem.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                          problem.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {problem.difficulty}
                        </span>
                        {problem.isActive ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded flex items-center gap-1">
                            <EyeOff className="h-3 w-3" />
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        By {problem.publishedBy?.username || 'Unknown'} • {new Date(problem.createdAt).toLocaleDateString()}
                      </p>
                      {processedTags.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {processedTags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleProblemStatus(problem._id)}
                      >
                        {problem.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/problems/${problem._id}`)}
                      >
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteProblem(problem._id)}
                        className="text-red-600 hover:text-red-700"
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
          <Card>
            <CardHeader>
              <CardTitle>Students</CardTitle>
              <CardDescription>View student progress and performance</CardDescription>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <p className="text-sm text-muted-foreground">No students found.</p>
              ) : (
                <div className="space-y-3">
                  {students.map((student) => (
                    <div key={student._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">
                          {student.firstName} {student.lastName}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          @{student.username} • {student.email}
                        </p>
                        <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                          <span>Problems Solved: <span className="font-semibold text-foreground">{student.problemsSolved}</span></span>
                          <span>Submissions: <span className="font-semibold text-foreground">{student.totalSubmissions}</span></span>
                          <span>Accuracy: <span className="font-semibold text-foreground">{student.accuracy}%</span></span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Last activity: {new Date(student.lastActivity).toLocaleString()}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchStudentDetail(student._id)}
                        >
                          View Details
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
          <Card>
            <CardHeader>
              <CardTitle>Admin Users</CardTitle>
              <CardDescription>All administrators on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {admins.map((admin) => (
                  <div key={admin._id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{admin.firstName} {admin.lastName}</h4>
                      <p className="text-sm text-muted-foreground">@{admin.username} • {admin.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Joined {new Date(admin.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{admin.problemsPublished || 0}</p>
                      <p className="text-xs text-muted-foreground">Problems Published</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedStudent && (
        <div className="fixed inset-0 bg-black/40 flex justify-end z-50">
          <div className="bg-white w-full max-w-3xl h-full shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-xl font-bold">
                  {selectedStudent.student.firstName} {selectedStudent.student.lastName}
                </h2>
                <p className="text-sm text-muted-foreground">
                  @{selectedStudent.student.username} • {selectedStudent.student.email}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStudent(null)}
                disabled={loadingStudentDetail}
              >
                Close
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Problems Solved</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedStudent.student.problemsSolved}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Total Submissions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedStudent.student.totalSubmissions}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Accuracy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedStudent.student.accuracy}%</div>
                  </CardContent>
                </Card>
              </div>

              {selectedStudent.bestProblem && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Best Performing Problem</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">
                      {selectedStudent.bestProblem.title ? selectedStudent.bestProblem.title.replace(/<[^>]*>/g, '').trim() : 'Untitled Problem'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Attempts until first accept: {selectedStudent.bestProblem.attemptsUntilFirstAccept}
                    </p>
                  </CardContent>
                </Card>
              )}

              {selectedStudent.worstProblem && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Most Challenging Problem</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">
                      {selectedStudent.worstProblem.title ? selectedStudent.worstProblem.title.replace(/<[^>]*>/g, '').trim() : 'Untitled Problem'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total submissions: {selectedStudent.worstProblem.totalSubmissions}
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Problems Solved</CardTitle>
                  <CardDescription>List of all problems this student has successfully solved</CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedStudent.problems.filter(p => p.acceptedSubmissions > 0).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No problems solved yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedStudent.problems
                        .filter(p => p.acceptedSubmissions > 0)
                        .map((p) => (
                          <div key={p.problemId} className="flex items-center justify-between p-3 border rounded-lg bg-green-50/50">
                            <div>
                              <p className="font-medium">
                                {p.title ? p.title.replace(/<[^>]*>/g, '').trim() : 'Untitled Problem'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Difficulty: {p.difficulty} • First solved in {p.totalSubmissions} attempt{p.totalSubmissions !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <div className="text-xs text-muted-foreground text-right">
                              <p>
                                <span className="font-semibold text-green-600">✓ Solved</span>
                              </p>
                              <p>
                                Total attempts: <span className="font-semibold text-foreground">{p.totalSubmissions}</span>
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Problem-wise Performance</CardTitle>
                  <CardDescription>Complete submission history for all problems</CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedStudent.problems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No submissions yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedStudent.problems.map((p) => (
                        <div key={p.problemId} className={`flex items-center justify-between p-3 border rounded-lg ${p.acceptedSubmissions > 0 ? 'bg-green-50/30' : 'bg-red-50/30'}`}>
                          <div>
                            <p className="font-medium">
                              {p.title ? p.title.replace(/<[^>]*>/g, '').trim() : 'Untitled Problem'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Difficulty: {p.difficulty}
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground text-right">
                            <p>
                              Submissions: <span className="font-semibold text-foreground">{p.totalSubmissions}</span>
                            </p>
                            <p>
                              Accepted: <span className={`font-semibold ${p.acceptedSubmissions > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {p.acceptedSubmissions}
                              </span>
                            </p>
                            {p.lastStatus && (
                              <p className="mt-1">
                                Last status: <span className={`font-semibold ${p.lastStatus === 'Accepted' ? 'text-green-600' : 'text-red-600'}`}>
                                  {p.lastStatus}
                                </span>
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
