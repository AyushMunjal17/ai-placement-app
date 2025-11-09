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
  const [showOutput, setShowOutput] = useState(false)
  
  // UI state
  const [activeTab, setActiveTab] = useState('description')
  const [submissions, setSubmissions] = useState([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  
  // AI Debugging state
  const [aiDebugging, setAiDebugging] = useState(false)
  const [aiResponse, setAiResponse] = useState('')
  const [showAiModal, setShowAiModal] = useState(false)

  // Language configurations
  const languages = {
    python: { id: 71, name: 'Python 3', template: '# Write your solution here\ndef solution():\n    pass\n\n# Test your solution\nif __name__ == "__main__":\n    solution()' },
    javascript: { id: 63, name: 'JavaScript', template: '// Write your solution here\nfunction solution() {\n    // Your code here\n}\n\n// Test your solution\nconsole.log(solution());' },
    java: { id: 62, name: 'Java', template: 'public class Solution {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}' },
    cpp: { id: 54, name: 'C++', template: '#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}' },
    c: { id: 50, name: 'C', template: '#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}' }
  }

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
    // Set default code template when language changes
    if (languages[language]) {
      setCode(languages[language].template)
    }
  }, [language])

  const fetchProblem = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/problems/${id}`)
      setProblem(response.data.problem)
      setCode(languages[language].template)
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
      return
    }

    setIsRunning(true)
    setOutput('')
    setTestResults([])
    setShowOutput(true)

    try {
      const response = await axios.post('/submissions/run', {
        code,
        language_id: language, // Send language name (python, javascript, etc.)
        problemId: id
      })

      // Check if response has test results (new format)
      if (response.data.testResults) {
        setTestResults(response.data.testResults)
        setOutput('')
      } else {
        // Fallback to old format (custom input)
        setOutput(response.data.output || response.data.error || 'No output')
      }
    } catch (err) {
      setOutput('Error running code: ' + (err.response?.data?.message || err.message))
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

    try {
      const response = await axios.post('/submissions/submit', {
        problemId: id,
        code,
        language_id: language // Send language name (python, javascript, etc.)
      })

      // Handle new format with detailed test results
      if (response.data.testResults) {
        setTestResults(response.data.testResults)
        setOutput('')
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

    // Get error message from test results or output
    const errorMessage = testResults.length > 0
      ? testResults.filter(r => !r.passed).map(r => r.error || r.status).join('\n')
      : output || 'Code is not producing expected output'

    if (!errorMessage || errorMessage === 'No output yet. Run your code to see results.') {
      setAiResponse('Please run your code first to see errors, then I can help debug!')
      setShowAiModal(true)
      return
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
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-background px-4 py-2">
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
            <h1 className="text-lg font-semibold">{problem?.title}</h1>
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
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Problem Description (Sticky) */}
        <div className="w-1/2 border-r flex flex-col overflow-hidden">
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
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'description' && (
              <div className="p-6">
                {/* Test Results - Show at top when available */}
                {testResults.length > 0 && (
                  <div className="mb-6">
                    <div className={`p-4 rounded-lg border-2 ${testResults.every(r => r.passed) ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {testResults.every(r => r.passed) ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                        <span className={`font-bold text-lg ${testResults.every(r => r.passed) ? 'text-green-700' : 'text-red-700'}`}>
                          {testResults.every(r => r.passed) ? 'Accepted' : 'Wrong Answer'}
                        </span>
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
                  </div>
                )}

                <div className="space-y-6">
                  {/* Tags */}
                  {(problem?.tags?.length > 0 || problem?.companyTags?.length > 0) && (
                    <div className="flex flex-wrap gap-2">
                      {problem?.tags?.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded border border-blue-200">
                          {tag}
                        </span>
                      ))}
                      {problem?.companyTags?.map((company, index) => (
                        <span key={index} className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded border border-green-200 font-medium">
                          {company}
                        </span>
                      ))}
                    </div>
                  )}

                  <div>
                    <h3 className="text-base font-semibold mb-2">Problem Description</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{problem?.description}</p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2">Input Format</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{problem?.inputFormat}</p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2">Output Format</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{problem?.outputFormat}</p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2">Constraints</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{problem?.constraints}</p>
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
            height="100%"
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
              }
            }}
          />
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
