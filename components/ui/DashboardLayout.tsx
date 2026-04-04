import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import ThemeSwitcher from './ThemeSwitcher';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, Menu, X } from 'lucide-react';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  sidebarItems: SidebarItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  userName: string;
  userRole: string;
  userAvatar?: string | null;
  onLogout: () => void;
  onShowProfile: () => void;
  theme?: string;
  onThemeChange?: (theme: string) => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  sidebarItems,
  activeTab,
  onTabChange,
  userName,
  userRole,
  userAvatar,
  onLogout,
  onShowProfile,
  theme = 'cosmic-purple',
  onThemeChange
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setMobileMenuOpen(false);
    }
  };

  const handleMenuItemClick = (id: string) => {
    onTabChange(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] transition-colors duration-300">
      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="fixed top-4 left-4 z-50 p-2.5 bg-[var(--color-surface)] rounded-xl shadow-lg border border-[var(--color-border)]"
          aria-label="Open menu"
        >
          <Menu size={24} className="text-[var(--color-text)]" />
        </button>
      )}

      {/* Desktop Sidebar */}
      {!isMobile ? (
        <Sidebar
          items={sidebarItems}
          activeItem={activeTab}
          onItemClick={onTabChange}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          logo="/logo.png"
        />
      ) : (
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                onClick={handleOverlayClick}
              />
              {/* Drawer */}
              <motion.div
                ref={drawerRef}
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed left-0 top-0 h-screen w-[280px] flex flex-col z-50 shadow-2xl"
                style={{ background: 'var(--color-sidebar-bg)' }}
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
              >
                {/* Drawer Header */}
                <div 
                  className="h-16 flex items-center justify-between px-4 shrink-0"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <div className="flex items-center">
                    <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border-2 border-white/20">
                      <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <span
                      className="ml-3 font-bold text-lg tracking-tight"
                      style={{
                        background: 'var(--gradient)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      Gyandeep
                    </span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    aria-label="Close menu"
                    style={{ color: 'var(--color-sidebar-text)' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Drawer Nav */}
                <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto custom-scrollbar ios-overflow-scroll" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                  {sidebarItems.map((item) => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleMenuItemClick(item.id)}
                        className={`w-full flex items-center h-12 rounded-xl transition-all duration-200 relative ${
                          isActive
                            ? 'shadow-lg'
                            : 'hover:bg-white/10'
                        }`}
                        style={isActive ? {
                          background: 'var(--gradient)'
                        } : {
                          color: 'var(--color-sidebar-text)'
                        }}
                      >
                        <div className="w-12 flex justify-center shrink-0">
                          <Icon size={20} className={isActive ? 'text-white' : ''} />
                        </div>
                        <span className="text-sm font-medium">{item.label}</span>
                        {isActive && (
                          <div className="absolute left-0 w-1 h-6 bg-white rounded-r-full" />
                        )}
                      </button>
                    );
                  })}
                </nav>

                {/* Drawer Footer */}
                <div 
                  className="p-2"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setCollapsed(!collapsed);
                    }}
                    className="w-full flex items-center h-10 rounded-lg transition-all duration-200 hover:bg-white/10"
                    style={{ color: 'var(--color-sidebar-text)' }}
                  >
                    <div className="w-12 flex justify-center shrink-0">
                      {collapsed ? <Menu size={18} /> : <Menu size={18} />}
                    </div>
                    <span className="text-sm font-medium">Collapse</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}

      {/* Main Content */}
      <div
        className={`flex flex-col transition-all duration-300 ${!isMobile ? (collapsed ? 'pl-16' : 'pl-[220px]') : 'pl-0'}`}
      >
        {/* Navbar */}
        <header 
          className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 md:px-6 backdrop-blur-md transition-all duration-300"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            borderBottom: '1px solid var(--color-border)'
          }}
        >
          <div className="flex items-center flex-1 max-w-md ml-12 md:ml-0 pl-10 sm:pl-0">
            <div className={`relative flex items-center w-full group transition-all duration-200 ${searchFocused ? 'scale-[1.02]' : ''}`}>
              <Search 
                className={`absolute left-3 w-5 h-5 transition-colors duration-200 ${searchFocused ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`} 
              />
              <input
                type="text"
                placeholder="Search anything..."
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="w-full h-11 pl-11 pr-4 rounded-xl text-sm transition-all duration-200 outline-none gd-input-focus"
                style={{
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  border: '2px solid var(--color-border)'
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button 
              className="relative p-2.5 rounded-xl transition-all duration-200 hover:bg-[var(--color-bg)]"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <Bell size={20} />
              <span 
                className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                style={{ backgroundColor: 'var(--color-secondary)' }}
              />
            </button>

            <div 
              className="h-8 w-px mx-1 hidden sm:block" 
              style={{ backgroundColor: 'var(--color-border)' }}
            />

            <button
              onClick={onShowProfile}
              className="flex items-center gap-3 p-1.5 rounded-xl transition-all duration-200 group"
              style={{ backgroundColor: 'transparent' }}
            >
              <div className="relative">
                <div 
                  className="w-9 h-9 rounded-xl overflow-hidden border-2 transition-all duration-200 group-hover:border-[var(--color-primary)]"
                  style={{
                    borderColor: 'transparent',
                    padding: '2px',
                    background: 'var(--gradient)'
                  }}
                >
                  <div 
                    className="w-full h-full rounded-lg overflow-hidden"
                    style={{ background: 'var(--color-surface)' }}
                  >
                    {userAvatar ? (
                      <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center text-white text-sm font-bold uppercase"
                        style={{ background: 'var(--gradient)' }}
                      >
                        {userName[0]}
                      </div>
                    )}
                  </div>
                </div>
                <div 
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                  style={{ backgroundColor: '#22C55E' }}
                />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-bold leading-none mb-0.5" style={{ color: 'var(--color-text)' }}>{userName}</p>
                <p className="text-xs font-medium capitalize" style={{ color: 'var(--color-text-muted)' }}>{userRole}</p>
              </div>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Theme Switcher */}
      {onThemeChange && (
        <ThemeSwitcher currentTheme={theme} onThemeChange={onThemeChange} />
      )}
    </div>
  );
};

export default DashboardLayout;
