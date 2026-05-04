import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AttendanceRecord, Student } from '../types';
import { t } from '../services/i18n';

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
    <div 
      className="bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden border border-slate-800"
      role="region"
      aria-label={t('Live Digital Classroom')}
    >
      {/* Background Effects */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/10 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
              <h2 className="text-3xl font-black text-white tracking-tight">{t('Digital Classroom')}</h2>
            </div>
            <div className="flex items-center gap-4 text-slate-400 font-medium">
              <span className="bg-slate-800 px-3 py-1 rounded-full text-xs border border-slate-700">{subject || t('General')}</span>
              <span className="bg-slate-800 px-3 py-1 rounded-full text-xs border border-slate-700">{t('Code')}: {classCode || '---'}</span>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-slate-800/50 backdrop-blur-md p-4 rounded-2xl border border-slate-700 min-w-[120px]">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('Present')}</p>
              <p className="text-2xl font-black text-white">{presentCount}<span className="text-slate-600 text-lg">/{totalCount}</span></p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-md p-4 rounded-2xl border border-slate-700 min-w-[120px]">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('Engagement')}</p>
              <p className="text-2xl font-black text-indigo-400">{engagementRate}%</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">{t('Student Presence')}</h3>
            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
              <div className="flex items-center gap-2 text-green-500">
                <span className="w-2 h-2 rounded-full bg-green-500" /> {t('Present')}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-slate-700" /> {t('Absent')}
              </div>
            </div>
          </div>

          <div 
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6"
            aria-live="polite"
            aria-atomic="false"
          >
            {students.map(student => {
              const isPresent = attendance.some(a => a.studentId === student.id && a.status === 'Present');
              return (
                <motion.div
                  key={student.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`relative group p-4 rounded-3xl transition-all duration-500 ${
                    isPresent 
                      ? 'bg-indigo-600/10 border border-indigo-500/20 shadow-[0_0_20px_rgba(79,70,229,0.1)]' 
                      : 'bg-slate-800/20 border border-slate-800 opacity-60'
                  }`}
                >
                  <div className="relative mb-3">
                    <div className={`w-16 h-16 mx-auto rounded-2xl overflow-hidden ${isPresent ? 'ring-2 ring-indigo-500 ring-offset-4 ring-offset-slate-900' : 'grayscale opacity-50'}`}>
                      {student.faceImage ? (
                        <img src={student.faceImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-600 font-bold">
                          {student.name[0]}
                        </div>
                      )}
                    </div>
                    {isPresent && (
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-lg flex items-center justify-center border-2 border-slate-900 shadow-lg"
                      >
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </motion.span>
                    )}
                  </div>
                  <p className={`text-[11px] font-bold text-center truncate ${isPresent ? 'text-white' : 'text-slate-600'}`}>
                    {student.name.split(' ')[0]}
                  </p>
                  <p className="text-[8px] font-bold text-center text-slate-500 mt-0.5 uppercase tracking-tighter">
                    {student.classId || '---'}
                  </p>
                </motion.div>
              );
            })}

            {students.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-[2rem]">
                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">{t('Waiting for students to enroll...')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalClassroom;
