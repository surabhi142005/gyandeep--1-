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
      className="fixed left-0 top-0 h-screen flex flex-col z-40 transition-all duration-300 shadow-xl overflow-hidden"
      style={{ backgroundColor: 'var(--color-sidebar-bg)' }}
    >
      {/* Logo Area */}
      <div 
        className="h-16 flex items-center px-4 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border-2 border-white/20">
           <img src={logo} alt="Logo" className="w-full h-full object-cover" />
        </div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="ml-3 font-bold text-lg tracking-tight"
            style={{
              background: 'var(--gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Gyandeep
          </motion.span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto custom-scrollbar">
        {items.map((item) => {
          const isActive = activeItem === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onItemClick(item.id)}
              className={`
                w-full flex items-center h-12 rounded-xl transition-all duration-200 relative
                ${isActive ? 'shadow-lg' : 'hover:bg-white/10'}
              `}
              style={isActive ? {
                background: 'var(--gradient)'
              } : {
                color: 'var(--color-sidebar-text)'
              }}
              title={collapsed ? item.label : ''}
            >
              <div className="w-12 flex justify-center shrink-0">
                <Icon size={20} className={isActive ? 'text-white' : ''} />
              </div>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm font-medium"
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

      {/* Bottom Collapse Button */}
      <div 
        className="p-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
      >
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center h-10 rounded-lg transition-all duration-200 hover:bg-white/10"
          style={{ color: 'var(--color-sidebar-text)' }}
        >
          <div className="w-12 flex justify-center shrink-0">
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </div>
          {!collapsed && <span className="text-sm font-medium">Collapse</span>}
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
