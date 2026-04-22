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
    // Helper function to strip HTML tags
    const stripHtml = (str) => {
      if (!str) return ''
      return String(str).replace(/<[^>]*>/g, '').trim()
    }
    
    // Extract unique companies and tags from problems
    const companies = new Set()
    const tags = new Set()
    problems.forEach(problem => {
      // Process company tags - handle both array and string formats
      if (Array.isArray(problem.companyTags)) {
        problem.companyTags.forEach(c => {
          const cleaned = stripHtml(c)
          if (cleaned) companies.add(cleaned)
        })
      } else if (problem.companyTags) {
        const companiesStr = stripHtml(problem.companyTags)
        companiesStr.split(',').forEach(c => {
          const cleaned = c.trim()
          if (cleaned) companies.add(cleaned)
        })
      }
      
      // Process tags - handle both array and string formats
      if (Array.isArray(problem.tags)) {
        problem.tags.forEach(t => {
          const cleaned = stripHtml(t)
          if (cleaned) tags.add(cleaned)
        })
      } else if (problem.tags) {
        const tagsStr = stripHtml(problem.tags)
        tagsStr.split(',').forEach(t => {
          const cleaned = t.trim()
          if (cleaned) tags.add(cleaned)
        })
      }
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
    <div className="space-y-10 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 animate-fade-in-up">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight">
            Coding <span className="text-gradient">Problems</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Challenge yourself with curated problems and improve your algorithmic thinking.
          </p>
        </div>
        <Link to="/create-problem">
          <Button variant="premium" className="flex items-center gap-2 px-6 h-12 text-base">
            <Code className="h-5 w-5" />
            Create Your Own
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <Card className="glass-card animate-fade-in-up shadow-xl" style={{ animationDelay: '0.1s' }}>
        <CardContent className="pt-6 space-y-6">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search by title, tags, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 bg-primary/5 dark:bg-white/5 border-primary/10 dark:border-white/10 text-lg rounded-2xl focus:ring-primary focus:border-primary transition-all"
              />
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-6">
            {/* Difficulty Filter */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">Difficulty:</span>
              <div className="flex gap-1.5 p-1 bg-primary/5 dark:bg-white/5 rounded-xl border border-primary/5 dark:border-white/5">
                {difficulties.map((difficulty) => (
                  <Button
                    key={difficulty}
                    variant={selectedDifficulty === difficulty ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleDifficultyFilter(difficulty)}
                    className={`h-9 px-4 font-bold rounded-lg transition-all ${
                      selectedDifficulty === difficulty 
                        ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' 
                        : 'text-muted-foreground hover:bg-primary/10 dark:hover:bg-white/5'
                    }`}
                  >
                    {difficulty}
                  </Button>
                ))}
              </div>
            </div>

            <div className="h-8 w-[1px] bg-white/10 hidden lg:block"></div>

            {/* Company Filter */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">Company:</span>
              <div className="min-w-[180px] bg-primary/5 dark:bg-white/5 rounded-xl border border-primary/10 dark:border-white/10 px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary transition-all">
                <select
                  value={selectedCompany}
                  onChange={(e) => {
                    setSelectedCompany(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer"
                >
                  <option value="" className="bg-background">All Companies</option>
                  {allCompanies.map((company) => (
                    <option key={company} value={company} className="bg-background">
                      {company}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tag Filter */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">Topic:</span>
              <div className="min-w-[180px] bg-primary/5 dark:bg-white/5 rounded-xl border border-primary/10 dark:border-white/10 px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary transition-all">
                <select
                  value={selectedTag}
                  onChange={(e) => {
                    setSelectedTag(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer"
                >
                  <option value="" className="bg-background">All Topics</option>
                  {allTags.map((tag) => (
                    <option key={tag} value={tag} className="bg-background">
                      {tag}
                    </option>
                  ))}
                </select>
              </div>
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
                  {selectedCompany.replace(/<[^>]*>/g, '')}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setSelectedCompany('')}
                  />
                </span>
              )}
              {selectedTag && (
                <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded flex items-center gap-1">
                  {selectedTag.replace(/<[^>]*>/g, '')}
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
        <Card className="glass-card p-12 text-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <Code className="h-20 w-20 mx-auto text-muted-foreground/20 mb-6" />
          <h3 className="text-2xl font-bold mb-2">No problems found</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-8 font-medium">
            {searchTerm || selectedDifficulty || selectedCompany || selectedTag
              ? "We couldn't find any challenges matching your filters. Try broadening your search!"
              : "The challenge library is empty. Be the pioneer and create the first problem!"
            }
          </p>
          <Link to="/create-problem">
            <Button variant="premium" size="lg">Create First Problem</Button>
          </Link>
        </Card>
      ) : (
        <Card className="glass-card animate-fade-in-up overflow-hidden border-none" style={{ animationDelay: '0.2s' }}>
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-5 bg-white/5 border-b border-white/5 font-black text-xs uppercase tracking-widest text-muted-foreground/60">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-4">Challenge Title</div>
              <div className="col-span-2 text-center">Acceptance</div>
              <div className="col-span-2">Companies</div>
              <div className="col-span-2">Topics</div>
              <div className="col-span-1 text-center">Level</div>
            </div>

            <div className="divide-y divide-white/5">
              {problems.map((problem, index) => (
                <div 
                  key={problem._id} 
                  className="grid grid-cols-12 gap-4 p-5 hover:bg-white/5 transition-all duration-300 items-center cursor-pointer group"
                  onClick={() => navigate(`/problems/${problem.slug}`)}
                >
                  {/* Index */}
                  <div className="col-span-1 text-center text-muted-foreground font-black text-xs">
                    {(currentPage - 1) * 12 + index + 1}
                  </div>

                  {/* Title */}
                  <div className="col-span-4">
                    <div className="font-bold text-lg group-hover:text-primary transition-colors">
                      {problem.title ? problem.title.replace(/<[^>]*>/g, '').trim() : 'Untitled Problem'}
                    </div>
                  </div>

                  {/* Acceptance Rate */}
                  <div className="col-span-2">
                    <div className="flex items-center justify-center gap-3 px-4">
                      <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden max-w-[100px]">
                        <div 
                          className="bg-green-500 h-full rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)] transition-all duration-1000"
                          style={{ width: `${Math.min(problem.acceptanceRate || 0, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-black text-muted-foreground min-w-[40px]">
                        {problem.acceptanceRate || 0}%
                      </span>
                    </div>
                  </div>

                  {/* Companies */}
                  <div className="col-span-2">
                    {(() => {
                      const stripHtml = (str) => {
                        if (!str) return ''
                        return String(str).replace(/<[^>]*>/g, '').trim()
                      }
                      
                      let processedCompanyTags = []
                      if (Array.isArray(problem.companyTags)) {
                        processedCompanyTags = problem.companyTags.map(company => stripHtml(company)).filter(company => company)
                      } else if (problem.companyTags) {
                        const companiesStr = stripHtml(problem.companyTags)
                        processedCompanyTags = companiesStr.split(',').map(c => c.trim()).filter(c => c)
                      }
                      
                      if (processedCompanyTags.length === 0) {
                        return <span className="text-xs text-muted-foreground/30 font-bold">-</span>
                      }
                      
                      return (
                        <div className="flex flex-wrap gap-1.5">
                          {processedCompanyTags.slice(0, 1).map((company, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-green-500/10 text-green-400 text-[10px] uppercase font-black rounded-md border border-green-500/20"
                            >
                              {company}
                            </span>
                          ))}
                          {processedCompanyTags.length > 1 && (
                            <span className="px-2 py-1 bg-white/5 text-muted-foreground text-[10px] font-black rounded-md border border-white/5">
                              +{processedCompanyTags.length - 1}
                            </span>
                          )}
                        </div>
                      )
                    })()}
                  </div>

                  {/* Topics */}
                  <div className="col-span-2">
                    {(() => {
                      const stripHtml = (str) => {
                        if (!str) return ''
                        return String(str).replace(/<[^>]*>/g, '').trim()
                      }
                      
                      let processedTags = []
                      if (Array.isArray(problem.tags)) {
                        processedTags = problem.tags.map(tag => stripHtml(tag)).filter(tag => tag)
                      } else if (problem.tags) {
                        const tagsStr = stripHtml(problem.tags)
                        processedTags = tagsStr.split(',').map(t => t.trim()).filter(t => t)
                      }
                      
                      if (processedTags.length === 0) {
                        return <span className="text-xs text-muted-foreground/30 font-bold">-</span>
                      }
                      
                      return (
                        <div className="flex flex-wrap gap-1.5">
                          {processedTags.slice(0, 1).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-primary/10 text-primary text-[10px] uppercase font-black rounded-md border border-primary/20"
                            >
                              {tag}
                            </span>
                          ))}
                          {processedTags.length > 1 && (
                            <span className="px-2 py-1 bg-white/5 text-muted-foreground text-[10px] font-black rounded-md border border-white/5">
                              +{processedTags.length - 1}
                            </span>
                          )}
                        </div>
                      )
                    })()}
                  </div>

                  {/* Difficulty */}
                  <div className="col-span-1 flex justify-center">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border tracking-widest ${
                      problem.difficulty === 'Easy' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      problem.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
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
        <div className="flex justify-center items-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <Button
            variant="ghost"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || loading}
            className="font-bold text-muted-foreground hover:text-primary hover:bg-white/5"
          >
            Previous
          </Button>
          
          <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  disabled={loading}
                  className={`h-9 w-9 p-0 font-bold rounded-lg transition-all ${
                    currentPage === page 
                      ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-110' 
                      : 'text-muted-foreground hover:bg-white/5'
                  }`}
                >
                  {page}
                </Button>
              )
            })}
          </div>

          <Button
            variant="ghost"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || loading}
            className="font-bold text-muted-foreground hover:text-primary hover:bg-white/5"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

export default Problems
