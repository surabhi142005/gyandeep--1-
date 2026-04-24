import React, { useState, useEffect, useMemo } from 'react';
import type { AnyUser, Admin, SubjectConfig, Student, Teacher, UserRole, Coordinates } from '../types';
import { UserRole as UserRoleEnum, ROLE_DISPLAY_NAMES } from '../types';
import Spinner from './Spinner';
import WebcamCapture from './WebcamCapture';
import AdminFaceViewer from './AdminFaceViewer';
import { bulkImportUsers, checkEmailServiceHealth, sendEmailNotification, fetchQuestionBank, fetchTagPresets, assignUserToClass } from '../services/dataService';
import { registerFace, verifyFace, hashPassword } from '../services/authService';
import { getCurrentPosition } from '../services/locationService';
import TicketPanel from './TicketPanel';
import { DashboardLayout, Card, Button, Badge, Input } from './ui';
import { 
  Users, 
  UserPlus, 
  School, 
  Camera, 
  BarChart3, 
  HelpCircle,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Trash2,
  Edit2,
  Shield,
  Plus,
  Download,
  BookOpen,
  Database
} from 'lucide-react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { t } from '../services/i18n';

interface AdminDashboardProps {
  admin: Admin;
  users: AnyUser[];
  onUpdateUsers: (users: AnyUser[]) => void;
  onLogout: () => void;
  theme: string;
  onThemeChange?: (theme: string) => void;
  onUpdateFaceImage: (adminId: string, faceImage: string) => void;
  allSubjects: SubjectConfig[];
  setAllSubjects: (subjects: SubjectConfig[]) => void;
  allClasses: any[];
  setAllClasses: (classes: any[]) => void;
}

