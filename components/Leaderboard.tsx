import React, { useMemo } from 'react';
import type { Student } from '../types';

interface LeaderboardProps {
  students: Student[];
  currentStudentId: string;
  theme: string;
}

const THEME_COLORS: Record<string, Record<string, string>> = {
  indigo: { primary: 'bg-indigo-600', text: 'text-indigo-600', lightBg: 'bg-indigo-50' },
  teal: { primary: 'bg-teal-600', text: 'text-teal-600', lightBg: 'bg-teal-50' },
  crimson: { primary: 'bg-red-600', text: 'text-red-600', lightBg: 'bg-red-50' },
  purple: { primary: 'bg-purple-600', text: 'text-purple-600', lightBg: 'bg-purple-50' },
};

const RANK_ICONS = ['🥇', '🥈', '🥉'];

const Leaderboard: React.FC<LeaderboardProps> = ({ students, currentStudentId, theme }) => {
  const colors = useMemo(() => THEME_COLORS[theme] || THEME_COLORS.indigo, [theme]);

  const ranked = useMemo(() => {
    return [...students]
      .sort((a, b) => (b.xp || 0) - (a.xp || 0))
      .slice(0, 10);
  }, [students]);

  if (ranked.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Leaderboard</h2>
        <p className="text-gray-500">No students yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">Leaderboard</h2>
      <div className="space-y-2">
        {ranked.map((student, index) => {
          const isCurrentUser = student.id === currentStudentId;
          return (
            <div
              key={student.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                isCurrentUser ? `${colors.lightBg} ring-2 ring-offset-1 ring-${theme === 'crimson' ? 'red' : theme}-400` : 'hover:bg-gray-50'
              }`}
            >
              <span className="text-lg w-8 text-center font-bold text-gray-400">
                {index < 3 ? RANK_ICONS[index] : `#${index + 1}`}
              </span>
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                {student.faceImage ? (
                  <img src={student.faceImage} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  student.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm truncate ${isCurrentUser ? colors.text : 'text-gray-800'}`}>
                  {student.name} {isCurrentUser && '(You)'}
                </p>
                <p className="text-xs text-gray-400">
                  Lvl {student.level || Math.floor((student.xp || 0) / 100) + 1}
                  {student.badges && student.badges.length > 0 && ` · ${student.badges.length} badges`}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-bold text-sm ${colors.text}`}>{student.xp || 0} XP</p>
                <p className="text-xs text-yellow-600">{student.coins || 0} coins</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Leaderboard;
