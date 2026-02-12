import React, { ReactNode } from 'react'

interface ModernDashboardLayoutProps {
  children: ReactNode
  title: string
  user?: any
  onLogout?: () => void
  theme?: string
}

const ModernDashboardLayout: React.FC<ModernDashboardLayoutProps> = ({
  children,
  title,
  user,
  onLogout,
  theme = 'indigo'
}) => {
  const getThemeColors = () => {
    switch (theme) {
      case 'teal':
        return { from: 'from-teal-500', to: 'to-cyan-500' }
      case 'purple':
        return { from: 'from-purple-500', to: 'to-pink-500' }
      case 'indigo':
      default:
        return { from: 'from-indigo-500', to: 'to-teal-500' }
    }
  }

  const colors = getThemeColors()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/2 right-10 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-10 left-1/2 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <div className={`backdrop-blur-md bg-slate-900/50 border-b border-slate-700/50 sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          {/* Left - Logo & Title */}
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 bg-gradient-to-br ${colors.from} ${colors.to} rounded-lg flex items-center justify-center`}>
              <span className="text-xl">📚</span>
            </div>
            <div>
              <h1 className={`text-xl font-bold bg-gradient-to-r ${colors.from} ${colors.to} bg-clip-text text-transparent`}>
                Gyandeep
              </h1>
              <p className="text-xs text-gray-500">{title}</p>
            </div>
          </div>

          {/* Right - User Info */}
          <div className="flex items-center gap-6">
            {user && (
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-white">{user.name}</p>
                <p className="text-xs text-gray-400 capitalize">{user.role}</p>
              </div>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-4 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-white text-sm font-medium transition-all border border-slate-600/50 hover:border-slate-500"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
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
      `}</style>
    </div>
  )
}

export default ModernDashboardLayout
