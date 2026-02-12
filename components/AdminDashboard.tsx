import React, { useState, useEffect, useMemo } from 'react';
import type { AnyUser, UserRole, Student, Teacher, Admin, SubjectConfig } from '../types';
import { UserRole as UserRoleEnum, ROLE_DISPLAY_NAMES } from '../types';
import { getCurrentPosition } from '../services/locationService';
import type { Coordinates } from '../types';
import Spinner from './Spinner';
import WebcamCapture from './WebcamCapture';
import AdminFaceViewer from './AdminFaceViewer';
import { adminOverride } from '../services/dataService';
import { registerFace, verifyFace } from '../services/authService';
import { bulkImportUsers } from '../services/dataService';
import { fetchQuestionBank, updateQuestionInBank, deleteQuestionFromBank, addQuestionsToBank, fetchTagPresets, updateTagPresets } from '../services/dataService';
import { t } from '../services/i18n';

interface AdminDashboardProps {
  admin: Admin;
  users: AnyUser[];
  onUpdateUsers: (users: AnyUser[]) => void;
  onLogout: () => void;
  theme: string;
  setTheme: (theme: string) => void;
  onUpdateFaceImage: (adminId: string, faceImage: string) => void;
  allSubjects: SubjectConfig[];
  setAllSubjects: (subjects: SubjectConfig[]) => void;
  allClasses: any[];
  setAllClasses: (classes: any[]) => void;
}

const THEMES = [
  { name: 'indigo', color: 'bg-indigo-600', gradient: 'from-indigo-500 to-purple-600' },
  { name: 'teal', color: 'bg-teal-600', gradient: 'from-teal-500 to-blue-600' },
  { name: 'crimson', color: 'bg-red-600', gradient: 'from-red-500 to-pink-600' },
  { name: 'purple', color: 'bg-purple-600', gradient: 'from-purple-500 to-indigo-600' },
  { name: 'ocean', color: 'bg-cyan-600', gradient: 'from-cyan-500 to-blue-600' },
  { name: 'sunset', color: 'bg-orange-600', gradient: 'from-orange-500 to-red-600' },
];

