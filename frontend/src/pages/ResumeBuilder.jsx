import { useState, useCallback } from 'react'
import axios from 'axios'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { 
  FileText, 
  Upload, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Brain, 
  Target,
  Sparkles,
  BarChart3,
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react'

const ResumeBuilder = () => {
  const [file, setFile] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const uploadedFile = e.dataTransfer.files[0]
      if (uploadedFile.type === "application/pdf") {
        setFile(uploadedFile)
        setError('')
      } else {
        setError('Please upload a PDF file.')
      }
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const uploadedFile = e.target.files[0]
      if (uploadedFile.type === "application/pdf") {
        setFile(uploadedFile)
        setError('')
      } else {
        setError('Please upload a PDF file.')
      }
    }
  }

  const analyzeResume = async () => {
    if (!file) return
    try {
      setAnalyzing(true)
      setError('')
      const formData = new FormData()
      formData.append('resume', file)

      const response = await axios.post('/resume/analyze', formData)

      setReport(response.data.report)
    } catch (err) {
      console.error('Analysis error:', err)
      setError(err.response?.data?.message || 'Failed to analyze resume. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  const reset = () => {
    setFile(null)
    setReport(null)
    setError('')
  }

  if (report) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analysis Report</h1>
            <p className="text-muted-foreground">Resume: {file.name}</p>
          </div>
          <Button variant="outline" onClick={reset}>Analyze Another</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-none shadow-xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-sm opacity-90 uppercase tracking-widest font-bold">ATS Score</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-7xl font-black mb-4">{report.score}</div>
              <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-white h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${report.score}%` }}
                />
              </div>
              <p className="mt-4 text-sm font-medium opacity-90">
                {report.score > 80 ? "Excellent Match!" : report.score > 60 ? "Good Potential" : "Needs Improvement"}
              </p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                Expert Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 leading-relaxed italic border-l-4 border-indigo-200 pl-4 py-2 bg-indigo-50/50 rounded-r-lg">
                "{report.summary}"
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-indigo-600 flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5" />
                Optimization Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {report.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm p-3 bg-indigo-50/30 rounded-lg border border-indigo-100/50">
                    <div className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">{i+1}</div>
                    <span className="text-slate-700">{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5" />
                  Missing Industry Terms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {report.missingKeywords.length > 0 ? report.missingKeywords.map((kw, i) => (
                    <span key={i} className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-full border border-red-100">
                      {kw}
                    </span>
                  )) : <p className="text-sm text-muted-foreground">All key terms found!</p>}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-orange-600 flex items-center gap-2 text-lg">
                  <AlertCircle className="h-5 w-5" />
                  Formatting Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {report.formatIssues?.length > 0 ? report.formatIssues.map((issue, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                      {issue}
                    </li>
                  )) : <p className="text-sm text-muted-foreground">No formatting issues detected.</p>}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-12">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
          <Brain className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">AI Resume Analyzer</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Upload your resume and get instant AI-powered feedback on how to beat the ATS 
          and land more interviews.
        </p>
      </div>

      <Card className={`border-2 border-dashed transition-all duration-300 ${
        dragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-muted-foreground/20'
      }`}>
        <CardContent className="p-12">
          {!file ? (
            <div 
              className="flex flex-col items-center justify-center space-y-4 cursor-pointer"
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-upload').click()}
            >
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center transition-transform hover:scale-110">
                <Upload className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">Drop your resume here</p>
                <p className="text-sm text-muted-foreground">Supports PDF format up to 5MB</p>
              </div>
              <input 
                id="file-upload" 
                type="file" 
                className="hidden" 
                accept="application/pdf"
                onChange={handleFileChange}
              />
              <Button variant="secondary">Browse Files</Button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-6">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl w-full max-w-md border border-muted">
                <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="font-bold truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Change</Button>
              </div>

              <div className="flex gap-4">
                <Button 
                  size="lg" 
                  className="px-12 h-14 text-lg font-bold shadow-lg" 
                  onClick={analyzeResume}
                  disabled={analyzing}
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-3" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5 mr-3 fill-current" />
                      Run AI Analysis
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
          <AlertCircle className="shrink-0 h-5 w-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
        {[
          { icon: BarChart3, title: "ATS Scoring", desc: "See precisely how your resume ranks against hiring algorithms." },
          { icon: Sparkles, title: "AI Suggestions", desc: "Get specific, line-by-line feedback to improve impact." },
          { icon: Target, title: "Keyword Match", desc: "Identify missing industry terms that recruiters look for." }
        ].map((item, i) => (
          <div key={i} className="p-6 rounded-2xl bg-muted/30 border border-transparent hover:border-primary/20 transition-all hover:bg-white hover:shadow-md group">
            <item.icon className="h-8 w-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold mb-2">{item.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ResumeBuilder
