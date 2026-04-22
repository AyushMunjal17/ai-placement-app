import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { 
  Code, 
  Brain, 
  FileText, 
  ArrowRight, 
  Clock,
  CheckCircle
} from 'lucide-react'

const Home = () => {
  const { isAuthenticated, user } = useAuth()

  const modules = [
    {
      id: 1,
      title: "LeetCode-Style Coding Platform",
      description: "Practice coding problems, submit solutions, and get real-time feedback with our Judge0-powered execution engine.",
      icon: Code,
      status: "active",
      link: "/problems",
      features: [
        "Real-time code execution",
        "Multiple programming languages",
        "Problem creation and sharing",
        "Detailed test case feedback"
      ]
    },
    {
      id: 2,
      title: "One-to-One AI Interview",
      description: "Experience realistic technical interviews with our AI interviewer. Get personalized feedback and improve your interview skills.",
      icon: Brain,
      status: "active",
      link: "/ai-interview",
      features: [
        "AI-powered mock interviews",
        "Real-time feedback",
        "Performance analytics",
        "Industry-specific questions"
      ]
    },
    {
      id: 3,
      title: "AI Resume Analyzer",
      description: "Analyze, optimize and create professional resumes tailored to your target roles using our AI-powered analyzer.",
      icon: FileText,
      status: "active",
      link: "/resume-builder",
      features: [
        "AI-powered content suggestions",
        "Industry-specific templates",
        "ATS-friendly formats",
        "Real-time optimization tips"
      ]
    }
  ]

  return (
    <div className="space-y-24 py-10">
      {/* Hero Section */}
      <section className="text-center space-y-10 animate-fade-in-up">
        <div className="space-y-6">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
            Elevate Your <span className="text-gradient">Career</span> with AI
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Master your technical interviews with our state-of-the-art platform 
            featuring coding challenges, AI-driven mock interviews, and resume optimization.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          {isAuthenticated ? (
            <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <p className="text-sm font-medium bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
                Welcome back, <span className="text-primary">{user?.firstName}</span>
              </p>
              <div className="flex gap-4 justify-center">
                <Link to="/problems">
                  <Button size="lg" variant="premium" className="flex items-center gap-2 px-8 py-6 text-lg">
                    <Code className="h-5 w-5" />
                    Start Coding
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button variant="outline" size="lg" className="px-8 py-6 text-lg border-white/20 hover:bg-white/5">
                    View Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <Link to="/register">
                <Button size="lg" variant="premium" className="flex items-center gap-2 px-8 py-6 text-lg">
                  Get Started for Free
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="px-8 py-6 text-lg border-white/20 hover:bg-white/5">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Modules Section */}
      <section className="space-y-12 relative">
        <div className="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10 translate-y-20"></div>
        
        <div className="text-center space-y-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <h2 className="text-3xl md:text-4xl font-bold">Powerful Modules</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to ace your technical interviews and land your dream job.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {modules.map((module, index) => (
            <Card 
              key={module.id} 
              className="glass-card hover:scale-[1.02] transition-all duration-500 animate-fade-in-up"
              style={{ animationDelay: `${0.6 + index * 0.1}s` }}
            >
              {module.status === 'coming-soon' && (
                <div className="absolute top-4 right-4 z-20">
                  <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md text-white/70 px-3 py-1 rounded-full text-xs font-medium border border-white/10">
                    <Clock className="h-3 w-3" />
                    Coming Soon
                  </div>
                </div>
              )}
              
              <CardHeader className="relative">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                  module.status === 'active' 
                    ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.2)]' 
                    : 'bg-white/5 text-muted-foreground'
                }`}>
                  <module.icon className="h-7 w-7" />
                </div>
                <CardTitle className="text-2xl font-bold mb-2">{module.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed text-muted-foreground/80">
                  {module.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {module.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3 text-sm text-foreground/80">
                      <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>

                {module.status === 'active' ? (
                  <Link to={module.link} className="block group">
                    <Button variant="outline" className="w-full h-11 bg-primary/5 dark:bg-white/10 hover:bg-primary hover:text-white transition-all duration-300 border-primary/10 dark:border-white/5 hover:border-primary/50 text-primary dark:text-foreground">
                      Explore Module
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                ) : (
                  <Button disabled className="w-full h-11 bg-white/5 border-white/5">
                    Stay Tuned
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center space-y-8 glass-card rounded-3xl p-12 relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.9s' }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 blur-[80px] -ml-32 -mb-32"></div>
        
        <h2 className="text-3xl md:text-4xl font-bold">Ready to Start Your Journey?</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
          Join thousands of developers who are already improving their coding skills 
          and interview performance with our platform.
        </p>
        {!isAuthenticated && (
          <Link to="/register">
            <Button size="lg" variant="premium" className="px-10 py-7 text-lg group">
              Create Your Free Account
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        )}
      </section>
    </div>
  )
}

export default Home
