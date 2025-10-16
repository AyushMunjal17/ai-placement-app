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
  Terminal
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

  const runCode = async () => {
    if (!code.trim()) {
      setOutput('Please write some code first!')
      setShowOutput(true)
      return
    }

    setIsRunning(true)
    setOutput('')
    setShowOutput(true)

    try {
      const response = await axios.post('/submissions/run', {
        code,
        language_id: languages[language].id,
        stdin: problem?.sampleTestCases?.[0]?.input || ''
      })

      setOutput(response.data.output || response.data.error || 'No output')
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
    setShowOutput(true)

    try {
      const response = await axios.post('/submissions/submit', {
        problemId: id,
        code,
        language_id: languages[language].id
      })

      setTestResults(response.data.results || [])
      setOutput(response.data.message || 'Submission completed')
    } catch (err) {
      setOutput('Error submitting solution: ' + (err.response?.data?.message || err.message))
    } finally {
      setIsSubmitting(false)
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
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/problems')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold">{problem?.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${difficultyColors[problem?.difficulty]}`}>
                  {problem?.difficulty}
                </span>
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
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="vs-dark">Dark Theme</option>
              <option value="light">Light Theme</option>
            </Select>
            <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
              {Object.entries(languages).map(([key, lang]) => (
                <option key={key} value={key}>{lang.name}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
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
          <div className="flex-1 overflow-auto p-6">
            {activeTab === 'description' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Problem Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{problem?.description}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Input Format</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{problem?.inputFormat}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Output Format</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{problem?.outputFormat}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Constraints</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{problem?.constraints}</p>
                </div>

                {problem?.sampleTestCases?.map((testCase, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Example {index + 1}</h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium">Input:</span>
                        <pre className="bg-muted p-2 rounded text-sm mt-1">{testCase.input}</pre>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Output:</span>
                        <pre className="bg-muted p-2 rounded text-sm mt-1">{testCase.expectedOutput}</pre>
                      </div>
                      {testCase.explanation && (
                        <div>
                          <span className="text-sm font-medium">Explanation:</span>
                          <p className="text-sm text-muted-foreground mt-1">{testCase.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'submissions' && (
              <div className="text-center text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Your submission history will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Code Editor */}
        <div className="w-1/2 flex flex-col">
          {/* Editor */}
          <div className="flex-1">
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
                wordWrap: 'on'
              }}
            />
          </div>

          {/* Action Bar */}
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setShowOutput(!showOutput)}
                className="flex items-center gap-2"
              >
                {showOutput ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showOutput ? 'Hide Output' : 'Show Output'}
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={runCode}
                  disabled={isRunning}
                  className="flex items-center gap-2"
                >
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Run Code
                </Button>

                <Button
                  onClick={submitSolution}
                  disabled={isSubmitting}
                  className="flex items-center gap-2"
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

          {/* Output Panel */}
          {showOutput && (
            <div className="border-t bg-muted/30 p-4 max-h-48 overflow-auto">
              <div className="flex items-center gap-2 mb-2">
                <Terminal className="h-4 w-4" />
                <span className="text-sm font-medium">Output</span>
              </div>
              
              {testResults.length > 0 ? (
                <div className="space-y-2">
                  {testResults.map((result, index) => (
                    <div key={index} className={`p-2 rounded text-sm ${
                      result.passed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      <div className="flex items-center gap-2">
                        {result.passed ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        Test Case {index + 1}: {result.passed ? 'Passed' : 'Failed'}
                      </div>
                      {!result.passed && result.error && (
                        <div className="mt-1 text-xs">{result.error}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="text-sm bg-background p-2 rounded border">{output || 'No output yet. Run your code to see results.'}</pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProblemDetail
