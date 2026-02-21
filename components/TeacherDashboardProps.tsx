import type { Teacher, Student, AttendanceRecord, ClassSession, HistoricalSessionRecord, SubjectConfig } from '@/types';
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
  allClasses: { id: string; name: string; }[];
  announcements?: Announcement[];
  onPostAnnouncement?: (text: string) => void;
}
