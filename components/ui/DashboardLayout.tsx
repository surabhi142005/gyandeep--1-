import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, User as UserIcon, Menu } from 'lucide-react';

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
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <div className="min-h-screen bg-app-bg text-app-text transition-colors duration-300">
      <Sidebar
        items={sidebarItems}
        activeItem={activeTab}
        onItemClick={onTabChange}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        logo="/logo.png"
      />

      <div 
        className={`flex flex-col transition-all duration-300 ${collapsed ? 'pl-16' : 'pl-[220px]'}`}
      >
        {/* Navbar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center flex-1 max-w-md">
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

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-500 hover:text-primary transition-colors rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full border-2 border-white dark:border-gray-900"></span>
            </button>

            <div className="h-8 w-px bg-gray-100 dark:bg-gray-800 mx-1"></div>

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
        <main className="flex-1 p-8">
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
