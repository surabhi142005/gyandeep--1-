import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AttendanceRecord, Student } from '../types';

interface DigitalClassroomProps {
  attendance: AttendanceRecord[];
  students: Student[];
  classCode?: string;
  subject?: string;
  theme: string;
}

const DigitalClassroom: React.FC<DigitalClassroomProps> = ({ attendance, students, classCode, subject, theme }) => {
  const presentCount = attendance.filter(a => a.status === 'Present').length;
  const totalCount = students.length;
  const engagementRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <div className="bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden border border-slate-800">
      {/* Background Effects */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/10 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <h2 className="text-3xl font-black text-white tracking-tight">Live Digital Classroom</h2>
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">
              {subject || 'No Active Session'} • {classCode || '---'}
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-slate-800/50 backdrop-blur-xl p-5 rounded-3xl border border-white/5 text-center min-w-[120px]">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Engagement</p>
              <p className="text-2xl font-black text-indigo-400">{engagementRate}%</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-xl p-5 rounded-3xl border border-white/5 text-center min-w-[120px]">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Present</p>
              <p className="text-2xl font-black text-white">{presentCount}<span className="text-slate-600 text-sm ml-1">/ {totalCount}</span></p>
            </div>
          </div>
        </div>

        {/* Visual Student Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4">
          {students.map((student) => {
            const isPresent = attendance.some(a => a.studentId === student.id && a.status === 'Present');
            
            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative group"
              >
                <div className={`
                  aspect-square rounded-2xl flex items-center justify-center text-sm font-black transition-all duration-500 border-2
                  ${isPresent 
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400 shadow-[0_0_20px_rgba(79,70,229,0.2)]' 
                    : 'bg-slate-800 border-slate-700 text-slate-600 opacity-40'}
                `}>
                  {student.name?.[0]}
                </div>
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-white text-slate-900 text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30">
                  {student.name}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white" />
                </div>

                {isPresent && (
                  <motion.div 
                    layoutId={`pulse-${student.id}`}
                    className="absolute inset-0 rounded-2xl bg-indigo-500/20"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.div>
            );
          })}
          
          {students.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-[2rem]">
              <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Waiting for students to enroll...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DigitalClassroom;
