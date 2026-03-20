import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface SidebarProps {
  items: SidebarItem[];
  activeItem: string;
  onItemClick: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  logo: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  items,
  activeItem,
  onItemClick,
  collapsed,
  onToggleCollapse,
  logo
}) => {
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 220 }}
      className="fixed left-0 top-0 h-screen bg-primary text-white flex flex-col z-40 transition-all duration-300 shadow-xl overflow-hidden"
    >
      {/* Logo Area */}
      <div className="h-16 flex items-center px-4 border-b border-white/10 shrink-0">
        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-white/20">
           <img src={logo} alt="Logo" className="w-full h-full object-cover" />
        </div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="ml-3 font-bold text-lg tracking-tight bg-theme-gradient bg-clip-text text-transparent"
            style={{ WebkitTextFillColor: 'transparent' }}
          >
            Gyandeep
          </motion.span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-6 px-2 space-y-2 overflow-y-auto custom-scrollbar">
        {items.map((item) => {
          const isActive = activeItem === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onItemClick(item.id)}
              className={`w-full flex items-center h-11 rounded-xl transition-all duration-200 relative group
                ${isActive 
                  ? 'bg-theme-gradient text-white shadow-lg shadow-black/20' 
                  : 'text-white/50 hover:text-white hover:bg-white/10'}
              `}
              title={collapsed ? item.label : ''}
            >
              <div className="w-12 flex justify-center shrink-0">
                <Icon size={20} className={isActive ? 'text-white' : 'text-inherit'} />
              </div>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm font-medium whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
              {isActive && !collapsed && (
                <motion.div
                  layoutId="active-indicator"
                  className="absolute left-0 w-1 h-6 bg-white rounded-r-full"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Profile Area */}
      <div className="p-2 border-t border-white/10 bg-black/5">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center h-10 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200"
        >
          <div className="w-12 flex justify-center shrink-0">
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </div>
          {!collapsed && <span className="text-sm font-medium">Collapse Sidebar</span>}
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
