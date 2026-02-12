import React, { useState } from 'react'
import '../styles/design-3d.css'

interface EnhancedLoginProps {
  onLogin: (userId: string, role: 'student' | 'teacher' | 'admin') => void
}

const EnhancedLogin: React.FC<EnhancedLoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'student' | 'teacher' | 'admin'>('student')
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher' | 'admin' | null>(null)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      const userId = `${role}-${Date.now()}`
      onLogin(userId, role)
      setLoading(false)
    }, 1000)
  }

  const roles = [
    {
      id: 'student',
      name: 'Student',
      icon: '👨‍🎓',
      color: 'from-blue-500 to-cyan-500',
      description: 'Learn & Track Progress'
    },
    {
      id: 'teacher',
      name: 'Teacher',
      icon: '👨‍🏫',
      color: 'from-purple-500 to-pink-500',
      description: 'Manage Classes & Track'
    },
    {
      id: 'admin',
      name: 'Administrator',
      icon: '⚙️',
      color: 'from-orange-500 to-red-500',
      description: 'System Configuration'
    }
  ]

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* 3D Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-10 left-1/2 w-72 h-72 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12 stagger-container">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">📚</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-teal-400 bg-clip-text text-transparent">
              Gyandeep
            </h1>
          </div>
          <p className="text-gray-400 text-lg mb-2">AI-Powered Classroom System</p>
          <p className="text-gray-500 text-sm max-w-md mx-auto">Experience the future of education with intelligent learning analytics and real-time collaboration</p>
        </div>

        {/* Main Container */}
        <div className="w-full max-w-6xl">
          {/* Role Selection */}
          {!selectedRole ? (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-8 text-center">Choose Your Role</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRole(r.id as any)}
                    className="group card-3d cursor-pointer p-8 hover:scale-105"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className={`text-6xl mb-4 transform group-hover:scale-125 transition-transform duration-300`}>
                        {r.icon}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">{r.name}</h3>
                      <p className="text-gray-400 text-sm">{r.description}</p>
                      <div className="mt-4 w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-50 transition-opacity"></div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Login Form */
            <div className="flex flex-col lg:flex-row gap-8 items-center">
              {/* Left Side - Benefits */}
              <div className="flex-1 hidden lg:block">
                <div className="glass-panel">
                  <h3 className="text-2xl font-bold text-white mb-8">Why Gyandeep?</h3>
                  <div className="space-y-6">
                    {[
                      { icon: '🎯', title: 'Precision Learning', desc: 'AI-powered quiz generation tailored to your needs' },
                      { icon: '🔐', title: 'Secure Access', desc: 'Face recognition and location-based authentication' },
                      { icon: '📊', title: 'Real Analytics', desc: 'Track progress with comprehensive performance metrics' },
                      { icon: '🤖', title: 'Smart Assistant', desc: 'Chat with AI for instant help and guidance' }
                    ].map((benefit, idx) => (
                      <div key={idx} className="flex gap-4 group">
                        <div className="text-3xl">{benefit.icon}</div>
                        <div>
                          <h4 className="font-semibold text-white group-hover:text-indigo-400 transition-colors">{benefit.title}</h4>
                          <p className="text-gray-400 text-sm">{benefit.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Side - Login Form */}
              <div className="flex-1 w-full max-w-md">
                <form onSubmit={handleLogin} className="glass-panel space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
                    <p className="text-gray-400 text-sm">Sign in as <span className="text-indigo-400 font-semibold">{selectedRole}</span></p>
                  </div>

                  {/* Email Input */}
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    />
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-500 to-teal-500 opacity-0 group-focus-within:opacity-10 transition-opacity blur pointer-events-none"></div>
                  </div>

                  {/* Password Input */}
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    />
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-500 to-teal-500 opacity-0 group-focus-within:opacity-10 transition-opacity blur pointer-events-none"></div>
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" className="w-4 h-4 rounded bg-slate-800 border-slate-700 accent-indigo-500 cursor-pointer" />
                      <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">Remember me</span>
                    </label>
                    <a href="#" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">Forgot password?</a>
                  </div>

                  {/* Login Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-indigo-500 to-teal-500 hover:from-indigo-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:shadow-lg shadow-indigo-500/50"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      'Sign In'
                    )}
                  </button>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-slate-800 text-gray-500">Or continue with</span>
                    </div>
                  </div>

                  {/* Social Buttons */}
                  <div className="grid grid-cols-2 gap-4">
                    <button className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-slate-700 hover:border-slate-600 hover:bg-slate-700/50 transition-all">
                      <span className="text-lg">👤</span>
                      <span className="text-sm text-gray-400">Google</span>
                    </button>
                    <button className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-slate-700 hover:border-slate-600 hover:bg-slate-700/50 transition-all">
                      <span className="text-lg">🔐</span>
                      <span className="text-sm text-gray-400">SSO</span>
                    </button>
                  </div>

                  {/* Footer */}
                  <p className="text-center text-gray-500 text-xs">
                    Don't have an account? <a href="#" className="text-indigo-400 hover:text-indigo-300 transition-colors">Sign up</a>
                  </p>

                  {/* Back Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedRole(null)}
                    className="w-full py-2 px-4 rounded-lg font-medium text-gray-400 border border-slate-700 hover:text-white hover:border-slate-600 transition-all"
                  >
                    ← Back to Role Selection
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-gray-500 text-sm">
          <p>© 2026 Gyandeep. All rights reserved. | <a href="#" className="text-indigo-400 hover:text-indigo-300">Privacy</a> | <a href="#" className="text-indigo-400 hover:text-indigo-300">Terms</a></p>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .bg-grid-pattern {
          background-image: 
            linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent),
            linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent);
          background-size: 50px 50px;
        }

        .stagger-container > * {
          animation: fadeInUp 0.6s ease-out backwards;
        }

        .stagger-container > *:nth-child(1) { animation-delay: 0.1s; }
        .stagger-container > *:nth-child(2) { animation-delay: 0.2s; }
        .stagger-container > *:nth-child(3) { animation-delay: 0.3s; }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

export default EnhancedLogin
