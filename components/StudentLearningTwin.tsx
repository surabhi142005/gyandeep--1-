import React from 'react';
import { motion } from 'framer-motion';
import { User, ActivityLog } from '../types';

interface StudentLearningTwinProps {
  student: User & { activities?: ActivityLog[] };
  theme: string;
}

const StudentLearningTwin: React.FC<StudentLearningTwinProps> = ({ student, theme }) => {
  const xp = student.xp || 0;
  const level = student.level || 1;
  const coins = student.coins || 0;
  const streak = student.streak || 0;
  
  const levelProgress = (xp % 500) / 5; // Percentage of progress to next level
  
  const activities = student.activities || [];

  return (
    <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 overflow-hidden relative">
      <div className="flex flex-col md:flex-row gap-8 items-center">
        {/* Visual Twin */}
        <div className="relative w-48 h-48">
          <motion.div 
            animate={{ 
              scale: [1, 1.05, 1],
              rotate: [0, 5, -5, 0] 
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-6xl shadow-2xl relative z-10"
          >
            {student.name?.[0] || 'S'}
          </motion.div>
          
          {/* Level Aura */}
          <div className="absolute inset-0 rounded-full border-4 border-indigo-200 animate-ping opacity-25" />
          
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white px-6 py-2 rounded-full shadow-lg border border-indigo-100 z-20">
            <span className="text-sm font-black text-indigo-600 uppercase tracking-widest">Level {level}</span>
          </div>
        </div>

        {/* Stats & Progress */}
        <div className="flex-1 w-full">
          <h3 className="text-2xl font-black text-slate-800 mb-2">{student.name}'s Learning Twin</h3>
          <p className="text-slate-500 mb-6 font-medium text-sm uppercase tracking-wide">Syncing real-time academic performance...</p>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-bold text-slate-600 uppercase tracking-tighter">Level Progress</span>
                <span className="text-xs font-black text-indigo-600">{Math.round(levelProgress)}%</span>
              </div>
              <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-1">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${levelProgress}%` }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full shadow-sm"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">{500 - (xp % 500)} XP until next level</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Coins</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-amber-500">{coins}</span>
                  <div className="w-5 h-5 rounded-full bg-amber-400 shadow-inner" />
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Current Streak</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-orange-600">{streak}</span>
                  <span className="text-lg">🔥</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="mt-12 border-t pt-8">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Recent Milestones</h4>
        <div className="space-y-3">
          {activities.length > 0 ? (
            activities.slice(0, 3).map((activity, idx) => (
              <div key={idx} className="flex items-center gap-4 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-indigo-600 font-black shadow-sm text-xs">
                  +{activity.xpEarned}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">{activity.type.replace(/_/g, ' ')}</p>
                  <p className="text-[10px] text-slate-400">{new Date(activity.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 font-medium">No recent activity recorded yet. Start learning to earn XP!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentLearningTwin;
