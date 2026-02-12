import React from 'react'
import '../styles/design-3d.css'

const EducationLanding: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/2 right-10 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-10 left-1/2 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="backdrop-blur-md bg-slate-900/50 border-b border-slate-700/50 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-teal-500 rounded-lg flex items-center justify-center">
                <span className="text-xl">📚</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-teal-400 bg-clip-text text-transparent">Gyandeep</span>
            </div>
            <button className="px-6 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-teal-500 hover:from-indigo-600 hover:to-teal-600 font-semibold transform hover:scale-105 transition-transform">
              Get Started
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                The Future of <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-teal-400 bg-clip-text text-transparent">Education</span> is Here
              </h1>
              <p className="text-xl text-gray-400 leading-relaxed">
                Gyandeep combines cutting-edge AI, face recognition, and intelligent analytics to create an immersive learning experience that adapts to every student's unique needs.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { number: '50K+', label: 'Active Students' },
                  { number: '500+', label: 'Schools' },
                  { number: '1M+', label: 'Lessons' },
                  { number: '98%', label: 'Success Rate' }
                ].map((stat, idx) => (
                  <div key={idx} className="bg-gradient-to-br from-indigo-500/10 to-teal-500/10 backdrop-blur-sm border border-indigo-500/20 rounded-lg p-4">
                    <div className="text-3xl font-bold text-indigo-400">{stat.number}</div>
                    <div className="text-sm text-gray-400">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button className="px-8 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-teal-500 hover:from-indigo-600 hover:to-teal-600 font-semibold transform hover:scale-105 transition-all shadow-lg shadow-indigo-500/50">
                  Start Free Trial
                </button>
                <button className="px-8 py-3 rounded-lg border border-slate-700 hover:bg-slate-700/50 font-semibold transform hover:scale-105 transition-all">
                  Watch Demo
                </button>
              </div>
            </div>

            {/* Right - 3D Illustration */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-teal-500 rounded-3xl blur-3xl opacity-20"></div>
              <div className="relative bg-gradient-to-br from-indigo-500/10 to-teal-500/10 backdrop-blur-sm border border-indigo-500/30 rounded-3xl p-12 h-96 flex items-center justify-center overflow-hidden">
                <div className="space-y-8 text-center">
                  <div className="text-7xl animate-bounce">🎓</div>
                  <div className="flex gap-4 justify-center">
                    <div className="w-16 h-16 rounded-lg bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center text-3xl transform hover:rotate-12 transition-transform">🤖</div>
                    <div className="w-16 h-16 rounded-lg bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-3xl transform hover:rotate-12 transition-transform">📊</div>
                    <div className="w-16 h-16 rounded-lg bg-teal-500/20 border border-teal-500/50 flex items-center justify-center text-3xl transform hover:rotate-12 transition-transform">🔐</div>
                  </div>
                  <p className="text-sm text-gray-400">AI-Powered Learning Platform</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <h2 className="text-4xl font-bold text-center mb-16">Why Choose Gyandeep?</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: '🤖',
                title: 'AI-Powered Learning',
                description: 'Personalized quizzes and recommendations based on your learning style'
              },
              {
                icon: '🔐',
                title: 'Face ID Authentication',
                description: 'Secure access with advanced facial recognition technology'
              },
              {
                icon: '📍',
                title: 'Location Verification',
                description: 'GPS-based attendance tracking for accurate records'
              },
              {
                icon: '📊',
                title: 'Real-time Analytics',
                description: 'Comprehensive performance metrics and insights'
              },
              {
                icon: '💬',
                title: 'Smart Chatbot',
                description: '24/7 AI assistant for instant help and guidance'
              },
              {
                icon: '🎯',
                title: 'Adaptive Learning',
                description: 'Content adapts to your pace and learning level'
              },
              {
                icon: '👥',
                title: 'Collaboration Tools',
                description: 'Work together with classmates and teachers seamlessly'
              },
              {
                icon: '🚀',
                title: 'Cloud-Based',
                description: 'Access anywhere, anytime on any device'
              }
            ].map((feature, idx) => (
              <div
                key={idx}
                className="group glass-panel p-6 hover:border-indigo-500/50 transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className="text-4xl mb-4 transform group-hover:scale-125 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold mb-2 group-hover:text-indigo-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="glass-panel text-center p-12 space-y-8">
            <h2 className="text-4xl font-bold">Ready to Transform Education?</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Join thousands of educators and students who are already experiencing the power of intelligent learning. Start your journey today.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <button className="px-8 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-teal-500 hover:from-indigo-600 hover:to-teal-600 font-semibold transform hover:scale-105 transition-all shadow-lg shadow-indigo-500/50">
                Get Started Free
              </button>
              <button className="px-8 py-3 rounded-lg border border-indigo-500 hover:bg-indigo-500/10 font-semibold transform hover:scale-105 transition-all">
                Schedule Demo
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-700/50 backdrop-blur-sm bg-slate-900/50 mt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              {[
                {
                  title: 'Product',
                  links: ['Features', 'Pricing', 'Security', 'API']
                },
                {
                  title: 'Company',
                  links: ['About', 'Blog', 'Careers', 'Contact']
                },
                {
                  title: 'Resources',
                  links: ['Documentation', 'Support', 'Community', 'Status']
                },
                {
                  title: 'Legal',
                  links: ['Privacy', 'Terms', 'Cookie', 'License']
                }
              ].map((col, idx) => (
                <div key={idx}>
                  <h4 className="font-semibold mb-4">{col.title}</h4>
                  <ul className="space-y-2">
                    {col.links.map((link, i) => (
                      <li key={i}>
                        <a href="#" className="text-gray-400 hover:text-indigo-400 transition-colors">
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-700/50 pt-8 flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-500 text-sm">© 2026 Gyandeep. All rights reserved.</p>
              <div className="flex gap-4 mt-4 md:mt-0">
                <a href="#" className="text-gray-400 hover:text-indigo-400 text-2xl transition-colors">𝕏</a>
                <a href="#" className="text-gray-400 hover:text-indigo-400 text-2xl transition-colors">ƒ</a>
                <a href="#" className="text-gray-400 hover:text-indigo-400 text-2xl transition-colors">in</a>
              </div>
            </div>
          </div>
        </footer>
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

        .glass-panel {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  )
}

export default EducationLanding