const THEME_COLORS: Record<string, Record<string, string>> = {
    indigo: { 
      primary: 'bg-indigo-600', 
      hover: 'hover:bg-indigo-700', 
      text: 'text-indigo-800',
      gradient: 'bg-gradient-to-r from-indigo-600 to-purple-600',
      card: 'bg-white/90 backdrop-blur-sm',
      border: 'border-indigo-200',
      light: 'bg-indigo-50',
      accent: 'accent-indigo-600',
      shadow: 'shadow-indigo-200',
      badge: 'bg-indigo-100 text-indigo-800',
      lightText: 'text-indigo-700',
      lightHover: 'hover:bg-indigo-100',
      focus: 'focus:ring-indigo-500 focus:border-indigo-500'
    },
    teal: { 
      primary: 'bg-teal-600', 
      hover: 'hover:bg-teal-700', 
      text: 'text-teal-800',
      gradient: 'bg-gradient-to-r from-teal-600 to-blue-600',
      card: 'bg-white/90 backdrop-blur-sm',
      border: 'border-teal-200',
      light: 'bg-teal-50',
      accent: 'accent-teal-600',
      shadow: 'shadow-teal-200',
      badge: 'bg-teal-100 text-teal-800',
      lightText: 'text-teal-700',
      lightHover: 'hover:bg-teal-100',
      focus: 'focus:ring-teal-500 focus:border-teal-500'
    },
    crimson: { 
      primary: 'bg-red-600', 
      hover: 'hover:bg-red-700', 
      text: 'text-red-800',
      gradient: 'bg-gradient-to-r from-red-600 to-pink-600',
      card: 'bg-white/90 backdrop-blur-sm',
      border: 'border-red-200',
      light: 'bg-red-50',
      accent: 'accent-red-600',
      shadow: 'shadow-red-200',
      badge: 'bg-red-100 text-red-800',
      lightText: 'text-red-700',
      lightHover: 'hover:bg-red-100',
      focus: 'focus:ring-red-500 focus:border-red-500'
    },
    purple: { 
      primary: 'bg-purple-600', 
      hover: 'hover:bg-purple-700', 
      text: 'text-purple-800',
      gradient: 'bg-gradient-to-r from-purple-600 to-indigo-600',
      card: 'bg-white/90 backdrop-blur-sm',
      border: 'border-purple-200',
      light: 'bg-purple-50',
      accent: 'accent-purple-600',
      shadow: 'shadow-purple-200',
      badge: 'bg-purple-100 text-purple-800',
      lightText: 'text-purple-700',
      lightHover: 'hover:bg-purple-100',
      focus: 'focus:ring-purple-500 focus:border-purple-500'
    },
    ocean: { 
      primary: 'bg-cyan-600', 
      hover: 'hover:bg-cyan-700', 
      text: 'text-cyan-800',
      gradient: 'bg-gradient-to-r from-cyan-600 to-blue-600',
      card: 'bg-white/90 backdrop-blur-sm',
      border: 'border-cyan-200',
      light: 'bg-cyan-50',
      accent: 'accent-cyan-600',
      shadow: 'shadow-cyan-200',
      badge: 'bg-cyan-100 text-cyan-800',
      lightText: 'text-cyan-700',
      lightHover: 'hover:bg-cyan-100',
      focus: 'focus:ring-cyan-500 focus:border-cyan-500'
    },
    sunset: { 
      primary: 'bg-orange-600', 
      hover: 'hover:bg-orange-700', 
      text: 'text-orange-800',
      gradient: 'bg-gradient-to-r from-orange-600 to-red-600',
      card: 'bg-white/90 backdrop-blur-sm',
      border: 'border-orange-200',
      light: 'bg-orange-50',
      accent: 'accent-orange-600',
      shadow: 'shadow-orange-200',
      badge: 'bg-orange-100 text-orange-800',
      lightText: 'text-orange-700',
      lightHover: 'hover:bg-orange-100',
      focus: 'focus:ring-orange-500 focus:border-orange-500'
    },
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ admin, users, onUpdateUsers, onLogout, theme, setTheme, onUpdateFaceImage, allSubjects, setAllSubjects, allClasses, setAllClasses }) => {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Add User State
  const [newUserName, setNewUserName] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRoleEnum.STUDENT);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserAssignedSubjects, setNewUserAssignedSubjects] = useState<string[]>([]);
  const [addUserError, setAddUserError] = useState<string | null>(null);

  // Edit User State
  const [editingUser, setEditingUser] = useState<AnyUser | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedId, setEditedId] = useState('');
  const [editedAssignedSubjects, setEditedAssignedSubjects] = useState<string[]>([]);
  const [editUserError, setEditUserError] = useState<string | null>(null);

  // Face Capture State
  const [capturingForUser, setCapturingForUser] = useState<AnyUser | null>(null);
  const [showFaceRegistration, setShowFaceRegistration] = useState(false);
  const [showFaceViewer, setShowFaceViewer] = useState(false);
  const [verifyingForUser, setVerifyingForUser] = useState<AnyUser | null>(null);
  const [overrideForUser, setOverrideForUser] = useState<AnyUser | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [isOverrideSubmitting, setIsOverrideSubmitting] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState<boolean | null>(null);
  
  // Subject Management State
  const [newSubjectName, setNewSubjectName] = useState('');
  const [subjectError, setSubjectError] = useState<string | null>(null);
  const [editingSubject, setEditingSubject] = useState<SubjectConfig | null>(null);
  const [editedSubjectName, setEditedSubjectName] = useState('');

  // Class Management State
  const [newClassName, setNewClassName] = useState('');
  const [classError, setClassError] = useState<string | null>(null);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [editedClassName, setEditedClassName] = useState('');

  // UI State
  const [activeTab, setActiveTab] = useState<'users' | 'subjects' | 'classes' | 'analytics' | 'qbank'>('users');
  const [bank, setBank] = useState<any[]>([]);
  const [bankSubjectFilter, setBankSubjectFilter] = useState<string>('');
  const [bankTagFilter, setBankTagFilter] = useState<string>('');
  const [editingBankItem, setEditingBankItem] = useState<any | null>(null);
  const [selectedQIds, setSelectedQIds] = useState<string[]>([]);
  const [showDeleteFilteredConfirm, setShowDeleteFilteredConfirm] = useState(false);
  const [lastDeletedSnapshot, setLastDeletedSnapshot] = useState<any[]>([]);
  const [tagPresets, setTagPresets] = useState<Record<string, string[]>>({});
  const [presetSubject, setPresetSubject] = useState<string>('');
  const [presetTagsInput, setPresetTagsInput] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');

  const colors = useMemo(() => THEME_COLORS[theme] || THEME_COLORS.indigo, [theme]);

  useEffect(() => {
    getCurrentPosition()
      .then(setLocation)
      .catch(err => setLocationError(err.message));
  }, []);

  useEffect(() => {
    fetchQuestionBank().then(setBank).catch(() => {});
    fetchTagPresets().then(setTagPresets).catch(() => {});
  }, []);
  
  // Filter users based on search and role filter
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           user.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, filterRole]);

  // Analytics data
  const analytics = useMemo(() => {
    const totalUsers = users.length;
    const students = users.filter(u => u.role === UserRoleEnum.STUDENT).length;
    const teachers = users.filter(u => u.role === UserRoleEnum.TEACHER).length;
    const admins = users.filter(u => u.role === UserRoleEnum.ADMIN).length;
    const usersWithFace = users.filter(u => u.faceImage).length;
    
    return { totalUsers, students, teachers, admins, usersWithFace };
  }, [users]);
  
  const handleStartEdit = (user: AnyUser) => {
    setEditingUser(user);
    setEditedName(user.name);
    setEditedId(user.id);
    if (user.role === UserRoleEnum.TEACHER) {
      setEditedAssignedSubjects((user as Teacher).assignedSubjects || []);
    } else {
      setEditedAssignedSubjects([]);
    }
    setEditUserError(null);
  };
  
  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditedName('');
    setEditedId('');
    setEditedAssignedSubjects([]);
    setEditUserError(null);
  };
  
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditUserError(null);
  
    if (!editingUser) return;
    
    const trimmedName = editedName.trim();
    const trimmedId = editedId.trim().toLowerCase();
  
    if (!trimmedName || !trimmedId) {
      setEditUserError("Name and User ID cannot be empty.");
      return;
    }
  
    if (trimmedId !== editingUser.id && users.some(u => u.id === trimmedId)) {
      setEditUserError("User ID already exists.");
      return;
    }

    // Enhanced validation for edited ID
    if (editingUser.role === UserRoleEnum.STUDENT && !trimmedId.startsWith('s')) {
      setEditUserError("Invalid Student ID. Must start with 's'.");
      return;
    }
    if (editingUser.role === UserRoleEnum.TEACHER && !trimmedId.startsWith('t')) {
      setEditUserError("Invalid Teacher ID. Must start with 't'.");
      return;
    }
    if (editingUser.role === UserRoleEnum.ADMIN && !trimmedId.startsWith('a')) {
      setEditUserError("Invalid Administrator ID. Must start with 'a'.");
      return;
    }
    if (!/^[a-z][a-z0-9]*$/.test(trimmedId)) {
        setEditUserError("Invalid ID format. Must start with a letter and contain only letters or numbers.");
        return;
    }
  
    const updatedUsers = users.map(u => {
      if (u.id === editingUser.id) {
        const updatedUser = { ...u, name: trimmedName, id: trimmedId };
        if (updatedUser.role === UserRoleEnum.TEACHER) {
          (updatedUser as Teacher).assignedSubjects = editedAssignedSubjects;
        }
        return updatedUser;
      }
      return u;
    });
  
    onUpdateUsers(updatedUsers);
    handleCancelEdit();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const text = await file.text();
      const newUsers = JSON.parse(text);
      if (!Array.isArray(newUsers)) {
        throw new Error("Uploaded file must contain a JSON array of users.");
      }
      await bulkImportUsers(newUsers);
      onUpdateUsers(newUsers);
    } catch (err: any) {
      setUploadError(`Failed to process file: ${err.message}`);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };
  
  const handleAddNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError(null);
    const trimmedId = newUserId.trim().toLowerCase();
    const trimmedName = newUserName.trim();
    const trimmedEmail = newUserEmail.trim();
    const trimmedPassword = newUserPassword.trim();
  
    if (!trimmedName || !trimmedId) {
      setAddUserError("Name and User ID cannot be empty.");
      return;
    }

    if (!trimmedEmail || !trimmedPassword) {
        setAddUserError("Email and Password are required.");
        return;
    }
    if (trimmedPassword.length < 6) {
        setAddUserError("Password must be at least 6 characters long.");
        return;
    }
    if (users.some(u => u.email?.toLowerCase() === trimmedEmail.toLowerCase())) {
        setAddUserError("An account with this email already exists.");
        return;
    }
  
    // ID prefix validation
    if (newUserRole === UserRoleEnum.STUDENT && !trimmedId.startsWith('s')) {
      setAddUserError("Invalid Student ID. Must start with 's'.");
      return;
    }
    if (newUserRole === UserRoleEnum.TEACHER && !trimmedId.startsWith('t')) {
      setAddUserError("Invalid Teacher ID. Must start with 't'.");
      return;
    }
    if (newUserRole === UserRoleEnum.ADMIN && !trimmedId.startsWith('a')) {
      setAddUserError("Invalid Administrator ID. Must start with 'a'.");
      return;
    }

    // General ID format validation
    if (!/^[a-z][a-z0-9]*$/.test(trimmedId)) {
        setAddUserError("Invalid ID format. Must start with a letter and contain only letters or numbers.");
        return;
    }
  
    // ID uniqueness validation
    if (users.some(u => u.id === trimmedId)) {
      setAddUserError("User ID already exists.");
      return;
    }
  
    const baseNewUser = { id: trimmedId, name: trimmedName, faceImage: null };
    
    let newUser: AnyUser;
    if (newUserRole === UserRoleEnum.STUDENT) {
      newUser = { ...baseNewUser, role: UserRoleEnum.STUDENT, performance: [] };
    } else if (newUserRole === UserRoleEnum.TEACHER) {
      newUser = { ...baseNewUser, role: UserRoleEnum.TEACHER, email: trimmedEmail, password: trimmedPassword, assignedSubjects: newUserAssignedSubjects };
    } else { // Admin
      newUser = { ...baseNewUser, role: UserRoleEnum.ADMIN, email: trimmedEmail, password: trimmedPassword };
    }
    
    onUpdateUsers([...users, newUser]);
    setNewUserName('');
    setNewUserId('');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserRole(UserRoleEnum.STUDENT);
    setNewUserAssignedSubjects([]);
  };
  
  const handleRoleChange = (userId: string, newRole: UserRole) => {
    const updatedUsers = users.map((user): AnyUser => {
      if (user.id !== userId || user.role === newRole) {
        return user;
      }
  
      // From Student to Teacher/Admin
      if (user.role === UserRoleEnum.STUDENT) {
        const { performance, ...rest } = user;
        if (newRole === UserRoleEnum.TEACHER) {
          return { ...rest, role: UserRoleEnum.TEACHER, assignedSubjects: [] }; // Add assignedSubjects for new teacher
        } else { // newRole must be ADMIN
          return { ...rest, role: UserRoleEnum.ADMIN };
        }
      }
      
      // From Teacher/Admin to Student
      if (newRole === UserRoleEnum.STUDENT) {
        const { assignedSubjects, ...rest } = user as Teacher; // Remove assignedSubjects if becoming student
        return { ...rest, role: UserRoleEnum.STUDENT, performance: [] };
      }
  
      // Between Teacher and Admin
      if (user.role === UserRoleEnum.TEACHER && newRole === UserRoleEnum.ADMIN) {
        const { assignedSubjects, ...rest } = user as Teacher; // Remove assignedSubjects if becoming admin
        return { ...rest, role: newRole };
      }
      if (user.role === UserRoleEnum.ADMIN && newRole === UserRoleEnum.TEACHER) {
        return { ...user, role: newRole, assignedSubjects: [] }; // Add assignedSubjects for new teacher
      }

      return { ...user, role: newRole } as AnyUser; // Default case
    });
    onUpdateUsers(updatedUsers);
  };
  
  const handleRemoveUser = (userId: string) => {
    if (window.confirm("Are you sure you want to remove this user?")) {
      onUpdateUsers(users.filter(user => user.id !== userId));
    }
  };

  const handleAssignClass = async (studentId: string, classId: string) => {
    const updatedUsers = users.map(u => {
      if (u.id === studentId && u.role === UserRoleEnum.STUDENT) {
        return { ...u, classId } as Student;
      }
      return u;
    });
    onUpdateUsers(updatedUsers);
  };

  async function handleCaptureForUser(imageDataUrl: string) {
    if (!capturingForUser) return;
    const updatedUsers = users.map(u => u.id === capturingForUser.id ? { ...u, faceImage: imageDataUrl } : u);
    onUpdateUsers(updatedUsers);
    try {
      await registerFace(capturingForUser.id, imageDataUrl);
    } catch (e) {
      console.error(e);
    }
    setCapturingForUser(null);
  }
  
  const handleAdminFaceRegister = async (imageDataUrl: string) => {
    onUpdateFaceImage(admin.id, imageDataUrl);
    try {
      await registerFace(admin.id, imageDataUrl);
    } catch (e) {
      console.error(e);
    }
    setShowFaceRegistration(false);
  };

  async function handleVerifyCapture(imageDataUrl: string) {
    if (!verifyingForUser) return;
    setVerifyMessage(null);
    setVerifySuccess(null);
    try {
      const res = await verifyFace(imageDataUrl, verifyingForUser.id);
      if (res.authenticated) {
        setVerifySuccess(true);
        setVerifyMessage(`Face login verified for ${verifyingForUser.name}`);
      } else {
        setVerifySuccess(false);
        setVerifyMessage(`Face login failed for ${verifyingForUser.name}`);
      }
    } catch (e: any) {
      setVerifySuccess(false);
      setVerifyMessage(e.message || 'Verification error');
    } finally {
      setVerifyingForUser(null);
      setTimeout(() => setVerifyMessage(null), 4000);
    }
  }

  const getRoleBadgeColor = (role: UserRole) => {
    switch(role) {
      case UserRoleEnum.ADMIN: return 'bg-purple-100 text-purple-800 border-purple-200';
      case UserRoleEnum.TEACHER: return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case UserRoleEnum.STUDENT: return 'bg-teal-100 text-teal-800 border-teal-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Subject Management Handlers
  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    setSubjectError(null);
    const trimmedName = newSubjectName.trim();
    if (!trimmedName) {
      setSubjectError("Subject name cannot be empty.");
      return;
    }
    if (allSubjects.some(s => s.name.toLowerCase() === trimmedName.toLowerCase())) {
      setSubjectError("Subject with this name already exists.");
      return;
    }
    const newSubjectId = trimmedName.toLowerCase().replace(/\s+/g, '-');
    setAllSubjects([...allSubjects, { id: newSubjectId, name: trimmedName }]);
    setNewSubjectName('');
  };

  const handleStartEditSubject = (subject: SubjectConfig) => {
    setEditingSubject(subject);
    setEditedSubjectName(subject.name);
    setSubjectError(null);
  };

  const handleSaveEditSubject = (e: React.FormEvent) => {
    e.preventDefault();
    setSubjectError(null);
    if (!editingSubject) return;
    const trimmedName = editedSubjectName.trim();
    if (!trimmedName) {
      setSubjectError("Subject name cannot be empty.");
      return;
    }
    if (allSubjects.some(s => s.id !== editingSubject.id && s.name.toLowerCase() === trimmedName.toLowerCase())) {
      setSubjectError("Subject with this name already exists.");
      return;
    }

    setAllSubjects(allSubjects.map(s => 
      s.id === editingSubject.id ? { ...s, name: trimmedName } : s
    ));
    setEditingSubject(null);
    setEditedSubjectName('');
  };

  const handleCancelEditSubject = () => {
    setEditingSubject(null);
    setEditedSubjectName('');
    setSubjectError(null);
  };

  const handleRemoveSubject = (subjectId: string) => {
    if (window.confirm("Are you sure you want to remove this subject? It will be unassigned from all teachers.")) {
      setAllSubjects(allSubjects.filter(s => s.id !== subjectId));
      onUpdateUsers(users.map(u => {
        if (u.role === UserRoleEnum.TEACHER) {
          return { ...u, assignedSubjects: (u as Teacher).assignedSubjects.filter(sId => sId !== subjectId) };
        }
        return u;
      }));
    }
  };

  // Class Management Handlers
  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    setClassError(null);
    const trimmedName = newClassName.trim();
    if (!trimmedName) {
      setClassError("Class name cannot be empty.");
      return;
    }
    if (allClasses.some((c: any) => c.name.toLowerCase() === trimmedName.toLowerCase())) {
      setClassError("A class with this name already exists.");
      return;
    }
    const newClass = { id: trimmedName.toLowerCase().replace(/\s+/g, '-'), name: trimmedName };
    setAllClasses([...allClasses, newClass]);
    setNewClassName('');
  };

  const handleStartEditClass = (cls: any) => {
    setEditingClass(cls);
    setEditedClassName(cls.name);
    setClassError(null);
  };

  const handleSaveEditClass = (e: React.FormEvent) => {
    e.preventDefault();
    setClassError(null);
    if (!editingClass) return;
    const trimmedName = editedClassName.trim();
    if (!trimmedName) {
      setClassError("Class name cannot be empty.");
      return;
    }
    if (allClasses.some((c: any) => c.id !== editingClass.id && c.name.toLowerCase() === trimmedName.toLowerCase())) {
      setClassError("A class with this name already exists.");
      return;
    }

    setAllClasses(allClasses.map((c: any) => 
      c.id === editingClass.id ? { ...c, name: trimmedName } : c
    ));
    setEditingClass(null);
    setEditedClassName('');
  };

  const handleCancelEditClass = () => {
    setEditingClass(null);
    setEditedClassName('');
    setClassError(null);
  };

  const handleRemoveClass = (classId: string) => {
    if (window.confirm("Are you sure you want to remove this class? Students will be unassigned.")) {
      setAllClasses(allClasses.filter((c: any) => c.id !== classId));
      // Unassign students from this class
      onUpdateUsers(users.map(u => {
        if (u.role === UserRoleEnum.STUDENT && (u as Student).classId === classId) {
          return { ...u, classId: undefined };
        }
        return u;
      }));
    }
  };

  // Handler for assigning subjects to new teacher
  const handleNewTeacherSubjectChange = (subjectId: string, isChecked: boolean) => {
    setNewUserAssignedSubjects(prev => 
      isChecked ? [...prev, subjectId] : prev.filter(id => id !== subjectId)
    );
  };

  // Handler for assigning subjects to editing teacher
  const handleEditTeacherSubjectChange = (subjectId: string, isChecked: boolean) => {
    setEditedAssignedSubjects(prev => 
      isChecked ? [...prev, subjectId] : prev.filter(id => id !== subjectId)
    );
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 ${colors.shadow}`}>
      {/* Modern Header */}
      <header className={`${colors.gradient} shadow-2xl backdrop-blur-lg border-b border-white/20`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-8">
            <div className="flex items-center space-x-6">
              <div className={`w-16 h-16 rounded-2xl ${colors.light} flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300`}>
                <svg className={`w-8 h-8 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Admin Dashboard</h1>
                <p className="text-white/90 text-lg font-medium">Welcome back, {admin.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              {/* Enhanced Theme Selector */}
              <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3">
                <span className="text-white/90 text-sm font-medium">Theme</span>
                <div className="flex space-x-2">
                  {THEMES.map(t => (
                    <button 
                      key={t.name} 
                      onClick={() => setTheme(t.name)} 
                      className={`w-8 h-8 rounded-full ${t.color} transform transition-all duration-300 ${theme === t.name ? 'ring-3 ring-white scale-125 shadow-lg' : 'hover:scale-110 hover:shadow-md'}`}
                      aria-label={`Set theme to ${t.name}`}
                    />
                  ))}
                </div>
              </div>
              <button 
                onClick={onLogout} 
                className="bg-white/20 backdrop-blur-sm text-white font-semibold py-3 px-6 rounded-2xl hover:bg-white/30 transition-all duration-300 flex items-center space-x-3 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Modern Navigation Tabs */}
      <div className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1">
            {[
              { id: 'users', label: 'Users', icon: '👥', desc: 'Manage users' },
              { id: 'subjects', label: 'Subjects', icon: '📚', desc: 'Subject management' },
              { id: 'classes', label: 'Classes', icon: '🏫', desc: 'Class organization' },
              { id: 'faces', label: 'Faces', icon: '📷', desc: 'Registered faces' },
              { id: 'analytics', label: 'Analytics', icon: '📊', desc: 'Data insights' },
              { id: 'qbank', label: t('Question Bank'), icon: '❓', desc: t('Manage questions') }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center space-y-1 py-6 px-6 border-b-2 font-medium transition-all duration-300 transform hover:scale-105 ${
                  activeTab === tab.id 
                    ? `${colors.border} ${colors.text} border-current bg-gradient-to-b ${colors.light} to-transparent` 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-2xl">{tab.icon}</span>
                <span className="text-sm font-semibold">{tab.label}</span>
                <span className="text-xs opacity-70">{tab.desc}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Enhanced Sidebar */}
            <div className="lg:col-span-1 space-y-8">
              {/* Modern Admin Profile Card */}
              <div className={`${colors.card} rounded-2xl shadow-xl border ${colors.border} p-8 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl`}>
                <div className="flex flex-col items-center text-center mb-6">
                  <div className={`w-20 h-20 rounded-full ${colors.gradient} flex items-center justify-center text-white text-3xl font-bold shadow-2xl mb-4 transform hover:rotate-12 transition-transform duration-300`}>
                    {admin.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-gray-800 mb-1">{admin.name}</h3>
                    <p className="text-gray-600 font-medium">{admin.email}</p>
                    <span className={`inline-block px-4 py-2 text-sm font-bold rounded-full ${colors.badge} mt-3 shadow-md`}>
                      👑 Administrator
                    </span>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-gray-700 flex items-center space-x-2">
                      <span>🔐</span>
                      <span>Face ID</span>
                    </h4>
                    <button 
                      onClick={() => setShowFaceRegistration(true)}
                      className={`text-xs font-bold ${colors.primary} ${colors.hover} text-white px-4 py-2 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105`}
                    >
                      {admin.faceImage ? '🔄 Update' : '✨ Register'}
                    </button>
                  </div>
                  {admin.faceImage ? (
                    <div className="flex items-center space-x-4 p-3 bg-green-50 rounded-xl border border-green-200">
                      <img src={admin.faceImage} alt="Admin face" className="w-14 h-14 rounded-full object-cover border-3 border-green-400 shadow-md"/>
                      <div>
                        <p className="text-sm font-bold text-green-700 flex items-center space-x-1">
                          <span>✅</span>
                          <span>Registered</span>
                        </p>
                        <p className="text-xs text-green-600 font-medium">Face ID active & secure</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
                        <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-600">Not registered</p>
                        <p className="text-xs text-gray-500 font-medium">Click to setup biometric security</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced Quick Stats */}
              <div className={`${colors.card} rounded-2xl shadow-xl border ${colors.border} p-6 transform hover:scale-105 transition-all duration-300`}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-xl text-gray-800 flex items-center space-x-2">
                    <span>📈</span>
                    <span>Quick Stats</span>
                  </h3>
                  <div className={`w-3 h-3 ${colors.primary} rounded-full animate-pulse`}></div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">👥</span>
                      <span className="text-sm font-semibold text-gray-700">Total Users</span>
                    </div>
                    <span className="font-bold text-xl text-gray-800">{analytics.totalUsers}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-teal-50 rounded-xl border border-teal-100">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">🎓</span>
                      <span className="text-sm font-semibold text-teal-700">Students</span>
                    </div>
                    <span className="font-bold text-xl text-teal-600">{analytics.students}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">👨‍🏫</span>
                      <span className="text-sm font-semibold text-indigo-700">Teachers</span>
                    </div>
                    <span className="font-bold text-xl text-indigo-600">{analytics.teachers}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl border border-green-100">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">🤖</span>
                      <span className="text-sm font-semibold text-green-700">Face ID Users</span>
                    </div>
                    <span className="font-bold text-xl text-green-600">{analytics.usersWithFace}</span>
                  </div>
                </div>
              </div>

              {/* Enhanced System Status */}
              <div className={`${colors.card} rounded-2xl shadow-xl border ${colors.border} p-6 transform hover:scale-105 transition-all duration-300`}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-xl text-gray-800 flex items-center space-x-2">
                    <span>⚡</span>
                    <span>System Status</span>
                  </h3>
                  <div className={`w-3 h-3 ${location ? 'bg-green-500' : locationError ? 'bg-red-500' : 'bg-yellow-500'} rounded-full animate-pulse`}></div>
                </div>
                {location && (
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-xl border border-green-200 mb-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-bold text-green-700">✅ Location verified</span>
                  </div>
                )}
                {locationError && (
                  <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-xl border border-red-200 mb-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-bold text-red-600">❌ {locationError}</span>
                  </div>
                )}
                {!location && !locationError && (
                  <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-xl border border-yellow-200 mb-3">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-bold text-yellow-600">⏳ Locating...</span>
                  </div>
                )}
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <p className="text-xs text-gray-600 font-medium">
                    📍 {location ? `Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}` : 'Location data unavailable'}
                  </p>
                </div>
              </div>
            </div>

            {/* Enhanced Main Content */}
            <div className="lg:col-span-3 space-y-8">
              {/* Modern Add User Form */}
              <div className={`${colors.card} rounded-2xl shadow-xl border ${colors.border} p-8 transform hover:scale-[1.01] transition-all duration-300`}>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Add New User</h2>
                    <p className="text-gray-600">Create new student, teacher, or admin accounts</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className={`${colors.primary} ${colors.hover} text-white px-6 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span>Import Users</span>
                    </label>
                  </div>
                </div>
                
                <form onSubmit={handleAddNewUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="newUserName" className="block text-sm font-bold text-gray-700 mb-3">Full Name</label>
                    <input 
                      type="text" 
                      id="newUserName" 
                      value={newUserName} 
                      onChange={e => setNewUserName(e.target.value)} 
                      className={`w-full px-5 py-4 border-2 ${colors.border} rounded-xl focus:outline-none ${colors.focus} transition-all duration-200 text-lg font-medium shadow-sm hover:shadow-md`} 
                      placeholder="e.g., Jane Doe" 
                    />
                  </div>
                  <div>
                    <label htmlFor="newUserId" className="block text-sm font-bold text-gray-700 mb-3">User ID</label>
                    <input 
                      type="text" 
                      id="newUserId" 
                      value={newUserId} 
                      onChange={e => setNewUserId(e.target.value)} 
                      className={`w-full px-5 py-4 border-2 ${colors.border} rounded-xl focus:outline-none ${colors.focus} transition-all duration-200 text-lg font-medium shadow-sm hover:shadow-md`} 
                      placeholder="e.g., s4, t2, or a2" 
                    />
                  </div>
                  <div>
                    <label htmlFor="newUserRole" className="block text-sm font-bold text-gray-700 mb-3">Role</label>
                    <select 
                      id="newUserRole" 
                      value={newUserRole} 
                      onChange={e => {setNewUserRole(e.target.value as UserRole); setNewUserAssignedSubjects([]);}} 
                      className={`w-full px-5 py-4 border-2 ${colors.border} rounded-xl focus:outline-none ${colors.focus} transition-all duration-200 text-lg font-medium shadow-sm hover:shadow-md bg-white`}
                    >
                      <option value={UserRoleEnum.STUDENT}>👨‍🎓 Student</option>
                      <option value={UserRoleEnum.TEACHER}>👩‍🏫 Teacher</option>
                      <option value={UserRoleEnum.ADMIN}>👨‍💼 Administrator</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="newUserEmail" className="block text-sm font-bold text-gray-700 mb-3">Email Address</label>
                    <input
                      type="email"
                      id="newUserEmail"
                      value={newUserEmail}
                      onChange={e => setNewUserEmail(e.target.value)}
                      className={`w-full px-5 py-4 border-2 ${colors.border} rounded-xl focus:outline-none ${colors.focus} transition-all duration-200 text-lg font-medium shadow-sm hover:shadow-md`}
                      placeholder="user@example.com"
                      required={newUserRole === UserRoleEnum.TEACHER || newUserRole === UserRoleEnum.ADMIN}
                    />
                  </div>
                  <div>
                    <label htmlFor="newUserPassword" className="block text-sm font-bold text-gray-700 mb-3">Password</label>
                    <input
                      type="password"
                      id="newUserPassword"
                      value={newUserPassword}
                      onChange={e => setNewUserPassword(e.target.value)}
                      className={`w-full px-5 py-4 border-2 ${colors.border} rounded-xl focus:outline-none ${colors.focus} transition-all duration-200 text-lg font-medium shadow-sm hover:shadow-md`}
                      placeholder="Min. 6 characters"
                      required={newUserRole === UserRoleEnum.TEACHER || newUserRole === UserRoleEnum.ADMIN}
                    />
                  </div>
                  {newUserRole === UserRoleEnum.TEACHER && (
                    <div className="md:col-span-2 lg:col-span-3">
                      <label className="block text-sm font-bold text-gray-700 mb-3">Assigned Subjects</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-40 overflow-y-auto border-2 border-gray-200 rounded-xl p-4 bg-gray-50">
                        {allSubjects.length > 0 ? (
                          allSubjects.map(subject => (
                            <label key={subject.id} className="flex items-center space-x-3 cursor-pointer hover:bg-white p-3 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md bg-white">
                              <input
                                type="checkbox"
                                className={`form-checkbox h-5 w-5 ${colors.accent} rounded-lg`}
                                value={subject.id}
                                checked={newUserAssignedSubjects.includes(subject.id)}
                                onChange={(e) => handleNewTeacherSubjectChange(subject.id, e.target.checked)}
                              />
                              <span className="text-sm font-semibold text-gray-700">{subject.name}</span>
                            </label>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 col-span-2 text-center py-4">No subjects available. Add some in the Subjects tab.</p>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="md:col-span-2 lg:col-span-3">
                    {addUserError && (
                      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
                        <div className="flex items-center space-x-2">
                          <span className="text-red-500">❌</span>
                          <p className="text-sm font-semibold text-red-600">{addUserError}</p>
                        </div>
                      </div>
                    )}
                    <button 
                      type="submit" 
                      className={`w-full ${colors.primary} ${colors.hover} text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl text-lg`}
                    >
                      <span className="flex items-center justify-center space-x-2">
                        <span>➕</span>
                      <span>{t('Add New User')}</span>
                      </span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Modern User Management */}
              <div className={`${colors.card} rounded-2xl shadow-xl border ${colors.border} p-8 transform hover:scale-[1.01] transition-all duration-300`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 space-y-4 sm:space-y-0">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('User Management')}</h2>
                    <p className="text-gray-600">{t('Manage all system users and their permissions')}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="🔍 Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`pl-10 pr-4 py-3 border-2 ${colors.border} rounded-xl focus:outline-none ${colors.focus} transition-all duration-200 w-full sm:w-72 text-lg font-medium shadow-sm hover:shadow-md`}
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <span className="text-gray-400 text-lg">🔍</span>
                      </div>
                    </div>
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value as UserRole | 'all')}
                      className={`px-5 py-3 border-2 ${colors.border} rounded-xl focus:outline-none ${colors.focus} transition-all duration-200 text-lg font-medium shadow-sm hover:shadow-md bg-white`}
                    >
                      <option value="all">👥 {t('All Roles')}</option>
                      <option value={UserRoleEnum.STUDENT}>🎓 {t('Students')}</option>
                      <option value={UserRoleEnum.TEACHER}>👨‍🏫 {t('Teachers')}</option>
                      <option value={UserRoleEnum.ADMIN}>👑 {t('Admins')}</option>
                    </select>
                  </div>
                </div>

                {verifyMessage && (
                  <div className={`mb-4 px-4 py-3 rounded-xl border ${verifySuccess ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    <p className="text-sm font-semibold">{verifyMessage}</p>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <div className="min-w-full">
                    {filteredUsers.length > 0 ? (
                      <div className="grid gap-4">
                        {filteredUsers.map(user => (
                          <div key={user.id} className={`${colors.card} rounded-lg border ${colors.border} p-4 hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]`}>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                              <div className="flex items-center space-x-4">
                                <div className={`w-12 h-12 rounded-full ${colors.gradient} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                                  {user.name.charAt(0)}
                                </div>
                                <div>
                                  <h3 className="font-bold text-gray-800">{user.name}</h3>
                                  <p className="text-sm text-gray-600">{user.id}</p>
                                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full border ${getRoleBadgeColor(user.role)} mt-1`}>
                                    {ROLE_DISPLAY_NAMES[user.role]}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-2">
                                {user.role !== UserRoleEnum.ADMIN && (
                                  <>
                                    <button 
                                      onClick={() => setCapturingForUser(user)} 
                                      className={`px-3 py-1 text-xs font-medium ${colors.badge} rounded-full hover:shadow-md transition-all duration-200`}
                                    >
                                      {user.faceImage ? '🔄 Update Face' : '👤 Add Face'}
                                    </button>
                                    {user.faceImage && (
                                      <button 
                                        onClick={() => setVerifyingForUser(user)} 
                                        className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full hover:bg-green-200 transition-all duration-200"
                                      >
                                        🔓 Face Login
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => setOverrideForUser(user)} 
                                      className="px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200 transition-all duration-200"
                                    >
                                      🛡️ Override
                                    </button>
                                  </>
                                )}
                                {user.id !== admin.id && (
                                  <>
                                    <button 
                                      onClick={() => handleStartEdit(user)} 
                                      className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-all duration-200"
                                    >
                                      ✏️ Edit
                                    </button>
                                    <button 
                                      onClick={() => handleRemoveUser(user.id)} 
                                      className="px-3 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full hover:bg-red-200 transition-all duration-200"
                                    >
                                      🗑️ Remove
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Face ID</p>
                                {user.faceImage ? (
                                  <div className="flex items-center space-x-2">
                                    <img src={user.faceImage} alt={`Face of ${user.name}`} className="w-8 h-8 rounded-full object-cover border-2 border-green-400"/>
                                    <span className="text-sm text-green-700 font-medium">✓ Registered</span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-500">Not registered</span>
                                )}
                              </div>
                              
                              <div>
                                <p className="text-xs text-gray-500 mb-1">{t('Assigned Subjects')}</p>
                                {user.role === UserRoleEnum.TEACHER && (user as Teacher).assignedSubjects.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {(user as Teacher).assignedSubjects.map(subjectId => (
                                      <span key={subjectId} className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                                        {allSubjects.find(s => s.id === subjectId)?.name || subjectId}
                                      </span>
                                    ))}
                                  </div>
                                ) : user.role === UserRoleEnum.TEACHER ? (
                                  <span className="text-sm text-gray-500">None assigned</span>
                                ) : (
                                  <span className="text-sm text-gray-400">Not applicable</span>
                                )}
                              </div>
                              
                              <div>
                                <p className="text-xs text-gray-500 mb-1">{t('Class Assignment')}</p>
                                {user.role === UserRoleEnum.STUDENT ? (
                                  <select
                                    value={(user as Student).classId || ''}
                                    onChange={e => handleAssignClass(user.id, e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  >
                                    <option value="">Unassigned</option>
                                    {allClasses.map(cls => (
                                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-sm text-gray-400">Not applicable</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('No users found')}</h3>
                        <p className="text-gray-500">{t('Try adjusting your search or filter criteria.')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subjects Tab */}
        {activeTab === 'subjects' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className={`${colors.card} rounded-xl shadow-lg border ${colors.border} p-6`}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">{t('Subject Management')}</h2>
                  <span className={`px-3 py-1 text-sm font-medium ${colors.badge} rounded-full`}>
                    {allSubjects.length} subjects
                  </span>
                </div>
                
                <div className="space-y-4">
                  {allSubjects.length > 0 ? (
                    allSubjects.map(subject => (
                      <div key={subject.id} className={`flex items-center justify-between p-4 ${colors.light} rounded-lg border ${colors.border} hover:shadow-md transition-all duration-200`}>
                        {editingSubject?.id === subject.id ? (
                          <form onSubmit={handleSaveEditSubject} className="flex-grow flex items-center space-x-3">
                            <input 
                              type="text" 
                              value={editedSubjectName} 
                              onChange={e => setEditedSubjectName(e.target.value)} 
                              className={`flex-grow px-3 py-2 border ${colors.border} rounded-lg focus:outline-none ${colors.focus}`}
                              autoFocus
                            />
                            <button type="submit" className={`px-3 py-2 text-sm font-medium text-white ${colors.primary} ${colors.hover} rounded-lg transition-colors`}>
                              Save
                            </button>
                            <button type="button" onClick={handleCancelEditSubject} className="px-3 py-2 text-sm font-medium bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors">
                              Cancel
                            </button>
                          </form>
                        ) : (
                          <>
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 rounded-lg ${colors.gradient} flex items-center justify-center text-white font-bold`}>
                                {subject.name.charAt(0)}
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-800">{subject.name}</h3>
                                <p className="text-xs text-gray-500">ID: {subject.id}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button 
                                onClick={() => handleStartEditSubject(subject)} 
                                className={`px-3 py-1 text-sm font-medium ${colors.badge} rounded-lg hover:shadow-md transition-all duration-200`}
                              >
                                ✏️ {t('Edit')}
                              </button>
                              <button 
                                onClick={() => handleRemoveSubject(subject.id)} 
                                className="px-3 py-1 text-sm font-medium bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
                              >
                                🗑️ {t('Delete')}
                              </button>
                            </div>
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div className="sm:col-span-2">
                                <label className="block text-xs text-gray-600 mb-1">{t('Presets')}</label>
                                <input type="text" value={tagPresets[subject.name]?.join(',') || ''} onChange={e => { const val = e.target.value; setTagPresets(prev => ({ ...prev, [subject.name]: val.split(',').map(s => s.trim()).filter(Boolean) })) }} className="w-full px-2 py-1 text-xs border border-gray-300 rounded" />
                              </div>
                              <div className="flex items-end gap-2">
                                <button onClick={async () => { const tags = tagPresets[subject.name] || []; await updateTagPresets(subject.name, tags); const map = await fetchTagPresets(); setTagPresets(map) }} className="px-3 py-1 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700">{t('Save')}</button>
                                <button onClick={async () => { const map = await fetchTagPresets(); setTagPresets(prev => ({ ...prev, [subject.name]: map[subject.name] || [] })) }} className={`px-3 py-1 text-xs rounded ${colors.lightText} ${colors.lightHover}`}>{t('Load')}</button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">{t('No subjects found')}</h3>
                      <p className="text-gray-500">{t('Add your first subject using the form on the right.')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className={`${colors.card} rounded-xl shadow-lg border ${colors.border} p-6`}>
                <h2 className="text-xl font-bold text-gray-800 mb-6">{t('Add New Subject')}</h2>
                <form onSubmit={handleAddSubject} className="space-y-4">
                  <div>
                    <label htmlFor="newSubjectName" className="block text-sm font-medium text-gray-700 mb-2">{t('Subject Name')}</label>
                    <input 
                      type="text" 
                      id="newSubjectName" 
                      value={newSubjectName} 
                      onChange={e => setNewSubjectName(e.target.value)} 
                      className={`w-full px-4 py-3 border ${colors.border} rounded-lg focus:outline-none ${colors.focus} transition-colors`}
                      placeholder="e.g., Mathematics, Physics"
                    />
                  </div>
                  {subjectError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-600">{subjectError}</p>
                    </div>
                  )}
                  <button 
                    type="submit" 
                    className={`w-full ${colors.primary} ${colors.hover} text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg`}
                  >
                    Add Subject
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Classes Tab */}
        {activeTab === 'classes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className={`${colors.card} rounded-xl shadow-lg border ${colors.border} p-6`}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Class Management</h2>
                  <span className={`px-3 py-1 text-sm font-medium ${colors.badge} rounded-full`}>
                    {allClasses.length} classes
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allClasses.length > 0 ? (
                    allClasses.map(cls => {
                      const studentsInClass = users.filter(u => u.role === UserRoleEnum.STUDENT && (u as Student).classId === cls.id).length;
                      return (
                        <div key={cls.id} className={`${colors.card} rounded-lg border ${colors.border} p-4 hover:shadow-md transition-all duration-200`}>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-800">{cls.name}</h3>
                            <div className="flex items-center space-x-2">
                              <button 
                                onClick={() => handleStartEditClass(cls)} 
                                className={`px-2 py-1 text-xs font-medium ${colors.badge} rounded hover:shadow-md transition-all duration-200`}
                                title={t('Edit class')}
                              >
                                ✏️ {t('Edit')}
                              </button>
                              <button 
                                onClick={() => handleRemoveClass(cls.id)} 
                                className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                                title={t('Delete class')}
                              >
                                🗑️ {t('Delete')}
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>👨‍🎓 {studentsInClass} students</span>
                            <span>🆔 {cls.id}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-2 text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No classes found</h3>
                      <p className="text-gray-500">Add your first class using the form on the right.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className={`${colors.card} rounded-xl shadow-lg border ${colors.border} p-6`}>
                <h2 className="text-xl font-bold text-gray-800 mb-6">Add New Class</h2>
                <form onSubmit={handleAddClass} className="space-y-4">
                  <div>
                    <label htmlFor="newClassName" className="block text-sm font-medium text-gray-700 mb-2">Class Name</label>
                    <input 
                      type="text" 
                      id="newClassName" 
                      value={newClassName} 
                      onChange={e => setNewClassName(e.target.value)} 
                      className={`w-full px-4 py-3 border ${colors.border} rounded-lg focus:outline-none ${colors.focus} transition-colors`}
                      placeholder="e.g., Class 10A, Science Stream"
                    />
                  </div>
                  {classError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-600">{classError}</p>
                    </div>
                  )}
                  <button 
                    type="submit" 
                    className={`w-full ${colors.primary} ${colors.hover} text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg`}
                  >
                    Add Class
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Faces Tab */}
        {activeTab === 'faces' && (
          <div>
            <div className={`${colors.card} rounded-2xl shadow-xl border ${colors.border} p-8`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Registered Student Faces</h2>
                <button
                  onClick={() => setShowFaceViewer(true)}
                  className={`text-white font-bold py-3 px-6 rounded-lg transition ${colors.primary} ${colors.hover} flex items-center gap-2 shadow-lg`}
                >
                  📷 View & Manage Faces
                </button>
              </div>
              <p className="text-gray-600">Manage all registered student faces for authentication purposes.</p>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'qbank' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className={`${colors.card} rounded-xl shadow-lg border ${colors.border} p-6`}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">{t('Question Bank')}</h2>
                  <span className={`px-3 py-1 text-sm font-medium ${colors.badge} rounded-full`}>
                    {bank.length} questions
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t('Subject')}</label>
                    <select value={bankSubjectFilter} onChange={e => setBankSubjectFilter(e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-300 rounded">
                      <option value="">All</option>
                      {allSubjects.map(s => (<option key={s.id} value={s.name}>{s.name}</option>))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">{t('Tag')}</label>
                    <input type="text" value={bankTagFilter} onChange={e => setBankTagFilter(e.target.value)} placeholder="Filter by tag" className="w-full px-2 py-1 text-xs border border-gray-300 rounded" />
                  </div>
                </div>
                <div className="flex gap-2 mb-4">
                  <button onClick={() => {
                    const filtered = bank.filter(q => !bankSubjectFilter || q.subject === bankSubjectFilter).filter(q => !bankTagFilter || (Array.isArray(q.tags) && q.tags.some((t: string) => t.includes(bankTagFilter))))
                    const rows: string[][] = [['id','subject','difficulty','tags','question','options']]
                    filtered.forEach(q => rows.push([q.id, q.subject || '', q.difficulty || 'medium', Array.isArray(q.tags) ? q.tags.join('|') : '', q.question, Array.isArray(q.options) ? q.options.join('|') : '']))
                    const csv = rows.map(r => r.join(',')).join('\n')
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a'); a.href = url; a.download = 'question_bank_filtered.csv'; a.click(); URL.revokeObjectURL(url)
                  }} className={`px-3 py-2 text-xs rounded ${colors.lightText} ${colors.lightHover}`}>{t('Export CSV')}</button>
                  <button onClick={() => {
                    const rows: string[][] = [['id','subject','difficulty','tags','question','options']]
                    bank.filter(q => selectedQIds.includes(q.id)).forEach(q => rows.push([q.id, q.subject || '', q.difficulty || 'medium', Array.isArray(q.tags) ? q.tags.join('|') : '', q.question, Array.isArray(q.options) ? q.options.join('|') : '']))
                    const csv = rows.map(r => r.join(',')).join('\n')
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a'); a.href = url; a.download = 'question_bank_selected.csv'; a.click(); URL.revokeObjectURL(url)
                  }} className={`px-3 py-2 text-xs rounded ${colors.lightText} ${colors.lightHover}`}>{t('Export Selected')}</button>
                  <button onClick={() => setShowDeleteFilteredConfirm(true)} className="px-3 py-2 text-xs rounded bg-red-100 text-red-800" title={t('Delete all filtered questions')}>{t('Delete Filtered')}</button>
                  {lastDeletedSnapshot.length > 0 && (
                    <button onClick={async () => { await addQuestionsToBank(lastDeletedSnapshot); const list = await fetchQuestionBank(); setBank(list); setLastDeletedSnapshot([]) }} className="px-3 py-2 text-xs rounded bg-green-100 text-green-800" title={t('Restore last deleted')}>{t('Undo Delete')}</button>
                  )}
                  <label className={`px-3 py-2 text-xs rounded ${colors.lightText} ${colors.lightHover} cursor-pointer`}>
                    {t('Import CSV')}
                    <input type="file" accept=".csv" className="hidden" onChange={async e => {
                      const file = e.target.files?.[0]; if (!file) return
                      const text = await file.text()
                      const lines = text.split(/\r?\n/).filter(Boolean)
                      const [header, ...rest] = lines
                      const idx = (name: string) => header.split(',').indexOf(name)
                      const toAdd = rest.map(line => {
                        const cols = line.split(',')
                        const id = cols[idx('id')] || undefined
                        const subject = cols[idx('subject')] || 'general'
                        const difficulty = cols[idx('difficulty')] || 'medium'
                        const tags = (cols[idx('tags')] || '').split('|').filter(Boolean)
                        const question = cols[idx('question')] || ''
                        const options = (cols[idx('options')] || '').split('|').filter(Boolean)
                        return { id, subject, difficulty, tags, question, options, correctAnswer: options[0] || '' }
                      })
                      await addQuestionsToBank(toAdd)
                      const list = await fetchQuestionBank(); setBank(list)
                      e.target.value = ''
                    }} />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <button onClick={async () => { await Promise.all(selectedQIds.map(id => deleteQuestionFromBank(id))); setBank(prev => prev.filter(i => !selectedQIds.includes(i.id))); setSelectedQIds([]) }} className="px-3 py-2 text-xs rounded bg-red-100 text-red-800">{t('Delete Selected')}</button>
                  <button onClick={async () => { const toAdd = bank.filter(q => selectedQIds.includes(q.id)).map(q => ({ subject: q.subject, difficulty: q.difficulty || 'medium', tags: Array.isArray(q.tags) ? q.tags : [], question: q.question, options: Array.isArray(q.options) ? q.options : [], correctAnswer: q.correctAnswer || (Array.isArray(q.options) ? q.options[0] : '') })); if (toAdd.length === 0) return; await addQuestionsToBank(toAdd); const list = await fetchQuestionBank(); setBank(list); setSelectedQIds([]) }} className="px-3 py-2 text-xs rounded bg-blue-100 text-blue-800">{t('Duplicate Selected')}</button>
                  <button onClick={async () => { const union = Array.from(new Set(selectedQIds.flatMap(id => { const q = bank.find(b => b.id === id); return Array.isArray(q?.tags) ? q!.tags : [] }))); await Promise.all(selectedQIds.map(id => updateQuestionInBank(id, { tags: union }))); setBank(prev => prev.map(q => selectedQIds.includes(q.id) ? { ...q, tags: union } : q)) }} className="px-3 py-2 text-xs rounded bg-yellow-100 text-yellow-800">{t('Merge Tags')}</button>
                  <select onChange={async e => { const subj = e.target.value; if (!subj) return; await Promise.all(selectedQIds.map(id => updateQuestionInBank(id, { subject: subj }))); setBank(prev => prev.map(q => selectedQIds.includes(q.id) ? { ...q, subject: subj } : q)) }} className="px-3 py-2 text-xs border border-gray-300 rounded"><option value="">{t('Move to Subject')}</option>{allSubjects.map(s => (<option key={s.id} value={s.name}>{s.name}</option>))}</select>
                  <select onChange={async e => { const val = e.target.value; await Promise.all(selectedQIds.map(id => updateQuestionInBank(id, { difficulty: val }))); setBank(prev => prev.map(q => selectedQIds.includes(q.id) ? { ...q, difficulty: val } : q)) }} className="px-3 py-2 text-xs border border-gray-300 rounded"><option value="">{t('Set Difficulty')}</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select>
                  <input type="text" placeholder={t('Add Tag')} className="px-2 py-1 text-xs border border-gray-300 rounded" onKeyDown={async e => { if (e.key === 'Enter') { const tag = (e.target as HTMLInputElement).value.trim(); if (!tag) return; await Promise.all(selectedQIds.map(id => { const q = bank.find(b => b.id === id); const tags = Array.isArray(q?.tags) ? Array.from(new Set([...(q!.tags), tag])) : [tag]; return updateQuestionInBank(id, { tags }) })); setBank(prev => prev.map(q => selectedQIds.includes(q.id) ? { ...q, tags: Array.isArray(q.tags) ? Array.from(new Set([...(q.tags), tag])) : [tag] } : q)); (e.target as HTMLInputElement).value = '' } }} />
                </div>
                <div className="max-h-96 overflow-y-auto border-t pt-3">
                  {bank.filter(q => !bankSubjectFilter || q.subject === bankSubjectFilter).filter(q => !bankTagFilter || (Array.isArray(q.tags) && q.tags.some((t: string) => t.includes(bankTagFilter)))).map(q => (
                    <div key={q.id} className="text-sm py-3 border-b flex items-start gap-2">
                      <input type="checkbox" checked={selectedQIds.includes(q.id)} onChange={e => setSelectedQIds(prev => e.target.checked ? [...prev, q.id] : prev.filter(id => id !== q.id))} className="mt-1" />
                      <p className="font-semibold text-gray-800">{q.question}</p>
                      <div className="text-xs text-gray-600">Subject: {q.subject} • Difficulty: {q.difficulty || 'medium'} • Tags: {Array.isArray(q.tags) ? q.tags.join(', ') : ''}</div>
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => setEditingBankItem(q)} className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800" title={t('Edit')}>{t('Edit')}</button>
                        <button onClick={async () => { await deleteQuestionFromBank(q.id); setBank(prev => prev.filter(i => i.id !== q.id)) }} className="px-2 py-1 text-xs rounded bg-red-100 text-red-800" title={t('Remove')}>{t('Remove')}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className={`${colors.card} rounded-xl shadow-lg border ${colors.border} p-6`}>
                <h2 className="text-xl font-bold text-gray-800 mb-6">{t('Edit Selected')}</h2>
                {editingBankItem ? (
                  <div className="space-y-3">
                    <input type="text" value={editingBankItem.question} onChange={e => setEditingBankItem({ ...editingBankItem, question: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded" />
                    <select value={editingBankItem.difficulty || 'medium'} onChange={e => setEditingBankItem({ ...editingBankItem, difficulty: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded">
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                    <input type="text" value={Array.isArray(editingBankItem.tags) ? editingBankItem.tags.join(',') : ''} onChange={e => setEditingBankItem({ ...editingBankItem, tags: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded" />
                    <button onClick={async () => { await updateQuestionInBank(editingBankItem.id, { question: editingBankItem.question, difficulty: editingBankItem.difficulty, tags: editingBankItem.tags }); const list = await fetchQuestionBank(); setBank(list); }} className={`w-full mt-2 text-white font-bold py-2 rounded ${colors.primary} ${colors.hover}`}>{t('Save')}</button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">Select a question to edit.</p>
                )}
              </div>
              <div className={`${colors.card} rounded-xl shadow-lg border ${colors.border} p-6 mt-6`}>
                <h2 className="text-xl font-bold text-gray-800 mb-6">{t('Tag Presets')}</h2>
                <div className="space-y-3">
                  <select value={presetSubject} onChange={e => setPresetSubject(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded">
                    <option value="">{t('Select Subject')}</option>
                    {allSubjects.map(s => (<option key={s.id} value={s.name}>{s.name}</option>))}
                  </select>
                  <input type="text" value={presetTagsInput} onChange={e => setPresetTagsInput(e.target.value)} placeholder={t('Comma-separated tags')} className="w-full px-3 py-2 text-sm border border-gray-300 rounded" />
                  <div className="flex gap-2">
                    <button onClick={async () => { if (!presetSubject) return; const tags = presetTagsInput.split(',').map(s => s.trim()).filter(Boolean); await updateTagPresets(presetSubject, tags); const map = await fetchTagPresets(); setTagPresets(map) }} className={`px-3 py-2 text-sm text-white rounded ${colors.primary} ${colors.hover}`}>{t('Save')}</button>
                    <button onClick={() => { if (!presetSubject) return; setPresetTagsInput((tagPresets[presetSubject] || []).join(',')) }} className={`px-3 py-2 text-sm rounded ${colors.lightText} ${colors.lightHover}`}>{t('Load')}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Key Metrics */}
            <div className="lg:col-span-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className={`${colors.card} rounded-xl shadow-lg border ${colors.border} p-6 text-center transform hover:scale-105 transition-transform duration-200`}>
                  <div className={`w-12 h-12 ${colors.gradient} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800">{analytics.totalUsers}</h3>
                  <p className="text-sm text-gray-600">{t('Total Users')}</p>
                </div>
                
                <div className={`${colors.card} rounded-xl shadow-lg border ${colors.border} p-6 text-center transform hover:scale-105 transition-transform duration-200`}>
                  <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zM12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-teal-600">{analytics.students}</h3>
                  <p className="text-sm text-gray-600">{t('Students')}</p>
                </div>
                
                <div className={`${colors.card} rounded-xl shadow-lg border ${colors.border} p-6 text-center transform hover:scale-105 transition-transform duration-200`}>
                  <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2h-14a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-indigo-600">{analytics.teachers}</h3>
                  <p className="text-sm text-gray-600">{t('Teachers')}</p>
                </div>
                
                <div className={`${colors.card} rounded-xl shadow-lg border ${colors.border} p-6 text-center transform hover:scale-105 transition-transform duration-200`}>
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-green-600">{analytics.usersWithFace}</h3>
                  <p className="text-sm text-gray-600">{t('Face ID Users')}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {showDeleteFilteredConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-3">{t('Delete Filtered Questions')}</h2>
            <p className="text-sm text-gray-600 mb-4">{t('This will delete all questions currently matching your filters. This action cannot be undone.')}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDeleteFilteredConfirm(false)} className={`px-3 py-2 text-sm rounded ${colors.lightText} ${colors.lightHover}`}>{t('Cancel')}</button>
              <button onClick={async () => {
                const filtered = bank.filter(q => !bankSubjectFilter || q.subject === bankSubjectFilter).filter(q => !bankTagFilter || (Array.isArray(q.tags) && q.tags.some((t: string) => t.includes(bankTagFilter))))
                setLastDeletedSnapshot(filtered)
                await Promise.all(filtered.map(q => deleteQuestionFromBank(q.id)))
                setBank(prev => prev.filter(q => !filtered.some(f => f.id === q.id)))
                setSelectedQIds([])
                setShowDeleteFilteredConfirm(false)
              }} className="px-3 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700">{t('Delete')}</button>
            </div>
          </div>
        </div>
      )}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md transform scale-100 transition-transform">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Edit User: {editingUser.name}</h2>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label htmlFor="editName" className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input 
                  type="text" 
                  id="editName" 
                  value={editedName} 
                  onChange={e => setEditedName(e.target.value)} 
                  className={`w-full px-4 py-3 border ${colors.border} rounded-lg focus:outline-none ${colors.focus} transition-colors`}
                />
              </div>
              <div>
                <label htmlFor="editId" className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
                <input 
                  type="text" 
                  id="editId" 
                  value={editedId} 
                  onChange={e => setEditedId(e.target.value)} 
                  className={`w-full px-4 py-3 border ${colors.border} rounded-lg focus:outline-none ${colors.focus} transition-colors`}
                />
              </div>
              {editingUser.role === UserRoleEnum.TEACHER && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Subjects</label>
                  <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {allSubjects.length > 0 ? (
                      allSubjects.map(subject => (
                        <label key={subject.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            className={`form-checkbox h-4 w-4 ${colors.accent} rounded`}
                            value={subject.id}
                            checked={editedAssignedSubjects.includes(subject.id)}
                            onChange={(e) => handleEditTeacherSubjectChange(subject.id, e.target.checked)}
                          />
                          <span className="text-sm text-gray-700">{subject.name}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 col-span-2">No subjects available.</p>
                    )}
                  </div>
                </div>
              )}
              {editUserError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{editUserError}</p>
                </div>
              )}
              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  type="button" 
                  onClick={handleCancelEdit} 
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={`px-4 py-2 text-white font-semibold rounded-lg ${colors.primary} ${colors.hover} transition-colors`}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {capturingForUser && (
        <WebcamCapture
          onCapture={handleCaptureForUser}
          onClose={() => setCapturingForUser(null)}
          theme={theme}
          title={`Capture Face for ${capturingForUser.name}`}
          buttonText="Capture & Save"
        />
      )}
      
      {showFaceRegistration && (
        <WebcamCapture
          onCapture={handleAdminFaceRegister}
          onClose={() => setShowFaceRegistration(false)}
          theme={theme}
          title={admin.faceImage ? "Update Admin Face ID" : "Register Admin Face ID"}
          buttonText="Capture & Save"
        />
      )}
      {verifyingForUser && (
        <WebcamCapture
          onCapture={handleVerifyCapture}
          onClose={() => setVerifyingForUser(null)}
          theme={theme}
          title={`Verify Face Login for ${verifyingForUser.name}`}
          buttonText="Verify"
          liveness
        />
      )}
      {overrideForUser && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-8 w-full max-w-md relative">
            <button onClick={() => setOverrideForUser(null)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">&times;</button>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Admin Override</h2>
            <p className="text-gray-600 mb-4 text-sm">Provide a reason for overriding login for {overrideForUser.name}.</p>
            <textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)} placeholder="Reason" className={`w-full p-3 text-base border border-gray-300 rounded-md shadow-sm focus:ring-1 ${THEME_COLORS[theme].focus}`} />
            <button onClick={async () => {
              setIsOverrideSubmitting(true);
              try {
                await adminOverride(admin.id, overrideForUser.id, 'login_override', overrideReason);
                setVerifyMessage('Override recorded in audit log');
                setOverrideForUser(null);
                setOverrideReason('');
              } catch (e) {
                setVerifyMessage('Failed to record override');
              } finally {
                setIsOverrideSubmitting(false);
              }
            }} disabled={isOverrideSubmitting} className={`w-full mt-4 text-white font-bold py-2.5 rounded-lg ${THEME_COLORS[theme].primary} ${THEME_COLORS[theme].hover}`}>
              {isOverrideSubmitting ? 'Submitting...' : 'Confirm Override'}
            </button>
          </div>
        </div>
      )}

      {/* Face Viewer Modal */}
      {showFaceViewer && <AdminFaceViewer onClose={() => setShowFaceViewer(false)} />}
    </div>
  );
};

export default AdminDashboard;