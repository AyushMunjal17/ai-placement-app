import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
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
  File,
  X
} from 'lucide-react'

// Quill toolbar configuration
const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['code-block'],
    ['link'],
    ['clean']
  ]
}

const quillFormats = [
  'bold', 'italic', 'underline', 'strike',
  'list',
  'code-block',
  'link'
]

const CreateProblem = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [showTestCaseModal, setShowTestCaseModal] = useState(false)


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
    supportedLanguages: ['c', 'cpp', 'java', 'python'],
    codeTemplates: {
      python: '',
      cpp: '',
      java: '',
      javascript: '',
      c: ''
    }
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

  const removeHiddenTestCase = (index) => {
    if (formData.hiddenTestCases.length > 1) {
      const updatedTestCases = formData.hiddenTestCases.filter((_, i) => i !== index)
      setFormData(prev => ({
        ...prev,
        hiddenTestCases: updatedTestCases
      }))
    }
  }

  const stripHtml = (html) => {
    if (!html) return ''
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()
  }

  const validateForm = () => {
    if (!stripHtml(formData.title)) return 'Title is required'
    if (!stripHtml(formData.description)) return 'Description is required'
    if (!stripHtml(formData.inputFormat)) return 'Input format is required'
    if (!stripHtml(formData.outputFormat)) return 'Output format is required'
    if (!stripHtml(formData.constraints)) return 'Constraints are required'
    
    // Validate supported languages
    if (!formData.supportedLanguages || formData.supportedLanguages.length === 0) {
      return 'At least one programming language must be selected'
    }
    
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

  const handleSubmit = async () => {
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
      // Extract plain text from rich text fields (title, tags should be plain text)
      const titleText = stripHtml(formData.title)
      const tagsText = stripHtml(formData.tags)
      const companyTagsText = stripHtml(formData.companyTags)
      
      const submitData = {
        ...formData,
        title: titleText, // Store as plain text, not HTML
        tags: tagsText ? tagsText.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        companyTags: companyTagsText ? companyTagsText.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        timeLimit: Number(formData.timeLimit),
        memoryLimit: Number(formData.memoryLimit)
      }

      await axios.post('/problems', submitData)
      
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

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setShowPreview(true)
        }}
        className="space-y-6"
      >
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
              <label className="text-sm font-medium mb-1 block">Problem Title *</label>
              <div className="border rounded-md overflow-hidden bg-background">
                <ReactQuill
                  theme="snow"
                  value={formData.title}
                  onChange={(value) => setFormData(prev => ({ ...prev, title: value }))}
                  readOnly={loading}
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder="e.g., Two Sum, Binary Tree Traversal"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Problem Description *</label>
              <div className="border rounded-md overflow-hidden bg-background">
                <ReactQuill
                  theme="snow"
                  value={formData.description}
                  onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
                  readOnly={loading}
                  modules={quillModules}
                  formats={quillFormats}
                />
              </div>
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
                <label className="text-sm font-medium mb-1 block">Tags (comma-separated)</label>
                <div className="border rounded-md overflow-hidden bg-background">
                  <ReactQuill
                    theme="snow"
                    value={formData.tags}
                    onChange={(value) => setFormData(prev => ({ ...prev, tags: value }))}
                    readOnly={loading}
                    modules={quillModules}
                    formats={quillFormats}
                    placeholder="e.g., array, hash-table, two-pointers"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Company Tags (comma-separated)</label>
              <div className="border rounded-md overflow-hidden bg-background">
                <ReactQuill
                  theme="snow"
                  value={formData.companyTags}
                  onChange={(value) => setFormData(prev => ({ ...prev, companyTags: value }))}
                  readOnly={loading}
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder="e.g., Google, Amazon, Microsoft, Apple, Meta"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Add companies that commonly ask this question in interviews
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Supported Languages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Supported Languages
            </CardTitle>
            <CardDescription>
              Select which programming languages students can use to solve this problem. Only selected languages will appear in the editor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: 'python', label: 'Python 3', icon: '🐍' },
                { key: 'javascript', label: 'JavaScript', icon: '📜' },
                { key: 'java', label: 'Java', icon: '☕' },
                { key: 'cpp', label: 'C++', icon: '⚡' },
                { key: 'c', label: 'C', icon: '🔧' }
              ].map((lang) => (
                <label
                  key={lang.key}
                  className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.supportedLanguages.includes(lang.key)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.supportedLanguages.includes(lang.key)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({
                          ...prev,
                          supportedLanguages: [...prev.supportedLanguages, lang.key]
                        }))
                      } else {
                        // Prevent unchecking if it's the last language
                        if (formData.supportedLanguages.length > 1) {
                          setFormData(prev => ({
                            ...prev,
                            supportedLanguages: prev.supportedLanguages.filter(l => l !== lang.key)
                          }))
                        } else {
                          setError('At least one language must be selected')
                          setTimeout(() => setError(''), 3000)
                        }
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    disabled={loading}
                  />
                  <span className="text-lg">{lang.icon}</span>
                  <span className="text-sm font-medium">{lang.label}</span>
                </label>
              ))}
            </div>
            {formData.supportedLanguages.length === 0 && (
              <p className="text-sm text-red-600 mt-2">⚠️ Please select at least one language</p>
            )}
          </CardContent>
        </Card>

        {/* Code Templates (optional) */}
        <Card>
          <CardHeader>
            <CardTitle>Code Templates (Optional)</CardTitle>
            <CardDescription>
              Define language-specific starter code with the exact function signature you want (e.g., <code>int findMax(vector&lt;int&gt; &amp;arr)</code>). Students will see this in the editor.
              <br />
              <span className="text-xs text-muted-foreground mt-1 block">
                Use <code className="bg-muted px-1 rounded">STUDENT_CODE_START</code> and <code className="bg-muted px-1 rounded">STUDENT_CODE_END</code> markers to define the editable region. Students will only write code between these markers.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { 
                key: 'python', 
                label: 'Python Template',
                placeholder: `# STUDENT_CODE_START
# Students will write their solution here
# Example: def twoSum(nums, target): ...
# STUDENT_CODE_END

# Test harness (hidden from students, handled by system)
if __name__ == "__main__":
    # System handles input/output and function calling
    pass`
              },
              { 
                key: 'javascript', 
                label: 'JavaScript Template',
                placeholder: `// STUDENT_CODE_START
// Students will write their solution here
// Example: function twoSum(nums, target) { ... }
// STUDENT_CODE_END

// Test harness (hidden from students, handled by system)
// System handles input/output and function calling`
              },
              { 
                key: 'java', 
                label: 'Java Template',
                placeholder: `// STUDENT_CODE_START
// Students will write their solution here
// Example: public int[] twoSum(int[] nums, int target) { ... }
// STUDENT_CODE_END

// Test harness (hidden from students, handled by system)
class Main {
    public static void main(String[] args) {
        // System handles input/output and method calling
    }
}`
              },
              { 
                key: 'cpp', 
                label: 'C++ Template',
                placeholder: `// Include necessary headers
#include <vector>
#include <iostream>
using namespace std;

// STUDENT_CODE_START
// Students will write their solution here
// Example: vector<int> twoSum(vector<int>& nums, int target) { ... }
// STUDENT_CODE_END

// Test harness (hidden from students, handled by system)
int main() {
    // System handles input/output and function calling
    return 0;
}`
              },
              { 
                key: 'c', 
                label: 'C Template',
                placeholder: `#include <stdio.h>
#include <stdlib.h>

// STUDENT_CODE_START
// Students will write their solution here
// Example: int* twoSum(int* nums, int numsSize, int target, int* returnSize) { ... }
// STUDENT_CODE_END

// Test harness (hidden from students, handled by system)
int main() {
    // System handles input/output and function calling
    return 0;
}`
              }
            ]
            .filter(({ key }) => formData.supportedLanguages.includes(key))
            .map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-sm font-medium mb-1 block">{label}</label>
                <Textarea
                  placeholder={placeholder}
                  value={formData.codeTemplates[key]}
                  onChange={(e) => {
                    const value = e.target.value
                    setFormData(prev => ({
                      ...prev,
                      codeTemplates: {
                        ...prev.codeTemplates,
                        [key]: value
                      }
                    }))
                  }}
                  rows={12}
                  disabled={loading}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Code between <code className="bg-muted px-1 rounded">STUDENT_CODE_START</code> and <code className="bg-muted px-1 rounded">STUDENT_CODE_END</code> will be editable by students. Everything else is hidden.
                </p>
              </div>
            ))}
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
              <label className="text-sm font-medium mb-1 block">Input Format *</label>
              <div className="border rounded-md overflow-hidden bg-background">
                <ReactQuill
                  theme="snow"
                  value={formData.inputFormat}
                  onChange={(value) => setFormData(prev => ({ ...prev, inputFormat: value }))}
                  readOnly={loading}
                  modules={quillModules}
                  formats={quillFormats}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Output Format *</label>
              <div className="border rounded-md overflow-hidden bg-background">
                <ReactQuill
                  theme="snow"
                  value={formData.outputFormat}
                  onChange={(value) => setFormData(prev => ({ ...prev, outputFormat: value }))}
                  readOnly={loading}
                  modules={quillModules}
                  formats={quillFormats}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Constraints *</label>
              <div className="border rounded-md overflow-hidden bg-background">
                <ReactQuill
                  theme="snow"
                  value={formData.constraints}
                  onChange={(value) => setFormData(prev => ({ ...prev, constraints: value }))}
                  readOnly={loading}
                  modules={quillModules}
                  formats={quillFormats}
                />
              </div>
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
                  <label className="text-sm font-medium mb-1 block">Explanation (optional)</label>
                  <div className="border rounded-md overflow-hidden bg-background">
                    <ReactQuill
                      theme="snow"
                      value={testCase.explanation || ''}
                      onChange={(value) => handleSampleTestCaseChange(index, 'explanation', value)}
                      readOnly={loading}
                      modules={quillModules}
                      formats={quillFormats}
                    />
                  </div>
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
              Hidden Test Cases (HackerEarth-Style Bulk Upload)
            </CardTitle>
            <CardDescription>
              Upload multiple input and output files. System will automatically pair input_i.txt with output_i.txt
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Bulk Upload Section */}
            <div className="border-2 border-dashed rounded-lg p-6 space-y-4">
              <div className="text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <h3 className="font-medium mb-2">Upload Test Case Files</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload multiple .txt files at once. Files should be named input_1.txt, output_1.txt, input_2.txt, output_2.txt, etc.
                </p>
                
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700">
                  <File className="h-4 w-4" />
                  Choose Files (Multiple)
                  <input
                    type="file"
                    accept=".txt"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files)
                      if (files.length === 0) return

                      // Group files by type (input/output) and extract numbers
                      const inputFiles = []
                      const outputFiles = []

                      for (const file of files) {
                        const name = file.name.toLowerCase()
                        if (name.startsWith('input_') && name.endsWith('.txt')) {
                          const match = name.match(/input_(\d+)\.txt/)
                          if (match) {
                            const num = parseInt(match[1])
                            inputFiles.push({ file, num, name: file.name })
                          }
                        } else if (name.startsWith('output_') && name.endsWith('.txt')) {
                          const match = name.match(/output_(\d+)\.txt/)
                          if (match) {
                            const num = parseInt(match[1])
                            outputFiles.push({ file, num, name: file.name })
                          }
                        }
                      }

                      // Sort by number
                      inputFiles.sort((a, b) => a.num - b.num)
                      outputFiles.sort((a, b) => a.num - b.num)

                      // Pair input and output files
                      const testCases = []
                      const maxNum = Math.max(
                        ...inputFiles.map(f => f.num),
                        ...outputFiles.map(f => f.num)
                      )

                      for (let i = 1; i <= maxNum; i++) {
                        const inputFile = inputFiles.find(f => f.num === i)
                        const outputFile = outputFiles.find(f => f.num === i)

                        if (inputFile && outputFile) {
                          // Read both files
                          const inputContent = await new Promise((resolve) => {
                            const reader = new FileReader()
                            reader.onload = (e) => resolve(e.target.result)
                            reader.readAsText(inputFile.file)
                          })

                          const outputContent = await new Promise((resolve) => {
                            const reader = new FileReader()
                            reader.onload = (e) => resolve(e.target.result)
                            reader.readAsText(outputFile.file)
                          })

                          testCases.push({
                            input: inputContent.trim(),
                            expectedOutput: outputContent.trim()
                          })
                        }
                      }

                      if (testCases.length > 0) {
                        setFormData(prev => ({
                          ...prev,
                          hiddenTestCases: testCases
                        }))
                        setSuccess(`Successfully loaded ${testCases.length} hidden test cases from ${files.length} files!`)
                        setTimeout(() => setSuccess(''), 3000)
                        setShowTestCaseModal(true)
                      } else {
                        setError('No valid file pairs found. Please ensure files are named input_1.txt, output_1.txt, etc.')
                        setTimeout(() => setError(''), 5000)
                      }
                    }}
                    disabled={loading}
                  />
                </label>
              </div>

              <div className="bg-muted p-4 rounded text-sm space-y-2">
                <p className="font-medium">File Naming Format:</p>
                <pre className="bg-background p-2 rounded overflow-x-auto text-xs">
{`input_1.txt    output_1.txt
input_2.txt    output_2.txt
input_3.txt    output_3.txt
...
input_70.txt   output_70.txt`}
                </pre>
                <p className="text-xs text-muted-foreground">
                  • Files must be named exactly as shown above
                  <br />
                  • Upload all files at once using the "Choose Files" button
                  <br />
                  • System will automatically pair input_i.txt with output_i.txt
                  <br />
                  • Files must be .txt format
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

        {/* Test Case Upload Confirmation Modal */}
        {showTestCaseModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Test Cases Uploaded</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTestCaseModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Successfully loaded {formData.hiddenTestCases.length} hidden test case(s)!
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTestCaseModal(false)
                  }}
                >
                  OK
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Submit / Preview Buttons */}
        <div className="flex gap-4">
          <Button
            type="button"
            disabled={loading}
            className="flex items-center gap-2"
            onClick={() => setShowPreview(true)}
          >
            <Eye className="h-4 w-4" />
            Preview Problem
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

      {/* Preview Overlay */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-xl font-semibold">Preview Problem</h2>
                <p className="text-sm text-muted-foreground">This is how students will see this problem.</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 
                  className="text-2xl font-bold"
                  dangerouslySetInnerHTML={{ __html: formData.title || 'Untitled Problem' }}
                />
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                  formData.difficulty === 'Easy'
                    ? 'text-green-600 bg-green-50 border-green-200'
                    : formData.difficulty === 'Medium'
                      ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
                      : 'text-red-600 bg-red-50 border-red-200'
                }`}>
                  {formData.difficulty}
                </span>
              </div>

              {/* Tags */}
              {(formData.tags || formData.companyTags) && (
                <div className="flex flex-wrap gap-2">
                  {stripHtml(formData.tags)
                    .split(',')
                    .map(t => t.trim())
                    .filter(Boolean)
                    .map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded border border-blue-200">
                        {tag}
                      </span>
                    ))}
                  {stripHtml(formData.companyTags)
                    .split(',')
                    .map(t => t.trim())
                    .filter(Boolean)
                    .map((company, idx) => (
                      <span key={idx} className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded border border-green-200 font-medium">
                        {company}
                      </span>
                    ))}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold mb-2">Problem Description</h3>
                  <div
                    className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: formData.description || '' }}
                  />
                </div>

                <div>
                  <h3 className="text-base font-semibold mb-2">Input Format</h3>
                  <div
                    className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: formData.inputFormat || '' }}
                  />
                </div>

                <div>
                  <h3 className="text-base font-semibold mb-2">Output Format</h3>
                  <div
                    className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: formData.outputFormat || '' }}
                  />
                </div>

                <div>
                  <h3 className="text-base font-semibold mb-2">Constraints</h3>
                  <div
                    className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: formData.constraints || '' }}
                  />
                </div>

                {formData.sampleTestCases && formData.sampleTestCases.length > 0 && (
                  <div>
                    <h3 className="text-base font-semibold mb-3">Examples</h3>
                    <div className="space-y-3">
                      {formData.sampleTestCases.map((testCase, index) => (
                        <div key={index} className="border rounded-lg p-3 bg-muted/20">
                          <div className="font-medium text-sm mb-2">Example {index + 1}:</div>
                          <div className="space-y-2">
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1">Input:</div>
                              <pre className="text-xs bg-background p-2 rounded border font-mono whitespace-pre-wrap">
                                {testCase.input}
                              </pre>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1">Output:</div>
                              <pre className="text-xs bg-background p-2 rounded border font-mono whitespace-pre-wrap">
                                {testCase.expectedOutput}
                              </pre>
                            </div>
                            {testCase.explanation && (
                              <div>
                                <div className="text-xs font-medium text-muted-foreground mb-1">Explanation:</div>
                                <div
                                  className="text-xs text-muted-foreground prose prose-sm max-w-none"
                                  dangerouslySetInnerHTML={{ __html: testCase.explanation }}
                                />
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

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(false)}
                disabled={loading}
              >
                Back to Edit
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  setShowPreview(false)
                  await handleSubmit()
                }}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Publishing...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Confirm & Publish
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CreateProblem
