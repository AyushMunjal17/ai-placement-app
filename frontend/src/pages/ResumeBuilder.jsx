import { useState, useEffect } from 'react'
import axios from 'axios'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { FileText, Download, Sparkles, Plus, Trash2, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

const ResumeBuilder = () => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [resumeId, setResumeId] = useState(null)
  const [activeSection, setActiveSection] = useState('personal')

  const [formData, setFormData] = useState({
    personalInfo: { fullName: '', email: '', phone: '', location: '', linkedin: '', github: '', portfolio: '', summary: '' },
    education: [{ institution: '', degree: '', field: '', startDate: '', endDate: '', grade: '' }],
    experience: [{ company: '', position: '', location: '', startDate: '', endDate: '', current: false, description: '', achievements: [''] }],
    projects: [{ name: '', description: '', technologies: [''], link: '', github: '', highlights: [''] }],
    skills: { technical: [''], tools: [''], soft: [''], languages: [''] },
    certifications: [{ name: '', issuer: '', date: '' }],
    achievements: [''],
    template: 'professional'
  })

  useEffect(() => {
    fetchResume()
  }, [])

  const fetchResume = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/resume')
      if (response.data.resume) {
        setFormData(response.data.resume)
        setResumeId(response.data.resume._id)
      }
    } catch (err) {
      if (err.response?.status !== 404) console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveResume = async () => {
    try {
      setSaving(true)
      const response = await axios.post('/resume', formData)
      setResumeId(response.data.resume._id)
      setMessage({ type: 'success', text: 'Resume saved!' })
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save' })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    }
  }

  const downloadPDF = async () => {
    if (!resumeId) {
      setMessage({ type: 'error', text: 'Please save first' })
      return
    }
    try {
      const response = await axios.get(`/resume/download/${resumeId}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `resume-${formData.personalInfo.fullName.replace(/\s+/g, '-')}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      setMessage({ type: 'success', text: 'Downloaded!' })
    } catch (err) {
      setMessage({ type: 'error', text: 'Download failed' })
    }
  }

  const enhanceWithAI = async (text, type, callback) => {
    if (!text.trim()) return
    try {
      const response = await axios.post('/resume/enhance', { text, type })
      callback(response.data.enhanced)
      setMessage({ type: 'success', text: 'Enhanced!' })
    } catch (err) {
      setMessage({ type: 'error', text: 'Enhancement failed' })
    }
  }

  const updatePersonal = (field, value) => {
    setFormData(prev => ({ ...prev, personalInfo: { ...prev.personalInfo, [field]: value } }))
  }

  const updateArray = (section, index, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: prev[section].map((item, i) => i === index ? { ...item, [field]: value } : item)
    }))
  }

  const addItem = (section, template) => {
    setFormData(prev => ({ ...prev, [section]: [...prev[section], template] }))
  }

  const removeItem = (section, index) => {
    setFormData(prev => ({ ...prev, [section]: prev[section].filter((_, i) => i !== index) }))
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2"><FileText className="h-8 w-8" />AI Resume Builder</h1>
        <p className="text-muted-foreground mt-2">Create an ATS-friendly resume</p>
      </div>

      {message.text && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {message.text}
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <Button onClick={saveResume} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Save</Button>
        <Button onClick={downloadPDF} variant="outline"><Download className="h-4 w-4 mr-2" />Download PDF</Button>
      </div>

      {/* Template Selection */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Choose Template</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {['professional', 'creative', 'technical', 'minimal'].map(t => (
              <button key={t} onClick={() => setFormData(prev => ({ ...prev, template: t }))}
                className={`p-4 border-2 rounded-lg capitalize ${formData.template === t ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                {t}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {['personal', 'education', 'experience', 'projects', 'skills', 'certifications'].map(section => (
          <Button key={section} variant={activeSection === section ? 'default' : 'outline'} size="sm"
            onClick={() => setActiveSection(section)} className="capitalize whitespace-nowrap">
            {section}
          </Button>
        ))}
      </div>

      {/* Personal Info */}
      {activeSection === 'personal' && (
        <Card>
          <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input placeholder="Full Name *" value={formData.personalInfo.fullName} onChange={(e) => updatePersonal('fullName', e.target.value)} />
              <Input placeholder="Email *" value={formData.personalInfo.email} onChange={(e) => updatePersonal('email', e.target.value)} />
              <Input placeholder="Phone *" value={formData.personalInfo.phone} onChange={(e) => updatePersonal('phone', e.target.value)} />
              <Input placeholder="Location" value={formData.personalInfo.location} onChange={(e) => updatePersonal('location', e.target.value)} />
              <Input placeholder="LinkedIn" value={formData.personalInfo.linkedin} onChange={(e) => updatePersonal('linkedin', e.target.value)} />
              <Input placeholder="GitHub" value={formData.personalInfo.github} onChange={(e) => updatePersonal('github', e.target.value)} />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium">Summary</label>
                <Button size="sm" variant="outline" onClick={() => enhanceWithAI(formData.personalInfo.summary, 'summary', (e) => updatePersonal('summary', e))}>
                  <Sparkles className="h-3 w-3 mr-1" />Enhance
                </Button>
              </div>
              <textarea className="w-full p-3 border rounded-lg min-h-[100px]" placeholder="Professional summary..."
                value={formData.personalInfo.summary} onChange={(e) => updatePersonal('summary', e.target.value)} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Education */}
      {activeSection === 'education' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between">
              <CardTitle>Education</CardTitle>
              <Button size="sm" onClick={() => addItem('education', { institution: '', degree: '', field: '', startDate: '', endDate: '', grade: '' })}>
                <Plus className="h-4 w-4 mr-1" />Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.education.map((edu, i) => (
              <div key={i} className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between">
                  <h4 className="font-medium">Education {i + 1}</h4>
                  {formData.education.length > 1 && <Button size="sm" variant="ghost" onClick={() => removeItem('education', i)}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Institution *" value={edu.institution} onChange={(e) => updateArray('education', i, 'institution', e.target.value)} />
                  <Input placeholder="Degree *" value={edu.degree} onChange={(e) => updateArray('education', i, 'degree', e.target.value)} />
                  <Input placeholder="Field" value={edu.field} onChange={(e) => updateArray('education', i, 'field', e.target.value)} />
                  <Input placeholder="Grade" value={edu.grade} onChange={(e) => updateArray('education', i, 'grade', e.target.value)} />
                  <Input placeholder="Start Date" value={edu.startDate} onChange={(e) => updateArray('education', i, 'startDate', e.target.value)} />
                  <Input placeholder="End Date" value={edu.endDate} onChange={(e) => updateArray('education', i, 'endDate', e.target.value)} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Experience */}
      {activeSection === 'experience' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between">
              <CardTitle>Experience</CardTitle>
              <Button size="sm" onClick={() => addItem('experience', { company: '', position: '', location: '', startDate: '', endDate: '', current: false, description: '', achievements: [''] })}>
                <Plus className="h-4 w-4 mr-1" />Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.experience.map((exp, i) => (
              <div key={i} className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between">
                  <h4 className="font-medium">Experience {i + 1}</h4>
                  {formData.experience.length > 1 && <Button size="sm" variant="ghost" onClick={() => removeItem('experience', i)}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Company *" value={exp.company} onChange={(e) => updateArray('experience', i, 'company', e.target.value)} />
                  <Input placeholder="Position *" value={exp.position} onChange={(e) => updateArray('experience', i, 'position', e.target.value)} />
                  <Input placeholder="Location" value={exp.location} onChange={(e) => updateArray('experience', i, 'location', e.target.value)} />
                  <Input placeholder="Start Date" value={exp.startDate} onChange={(e) => updateArray('experience', i, 'startDate', e.target.value)} />
                  <Input placeholder="End Date" value={exp.endDate} onChange={(e) => updateArray('experience', i, 'endDate', e.target.value)} />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium">Description</label>
                    <Button size="sm" variant="outline" onClick={() => enhanceWithAI(exp.description, 'experience', (e) => updateArray('experience', i, 'description', e))}>
                      <Sparkles className="h-3 w-3 mr-1" />Enhance
                    </Button>
                  </div>
                  <textarea className="w-full p-2 border rounded-lg" rows={3} value={exp.description} onChange={(e) => updateArray('experience', i, 'description', e.target.value)} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Projects */}
      {activeSection === 'projects' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between">
              <CardTitle>Projects</CardTitle>
              <Button size="sm" onClick={() => addItem('projects', { name: '', description: '', technologies: [''], link: '', github: '', highlights: [''] })}>
                <Plus className="h-4 w-4 mr-1" />Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.projects.map((proj, i) => (
              <div key={i} className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between">
                  <h4 className="font-medium">Project {i + 1}</h4>
                  {formData.projects.length > 1 && <Button size="sm" variant="ghost" onClick={() => removeItem('projects', i)}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
                </div>
                <Input placeholder="Project Name *" value={proj.name} onChange={(e) => updateArray('projects', i, 'name', e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Demo Link" value={proj.link} onChange={(e) => updateArray('projects', i, 'link', e.target.value)} />
                  <Input placeholder="GitHub" value={proj.github} onChange={(e) => updateArray('projects', i, 'github', e.target.value)} />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium">Description</label>
                    <Button size="sm" variant="outline" onClick={() => enhanceWithAI(proj.description, 'project', (e) => updateArray('projects', i, 'description', e))}>
                      <Sparkles className="h-3 w-3 mr-1" />Enhance
                    </Button>
                  </div>
                  <textarea className="w-full p-2 border rounded-lg" rows={3} value={proj.description} onChange={(e) => updateArray('projects', i, 'description', e.target.value)} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Skills */}
      {activeSection === 'skills' && (
        <Card>
          <CardHeader><CardTitle>Skills</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {['technical', 'tools', 'soft', 'languages'].map(category => (
              <div key={category}>
                <label className="text-sm font-medium capitalize mb-2 block">{category} Skills</label>
                <Input placeholder={`Enter ${category} skills (comma-separated)`}
                  value={formData.skills[category].join(', ')}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    skills: { ...prev.skills, [category]: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                  }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Certifications */}
      {activeSection === 'certifications' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between">
              <CardTitle>Certifications</CardTitle>
              <Button size="sm" onClick={() => addItem('certifications', { name: '', issuer: '', date: '' })}>
                <Plus className="h-4 w-4 mr-1" />Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.certifications.map((cert, i) => (
              <div key={i} className="p-4 border rounded-lg">
                <div className="flex justify-between mb-3">
                  <h4 className="font-medium">Certification {i + 1}</h4>
                  {formData.certifications.length > 1 && <Button size="sm" variant="ghost" onClick={() => removeItem('certifications', i)}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Input placeholder="Name" value={cert.name} onChange={(e) => updateArray('certifications', i, 'name', e.target.value)} />
                  <Input placeholder="Issuer" value={cert.issuer} onChange={(e) => updateArray('certifications', i, 'issuer', e.target.value)} />
                  <Input placeholder="Date" value={cert.date} onChange={(e) => updateArray('certifications', i, 'date', e.target.value)} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ResumeBuilder
