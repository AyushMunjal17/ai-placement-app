import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Editor from '@monaco-editor/react'
import { useTheme } from '../contexts/ThemeContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Select } from '../components/ui/select'
import { 
  Code, 
  Clock, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Play, 
  Send,
  ArrowLeft,
  Eye,
  EyeOff,
  Trophy,
  HardDrive,
  Terminal,
  Sparkles,
  X,
  Tag,
  Building2
} from 'lucide-react'

// Markers used inside language-specific templates to define the student-editable region
// Example (C++):
// // STUDENT_CODE_START
// vector<int> twoSum(...) { ... }
// // STUDENT_CODE_END
// main() { ... }
const STUDENT_CODE_START = 'STUDENT_CODE_START'
const STUDENT_CODE_END = 'STUDENT_CODE_END'

// Extract just the student-editable code from a full template.
// If no markers are present, fall back to returning the whole template for backward compatibility.
const extractStudentCodeFromTemplate = (template) => {
  if (!template) return { studentCode: '', hasMarkers: false }

  const lines = template.split('\n')
  const startIdx = lines.findIndex(line => line.includes(STUDENT_CODE_START))
  const endIdx = lines.findIndex(line => line.includes(STUDENT_CODE_END))

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return { studentCode: template, hasMarkers: false }
  }

  const studentLines = lines.slice(startIdx + 1, endIdx)
  return {
    studentCode: studentLines.join('\n'),
    hasMarkers: true
  }
}

// Rebuild the full program by injecting the current student code between the marker lines.
// If markers are missing, fall back to sending only the student code (current behavior).
const buildFullCodeFromStudentCode = (template, studentCode) => {
  if (!template) return studentCode

  const lines = template.split('\n')
  const startIdx = lines.findIndex(line => line.includes(STUDENT_CODE_START))
  const endIdx = lines.findIndex(line => line.includes(STUDENT_CODE_END))

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return studentCode
  }

  const before = lines.slice(0, startIdx + 1) // include START marker line
  const after = lines.slice(endIdx) // include END marker line
  const studentLines = (studentCode || '').split('\n')

  const fullLines = [...before, ...studentLines, ...after]
  return fullLines.join('\n')
}

const stripHtmlTags = (str) => {
  if (!str) return ''
  return String(str).replace(/<[^>]*>/g, '').trim()
}

