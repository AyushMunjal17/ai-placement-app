import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { 
  Search, 
  Filter, 
  Code, 
  Clock, 
  Users, 
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'

const Problems = () => {
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const difficulties = ['Easy', 'Medium', 'Hard']
  const difficultyColors = {
    Easy: 'text-green-600 bg-green-50 border-green-200',
    Medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    Hard: 'text-red-600 bg-red-50 border-red-200'
  }

  useEffect(() => {
    fetchProblems()
  }, [currentPage, selectedDifficulty, searchTerm])

  const fetchProblems = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage,
        limit: 12
      })

      if (selectedDifficulty) params.append('difficulty', selectedDifficulty)
      if (searchTerm) params.append('search', searchTerm)

      const response = await axios.get(`/problems?${params}`)
      setProblems(response.data.problems)
      setTotalPages(response.data.pagination.totalPages)
      setError('')
    } catch (err) {
      setError('Failed to fetch problems. Please try again.')
      console.error('Fetch problems error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchProblems()
  }

  const handleDifficultyFilter = (difficulty) => {
    setSelectedDifficulty(difficulty === selectedDifficulty ? '' : difficulty)
    setCurrentPage(1)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading && problems.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading problems...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Coding Problems</h1>
          <p className="text-muted-foreground">
            Practice coding problems and improve your skills
          </p>
        </div>
        <Link to="/create-problem">
          <Button className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Create Problem
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search problems by title or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </form>

            {/* Difficulty Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-2">
                {difficulties.map((difficulty) => (
                  <Button
                    key={difficulty}
                    variant={selectedDifficulty === difficulty ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDifficultyFilter(difficulty)}
                    className={selectedDifficulty === difficulty ? '' : difficultyColors[difficulty]}
                  >
                    {difficulty}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-4 text-red-600 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Problems Grid */}
      {problems.length === 0 && !loading ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Code className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No problems found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || selectedDifficulty 
                ? 'Try adjusting your search or filters'
                : 'Be the first to create a problem!'
              }
            </p>
            <Link to="/create-problem">
              <Button>Create First Problem</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {problems.map((problem) => (
            <Card key={problem._id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">
                      {problem.title}
                    </CardTitle>
                    <CardDescription className="mt-2 line-clamp-3">
                      {problem.description}
                    </CardDescription>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium border ${difficultyColors[problem.difficulty]}`}>
                    {problem.difficulty}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{problem.totalSubmissions || 0} submissions</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    <span>{problem.acceptanceRate || 0}% accepted</span>
                  </div>
                </div>

                {/* Tags */}
                {problem.tags && problem.tags.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {problem.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded border border-blue-200"
                        >
                          {tag}
                        </span>
                      ))}
                      {problem.tags.length > 3 && (
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
                          +{problem.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Company Tags */}
                {problem.companyTags && problem.companyTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {problem.companyTags.slice(0, 3).map((company, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded border border-green-200 font-medium"
                      >
                        {company}
                      </span>
                    ))}
                    {problem.companyTags.length > 3 && (
                      <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
                        +{problem.companyTags.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Publisher and Date */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>By {problem.publisherName}</span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(problem.createdAt)}</span>
                  </div>
                </div>

                {/* Action Button */}
                <Link to={`/problems/${problem._id}`}>
                  <Button className="w-full">
                    Solve Problem
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || loading}
          >
            Previous
          </Button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  disabled={loading}
                >
                  {page}
                </Button>
              )
            })}
          </div>

          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || loading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

export default Problems
