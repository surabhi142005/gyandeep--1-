import React from 'react';

const Dashboard3D: React.FC<{ theme: string; stats?: { xp: number; level: number; coins: number } }> = ({ theme, stats = { xp: 0, level: 1, coins: 0 } }) => {
  return (
    <div className="w-full h-[500px] bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 rounded-3xl overflow-hidden relative flex items-center justify-center">
      <div className="absolute top-8 left-8 z-10 text-white pointer-events-none">
        <h2 className="text-3xl font-black tracking-tight uppercase opacity-50">Gyandeep VR</h2>
        <div className="mt-4 space-y-2">
          <p className="text-6xl font-black text-indigo-400">{stats.level}</p>
          <p className="text-sm font-bold uppercase tracking-widest text-white/50">Current Level</p>
        </div>
      </div>
      
      <div className="absolute bottom-8 right-8 z-10 flex gap-4 pointer-events-none">
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
          <p className="text-xs font-bold text-white/50 uppercase">XP</p>
          <p className="text-xl font-bold text-white">{stats.xp}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
          <p className="text-xs font-bold text-white/50 uppercase">Coins</p>
          <p className="text-xl font-bold text-amber-400">{stats.coins}</p>
        </div>
      </div>

      <div className="text-center">
        <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-indigo-500/30 flex items-center justify-center">
          <span className="text-6xl">🎓</span>
        </div>
        <p className="text-white text-2xl font-bold">Welcome to Gyandeep</p>
        <p className="text-white/50 mt-2">3D Preview</p>
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent pointer-events-none" />
    </div>
  );
};

export default Dashboard3D;
