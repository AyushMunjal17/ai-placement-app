import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { 
  Brain, 
  Send, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  User, 
  Bot,
  MessageSquare,
  BarChart3,
  ArrowLeft,
  Trophy,
  Target,
  Zap
} from 'lucide-react'

const AIInterview = () => {
  const [role, setRole] = useState('')
  const [interviewId, setInterviewId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [report, setReport] = useState(null)
  const [status, setStatus] = useState('pending') // pending, in-progress, completed
  
  const scrollRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const startInterview = async () => {
    if (!role.trim()) return
    try {
      setStarting(true)
      const response = await axios.post('/interview/start', { role })
      setInterviewId(response.data.interviewId)
      setMessages([{ role: 'assistant', content: response.data.message }])
      setStatus('in-progress')
    } catch (err) {
      console.error('Start error:', err)
    } finally {
      setStarting(false)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading || status === 'completed') return
    
    const userMessage = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    
    try {
      setLoading(true)
      const response = await axios.post('/interview/answer', {
        interviewId,
        answer: userMessage
      })
      
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.message }])
      
      if (response.data.status === 'completed') {
        setStatus('completed')
        setReport(response.data.report)
      }
    } catch (err) {
      console.error('Send error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'pending') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-8">
        <div className="space-y-4">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
            <Brain className="h-10 w-10" />
          </div>
          <h1 className="text-4xl font-bold">One-to-One AI Interview</h1>
          <p className="text-muted-foreground text-lg">
            Experience a realistic technical interview tailored to your target role. 
            Our AI will ask questions, provide feedback, and help you improve.
          </p>
        </div>

        <Card className="p-6 border-dashed border-2">
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2 text-left">
              <label className="text-sm font-medium">What role are you applying for?</label>
              <Input 
                placeholder="e.g. Frontend Developer, Data Scientist, SRE..." 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && startInterview()}
              />
            </div>
            <Button 
              className="w-full h-12 text-lg" 
              onClick={startInterview} 
              disabled={starting || !role.trim()}
            >
              {starting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Zap className="h-5 w-5 mr-2" />}
              Start Interview
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-sm">Real-time Data</h3>
            <p className="text-xs text-muted-foreground">Get instant feedback on your answers and communication style.</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-sm">Role-Specific</h3>
            <p className="text-xs text-muted-foreground">Questions are customized based on the role and industry standards.</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-sm">Analytics</h3>
            <p className="text-xs text-muted-foreground">Receive a detailed performance report with scores and tips.</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'completed' && report) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Interview Performance Report</h1>
            <p className="text-muted-foreground">Role: {role}</p>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try Another Role
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 bg-primary text-primary-foreground">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-sm opacity-80 uppercase tracking-wider font-bold">Overall Score</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-6xl font-black mb-2">{report.score}</div>
              <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-white h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${report.score}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Expert Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed italic border-l-4 border-primary/20 pl-4 py-1">
                "{report.summary}"
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Key Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {report.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm p-2 bg-green-50 rounded border border-green-100">
                    <span className="font-bold text-green-600 shrink-0 mt-0.5">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-blue-600 flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {report.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm p-2 bg-blue-50 rounded border border-blue-100">
                    <span className="font-bold text-blue-600 shrink-0 mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Interview Transcript</CardTitle>
            <CardDescription>Review your conversation with the AI interviewer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-4 ${m.role === 'assistant' ? 'bg-muted/30' : ''} p-4 rounded-lg`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    m.role === 'assistant' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                  }`}>
                    {m.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase text-muted-foreground">{m.role === 'assistant' ? 'Interviewer' : 'You'}</p>
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center pt-8">
           <Button variant="ghost" className="text-muted-foreground" onClick={() => navigate('/dashboard')}>
             <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
           </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-5xl h-[calc(100vh-120px)] flex flex-col pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <Brain size={24} />
          </div>
          <div>
            <h2 className="font-bold">Interviewing for {role}</h2>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <p className="text-xs text-muted-foreground capitalize">{status.replace('-', ' ')}</p>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => window.confirm('Cancel session?') && setStatus('pending')}>
          End Session
        </Button>
      </div>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden shadow-xl border-t-4 border-t-primary">
        <ScrollArea className="flex-1 p-4" viewportRef={scrollRef}>
          <div className="space-y-6 max-w-4xl mx-auto pt-4 pb-20">
            {messages.map((m, i) => (
              <div 
                key={i} 
                className={`flex gap-3 md:gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                  m.role === 'assistant' ? 'bg-white border text-primary' : 'bg-primary text-primary-foreground'
                }`}>
                  {m.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
                </div>
                <div className={`p-4 md:p-5 rounded-2xl max-w-[85%] md:max-w-[75%] shadow-sm ${
                  m.role === 'assistant' ? 'bg-white border rounded-tl-none' : 'bg-primary text-primary-foreground rounded-tr-none'
                }`}>
                  <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-2xl bg-white border flex items-center justify-center shrink-0">
                  <Bot size={20} className="text-primary animate-pulse" />
                </div>
                <div className="p-4 bg-white border rounded-2xl rounded-tl-none flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            {status === 'completed' && (
              <div className="flex justify-center p-6 animate-in zoom-in duration-500">
                <Card className="bg-primary text-primary-foreground p-6 shadow-2xl max-w-sm text-center space-y-4">
                  <Trophy className="h-12 w-12 mx-auto text-yellow-400" />
                  <div>
                    <h3 className="text-xl font-bold">Interview Complete!</h3>
                    <p className="text-sm opacity-90">Your performance analysis is ready for review.</p>
                  </div>
                  <Button 
                    variant="secondary" 
                    className="w-full font-bold"
                    onClick={() => {
                        // Force a refresh of the component state to show report
                        setStatus('completed')
                    }}
                  >
                    View Detailed Report <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 bg-slate-50 border-t">
          <div className="max-w-4xl mx-auto flex gap-2">
            <Input 
              className="bg-white py-6"
              placeholder="Type your answer here..." 
              value={input} 
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={loading || status === 'completed'}
            />
            <Button className="h-full px-4 flex items-center gap-2" onClick={sendMessage} disabled={loading || !input.trim()}>
              <span className="hidden md:inline">Send</span>
              <Send size={18} />
            </Button>
          </div>
          <p className="text-[10px] text-center text-muted-foreground mt-2">
            AI Interviewer is evaluating your responses. Be descriptive and professional.
          </p>
        </div>
      </Card>
    </div>
  )
}

// Simple ScrollArea fallback if UI component is missing
const ScrollArea = ({ children, className, viewportRef }) => (
  <div className={`overflow-y-auto ${className}`} ref={viewportRef}>
    {children}
  </div>
)

export default AIInterview
