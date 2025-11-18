import type { Teacher, Student, AttendanceRecord, ClassSession, HistoricalSessionRecord, SubjectConfig } from '@/types';

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
  allSubjects: SubjectConfig[]; // New prop
  allClasses: { id: string; name: string; }[];
}