const SIDEBAR_ITEMS = [
  { id: 'users', label: t('User Management'), icon: Users },
  { id: 'registration', label: t('Registration'), icon: UserPlus },
  { id: 'subjects', label: t('Subjects'), icon: BookOpen },
  { id: 'classes', label: t('Classes'), icon: School },
  { id: 'faces', label: t('Biometrics'), icon: Camera },
  { id: 'analytics', label: t('Analytics'), icon: BarChart3 },
  { id: 'qbank', label: t('Question Bank'), icon: HelpCircle },
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  admin, users, onUpdateUsers, onLogout, theme, onThemeChange,
  onUpdateFaceImage, allSubjects, setAllSubjects, allClasses, setAllClasses
}) => {
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

  const [emailHealth, setEmailHealth] = useState<{ transport: string; message: string; smtpConfigured: boolean; resendConfigured: boolean } | null>(null);
  const [emailHealthLoading, setEmailHealthLoading] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState(admin.email || '');
  const [emailStatusMessage, setEmailStatusMessage] = useState<string | null>(null);
  const [aiEmailPrompt, setAiEmailPrompt] = useState('');
  const [aiEmailRecipients, setAiEmailRecipients] = useState('');
  const [aiEmailSending, setAiEmailSending] = useState(false);
  const [aiEmailStatus, setAiEmailStatus] = useState<string | null>(null);

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
  const [activeTab, setActiveTab] = useState<'users' | 'subjects' | 'classes' | 'analytics' | 'qbank' | 'registration' | 'faces'>('users');
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

  useEffect(() => {
    getCurrentPosition()
      .then(setLocation)
      .catch(err => setLocationError(err.message));
  }, []);

  useEffect(() => {
    fetchQuestionBank().then(setBank).catch((err) => { console.error('Failed to load question bank:', err); });
    fetchTagPresets().then(setTagPresets).catch((err) => { console.error('Failed to load tag presets:', err); });
  }, []);

  const loadEmailHealth = async () => {
    try {
      setEmailHealthLoading(true);
      setEmailStatusMessage(null);
      const status = await checkEmailServiceHealth();
      setEmailHealth(status);
    } catch (err: any) {
      setEmailStatusMessage(err?.message || 'Failed to check email health');
    } finally {
      setEmailHealthLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmailTo || !testEmailTo.includes('@')) {
      setEmailStatusMessage('Enter a valid test email address.');
      return;
    }
    try {
      setEmailStatusMessage(null);
      await sendEmailNotification({
        to: testEmailTo,
        subject: 'Gyandeep Email Health Check',
        html: `<p>Gyandeep email check successful at ${new Date().toISOString()}</p>`,
      });
      setEmailStatusMessage('Test email sent successfully.');
    } catch (err: any) {
      setEmailStatusMessage(err?.message || 'Failed to send test email.');
    }
  };


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

  const handleAddNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError(null);
    const trimmedId = newUserId.trim().toLowerCase();
    const trimmedName = newUserName.trim();
    const trimmedEmail = newUserEmail.trim();
    const trimmedPassword = newUserPassword.trim();

    // Auto-set role to STUDENT for registration tab
    const userRole = activeTab === 'registration' ? UserRoleEnum.STUDENT : newUserRole;

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
    if (userRole === UserRoleEnum.STUDENT && !trimmedId.startsWith('s')) {
      setAddUserError("Invalid Student ID. Must start with 's'.");
      return;
    }
    if (userRole === UserRoleEnum.TEACHER && !trimmedId.startsWith('t')) {
      setAddUserError("Invalid Teacher ID. Must start with 't'.");
      return;
    }
    if (userRole === UserRoleEnum.ADMIN && !trimmedId.startsWith('a')) {
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

    try {
      const hashedPassword = await hashPassword(trimmedPassword);
      const baseNewUser = { id: trimmedId, name: trimmedName, faceImage: null };

      let newUser: AnyUser;
      if (userRole === UserRoleEnum.STUDENT) {
        newUser = { ...baseNewUser, role: UserRoleEnum.STUDENT, email: trimmedEmail, password: hashedPassword, performance: [] };
      } else if (userRole === UserRoleEnum.TEACHER) {
        newUser = { ...baseNewUser, role: UserRoleEnum.TEACHER, email: trimmedEmail, password: hashedPassword, assignedSubjects: newUserAssignedSubjects };
      } else { // Admin
        newUser = { ...baseNewUser, role: UserRoleEnum.ADMIN, email: trimmedEmail, password: hashedPassword };
      }

      onUpdateUsers([...users, newUser]);
      setNewUserName('');
      setNewUserId('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole(UserRoleEnum.STUDENT);
      setNewUserAssignedSubjects([]);
    } catch (err: any) {
      setAddUserError("Error securing password: " + err.message);
    }
  };

  const handleRemoveUser = (userId: string) => {
    if (window.confirm("Are you sure you want to remove this user?")) {
      onUpdateUsers(users.filter(user => user.id !== userId));
    }
  };

  const handleToggleActive = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const isActive = user.active !== false;
    const action = isActive ? 'deactivate' : 'activate';
    if (window.confirm(`Are you sure you want to ${action} ${user.name}?`)) {
      onUpdateUsers(users.map(u => u.id === userId ? { ...u, active: !isActive } : u));
    }
  };

  const handleAssignClass = async (userId: string, classId: string | null) => {
    try {
      await assignUserToClass(userId, classId);
      const updatedUsers = users.map(u => {
        if (u.id === userId && (u.role === UserRoleEnum.STUDENT || u.role === UserRoleEnum.TEACHER)) {
          return { ...u, classId } as AnyUser;
        }
        return u;
      });
      onUpdateUsers(updatedUsers);
    } catch (err) {
      console.error('Failed to assign class:', err);
      setClassError('Failed to assign class. Please try again.');
      return;
    }
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
    <DashboardLayout
      sidebarItems={SIDEBAR_ITEMS}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as any)}
      userName={admin.name}
      userRole="Administrator"
      userAvatar={admin.faceImage}
      onLogout={onLogout}
      onShowProfile={() => setShowFaceRegistration(true)}
      theme={theme}
      onThemeChange={onThemeChange}
    >
      {activeTab === 'users' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card padding="md" hover>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('Total Users')}</p>
                  <p className="text-2xl font-bold">{analytics.totalUsers}</p>
                </div>
              </div>
            </Card>
            <Card padding="md" hover>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                  <School size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('Students')}</p>
                  <p className="text-2xl font-bold">{analytics.students}</p>
                </div>
              </div>
            </Card>
            <Card padding="md" hover>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <BookOpen size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('Teachers')}</p>
                  <p className="text-2xl font-bold">{analytics.teachers}</p>
                </div>
              </div>
            </Card>
            <Card padding="md" hover>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                  <Camera size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('Biometric Set')}</p>
                  <p className="text-2xl font-bold">{analytics.usersWithFace}</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold">{t('User Management')}</h2>
                <p className="text-sm text-gray-500">{t('Manage permissions and account status')}</p>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                   <input 
                    type="text" 
                    placeholder={t('Search users...')}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                   />
                </div>
                <Button variant="primary" onClick={() => setActiveTab('registration')} icon={<Plus size={18} />}>
                  {t('Add User')}
                </Button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">{t('User')}</th>
                    <th className="px-6 py-4">{t('Role')}</th>
                    <th className="px-6 py-4">{t('Class')}</th>
                    <th className="px-6 py-4">{t('Status')}</th>
                    <th className="px-6 py-4">{t('Face ID')}</th>
                    <th className="px-6 py-4 text-right">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-theme-gradient flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:scale-110 transition-transform">
                            {user.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={user.role === UserRoleEnum.ADMIN ? 'primary' : user.role === UserRoleEnum.TEACHER ? 'info' : 'success' as any} size="sm">
                          {ROLE_DISPLAY_NAMES[user.role]}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        {(user.role === UserRoleEnum.STUDENT || user.role === UserRoleEnum.TEACHER) ? (
                          <select
                            value={(user.classId as string | null) || ''}
                            onChange={(e) => handleAssignClass(user.id, e.target.value || null)}
                            className="min-w-[160px] px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                          >
                            <option value="">{t('Unassigned')}</option>
                            {allClasses.map((cls) => (
                              <option key={cls.id} value={cls.id}>
                                {cls.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm text-gray-400">{t('N/A')}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${user.active !== false ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="text-sm font-medium">{user.active !== false ? 'Active' : 'Inactive'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.faceImage ? (
                          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-green-500/30">
                            <img src={user.faceImage} alt="Face" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                            <Camera size={14} />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" onClick={() => handleStartEdit(user)} icon={<Edit2 size={14} />} />
                          <Button variant="ghost" size="sm" onClick={() => handleToggleActive(user.id)} icon={<Shield size={14} />} />
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveUser(user.id)} className="text-red-500 hover:text-red-600" icon={<Trash2 size={14} />} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'registration' && (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card padding="xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">{t('Registration Center')}</h2>
              <p className="text-gray-500">{t('Onboard new students, teachers and staff')}</p>
            </div>

            <form onSubmit={handleAddNewUser} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2">{t('Full Name')}</label>
                  <Input
                    value={newUserName}
                    onChange={e => setNewUserName(e.target.value)}
                    placeholder={t('e.g. Jane Doe')}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">{t('User ID')}</label>
                  <Input
                    value={newUserId}
                    onChange={e => setNewUserId(e.target.value)}
                    placeholder={t('e.g. s101, t201')}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">{t('Email')}</label>
                  <Input
                    type="email"
                    value={newUserEmail}
                    onChange={e => setNewUserEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">{t('Role')}</label>
                  <select 
                    value={newUserRole} 
                    onChange={e => setNewUserRole(e.target.value as any)}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option value={UserRoleEnum.STUDENT}>{t('Student')}</option>
                    <option value={UserRoleEnum.TEACHER}>{t('Teacher')}</option>
                    <option value={UserRoleEnum.ADMIN}>{t('Administrator')}</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold mb-2">{t('Password')}</label>
                  <Input
                    type="password"
                    value={newUserPassword}
                    onChange={e => setNewUserPassword(e.target.value)}
                    placeholder={t('Min 6 characters')}
                    required
                  />
                </div>
              </div>

              {addUserError && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2 border border-red-100">
                  <AlertCircle size={16} />
                  {addUserError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" type="button" onClick={() => setActiveTab('users')}>{t('Cancel')}</Button>
                <Button variant="primary" type="submit" className="px-12">{t('Register User')}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {activeTab === 'subjects' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-2 space-y-4">
            {allSubjects.map(subject => (
              <Card key={subject.id} padding="md" hover>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-theme-gradient flex items-center justify-center text-white font-bold">
                      {subject.name[0]}
                    </div>
                    <div>
                      <h3 className="font-bold">{subject.name}</h3>
                      <p className="text-xs text-gray-500">ID: {subject.id}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleStartEditSubject(subject)} icon={<Edit2 size={14} />} />
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveSubject(subject.id)} className="text-red-500" icon={<Trash2 size={14} />} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Card padding="lg" className="h-fit sticky top-24">
            <h3 className="text-lg font-bold mb-4">{t('Add New Subject')}</h3>
            <form onSubmit={handleAddSubject} className="space-y-4">
               <Input 
                value={newSubjectName}
                onChange={e => setNewSubjectName(e.target.value)}
                placeholder={t('Subject Name')}
               />
               {subjectError && <p className="text-xs text-red-500">{subjectError}</p>}
               <Button variant="primary" type="submit" className="w-full">{t('Create Subject')}</Button>
            </form>
          </Card>
        </div>
      )}

      {activeTab === 'faces' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <Card padding="xl">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold">{t('Biometric Management')}</h2>
                  <p className="text-gray-500">{t('Manage student and staff facial recognition data')}</p>
                </div>
                <Button variant="primary" onClick={() => setShowFaceViewer(true)} icon={<Camera size={20} />}>
                  {t('Open Face Viewer')}
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center text-primary mb-4 shadow-sm">
                       <ShieldCheck size={24} />
                    </div>
                    <h3 className="font-bold mb-2">{t('Secure Storage')}</h3>
                    <p className="text-sm text-gray-500">{t('All facial data is encrypted and stored locally on your secure server.')}</p>
                 </div>
                 <div className="p-6 rounded-2xl bg-secondary/5 border border-secondary/10">
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center text-secondary mb-4 shadow-sm">
                       <RefreshCw size={24} />
                    </div>
                    <h3 className="font-bold mb-2">{t('Bulk Verification')}</h3>
                    <p className="text-sm text-gray-500">{t('Run automated health checks on your biometric database regularly.')}</p>
                 </div>
                 <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center text-amber-600 mb-4 shadow-sm">
                       <AlertCircle size={24} />
                    </div>
                    <h3 className="font-bold mb-2">{t('Privacy First')}</h3>
                    <p className="text-sm text-gray-500">{t('Ensure all users have consented to biometric data collection.')}</p>
                 </div>
              </div>
           </Card>
        </div>
      )}

      {activeTab === 'classes' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {allClasses.map(cls => {
                  const studentsInClass = users.filter(u => u.role === UserRoleEnum.STUDENT && (u as Student).classId === cls.id).length;
                  return (
                    <Card key={cls.id} padding="lg" hover>
                       <div className="flex justify-between items-start mb-4">
                          <div className="w-12 h-12 rounded-xl bg-theme-gradient flex items-center justify-center text-white font-bold text-xl">
                             {cls.name[0]}
                          </div>
                          <div className="flex gap-1">
                             <Button variant="ghost" size="sm" onClick={() => handleStartEditClass(cls)} icon={<Edit2 size={14} />} />
                             <Button variant="ghost" size="sm" onClick={() => handleRemoveClass(cls.id)} className="text-red-500" icon={<Trash2 size={14} />} />
                          </div>
                       </div>
                       <h3 className="font-bold text-lg mb-1">{cls.name}</h3>
                       <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                          <span className="flex items-center gap-1"><Users size={12} /> {studentsInClass} Students</span>
                          <span className="flex items-center gap-1"><ShieldCheck size={12} /> {cls.id}</span>
                       </div>
                    </Card>
                  );
                })}
              </div>
            </div>
            <Card padding="lg" className="h-fit sticky top-24">
              <h3 className="text-lg font-bold mb-4">{t('Create New Class')}</h3>
              <form onSubmit={handleAddClass} className="space-y-4">
                 <Input 
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  placeholder={t('Class Name (e.g. 10-A)')}
                 />
                 {classError && <p className="text-xs text-red-500">{classError}</p>}
                 <Button variant="primary" type="submit" className="w-full">{t('Add Class')}</Button>
              </form>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card padding="xl">
                 <h3 className="text-lg font-bold mb-6">{t('User Distribution')}</h3>
                 <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie
                             data={[
                                { name: t('Students'), value: analytics.students },
                                { name: t('Teachers'), value: analytics.teachers },
                                { name: t('Admins'), value: analytics.admins },
                             ]}
                             cx="50%"
                             cy="50%"
                             innerRadius={60}
                             outerRadius={80}
                             paddingAngle={5}
                             dataKey="value"
                          >
                             <Cell fill="var(--color-primary)" />
                             <Cell fill="var(--color-secondary)" />
                             <Cell fill="#94A3B8" />
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                               backgroundColor: 'var(--color-surface)', 
                               border: 'none',
                               borderRadius: '0.75rem',
                               boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                          <Legend verticalAlign="bottom" height={36}/>
                       </PieChart>
                    </ResponsiveContainer>
                 </div>
              </Card>

              <Card padding="xl">
                 <h3 className="text-lg font-bold mb-6">{t('System Health')}</h3>
                 <div className="space-y-6">
                    <div>
                       <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium">{t('Database Load')}</span>
                          <span className="font-bold text-primary">12%</span>
                       </div>
                       <div className="w-full h-2 bg-primary/10 rounded-full overflow-hidden">
                          <div className="h-full bg-theme-gradient w-[12%]" />
                       </div>
                    </div>
                    <div>
                       <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium">{t('Storage Usage')}</span>
                          <span className="font-bold text-secondary">45%</span>
                       </div>
                       <div className="w-full h-2 bg-secondary/10 rounded-full overflow-hidden">
                          <div className="h-full bg-theme-gradient w-[45%]" />
                       </div>
                    </div>
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between">
                       <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-sm font-bold text-green-600">{t('All Systems Normal')}</span>
                       </div>
                       <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />}>{t('Restart Services')}</Button>
                    </div>
                 </div>
              </Card>
           </div>
        </div>
      )}

      {activeTab === 'qbank' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <Card className="overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                 <div>
                    <h2 className="text-xl font-bold">{t('Global Question Bank')}</h2>
                    <p className="text-sm text-gray-500">{t('Universal questions shared across all classes')}</p>
                 </div>
                 <div className="flex gap-2">
                    <Button variant="secondary" size="sm" icon={<Download size={16} />} onClick={() => {
                      const csv = bank.map(q => `"${q.question}","${q.subject}","${q.difficulty || ''}","${q.type || ''}","${q.options?.join('|') || ''}","${q.correctAnswer || ''}"`).join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'question-bank.csv';
                      a.click();
                    }}>{t('Export')}</Button>
                    <Button variant="primary" size="sm" icon={<Plus size={16} />} onClick={() => setEditingBankItem({})}>{t('Add New')}</Button>
                 </div>
              </div>
              
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <Search size={16} className="inline mr-2 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder={t('Search questions...')}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                      value={bankTagFilter}
                      onChange={(e) => setBankTagFilter(e.target.value)}
                    />
                  </div>
                  <select 
                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                    value={bankSubjectFilter}
                    onChange={(e) => setBankSubjectFilter(e.target.value)}
                  >
                    <option value="">{t('All Subjects')}</option>
                    {allSubjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                  <select 
                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                    value={(bank.find(() => true) as any)?.difficulty || ''}
                    onChange={(e) => {}}
                  >
                    <option value="">{t('All Difficulties')}</option>
                    <option value="easy">{t('Easy')}</option>
                    <option value="medium">{t('Medium')}</option>
                    <option value="hard">{t('Hard')}</option>
                  </select>
                </div>
              </div>
              
              <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[500px] overflow-y-auto">
                {bank.length === 0 ? (
                  <div className="p-12 text-center">
                    <Database size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-bold text-gray-500">{t('No questions found')}</h3>
                    <p className="text-sm text-gray-400">{t('Add questions to get started')}</p>
                  </div>
                ) : (
                  bank
                    .filter(q => !bankSubjectFilter || q.subject === bankSubjectFilter)
                    .filter(q => !bankTagFilter || q.question?.toLowerCase().includes(bankTagFilter.toLowerCase()) || q.tags?.some((t: string) => t.toLowerCase().includes(bankTagFilter.toLowerCase())))
                    .map((q, idx) => (
                      <div key={q.id || idx} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="default" size="sm">{q.subject || t('No Subject')}</Badge>
                              {q.difficulty && <Badge variant={q.difficulty === 'easy' ? 'success' : q.difficulty === 'hard' ? 'danger' : 'default'} size="sm">{t(q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1))}</Badge>}
                              {q.type && <Badge variant="secondary" size="sm">{q.type}</Badge>}
                            </div>
                            <p className="text-sm font-medium mb-1">{q.question}</p>
                            {q.options && Array.isArray(q.options) && (
                              <div className="text-xs text-gray-500 space-y-1 mt-2">
                                {q.options.map((opt: string, i: number) => (
                                  <div key={i} className={opt === q.correctAnswer ? 'text-green-600 font-medium' : ''}>
                                    {String.fromCharCode(65 + i)}. {opt} {opt === q.correctAnswer && <CheckCircle2 size={12} className="inline ml-1" />}
                                  </div>
                                ))}
                              </div>
                            )}
                            {q.tags && q.tags.length > 0 && (
                              <div className="flex gap-1 mt-2">
                                {q.tags.map((tag: string, i: number) => <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{tag}</span>)}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" icon={<Edit2 size={14} />} onClick={() => setEditingBankItem(q)} />
                            <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={async () => {
                              if (confirm(t('Delete this question?'))) {
                                try {
                                  await import('../services/dataService').then(m => m.deleteQuestionFromBank(q.id));
                                  setBank(bank.filter(b => b.id !== q.id));
                                } catch (err) { console.error('Delete failed:', err); }
                              }
                            }} />
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
              
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                <p className="text-sm text-gray-500">{bank.length} {t('total questions')}</p>
              </div>
           </Card>
           
           {editingBankItem !== null && (
             <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
               <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-xl">
                 <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                   <h2 className="text-xl font-bold">{editingBankItem.id ? t('Edit Question') : t('Add New Question')}</h2>
                 </div>
                 <form onSubmit={async (e) => {
                   e.preventDefault();
                   const form = e.target as HTMLFormElement;
                   const questionData = {
                     question: (form.elements.namedItem('question') as HTMLInputElement).value,
                     subject: (form.elements.namedItem('subject') as HTMLSelectElement).value,
                     difficulty: (form.elements.namedItem('difficulty') as HTMLSelectElement).value,
                     type: (form.elements.namedItem('type') as HTMLSelectElement).value,
                     options: [
                       (form.elements.namedItem('optionA') as HTMLInputElement).value,
                       (form.elements.namedItem('optionB') as HTMLInputElement).value,
                       (form.elements.namedItem('optionC') as HTMLInputElement).value,
                       (form.elements.namedItem('optionD') as HTMLInputElement).value,
                     ].filter(Boolean),
                     correctAnswer: (form.elements.namedItem('correctAnswer') as HTMLSelectElement).value,
                     tags: (form.elements.namedItem('tags') as HTMLInputElement).value.split(',').map(t => t.trim()).filter(Boolean),
                   };
                   try {
                     if (editingBankItem.id) {
                       await import('../services/dataService').then(m => m.updateQuestionInBank(editingBankItem.id, questionData));
                       setBank(bank.map(q => q.id === editingBankItem.id ? { ...q, ...questionData } : q));
                     } else {
                       const res = await import('../services/dataService').then(m => m.addQuestionsToBank([questionData]));
                       const newQ = { ...questionData, id: res.insertedId || Date.now().toString() };
                       setBank([newQ, ...bank]);
                     }
                     setEditingBankItem(null);
                   } catch (err) { console.error('Save failed:', err); }
                 }} className="p-6 space-y-4">
                   <div>
                     <label className="block text-sm font-bold mb-1">{t('Question')}</label>
                     <textarea name="question" defaultValue={editingBankItem.question || ''} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" rows={3} required />
                   </div>
                   <div className="grid grid-cols-3 gap-4">
                     <div>
                       <label className="block text-sm font-bold mb-1">{t('Subject')}</label>
                       <select name="subject" defaultValue={editingBankItem.subject || ''} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" required>
                         <option value="">{t('Select...')}</option>
                         {allSubjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                       </select>
                     </div>
                     <div>
                       <label className="block text-sm font-bold mb-1">{t('Difficulty')}</label>
                       <select name="difficulty" defaultValue={editingBankItem.difficulty || ''} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                         <option value="">{t('Select...')}</option>
                         <option value="easy">{t('Easy')}</option>
                         <option value="medium">{t('Medium')}</option>
                         <option value="hard">{t('Hard')}</option>
                       </select>
                     </div>
                     <div>
                       <label className="block text-sm font-bold mb-1">{t('Type')}</label>
                       <select name="type" defaultValue={editingBankItem.type || 'mcq'} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                         <option value="mcq">MCQ</option>
                         <option value="short">Short Answer</option>
                         <option value="long">Long Answer</option>
                       </select>
                     </div>
                   </div>
                   <div>
                     <label className="block text-sm font-bold mb-1">{t('Options (A, B, C, D)')}</label>
                     <div className="grid grid-cols-2 gap-2">
                       <div className="flex items-center gap-2"><span className="text-sm font-bold w-6">A.</span><input name="optionA" defaultValue={editingBankItem.options?.[0] || ''} className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" /></div>
                       <div className="flex items-center gap-2"><span className="text-sm font-bold w-6">B.</span><input name="optionB" defaultValue={editingBankItem.options?.[1] || ''} className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" /></div>
                       <div className="flex items-center gap-2"><span className="text-sm font-bold w-6">C.</span><input name="optionC" defaultValue={editingBankItem.options?.[2] || ''} className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" /></div>
                       <div className="flex items-center gap-2"><span className="text-sm font-bold w-6">D.</span><input name="optionD" defaultValue={editingBankItem.options?.[3] || ''} className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" /></div>
                     </div>
                   </div>
                   <div>
                     <label className="block text-sm font-bold mb-1">{t('Correct Answer')}</label>
                     <select name="correctAnswer" defaultValue={editingBankItem.correctAnswer || ''} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" required>
                       <option value="">{t('Select correct answer...')}</option>
                       <option value="A">A</option>
                       <option value="B">B</option>
                       <option value="C">C</option>
                       <option value="D">D</option>
                     </select>
                   </div>
                   <div>
                     <label className="block text-sm font-bold mb-1">{t('Tags (comma separated)')}</label>
                     <input name="tags" defaultValue={editingBankItem.tags?.join(', ') || ''} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" placeholder="algebra, practice, exam" />
                   </div>
                   <div className="flex justify-end gap-3 pt-4">
                     <Button variant="ghost" type="button" onClick={() => setEditingBankItem(null)}>{t('Cancel')}</Button>
                     <Button variant="primary" type="submit">{t('Save Question')}</Button>
                   </div>
                 </form>
               </motion.div>
             </div>
           )}
        </div>
      )}

      {/* Modals & Overlays */}
      {editingUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCancelEdit} />
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-md">
            <Card padding="xl">
              <h2 className="text-xl font-bold mb-6">Edit User</h2>
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <Input value={editedName} onChange={e => setEditedName(e.target.value)} label="Full Name" />
                <Input value={editedId} onChange={e => setEditedId(e.target.value)} label="User ID" />
                {editUserError && <p className="text-xs text-red-500">{editUserError}</p>}
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="ghost" onClick={handleCancelEdit}>Cancel</Button>
                  <Button variant="primary" type="submit">Save Changes</Button>
                </div>
              </form>
            </Card>
          </motion.div>
        </div>
      )}

      <TicketPanel userId={admin.id} role="admin" />

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

      {showFaceViewer && <AdminFaceViewer onClose={() => setShowFaceViewer(false)} />}
      
    </DashboardLayout>
  );
};

export default AdminDashboard;
