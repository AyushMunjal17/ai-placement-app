import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Select } from '../components/ui/select'
import { 
  PlusCircle, 
  AlertCircle, 
  Trash2, 
  Plus,
  Save,
  Eye,
  Code,
  Clock,
  HardDrive,
  Upload,
  File
} from 'lucide-react'

const CreateProblem = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    inputFormat: '',
    outputFormat: '',
    constraints: '',
    difficulty: 'Easy',
    tags: '',
    companyTags: '',
    timeLimit: 2,
    memoryLimit: 256,
    sampleTestCases: [
      { input: '', expectedOutput: '', explanation: '' }
    ],
    hiddenTestCases: [
      { input: '', expectedOutput: '' }
    ],
    supportedLanguages: ['c', 'cpp', 'java', 'python']
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (error) setError('')
    if (success) setSuccess('')
  }

  const handleSampleTestCaseChange = (index, field, value) => {
    const updatedTestCases = [...formData.sampleTestCases]
    updatedTestCases[index][field] = value
    setFormData(prev => ({
      ...prev,
      sampleTestCases: updatedTestCases
    }))
  }

  const handleHiddenTestCaseChange = (index, field, value) => {
    const updatedTestCases = [...formData.hiddenTestCases]
    updatedTestCases[index][field] = value
    setFormData(prev => ({
      ...prev,
      hiddenTestCases: updatedTestCases
    }))
  }

  const addSampleTestCase = () => {
    setFormData(prev => ({
      ...prev,
      sampleTestCases: [...prev.sampleTestCases, { input: '', expectedOutput: '', explanation: '' }]
    }))
  }

  const removeSampleTestCase = (index) => {
    if (formData.sampleTestCases.length > 1) {
      const updatedTestCases = formData.sampleTestCases.filter((_, i) => i !== index)
      setFormData(prev => ({
        ...prev,
        sampleTestCases: updatedTestCases
      }))
    }
  }

  const addHiddenTestCase = () => {
    setFormData(prev => ({
      ...prev,
      hiddenTestCases: [...prev.hiddenTestCases, { input: '', expectedOutput: '' }]
    }))
  }

  const removeHiddenTestCase = (index) => {
    if (formData.hiddenTestCases.length > 1) {
      const updatedTestCases = formData.hiddenTestCases.filter((_, i) => i !== index)
      setFormData(prev => ({
        ...prev,
        hiddenTestCases: updatedTestCases
      }))
    }
  }

  const validateForm = () => {
    if (!formData.title.trim()) return 'Title is required'
    if (!formData.description.trim()) return 'Description is required'
    if (!formData.inputFormat.trim()) return 'Input format is required'
    if (!formData.outputFormat.trim()) return 'Output format is required'
    if (!formData.constraints.trim()) return 'Constraints are required'
    
    // Validate sample test cases
    for (let i = 0; i < formData.sampleTestCases.length; i++) {
      const testCase = formData.sampleTestCases[i]
      if (!testCase.input.trim() || !testCase.expectedOutput.trim()) {
        return `Sample test case ${i + 1} must have both input and expected output`
      }
    }

    // Validate hidden test cases
    for (let i = 0; i < formData.hiddenTestCases.length; i++) {
      const testCase = formData.hiddenTestCases[i]
      if (!testCase.input.trim() || !testCase.expectedOutput.trim()) {
        return `Hidden test case ${i + 1} must have both input and expected output`
      }
    }

    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      setLoading(false)
      return
    }

    try {
      const submitData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        companyTags: formData.companyTags.split(',').map(tag => tag.trim()).filter(tag => tag),
        timeLimit: Number(formData.timeLimit),
        memoryLimit: Number(formData.memoryLimit)
      }

      const response = await axios.post('/problems', submitData)
      
      setSuccess('Problem created successfully!')
      setTimeout(() => {
        navigate('/problems')
      }, 2000)

    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create problem'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <PlusCircle className="h-8 w-8" />
          Create New Problem
        </h1>
        <p className="text-muted-foreground mt-2">
          Create a coding problem for others to solve. Fill in all the details carefully.
        </p>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="flex items-center gap-2 p-4 text-red-600 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 text-green-600 bg-green-50 border border-green-200 rounded-md">
          <Save className="h-4 w-4" />
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Provide the basic details about your problem
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Problem Title *</label>
              <Input
                name="title"
                placeholder="e.g., Two Sum, Binary Tree Traversal"
                value={formData.title}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Problem Description *</label>
              <Textarea
                name="description"
                placeholder="Describe the problem in detail. What should the solution accomplish?"
                value={formData.description}
                onChange={handleInputChange}
                disabled={loading}
                rows={6}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Difficulty *</label>
                <Select
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleInputChange}
                  disabled={loading}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Tags (comma-separated)</label>
                <Input
                  name="tags"
                  placeholder="e.g., array, hash-table, two-pointers"
                  value={formData.tags}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Company Tags (comma-separated)</label>
              <Input
                name="companyTags"
                placeholder="e.g., Google, Amazon, Microsoft, Apple, Meta"
                value={formData.companyTags}
                onChange={handleInputChange}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Add companies that commonly ask this question in interviews
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Input/Output Format */}
        <Card>
          <CardHeader>
            <CardTitle>Input/Output Specification</CardTitle>
            <CardDescription>
              Define how the input and output should be formatted
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Input Format *</label>
              <Textarea
                name="inputFormat"
                placeholder="Describe the input format. e.g., First line contains integer n, second line contains n space-separated integers"
                value={formData.inputFormat}
                onChange={handleInputChange}
                disabled={loading}
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Output Format *</label>
              <Textarea
                name="outputFormat"
                placeholder="Describe the expected output format. e.g., Print a single integer representing the answer"
                value={formData.outputFormat}
                onChange={handleInputChange}
                disabled={loading}
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Constraints *</label>
              <Textarea
                name="constraints"
                placeholder="Define the constraints. e.g., 1 ≤ n ≤ 10^5, -10^9 ≤ arr[i] ≤ 10^9"
                value={formData.constraints}
                onChange={handleInputChange}
                disabled={loading}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Limits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Execution Limits
            </CardTitle>
            <CardDescription>
              Set time and memory limits for code execution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Time Limit (seconds)</label>
                <Input
                  name="timeLimit"
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={formData.timeLimit}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Memory Limit (MB)</label>
                <Input
                  name="memoryLimit"
                  type="number"
                  min="64"
                  max="1024"
                  value={formData.memoryLimit}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sample Test Cases */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Sample Test Cases
            </CardTitle>
            <CardDescription>
              These test cases will be visible to users for understanding the problem
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.sampleTestCases.map((testCase, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Sample Test Case {index + 1}</h4>
                  {formData.sampleTestCases.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeSampleTestCase(index)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Input *</label>
                    <Textarea
                      placeholder="Sample input or paste large input here"
                      value={testCase.input}
                      onChange={(e) => handleSampleTestCaseChange(index, 'input', e.target.value)}
                      disabled={loading}
                      rows={3}
                    />
                    <div className="mt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-blue-600 hover:text-blue-700">
                        <Upload className="h-4 w-4" />
                        Upload Input File (.txt)
                        <input
                          type="file"
                          accept=".txt"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onload = (event) => {
                                handleSampleTestCaseChange(index, 'input', event.target.result)
                              }
                              reader.readAsText(file)
                            }
                          }}
                          disabled={loading}
                        />
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Expected Output *</label>
                    <Textarea
                      placeholder="Expected output or paste large output here"
                      value={testCase.expectedOutput}
                      onChange={(e) => handleSampleTestCaseChange(index, 'expectedOutput', e.target.value)}
                      disabled={loading}
                      rows={3}
                    />
                    <div className="mt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-blue-600 hover:text-blue-700">
                        <Upload className="h-4 w-4" />
                        Upload Output File (.txt)
                        <input
                          type="file"
                          accept=".txt"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onload = (event) => {
                                handleSampleTestCaseChange(index, 'expectedOutput', event.target.result)
                              }
                              reader.readAsText(file)
                            }
                          }}
                          disabled={loading}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Explanation (optional)</label>
                  <Textarea
                    placeholder="Explain why this input produces this output"
                    value={testCase.explanation}
                    onChange={(e) => handleSampleTestCaseChange(index, 'explanation', e.target.value)}
                    disabled={loading}
                    rows={2}
                  />
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addSampleTestCase}
              disabled={loading}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Sample Test Case
            </Button>
          </CardContent>
        </Card>

        {/* Hidden Test Cases */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Hidden Test Cases (Bulk Upload)
            </CardTitle>
            <CardDescription>
              Upload all hidden test cases in a single file. Format: Each test case separated by "---"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Bulk Upload Section */}
            <div className="border-2 border-dashed rounded-lg p-6 space-y-4">
              <div className="text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <h3 className="font-medium mb-2">Upload Hidden Test Cases File</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload a .txt file containing all hidden test cases
                </p>
                
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700">
                  <File className="h-4 w-4" />
                  Choose File
                  <input
                    type="file"
                    accept=".txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          const content = event.target.result
                          // Parse the file content
                          const testCases = content.split('---').map(tc => tc.trim()).filter(tc => tc)
                          const parsedTestCases = testCases.map(tc => {
                            const parts = tc.split('###OUTPUT###')
                            return {
                              input: parts[0]?.replace('###INPUT###', '').trim() || '',
                              expectedOutput: parts[1]?.trim() || ''
                            }
                          })
                          
                          if (parsedTestCases.length > 0) {
                            setFormData(prev => ({
                              ...prev,
                              hiddenTestCases: parsedTestCases
                            }))
                            setSuccess(`Successfully loaded ${parsedTestCases.length} hidden test cases!`)
                            setTimeout(() => setSuccess(''), 3000)
                          }
                        }
                        reader.readAsText(file)
                      }
                    }}
                    disabled={loading}
                  />
                </label>
              </div>

              <div className="bg-muted p-4 rounded text-sm space-y-2">
                <p className="font-medium">File Format:</p>
                <pre className="bg-background p-2 rounded overflow-x-auto text-xs">
{`###INPUT###
4 9
2 7 11 15
###OUTPUT###
0 1
---
###INPUT###
4 6
3 2 4
###OUTPUT###
1 2
---
###INPUT###
1000 1999
1 2 3 4 ... (large input)
###OUTPUT###
998 999`}
                </pre>
                <p className="text-xs text-muted-foreground">
                  • Use <code className="bg-background px-1 rounded">###INPUT###</code> before input data
                  <br />
                  • Use <code className="bg-background px-1 rounded">###OUTPUT###</code> before output data
                  <br />
                  • Separate test cases with <code className="bg-background px-1 rounded">---</code>
                </p>
              </div>
            </div>

            {/* Display loaded test cases */}
            {formData.hiddenTestCases.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Loaded Test Cases: {formData.hiddenTestCases.length}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        hiddenTestCases: [{ input: '', expectedOutput: '' }]
                      }))
                    }}
                    disabled={loading}
                  >
                    Clear All
                  </Button>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2">
                  {formData.hiddenTestCases.map((testCase, index) => (
                    <div key={index} className="border rounded p-3 bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Test Case {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeHiddenTestCase(index)}
                          disabled={loading}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-medium">Input:</span>
                          <pre className="bg-background p-1 rounded mt-1 overflow-hidden text-ellipsis">
                            {testCase.input.substring(0, 50)}{testCase.input.length > 50 ? '...' : ''}
                          </pre>
                        </div>
                        <div>
                          <span className="font-medium">Output:</span>
                          <pre className="bg-background p-1 rounded mt-1 overflow-hidden text-ellipsis">
                            {testCase.expectedOutput.substring(0, 50)}{testCase.expectedOutput.length > 50 ? '...' : ''}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creating Problem...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Create Problem
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/problems')}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

export default CreateProblem
