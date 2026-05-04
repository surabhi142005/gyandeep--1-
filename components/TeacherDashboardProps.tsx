import type { Teacher, Student, AttendanceRecord, ClassConfig, ClassSession, HistoricalSessionRecord, SubjectConfig, AnyUser } from '@/types';
import type { Announcement } from './AnnouncementBoard';

export interface TeacherDashboardProps {
  teacher: Teacher;
  students: Student[];
  attendance: AttendanceRecord[];
  classSession: ClassSession;
  onUpdateSession: (session: Partial<ClassSession>) => void;
  onLogout: () => void;
  theme: string;
  onUpdateFaceImage: (teacherId: string, faceImage: string) => void;
  historicalRecords: HistoricalSessionRecord[];
  onUpdateHistoricalRecords: (records: HistoricalSessionRecord[]) => void;
  allSubjects: SubjectConfig[];
  allClasses: ClassConfig[];
  announcements?: Announcement[];
  onPostAnnouncement?: (text: string) => void;
  onAttendanceUpdate?: (newAttendance: AttendanceRecord) => void;
  onStudentsUpdate?: (students: Student[]) => void;
  allUsers: AnyUser[];
}
