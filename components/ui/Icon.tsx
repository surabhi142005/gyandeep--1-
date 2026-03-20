/**
 * components/ui/Icon.tsx
 * Icon system wrapper for lucide-react with consistent styling
 */

import React from 'react';
import {
  LucideProps,
  icons,
  type LucideIcon,
  Home, Menu, X, ArrowLeft, ArrowRight, User, Users, LogIn, LogOut, Lock, Unlock, Eye, EyeOff,
  Plus, Edit, Trash2, Save, Search, Filter, Download, Upload, RefreshCw, Settings,
  Check, CheckCircle, XCircle, AlertTriangle, Info, Loader2,
  BarChart3, Calendar, Clock, Mail, Bell, File, Folder,
  BookOpen, GraduationCap, Presentation, Award, HelpCircle, ClipboardCheck,
  Palette, Moon, Sun, Minimize2, Maximize2, Expand, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Accessibility, Type, ZoomIn, ZoomOut
} from 'lucide-react';

interface IconProps extends LucideProps {
  name: string;
}

const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  strokeWidth = 2,
  className = '',
  ...props
}) => {
  const iconMap: Record<string, LucideIcon> = {
    Home, Menu, X, ArrowLeft, ArrowRight, User, Users, LogIn, LogOut, Lock, Unlock, Eye, EyeOff,
    Plus, Edit, Trash2, Save, Search, Filter, Download, Upload, RefreshCw, Settings,
    Check, CheckCircle, XCircle, AlertTriangle, Info, Loader2,
    BarChart3, Calendar, Clock, Mail, Bell, File, Folder,
    BookOpen, GraduationCap, Presentation, Award, HelpCircle, ClipboardCheck,
    Palette, Moon, Sun, Minimize2, Maximize2, Expand, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
    Accessibility, Type, ZoomIn, ZoomOut
  };

  const IconComponent = iconMap[name];

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  return (
    <IconComponent
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...props}
    />
  );
};

// Pre-defined icon presets for common use cases
export const AppIcons = {
  // Navigation
  home: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Home" {...props} />,
  menu: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Menu" {...props} />,
  close: (props?: Omit<LucideProps, 'ref'>) => <Icon name="X" {...props} />,
  back: (props?: Omit<LucideProps, 'ref'>) => <Icon name="ArrowLeft" {...props} />,
  forward: (props?: Omit<LucideProps, 'ref'>) => <Icon name="ArrowRight" {...props} />,
  
  // User & Auth
  user: (props?: Omit<LucideProps, 'ref'>) => <Icon name="User" {...props} />,
  users: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Users" {...props} />,
  login: (props?: Omit<LucideProps, 'ref'>) => <Icon name="LogIn" {...props} />,
  logout: (props?: Omit<LucideProps, 'ref'>) => <Icon name="LogOut" {...props} />,
  lock: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Lock" {...props} />,
  unlock: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Unlock" {...props} />,
  eye: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Eye" {...props} />,
  eyeOff: (props?: Omit<LucideProps, 'ref'>) => <Icon name="EyeOff" {...props} />,
  
  // Actions
  add: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Plus" {...props} />,
  edit: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Edit" {...props} />,
  delete: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Trash2" {...props} />,
  save: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Save" {...props} />,
  search: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Search" {...props} />,
  filter: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Filter" {...props} />,
  download: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Download" {...props} />,
  upload: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Upload" {...props} />,
  refresh: (props?: Omit<LucideProps, 'ref'>) => <Icon name="RefreshCw" {...props} />,
  settings: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Settings" {...props} />,
  
  // Status
  check: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Check" {...props} />,
  checkCircle: (props?: Omit<LucideProps, 'ref'>) => <Icon name="CheckCircle" {...props} />,
  error: (props?: Omit<LucideProps, 'ref'>) => <Icon name="XCircle" {...props} />,
  warning: (props?: Omit<LucideProps, 'ref'>) => <Icon name="AlertTriangle" {...props} />,
  info: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Info" {...props} />,
  loading: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Loader2" {...props} />,
  
  // Data
  chart: (props?: Omit<LucideProps, 'ref'>) => <Icon name="BarChart3" {...props} />,
  calendar: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Calendar" {...props} />,
  clock: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Clock" {...props} />,
  mail: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Mail" {...props} />,
  bell: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Bell" {...props} />,
  file: (props?: Omit<LucideProps, 'ref'>) => <Icon name="File" {...props} />,
  folder: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Folder" {...props} />,
  
  // Education
  book: (props?: Omit<LucideProps, 'ref'>) => <Icon name="BookOpen" {...props} />,
  student: (props?: Omit<LucideProps, 'ref'>) => <Icon name="GraduationCap" {...props} />,
  teacher: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Presentation" {...props} />,
  grade: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Award" {...props} />,
  quiz: (props?: Omit<LucideProps, 'ref'>) => <Icon name="HelpCircle" {...props} />,
  attendance: (props?: Omit<LucideProps, 'ref'>) => <Icon name="ClipboardCheck" {...props} />,
  
  // UI
  theme: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Palette" {...props} />,
  moon: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Moon" {...props} />,
  sun: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Sun" {...props} />,
  minimize: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Minimize2" {...props} />,
  maximize: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Maximize2" {...props} />,
  expand: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Expand" {...props} />,
  collapse: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Minimize2" {...props} />,
  chevronDown: (props?: Omit<LucideProps, 'ref'>) => <Icon name="ChevronDown" {...props} />,
  chevronUp: (props?: Omit<LucideProps, 'ref'>) => <Icon name="ChevronUp" {...props} />,
  chevronLeft: (props?: Omit<LucideProps, 'ref'>) => <Icon name="ChevronLeft" {...props} />,
  chevronRight: (props?: Omit<LucideProps, 'ref'>) => <Icon name="ChevronRight" {...props} />,
  
  // Accessibility
  accessibility: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Accessibility" {...props} />,
  eyeVisible: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Eye" {...props} />,
  fontSize: (props?: Omit<LucideProps, 'ref'>) => <Icon name="Type" {...props} />,
  zoomIn: (props?: Omit<LucideProps, 'ref'>) => <Icon name="ZoomIn" {...props} />,
  zoomOut: (props?: Omit<LucideProps, 'ref'>) => <Icon name="ZoomOut" {...props} />,
} as const;

export { Icon };
export default Icon;