const formatRichTextToPlain = (html) => {
  if (!html) return ''
  return String(html)
    .replace(/<\/(p|div)>/gi, '\n')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

const ProblemDetail = () => {
  const { id } = useParams() // This is now a slug (or legacy ObjectId)
  const navigate = useNavigate()
  
  // Problem state
  const [problem, setProblem] = useState(null)
  const [problemId, setProblemId] = useState(null) // MongoDB _id for submissions
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Code editor state
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('python')
  const { isDark } = useTheme()
  const [editorTheme, setEditorTheme] = useState(isDark ? 'vs-dark' : 'light')
  
  // Sync editor theme with app theme
  useEffect(() => {
    setEditorTheme(isDark ? 'vs-dark' : 'light')
  }, [isDark])
  
  // Execution state
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [output, setOutput] = useState('')
  const [testResults, setTestResults] = useState([])
  const [lastRunResults, setLastRunResults] = useState([])
  const [lastRunOutput, setLastRunOutput] = useState('')
  const [showOutput, setShowOutput] = useState(false)
  const [lastAction, setLastAction] = useState(null) // 'run' or 'submit'
  const [showSubmitPanel, setShowSubmitPanel] = useState(false)
  
  // UI state
  const [activeTab, setActiveTab] = useState('description')
  const [submissions, setSubmissions] = useState([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  
  // AI Debugging state
  const [aiDebugging, setAiDebugging] = useState(false)
  const [aiResponse, setAiResponse] = useState('')
  const [showAiModal, setShowAiModal] = useState(false)
  
  // Tags and Company modal state
  const [showTagsModal, setShowTagsModal] = useState(false)
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  
  // Suggested problems state
  const [suggestedProblems, setSuggestedProblems] = useState([])
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  // Language configurations
  const allLanguages = {
    python: { id: 71, name: 'Python 3', template: '# Write your solution here\n# Define the required function based on the problem statement\n' },
    javascript: { id: 63, name: 'JavaScript', template: '// Write your solution here\n// Define the required function based on the problem statement\n' },
    java: { id: 62, name: 'Java', template: '// Write your solution here\n// Define the required method based on the problem statement\n' },
    cpp: { id: 54, name: 'C++', template: '// Write your solution here\n// Define the required function based on the problem statement\n' },
    c: { id: 50, name: 'C', template: '// Write your solution here\n// Define the required function based on the problem statement\n' }
  }

  // Filter languages based on problem's supported languages
  const languages = problem?.supportedLanguages && problem.supportedLanguages.length > 0
    ? Object.fromEntries(
        Object.entries(allLanguages).filter(([key]) => 
          problem.supportedLanguages.includes(key)
        )
      )
    : allLanguages

  const difficultyColors = {
    Easy: 'text-green-600 bg-green-50 border-green-200',
    Medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    Hard: 'text-red-600 bg-red-50 border-red-200'
  }


  useEffect(() => {
    fetchProblem()
    fetchSubmissions()
  }, [id])

  useEffect(() => {
    if (!problem) return

    // Set default language to first supported language if current language is not supported
    if (problem.supportedLanguages && problem.supportedLanguages.length > 0) {
      if (!problem.supportedLanguages.includes(language)) {
        setLanguage(problem.supportedLanguages[0])
        return
      }
    }

    // Set default code template when language changes
    const supportedLangs = problem.supportedLanguages || Object.keys(allLanguages)
    const availableLanguages = Object.fromEntries(
      Object.entries(allLanguages).filter(([key]) => supportedLangs.includes(key))
    )

    if (availableLanguages[language]) {
      let baseTemplate
      if (problem.codeTemplates && problem.codeTemplates[language] && problem.codeTemplates[language].trim().length > 0) {
        baseTemplate = problem.codeTemplates[language]
      } else {
        baseTemplate = availableLanguages[language].template
      }

      const { studentCode } = extractStudentCodeFromTemplate(baseTemplate)
      setCode(studentCode)
    }
  }, [language, problem])

  const fetchProblem = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/problems/${id}`)
      const fetchedProblem = response.data.problem
      setProblem(fetchedProblem)
      setProblemId(fetchedProblem._id) // Store MongoDB _id for submissions

      // Set default language to first supported language
      const supportedLangs = fetchedProblem.supportedLanguages || ['python']
      if (!supportedLangs.includes(language)) {
        setLanguage(supportedLangs[0])
      }

      const templates = fetchedProblem.codeTemplates || {}
      const currentLang = supportedLangs.includes(language) ? language : supportedLangs[0]
      const baseTemplate = templates[currentLang] && templates[currentLang].trim().length > 0
        ? templates[currentLang]
        : allLanguages[currentLang]?.template || allLanguages.python.template
      const { studentCode } = extractStudentCodeFromTemplate(baseTemplate)
      setCode(studentCode)
      setError('')
    } catch (err) {
      setError('Failed to load problem. Please try again.')
      console.error('Fetch problem error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSubmissions = async () => {
    try {
      setLoadingSubmissions(true)
      // Use problemId (_id) if available, otherwise fall back to id param
      const pid = problemId || id
      const response = await axios.get(`/submissions/problem/${pid}`)
      setSubmissions(response.data.submissions || [])
    } catch (err) {
      console.error('Fetch submissions error:', err)
    } finally {
      setLoadingSubmissions(false)
    }
  }

  const fetchSuggestedProblems = async () => {
    if (!problem) return
    
    try {
      setLoadingSuggestions(true)
      
      // Get current problem tags and difficulty
      const stripHtml = (str) => {
        if (!str) return ''
        return String(str).replace(/<[^>]*>/g, '').trim()
      }
      
      let currentTags = []
      if (Array.isArray(problem.tags)) {
        currentTags = problem.tags.map(tag => stripHtml(tag)).filter(tag => tag)
      } else if (problem.tags) {
        const tagsStr = stripHtml(problem.tags)
        currentTags = tagsStr.split(',').map(t => t.trim()).filter(t => t)
      }
      
      // Fetch all problems
      const response = await axios.get('/problems')
      const allProblems = response.data.problems || []
      
      // Filter out current problem and find similar ones
      const similarProblems = allProblems
        .filter(p => p._id !== id) // Exclude current problem
        .map(p => {
          let score = 0
          let pTags = []
          
          if (Array.isArray(p.tags)) {
            pTags = p.tags.map(tag => stripHtml(tag)).filter(tag => tag)
          } else if (p.tags) {
            const tagsStr = stripHtml(p.tags)
            pTags = tagsStr.split(',').map(t => t.trim()).filter(t => t)
          }
          
          // Score based on matching tags
          const commonTags = currentTags.filter(tag => pTags.includes(tag))
          score += commonTags.length * 10
          
          // Bonus for same difficulty
          if (p.difficulty === problem.difficulty) {
            score += 5
          }
          
          return { problem: p, score, commonTags }
        })
        .filter(item => item.score > 0) // Only include problems with some similarity
        .sort((a, b) => b.score - a.score) // Sort by score
        .slice(0, 5) // Top 5 suggestions
        .map(item => item.problem)
      
      setSuggestedProblems(similarProblems)
      
      // Show modal if there are suggestions
      if (similarProblems.length > 0) {
        setShowSuggestionsModal(true)
      }
    } catch (err) {
      console.error('Fetch suggested problems error:', err)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const runCode = async () => {
    if (!code.trim()) {
      setOutput('Please write some code first!')
      setShowOutput(true)
      setLastAction('run')
      return
    }

    setIsRunning(true)
    setOutput('')
    setTestResults([])
    setShowOutput(true)
    setLastAction('run') // Set this first to ensure UI updates
    setLastRunResults([])
    setLastRunOutput('')

    // Build full code using problem-specific template and hidden harness (if configured)
    const baseTemplate = (problem?.codeTemplates && problem.codeTemplates[language] && problem.codeTemplates[language].trim().length > 0)
      ? problem.codeTemplates[language]
      : languages[language].template
    const finalCode = buildFullCodeFromStudentCode(baseTemplate, code)

    try {
      const response = await axios.post('/submissions/run', {
        code: finalCode,
        language_id: language, // Send language name (python, javascript, etc.)
        problemId: problemId || id
      })

      console.log('Run response:', response.data) // Debug log

      // Check if response has test results (new format)
      if (response.data.testResults && Array.isArray(response.data.testResults)) {
        console.log('Found testResults array with length:', response.data.testResults.length, response.data.testResults)
        if (response.data.testResults.length > 0) {
          console.log('Setting test results:', response.data.testResults)
          // Update states - ensure lastAction is set first
          setLastAction('run')
          setShowOutput(true)
          setActiveTab('results') // Auto-switch to Results tab
          setTestResults(response.data.testResults)
          setLastRunResults(response.data.testResults)
          setLastRunOutput('')
          setOutput('')
          console.log('State updated - testResults:', response.data.testResults.length, 'items')
        } else {
          // Empty array - show verdict instead
          console.log('Empty testResults, showing verdict')
          const verdictResults = [{
            testCaseNumber: 1,
            passed: response.data.verdict === 'Accepted',
            status: response.data.verdict || 'Unknown',
            input: 'Sample test case',
            expectedOutput: 'Expected output',
            actualOutput: `Passed: ${response.data.passedTestCases || 0}/${response.data.totalTestCases || 0}`
          }]
          setTestResults(verdictResults)
          setLastRunResults(verdictResults)
          setLastRunOutput('')
          setOutput('')
        }
        setShowOutput(true)
      } else if (response.data.output !== undefined) {
        // Fallback to old format (custom input)
        console.log('Using output format:', response.data.output)
        const runOutput = response.data.output || response.data.error || 'No output'
        setTestResults([])
        setLastRunResults([])
        setLastRunOutput(runOutput)
        setOutput(runOutput)
        setShowOutput(true)
        setLastAction('run')
      } else {
        // No output or error - but still show something
        console.log('No test results or output found, full response:', response.data)
        // Even if testResults is empty array, try to show verdict info
        if (response.data.verdict || response.data.passedTestCases !== undefined) {
          const verdictResults = [{
            testCaseNumber: 1,
            passed: response.data.verdict === 'Accepted',
            status: response.data.verdict || 'Unknown',
            input: 'Sample test case',
            expectedOutput: 'Expected output',
            actualOutput: `Passed: ${response.data.passedTestCases || 0}/${response.data.totalTestCases || 0}`
          }]
          setTestResults(verdictResults)
          setLastRunResults(verdictResults)
          setLastRunOutput('')
          setOutput('')
        } else {
          const fallbackMessage = 'No output received. Response: ' + JSON.stringify(response.data)
          setTestResults([])
          setLastRunResults([])
          setLastRunOutput(fallbackMessage)
          setOutput(fallbackMessage)
        }
        setShowOutput(true)
        setLastAction('run')
      }
    } catch (err) {
      console.error('Run error:', err)
      const errorMsg = 'Error running code: ' + (err.response?.data?.message || err.message)
      setTestResults([])
      setLastRunResults([])
      setLastRunOutput(errorMsg)
      setOutput(errorMsg)
      setShowOutput(true)
      setLastAction('run')
    } finally {
      setIsRunning(false)
    }
  }

  const submitSolution = async () => {
    if (!code.trim()) {
      setOutput('Please write some code first!')
      setShowOutput(true)
      return
    }

    setIsSubmitting(true)
    setTestResults([])
    setOutput('')
    setShowOutput(true)
    setLastAction('submit')
    setShowSubmitPanel(false)

    // Build full code using problem-specific template and hidden harness (if configured)
    const baseTemplate = (problem?.codeTemplates && problem.codeTemplates[language] && problem.codeTemplates[language].trim().length > 0)
      ? problem.codeTemplates[language]
      : languages[language].template
    const finalCode = buildFullCodeFromStudentCode(baseTemplate, code)

    try {
      const response = await axios.post('/submissions/submit', {
        problemId: problemId || id,
        code: finalCode,
        language_id: language // Send language name (python, javascript, etc.)
      })

      // Handle new format with detailed test results
      if (response.data.testResults) {
        setTestResults(response.data.testResults)
        setOutput('')
        setShowSubmitPanel(true)
        setActiveTab('results') // Auto-switch to Results tab
        // Refresh submissions after successful submit
        fetchSubmissions()
        
        // Fetch suggested problems only if all test cases passed (Accepted)
        if (response.data.testResults.every(r => r.passed)) {
          fetchSuggestedProblems()
        }
      } else {
        // Fallback
        setOutput(response.data.message || 'Submission completed')
      }
    } catch (err) {
      setOutput('Error submitting solution: ' + (err.response?.data?.message || err.message))
    } finally {
      setIsSubmitting(false)
    }
  }

  const getAiHelp = async () => {
    if (!code.trim()) {
      setAiResponse('Please write some code first!')
      setShowAiModal(true)
      return
    }

    // Use current test results if visible, otherwise fall back to last run data
    const runResultsSource = (testResults.length > 0 ? testResults : lastRunResults) || []
    const failingResults = runResultsSource.filter(r => r && r.passed === false)
    const outputSource = output || lastRunOutput

    let errorMessage = ''
    if (failingResults.length > 0) {
      errorMessage = failingResults
        .map(r => r.error || r.status || 'Test case failed')
        .join('\n')
    } else if (outputSource) {
      errorMessage = outputSource
    }

    const hasRunContext = (lastAction === 'run') || runResultsSource.length > 0 || !!outputSource

    if ((!errorMessage || errorMessage === 'No output yet. Run your code to see results.') && !hasRunContext) {
      setAiResponse('Please run your code first to see errors, then I can help debug!')
      setShowAiModal(true)
      return
    }

    if (!errorMessage) {
      errorMessage = 'Sample tests passed, but I still need help improving or understanding my solution.'
    }

    setAiDebugging(true)
    setShowAiModal(true)
    setAiResponse('🤖 AI is analyzing your code...')

    try {
      const response = await axios.post('/ai/debug', {
        code,
        language,
        error: errorMessage,
        problemDescription: problem?.title || 'Coding problem'
      })

      setAiResponse(response.data.debugging)
    } catch (err) {
      setAiResponse(
        err.response?.status === 503
          ? '⚠️ AI debugging is not configured yet. Please add GEMINI_API_KEY to backend .env file.\n\nGet a free API key from: https://makersuite.google.com/app/apikey'
          : '❌ Failed to get AI help: ' + (err.response?.data?.message || err.message)
      )
    } finally {
      setAiDebugging(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading problem...</span>
        </div>
      </div>
    )
  }

  if (error && !problem) {
    return (
      <div className="space-y-6">
        <Button 
          variant="outline" 
          onClick={() => navigate('/problems')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Problems
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 p-4 text-red-600 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div className="border-b bg-background px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/problems')}
              className="flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-lg font-semibold">
              {problem?.title ? problem.title.replace(/<[^>]*>/g, '').trim() : 'Untitled Problem'}
            </h1>
            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${difficultyColors[problem?.difficulty]}`}>
              {problem?.difficulty}
            </span>
            {problem?.acceptanceRate !== undefined && (
              <span className="text-xs text-muted-foreground">
                Acceptance: <span className="font-medium text-green-600">{problem.acceptanceRate}%</span>
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="flex gap-2">
              {(() => {
                let processedTags = []
                if (Array.isArray(problem?.tags)) {
                  processedTags = problem.tags.map(tag => stripHtmlTags(tag)).filter(tag => tag)
                } else if (problem?.tags) {
                  const tagsStr = stripHtmlTags(problem.tags)
                  processedTags = tagsStr.split(',').map(t => t.trim()).filter(t => t)
                }
                
                let processedCompanyTags = []
                if (Array.isArray(problem?.companyTags)) {
                  processedCompanyTags = problem.companyTags.map(company => stripHtmlTags(company)).filter(company => company)
                } else if (problem?.companyTags) {
                  const companiesStr = stripHtmlTags(problem.companyTags)
                  processedCompanyTags = companiesStr.split(',').map(c => c.trim()).filter(c => c)
                }
                
                return (
                  <>
                    {processedTags.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTagsModal(true)}
                        className="flex items-center gap-1.5 border-blue-300 text-blue-600 hover:bg-blue-50"
                      >
                        <Tag className="h-4 w-4" />
                        Tags
                      </Button>
                    )}
                    {processedCompanyTags.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCompanyModal(true)}
                        className="flex items-center gap-1.5 border-green-300 text-green-600 hover:bg-green-50"
                      >
                        <Building2 className="h-4 w-4" />
                        Companies
                      </Button>
                    )}
                  </>
                )
              })()}
              <Button
                variant="outline"
                size="sm"
                onClick={getAiHelp}
                disabled={aiDebugging}
                className="flex items-center gap-1.5 border-purple-300 text-purple-600 hover:bg-purple-50"
              >
                {aiDebugging ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                AI Help
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={runCode}
                disabled={isRunning}
                className="flex items-center gap-1.5"
              >
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Run
              </Button>
              <Button
                size="sm"
                onClick={submitSolution}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - both panels scroll independently */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Problem Description / Results */}
        <div className="w-1/2 border-r flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="border-b flex-shrink-0">
            <div className="flex">
              <button
                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                  activeTab === 'description' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('description')}
              >
                Description
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                  activeTab === 'submissions' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('submissions')}
              >
                Submissions
              </button>
              {/* Results tab - visible whenever there are run/submit results */}
              {(testResults.length > 0 || (lastAction === 'run' && showOutput)) && (
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'results'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setActiveTab('results')}
                >
                  {lastAction === 'run' ? (
                    <Terminal className="h-3.5 w-3.5" />
                  ) : (
                    <CheckCircle className="h-3.5 w-3.5" />
                  )}
                  {lastAction === 'run' ? 'Run Results' : 'Submit Results'}
                </button>
              )}
            </div>
          </div>

          {/* Content - independently scrollable */}
          <div className="flex-1 overflow-y-auto">
            {/* === RESULTS TAB === */}
            {activeTab === 'results' && (
              <div className="p-6">
                {/* Run Results */}
                {lastAction === 'run' && Array.isArray(testResults) && testResults.length > 0 && (
                  <div className={`p-4 rounded-lg border-2 ${testResults.every(r => r.passed) ? 'bg-green-50 border-green-500' : 'bg-yellow-50 border-yellow-500'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {testResults.every(r => r.passed) ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-600" />
                        )}
                        <span className={`font-bold text-lg ${testResults.every(r => r.passed) ? 'text-green-700' : 'text-yellow-700'}`}>
                          {testResults.every(r => r.passed) ? 'All Sample Tests Passed' : 'Some Sample Tests Failed'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTestResults([])
                          setLastAction('')
                          setShowOutput(false)
                          setActiveTab('description')
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Close panel"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="text-sm font-medium mb-3">
                      Test Cases Passed: {testResults.filter(r => r.passed).length}/{testResults.length}
                    </div>

                    {/* Individual Run Test Results */}
                    <div className="space-y-2">
                      {testResults.map((result, index) => (
                          <div key={index} className={`border rounded p-3 ${result.passed ? 'bg-white border-green-300' : 'bg-white border-yellow-300'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {result.passed ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                                )}
                                <span className="font-medium text-sm">
                                  Sample Test {result.testCaseNumber || index + 1}: {result.passed ? 'Passed' : result.status || 'Failed'}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-2 text-xs mt-2">
                              {result.input && (
                                <div>
                                  <span className="font-medium">Input:</span>
                                  <pre className="bg-gray-50 p-2 rounded border mt-1 overflow-x-auto whitespace-pre-wrap">{result.input}</pre>
                                </div>
                              )}
                              {result.expectedOutput && (
                                <div>
                                  <span className="font-medium">Expected:</span>
                                  <pre className="bg-gray-50 p-2 rounded border mt-1 overflow-x-auto whitespace-pre-wrap">{result.expectedOutput}</pre>
                                </div>
                              )}
                              {result.actualOutput && (
                                <div>
                                  <span className="font-medium">Your Output:</span>
                                  <pre className="bg-gray-50 p-2 rounded border mt-1 overflow-x-auto whitespace-pre-wrap">{result.actualOutput}</pre>
                                </div>
                              )}
                              {result.error && (
                                <div>
                                  <span className="font-medium text-red-600">Error:</span>
                                  <pre className="bg-gray-50 p-2 rounded border mt-1 overflow-x-auto text-red-600 whitespace-pre-wrap">{result.error}</pre>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Submit Results */}
                {lastAction === 'submit' && showSubmitPanel && testResults.length > 0 && (
                  <div className={`p-4 rounded-lg border-2 ${testResults.every(r => r.passed) ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {testResults.every(r => r.passed) ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                        <span className={`font-bold text-lg ${testResults.every(r => r.passed) ? 'text-green-700' : 'text-red-700'}`}>
                          {testResults.every(r => r.passed) ? 'Accepted' : 'Wrong Answer'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSubmitPanel(false)
                          setTestResults([])
                          setActiveTab('description')
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Close panel"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="text-sm font-medium mb-3">
                      Test Cases Passed: {testResults.filter(r => r.passed).length}/{testResults.length}
                    </div>

                    {/* Individual Test Results */}
                    <div className="space-y-2">
                      {testResults.map((result, index) => (
                        <div key={index} className={`border rounded p-3 ${result.passed ? 'bg-white border-green-300' : 'bg-white border-red-300'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {result.passed ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-red-600" />
                              )}
                              <span className="font-medium text-sm">
                                Test Case {result.testCaseNumber}: {result.status}
                              </span>
                            </div>
                          </div>
                          {!result.passed && (
                            <div className="space-y-2 text-xs mt-2">
                              {result.input && result.input !== 'Hidden' && (
                                <div>
                                  <span className="font-medium">Input:</span>
                                  <pre className="bg-gray-50 p-2 rounded border mt-1 overflow-x-auto">{result.input}</pre>
                                </div>
                              )}
                              {result.expectedOutput && result.expectedOutput !== 'Hidden' && (
                                <div>
                                  <span className="font-medium">Expected:</span>
                                  <pre className="bg-gray-50 p-2 rounded border mt-1 overflow-x-auto">{result.expectedOutput}</pre>
                                </div>
                              )}
                              {result.actualOutput && result.actualOutput !== 'Hidden' && (
                                <div>
                                  <span className="font-medium">Your Output:</span>
                                  <pre className="bg-gray-50 p-2 rounded border mt-1 overflow-x-auto">{result.actualOutput}</pre>
                                </div>
                              )}
                              {result.error && (
                                <div>
                                  <span className="font-medium text-red-600">Error:</span>
                                  <pre className="bg-gray-50 p-2 rounded border mt-1 overflow-x-auto text-red-600">{result.error}</pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Plain output (no test results) */}
                {lastAction === 'run' && !isRunning && testResults.length === 0 && showOutput && (
                  <div className="border-t bg-muted/30 p-3 text-sm">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Output</div>
                    <pre className="bg-gray-50 p-2 rounded border max-h-40 overflow-auto whitespace-pre-wrap">
                      {output || 'No output yet. Run your code to see results.'}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* === DESCRIPTION TAB === */}
            {activeTab === 'description' && (
              <div className="p-6">
                <div className="space-y-6">
                  {/* Tags and Companies removed from here - now in modal buttons */}

                  <div>
                    <h3 className="text-base font-semibold mb-2">Problem Description</h3>
                    <div
                      className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: problem?.description || '' }}
                    />
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2">Input Format</h3>
                    <div
                      className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: problem?.inputFormat || '' }}
                    />
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2">Output Format</h3>
                    <div
                      className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: problem?.outputFormat || '' }}
                    />
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2">Constraints</h3>
                    <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
                      {(() => {
                        const stripHtml = (str) => {
                          if (!str) return ''
                          return String(str).replace(/<[^>]*>/g, '').trim()
                        }
                        const constraintsText = stripHtml(problem?.constraints || '')
                        const constraints = constraintsText
                          .split(/[\n\r,;•·]/)
                          .map(c => c.trim().replace(/^and\s+/i, ''))
                          .filter(c => c.length > 0)
                        if (constraints.length === 0) {
                          return <div className="text-sm text-muted-foreground">No constraints specified</div>
                        }
                        return (
                          <ul className="list-disc list-inside space-y-1">
                            {constraints.map((constraint, index) => (
                              <li key={index}>{constraint}</li>
                            ))}
                          </ul>
                        )
                      })()}
                    </div>
                  </div>

                  {problem?.sampleTestCases && problem.sampleTestCases.length > 0 && (
                    <div>
                      <h3 className="text-base font-semibold mb-3">Examples</h3>
                      <div className="space-y-3">
                        {problem.sampleTestCases.map((testCase, index) => (
                          <div key={index} className="border rounded-lg p-3 bg-muted/20">
                            <div className="font-medium text-sm mb-2">Example {index + 1}:</div>
                            <div className="space-y-2">
                              <div>
                                <div className="text-xs font-medium text-muted-foreground mb-1">Input:</div>
                                <pre className="text-xs bg-background p-2 rounded border font-mono">{testCase.input}</pre>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-muted-foreground mb-1">Output:</div>
                                <pre className="text-xs bg-background p-2 rounded border font-mono">{testCase.expectedOutput}</pre>
                              </div>
                              {testCase.explanation && (
                                <div>
                                  <div className="text-xs font-medium text-muted-foreground mb-1">Explanation:</div>
                                  <p className="text-xs text-muted-foreground whitespace-pre-line">
                                    {formatRichTextToPlain(testCase.explanation)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* === SUBMISSIONS TAB === */}
            {activeTab === 'submissions' && (
              <div className="p-6">
                <div>
                  {loadingSubmissions ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                      <p className="text-sm text-muted-foreground mt-2">Loading submissions...</p>
                    </div>
                  ) : submissions.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No submissions yet. Submit your solution to see it here!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-lg mb-4">Your Submissions ({submissions.length})</h3>
                      {submissions.map((submission, index) => (
                        <div key={submission._id || index} className={`border rounded-lg p-4 ${
                          submission.status === 'Accepted' 
                            ? 'border-green-300 bg-green-50/50' 
                            : 'border-red-300 bg-red-50/50'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {submission.status === 'Accepted' ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-red-600" />
                              )}
                              <span className={`font-semibold ${
                                submission.status === 'Accepted' ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {submission.status}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(submission.createdAt).toLocaleString()}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Language:</span>
                              <p className="font-medium">{submission.language}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Test Cases:</span>
                              <p className="font-medium">
                                {submission.passedTestCases || 0}/{submission.totalTestCases || 0}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Time:</span>
                              <p className="font-medium">{submission.executionTime || 0}s</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Memory:</span>
                              <p className="font-medium">{Math.round((submission.memoryUsed || 0) / 1024)}KB</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Code Editor (independently scrollable) */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="border-b bg-muted/20 px-4 py-2 flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Language</span>
              <Select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-[150px]">
                {Object.entries(languages).map(([key, lang]) => (
                  <option key={key} value={key}>{lang.name}</option>
                ))}
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Theme</span>
              <Select value={editorTheme} onChange={(e) => setEditorTheme(e.target.value)} className="w-[130px]">
                <option value="vs-dark">Dark</option>
                <option value="light">Light</option>
              </Select>
            </div>
          </div>
          {/* Editor fills remaining height */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={language === 'cpp' ? 'cpp' : language}
              theme={editorTheme}
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                lineNumbers: 'on',
                renderLineHighlight: 'all',
                scrollbar: {
                  vertical: 'auto',
                  horizontal: 'auto'
                },
                mouseWheelZoom: false
              }}
            />
          </div>

          {/* Running indicator shown below editor */}
          {lastAction === 'run' && isRunning && (
            <div className="border-t bg-muted/30 p-3 text-sm flex-shrink-0">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Running code...</span>
              </div>
            </div>
          )}
          {lastAction === 'submit' && isSubmitting && (
            <div className="border-t bg-muted/30 p-3 text-sm flex-shrink-0">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Submitting solution...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tags Modal */}
      {showTagsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-lg">Problem Tags</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTagsModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const stripHtml = (str) => {
                    if (!str) return ''
                    return String(str).replace(/<[^>]*>/g, '').trim()
                  }
                  
                  let processedTags = []
                  if (Array.isArray(problem?.tags)) {
                    processedTags = problem.tags.map(tag => stripHtml(tag)).filter(tag => tag)
                  } else if (problem?.tags) {
                    const tagsStr = stripHtml(problem.tags)
                    processedTags = tagsStr.split(',').map(t => t.trim()).filter(t => t)
                  }
                  
                  if (processedTags.length === 0) {
                    return <p className="text-muted-foreground">No tags available</p>
                  }
                  
                  return processedTags.map((tag, index) => (
                    <span key={index} className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm rounded-md border border-blue-200 dark:border-blue-800 font-medium">
                      {tag}
                    </span>
                  ))
                })()}
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 dark:bg-gray-900 flex justify-end">
              <Button onClick={() => setShowTagsModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Company Modal */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-lg">Companies</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCompanyModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const stripHtml = (str) => {
                    if (!str) return ''
                    return String(str).replace(/<[^>]*>/g, '').trim()
                  }
                  
                  let processedCompanyTags = []
                  if (Array.isArray(problem?.companyTags)) {
                    processedCompanyTags = problem.companyTags.map(company => stripHtml(company)).filter(company => company)
                  } else if (problem?.companyTags) {
                    const companiesStr = stripHtml(problem.companyTags)
                    processedCompanyTags = companiesStr.split(',').map(c => c.trim()).filter(c => c)
                  }
                  
                  if (processedCompanyTags.length === 0) {
                    return <p className="text-muted-foreground">No companies available</p>
                  }
                  
                  return processedCompanyTags.map((company, index) => (
                    <span key={index} className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm rounded-md border border-green-200 dark:border-green-800 font-medium">
                      {company}
                    </span>
                  ))
                })()}
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 dark:bg-gray-900 flex justify-end">
              <Button onClick={() => setShowCompanyModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Suggested Problems Modal */}
      {showSuggestionsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-800/20">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-lg">Suggested Problems</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSuggestionsModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loadingSuggestions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : suggestedProblems.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No similar problems found</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground mb-4">
                    Based on the tags and difficulty of this problem, here are some similar problems you might want to try:
                  </p>
                  {suggestedProblems.map((suggestedProblem) => {
                    const stripHtml = (str) => {
                      if (!str) return ''
                      return String(str).replace(/<[^>]*>/g, '').trim()
                    }
                    
                    const title = stripHtml(suggestedProblem.title)
                    const difficultyColors = {
                      Easy: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
                      Medium: 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
                      Hard: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                    }
                    
                    return (
                      <div
                        key={suggestedProblem._id}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setShowSuggestionsModal(false)
                          navigate(`/problems/${suggestedProblem.slug || suggestedProblem._id}`)
                          window.location.reload()
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-base mb-2 hover:text-primary">
                              {title}
                            </h4>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${difficultyColors[suggestedProblem.difficulty] || ''}`}>
                                {suggestedProblem.difficulty}
                              </span>
                              {suggestedProblem.acceptanceRate !== undefined && (
                                <span className="text-xs text-muted-foreground">
                                  Acceptance: {suggestedProblem.acceptanceRate}%
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowSuggestionsModal(false)
                              navigate(`/problems/${suggestedProblem.slug || suggestedProblem._id}`)
                              window.location.reload()
                            }}
                          >
                            Solve
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 dark:bg-gray-900 flex justify-end">
              <Button onClick={() => setShowSuggestionsModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* AI Help Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-lg">AI Debugging Assistant</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAiModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-sm max-w-none">
                {aiDebugging ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>AI is analyzing your code...</span>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {aiResponse}
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <Button onClick={() => setShowAiModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProblemDetail
