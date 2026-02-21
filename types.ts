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
  emailVerified?: boolean;
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
  xp?: number;
  badges?: string[];
  coins?: number;
  level?: number;
  totalQuizzes?: number;
  longestStreak?: number;
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

// ========== Blockchain Types ==========

export interface BlockchainRecord {
  recordId: number;
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  verified: boolean;
}

export interface AttendanceBlockchainRecord extends BlockchainRecord {
  studentId: string;
  classId: string;
  location: string;
}

export interface GradeBlockchainRecord extends BlockchainRecord {
  studentId: string;
  quizId: string;
  subject: string;
  score: number;
  maxScore: number;
  teacherId: string;
}

export interface NFTCertificate {
  tokenId: number;
  studentId: string;
  courseId: string;
  courseName: string;
  grade: string;
  issueDate: number;
  metadataURI: string;
  revoked: boolean;
  owner: string;
}

export interface WalletInfo {
  address: string;
  connected: boolean;
  chainId: number;
  balance: string;
}

// ========== Digital Twin Types ==========

export interface DigitalTwinState {
  classroomId: string;
  students: StudentTwinData[];
  teacher: TeacherTwinData | null;
  activeSession: boolean;
  timestamp: number;
}

export interface StudentTwinData {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  status: 'present' | 'absent' | 'late';
  engagement: number; // 0-100
}

export interface TeacherTwinData {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  active: boolean;
}

export interface LearningTwinData {
  studentId: string;
  subjects: SubjectPerformance[];
  learningPath: LearningNode[];
  predictedOutcome: number;
}

export interface SubjectPerformance {
  subject: string;
  score: number;
  trend: 'improving' | 'stable' | 'declining';
  position: { x: number; y: number; z: number };
}

export interface LearningNode {
  id: string;
  type: 'quiz' | 'assignment' | 'milestone';
  completed: boolean;
  score?: number;
  date: string;
}

// ========== Real-Time Analytics Types ==========

export interface RealtimeAnalytics {
  userId: string;
  userRole: UserRole;
  performanceData: PerformanceTrend[];
  attendanceData: AttendanceTrend[];
  engagementData: EngagementMetric[];
  timestamp: number;
}

export interface PerformanceTrend {
  subject: string;
  data: { date: string; score: number }[];
  average: number;
  trend: 'up' | 'down' | 'stable';
}

export interface AttendanceTrend {
  period: string; // 'week' | 'month' | 'year'
  present: number;
  absent: number;
  percentage: number;
}

export interface EngagementMetric {
  type: 'quiz' | 'chat' | 'attendance' | 'notes';
  count: number;
  timestamp: number;
}

export interface LiveClassMetrics {
  sessionCode: string;
  studentsPresent: number;
  totalStudents: number;
  quizParticipation: number;
  chatActivity: number;
  averageEngagement: number;
}

// ========== WebSocket Message Types ==========

export interface WebSocketMessage {
  type: 'attendance' | 'performance' | 'quiz' | 'session' | 'blockchain' | 'digital-twin' | 'engagement';
  data: any;
  timestamp: number;
  userId?: string;
}

export interface AttendanceUpdateMessage extends WebSocketMessage {
  type: 'attendance';
  data: {
    studentId: string;
    status: 'Present' | 'Absent';
    timestamp: Date;
    location?: Coordinates;
  };
}

export interface PerformanceUpdateMessage extends WebSocketMessage {
  type: 'performance';
  data: {
    studentId: string;
    subject: string;
    score: number;
    quizId: string;
  };
}

export interface BlockchainUpdateMessage extends WebSocketMessage {
  type: 'blockchain';
  data: {
    transactionHash: string;
    recordType: 'attendance' | 'grade' | 'certificate';
    status: 'pending' | 'confirmed' | 'failed';
  };
}
