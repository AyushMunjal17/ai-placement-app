import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { 
  Search, 
  Filter, 
  Code, 
  Clock, 
  Users, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Building2,
  Tag,
  TrendingUp,
  X
} from 'lucide-react'

const Problems = () => {
  const navigate = useNavigate()
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState('')
  const [selectedCompany, setSelectedCompany] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [allCompanies, setAllCompanies] = useState([])
  const [allTags, setAllTags] = useState([])

  const difficulties = ['Easy', 'Medium', 'Hard']
  const difficultyColors = {
    Easy: 'text-green-600 bg-green-50 border-green-200',
    Medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    Hard: 'text-red-600 bg-red-50 border-red-200'
  }

  useEffect(() => {
    fetchProblems()
  }, [currentPage, selectedDifficulty, searchTerm, selectedCompany, selectedTag])

  useEffect(() => {
    // Extract unique companies and tags from problems
    const companies = new Set()
    const tags = new Set()
    problems.forEach(problem => {
      problem.companyTags?.forEach(c => companies.add(c))
      problem.tags?.forEach(t => tags.add(t))
    })
    setAllCompanies(Array.from(companies).sort())
    setAllTags(Array.from(tags).sort())
  }, [problems])

  const fetchProblems = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage,
        limit: 12
      })

      if (selectedDifficulty) params.append('difficulty', selectedDifficulty)
      if (searchTerm) params.append('search', searchTerm)
      if (selectedCompany) params.append('companyTags', selectedCompany)
      if (selectedTag) params.append('tags', selectedTag)

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
        <CardContent className="pt-6 space-y-4">
          {/* Search Bar */}
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

          {/* Filters Row */}
          <div className="flex flex-wrap gap-3">
            {/* Difficulty Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Difficulty:</span>
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

            {/* Company Filter */}
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Company:</span>
              <Select
                value={selectedCompany}
                onChange={(e) => {
                  setSelectedCompany(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-[200px]"
              >
                <option value="">All Companies</option>
                {allCompanies.map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </Select>
            </div>

            {/* Tag Filter */}
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Topic:</span>
              <Select
                value={selectedTag}
                onChange={(e) => {
                  setSelectedTag(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-[200px]"
              >
                <option value="">All Topics</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Active Filters */}
          {(selectedDifficulty || selectedCompany || selectedTag) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {selectedDifficulty && (
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded flex items-center gap-1">
                  {selectedDifficulty}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setSelectedDifficulty('')}
                  />
                </span>
              )}
              {selectedCompany && (
                <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded flex items-center gap-1">
                  {selectedCompany}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setSelectedCompany('')}
                  />
                </span>
              )}
              {selectedTag && (
                <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded flex items-center gap-1">
                  {selectedTag}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setSelectedTag('')}
                  />
                </span>
              )}
              <button
                onClick={() => {
                  setSelectedDifficulty('')
                  setSelectedCompany('')
                  setSelectedTag('')
                }}
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                Clear all
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-4 text-red-600 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Problems List */}
      {problems.length === 0 && !loading ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Code className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No problems found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || selectedDifficulty || selectedCompany || selectedTag
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
        <Card>
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-3 p-4 bg-muted/50 border-b font-medium text-sm">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-4">Problem Title</div>
              <div className="col-span-2">Acceptance</div>
              <div className="col-span-2">Companies</div>
              <div className="col-span-2">Topics</div>
              <div className="col-span-1 text-center">Difficulty</div>
            </div>

            {/* Table Body */}
            <div className="divide-y">
              {problems.map((problem, index) => (
                <div 
                  key={problem._id} 
                  className="grid grid-cols-12 gap-3 p-4 hover:bg-muted/30 transition-colors items-center cursor-pointer"
                  onClick={() => navigate(`/problems/${problem._id}`)}
                >
                  {/* Index */}
                  <div className="col-span-1 text-center text-muted-foreground font-medium">
                    {(currentPage - 1) * 12 + index + 1}
                  </div>

                  {/* Title */}
                  <div className="col-span-4">
                    <div className="font-medium hover:text-blue-600 transition-colors">
                      {problem.title}
                    </div>
                  </div>

                  {/* Acceptance Rate */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(problem.acceptanceRate || 0, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground min-w-[45px]">
                        {problem.acceptanceRate || 0}%
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {problem.totalSubmissions || 0} submissions
                    </div>
                  </div>

                  {/* Companies */}
                  <div className="col-span-2">
                    {problem.companyTags && problem.companyTags.length > 0 ? (
                      <div className="flex flex-wrap gap-1 group">
                        {problem.companyTags.slice(0, 2).map((company, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded border border-green-200 font-medium"
                          >
                            {company}
                          </span>
                        ))}
                        {problem.companyTags.length > 2 && (
                          <>
                            {problem.companyTags.slice(2).map((company, idx) => (
                              <span
                                key={idx + 2}
                                className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded border border-green-200 font-medium hidden group-hover:inline-block"
                              >
                                {company}
                              </span>
                            ))}
                            <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded cursor-pointer group-hover:hidden">
                              +{problem.companyTags.length - 2}
                            </span>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </div>

                  {/* Topics */}
                  <div className="col-span-2">
                    {problem.tags && problem.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1 group">
                        {problem.tags.slice(0, 2).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {problem.tags.length > 2 && (
                          <>
                            {problem.tags.slice(2).map((tag, idx) => (
                              <span
                                key={idx + 2}
                                className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded hidden group-hover:inline-block"
                              >
                                {tag}
                              </span>
                            ))}
                            <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded cursor-pointer group-hover:hidden">
                              +{problem.tags.length - 2}
                            </span>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </div>

                  {/* Difficulty */}
                  <div className="col-span-1 flex justify-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${difficultyColors[problem.difficulty]}`}>
                      {problem.difficulty}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
