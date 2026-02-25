/**
 * hooks/usePerformance.ts
 *
 * Extracts XP / badges / performance update logic from App.tsx.
 */

import type { AnyUser, PerformanceData, Student } from '../types';
import { UserRole as UserRoleEnum } from '../types';

interface UsePerformanceOptions {
  setAllUsers: React.Dispatch<React.SetStateAction<AnyUser[]>>;
}

const BADGE_RULES: { badge: string; condition: (score: number, student: Student) => boolean }[] = [
  { badge: 'Perfect 5',  condition: (score, s) => score === 100 && !s.badges?.includes('Perfect 5') },
  { badge: 'High Score', condition: (score, s) => score >= 80  && !s.badges?.includes('High Score') },
];

export function usePerformance({ setAllUsers }: UsePerformanceOptions) {
  const handleUpdatePerformance = (studentId: string, subject: string, score: number) => {
    const newPerformance: PerformanceData = {
      subject,
      score,
      date: new Date().toISOString().split('T')[0],
    };

    setAllUsers(prevUsers => prevUsers.map(user => {
      if (user.id !== studentId || user.role !== UserRoleEnum.STUDENT) return user;
      const student = user as Student;
      const xpGain = Math.max(1, Math.round(score));
      const badges = Array.isArray(student.badges) ? [...student.badges] : [];
      for (const rule of BADGE_RULES) {
        if (rule.condition(score, student)) badges.push(rule.badge);
      }
      return {
        ...student,
        performance: [...(student.performance || []), newPerformance],
        xp: (student.xp || 0) + xpGain,
        badges,
      };
    }));
  };

  return { handleUpdatePerformance };
}
