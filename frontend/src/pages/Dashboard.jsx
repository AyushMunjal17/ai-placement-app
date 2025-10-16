import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { LayoutDashboard, AlertCircle, User, Code, Trophy, Clock } from 'lucide-react'

const Dashboard = () => {
  const { user } = useAuth()

  const stats = [
    {
      title: "Problems Solved",
      value: user?.problemsSolved || 0,
      icon: Trophy,
      color: "text-green-600"
    },
    {
      title: "Problems Published",
      value: user?.problemsPublished || 0,
      icon: Code,
      color: "text-blue-600"
    },
    {
      title: "Total Submissions",
      value: user?.totalSubmissions || 0,
      icon: Clock,
      color: "text-purple-600"
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
      <div className="grid md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
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

      {/* Coming Soon Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" />
            Enhanced Dashboard Features
          </CardTitle>
          <CardDescription>
            More features coming soon to enhance your experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-4 text-blue-600 bg-blue-50 border border-blue-200 rounded-md">
            <AlertCircle className="h-4 w-4" />
            Advanced analytics, submission history, progress tracking, and more features coming soon!
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard
