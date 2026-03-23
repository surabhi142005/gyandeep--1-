import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, User as UserIcon, Menu, X } from 'lucide-react';
import { createPortal } from 'react-dom';

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
  onShowProfile
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
    <div className="min-h-screen bg-app-bg text-app-text transition-colors duration-300">
      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
          aria-label="Open menu"
        >
          <Menu size={24} className="text-gray-700 dark:text-gray-300" />
        </button>
      )}

      {/* Desktop Sidebar - hidden on mobile, shown as drawer on mobile */}
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
                className="fixed inset-0 bg-black/50 z-40"
                onClick={handleOverlayClick}
              />
              {/* Drawer */}
              <motion.div
                ref={drawerRef}
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed left-0 top-0 h-screen w-[280px] bg-primary text-white flex flex-col z-50 shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
              >
                {/* Drawer Header */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-white/20">
                      <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <span className="ml-3 font-bold text-lg tracking-tight bg-theme-gradient bg-clip-text text-transparent" style={{ WebkitTextFillColor: 'transparent' }}>
                      Gyandeep
                    </span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-lg"
                    aria-label="Close menu"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Drawer Nav */}
                <nav className="flex-1 py-6 px-2 space-y-2 overflow-y-auto custom-scrollbar">
                  {sidebarItems.map((item) => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleMenuItemClick(item.id)}
                        className={`w-full flex items-center h-11 rounded-xl transition-all duration-200 relative ${
                          isActive 
                            ? 'bg-theme-gradient text-white shadow-lg shadow-black/20' 
                            : 'text-white/50 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <div className="w-12 flex justify-center shrink-0">
                          <Icon size={20} className={isActive ? 'text-white' : 'text-inherit'} />
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
                <div className="p-2 border-t border-white/10 bg-black/5">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setCollapsed(!collapsed);
                    }}
                    className="w-full flex items-center h-10 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200"
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
        <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 md:px-6 shadow-sm">
          <div className="flex items-center flex-1 max-w-md ml-12 md:ml-0">
            <div className={`relative flex items-center w-full group transition-all duration-200 ${searchFocused ? 'scale-[1.02]' : ''}`}>
              <Search className={`absolute left-3 w-4 h-4 transition-colors duration-200 ${searchFocused ? 'text-primary' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Search anything..."
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="w-full h-10 pl-10 pr-4 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button className="relative p-2 text-gray-500 hover:text-primary transition-colors rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full border-2 border-white dark:border-gray-900"></span>
            </button>

            <div className="h-8 w-px bg-gray-100 dark:bg-gray-800 mx-1 hidden sm:block"></div>

            <button 
              onClick={onShowProfile}
              className="flex items-center gap-3 p-1 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-lg overflow-hidden border-2 border-transparent group-hover:border-primary transition-all shadow-sm">
                  {userAvatar ? (
                    <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-theme-gradient flex items-center justify-center text-white text-xs font-bold uppercase">
                      {userName[0]}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold leading-none mb-1">{userName}</p>
                <p className="text-[10px] text-gray-400 font-medium capitalize">{userRole}</p>
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
    </div>
  );
};

export default DashboardLayout;
