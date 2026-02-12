export enum UserRole {
  TEACHER = 'teacher',
  STUDENT = 'student',
  ADMIN = 'admin',
}

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrator',
  [UserRole.TEACHER]: 'Teacher',
  [UserRole.STUDENT]: 'Student',
};

export interface SubjectConfig {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  faceImage: string | null; // Stores base64 image data for face recognition
  email?: string;
  googleId?: string;
  password?: string;
  preferences?: UserPreferences;
  history?: UserHistory[];
}

export interface UserPreferences {
  theme?: string;
  highContrast?: boolean;
  fontScale?: number;
  language?: string;
  notifications?: boolean;
}

export interface UserHistory {
  id: string;
  type: 'quiz' | 'attendance' | 'view';
  details: string;
  timestamp: string;
}

export interface Student extends User {
  role: UserRole.STUDENT;
  performance: PerformanceData[];
  classId?: string;
}

export interface Teacher extends User {
  role: UserRole.TEACHER;
  assignedSubjects: string[]; // Array of SubjectConfig IDs
}

export interface Admin extends User {
  role: UserRole.ADMIN;
}

export type AnyUser = Student | Teacher | Admin;

export interface PerformanceData {
  subject: string;
  date: string; // YYYY-MM-DD
  score: number; // Percentage
}

export interface AttendanceRecord {
  studentId: string;
  studentName: string;
  timestamp: Date | null;
  status: 'Present' | 'Absent';
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ClassSession {
  code: string | null;
  expiry: number | null; // Using timestamp for easier comparison
  notes: string | null;
  quiz: QuizQuestion[] | null;
  quizPublished: boolean;
  subject: string;
  teacherLocation: Coordinates | null;
  attendanceRadius: number; // in meters
}

export interface HistoricalSessionRecord {
  id: number; // Using start timestamp as a unique ID
  date: string; // ISO string
  subject: string;
  attendance: AttendanceRecord[];
  notes: string | null; // Add notes property
  classId?: string; // Optional class ID for class-based filtering
}

export interface ClassConfig {
  id: string;
  name: string;
}