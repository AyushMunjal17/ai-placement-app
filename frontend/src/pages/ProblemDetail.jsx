import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Editor from '@monaco-editor/react'
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
  X
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

const ProblemDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  
  // Problem state
  const [problem, setProblem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Code editor state
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('python')
  const [theme, setTheme] = useState('vs-dark')
  
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

  // Handle wheel events to allow page scrolling when in editor area
  useEffect(() => {
    const handleWheel = (e) => {
      // Check if the event is from the editor area
      const target = e.target
      const editorContainer = target.closest('.monaco-editor')
      
      if (editorContainer) {
        const scrollableElement = editorContainer.querySelector('.monaco-scrollable-element')
        if (scrollableElement) {
          const { scrollTop, scrollHeight, clientHeight } = scrollableElement
          const isAtTop = scrollTop <= 0
          const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1
          
          // Always allow some page scroll when scrolling in editor area
          // Find the main scrollable container (the one with overflow: auto)
          const mainContainer = Array.from(document.querySelectorAll('*')).find(el => {
            const style = window.getComputedStyle(el)
            return style.overflow === 'auto' || style.overflowY === 'auto'
          })
          
          if (mainContainer) {
            // If at boundaries, allow full page scroll
            if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
              mainContainer.scrollBy({ top: e.deltaY, behavior: 'auto' })
            } else {
              // When not at boundaries, also allow partial page scroll
              mainContainer.scrollBy({ top: e.deltaY * 0.3, behavior: 'auto' })
            }
          } else {
            // Fallback: scroll window
            if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
              window.scrollBy({ top: e.deltaY, behavior: 'auto' })
            } else {
              window.scrollBy({ top: e.deltaY * 0.3, behavior: 'auto' })
            }
          }
        }
      }
    }

    // Use capture phase to catch events
    document.addEventListener('wheel', handleWheel, { passive: true, capture: true })
    return () => document.removeEventListener('wheel', handleWheel, { capture: true })
  }, [])

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
      const response = await axios.get(`/submissions/problem/${id}`)
      setSubmissions(response.data.submissions || [])
    } catch (err) {
      console.error('Fetch submissions error:', err)
    } finally {
      setLoadingSubmissions(false)
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
        problemId: id
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
        problemId: id,
        code: finalCode,
        language_id: language // Send language name (python, javascript, etc.)
      })

      // Handle new format with detailed test results
      if (response.data.testResults) {
        setTestResults(response.data.testResults)
        setOutput('')
        setShowSubmitPanel(true)
        // Refresh submissions after successful submit
        fetchSubmissions()
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
    <div className="flex flex-col" style={{ height: '100vh', overflow: 'auto' }}>
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
          
          <div className="flex items-center gap-2">
            <Select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-[140px]">
              {Object.entries(languages).map(([key, lang]) => (
                <option key={key} value={key}>{lang.name}</option>
              ))}
            </Select>
            {problem?.supportedLanguages && problem.supportedLanguages.length > 0 && (
              <span className="text-xs text-muted-foreground">
                ({problem.supportedLanguages.length} language{problem.supportedLanguages.length !== 1 ? 's' : ''} available)
              </span>
            )}
            <Select value={theme} onChange={(e) => setTheme(e.target.value)} className="w-[120px]">
              <option value="vs-dark">Dark</option>
              <option value="light">Light</option>
            </Select>
            <div className="flex gap-2 ml-2">
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

      {/* Main Content */}
      <div className="flex flex-1" style={{ minHeight: 'calc(100vh - 60px)' }}>
        {/* Left Panel - Problem Description */}
        <div className="w-1/2 border-r flex flex-col">
          {/* Tabs */}
          <div className="border-b">
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
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            {activeTab === 'description' && (
              <div className="p-6">
                {/* Run Results Panel - shown above problem statement */}
                {lastAction === 'run' && Array.isArray(testResults) && testResults.length > 0 && (
                  <div className="mb-6 sticky top-0 z-10 bg-white pb-4 border-b">
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
                      <div className="space-y-2 max-h-96 overflow-y-auto">
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
                  </div>
                )}

                {/* Submit Results Panel - shown above problem statement */}
                {lastAction === 'submit' && showSubmitPanel && testResults.length > 0 && (
                  <div className="mb-6 sticky top-0 z-10 bg-white pb-4 border-b">
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

                      {/* Individual Test Results (including hidden, with hidden inputs/outputs masked) */}
                      <div className="space-y-2 max-h-96 overflow-y-auto">
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
                            {/* For submit, we only show full details for sample tests; hidden tests keep input/output masked */}
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
                  </div>
                )}

                <div className="space-y-6">
                  {/* Tags */}
                  {(() => {
                    // Helper function to strip HTML and extract tags
                    const stripHtml = (str) => {
                      if (!str) return ''
                      return String(str).replace(/<[^>]*>/g, '').trim()
                    }
                    
                    // Process tags - handle both array and string formats
                    let processedTags = []
                    if (Array.isArray(problem?.tags)) {
                      processedTags = problem.tags
                        .map(tag => stripHtml(tag))
                        .filter(tag => tag)
                    } else if (problem?.tags) {
                      // If tags is a string, split by comma and strip HTML
                      const tagsStr = stripHtml(problem.tags)
                      processedTags = tagsStr.split(',').map(t => t.trim()).filter(t => t)
                    }
                    
                    // Process company tags - handle both array and string formats
                    let processedCompanyTags = []
                    if (Array.isArray(problem?.companyTags)) {
                      processedCompanyTags = problem.companyTags
                        .map(company => stripHtml(company))
                        .filter(company => company)
                    } else if (problem?.companyTags) {
                      // If companyTags is a string, split by comma and strip HTML
                      const companiesStr = stripHtml(problem.companyTags)
                      processedCompanyTags = companiesStr.split(',').map(c => c.trim()).filter(c => c)
                    }
                    
                    if (processedTags.length === 0 && processedCompanyTags.length === 0) {
                      return null
                    }
                    
                    return (
                      <div className="flex flex-wrap gap-2">
                        {processedTags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded border border-blue-200">
                            {tag}
                          </span>
                        ))}
                        {processedCompanyTags.map((company, index) => (
                          <span key={index} className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded border border-green-200 font-medium">
                            {company}
                          </span>
                        ))}
                      </div>
                    )
                  })()}

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
                    <div
                      className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: problem?.constraints || '' }}
                    />
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
                                  <p className="text-xs text-muted-foreground">{testCase.explanation}</p>
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

        {/* Right Panel - Code Editor */}
        <div className="w-1/2 flex flex-col">
          <Editor
            height="calc(100vh - 60px)"
            language={language === 'cpp' ? 'cpp' : language}
            theme={theme}
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


          {lastAction === 'run' && !isRunning && testResults.length === 0 && showOutput && (
            <div className="border-t bg-muted/30 p-3 text-sm">
              <div className="text-xs font-medium text-muted-foreground mb-1">Output</div>
              <pre className="bg-gray-50 p-2 rounded border max-h-40 overflow-auto whitespace-pre-wrap">
                {output || 'No output yet. Run your code to see results.'}
              </pre>
            </div>
          )}

          {/* Debug: Always show when run is clicked, even if no results */}
          {lastAction === 'run' && !isRunning && testResults.length === 0 && !output && (
            <div className="border-t bg-yellow-50 p-3 text-sm">
              <div className="text-xs font-medium text-yellow-700 mb-1">Debug Info</div>
              <pre className="bg-white p-2 rounded border max-h-40 overflow-auto whitespace-pre-wrap text-xs">
                {`Last Action: ${lastAction}
Test Results Length: ${testResults.length}
Show Output: ${showOutput}
Is Running: ${isRunning}
Check browser console for API response details.`}
              </pre>
            </div>
          )}

          {lastAction === 'run' && isRunning && (
            <div className="border-t bg-muted/30 p-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Running code...</span>
              </div>
            </div>
          )}
        </div>
      </div>

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
