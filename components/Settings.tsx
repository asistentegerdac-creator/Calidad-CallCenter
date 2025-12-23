
import React, { useState } from 'react';

interface Props {
  areas: string[];
  setAreas: (a: string[]) => void;
  specialties: string[];
  setSpecialties: (s: string[]) => void;
}

export const Settings: React.FC<Props> = ({ areas, setAreas, specialties, setSpecialties }) => {
  const [newArea, setNewArea] = useState('');
  const [newSpec, setNewSpec] = useState('');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      <div className="glass-card bg-white p-12 border border-orange-100 shadow-xl">
        <h3 className="text-2xl font-black mb-10 flex items-center gap-4">
          <span className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner">🏢</span> 
          Áreas Hospitalarias
        </h3>
        <div className="flex gap-4 mb-10">
          <input className="flex-1 bg-orange-50/20 border-2 border-orange-50 rounded-2xl p-5 text-sm font-bold outline-none focus:border-amber-400 transition-all" value={newArea} onChange={e => setNewArea(e.target.value)} placeholder="Ej: Rayos X" />
          <button onClick={() => { if(newArea) setAreas([...areas, newArea]); setNewArea(''); }} className="w-16 h-16 bg-amber-500 text-white rounded-2xl font-black text-3xl shadow-xl shadow-amber-100 hover:scale-105 active:scale-95 transition-all">+</button>
        </div>
        <div className="flex flex-wrap gap-3">
          {areas.map(a => (
            <span key={a} className="px-5 py-3 bg-white text-slate-700 rounded-2xl text-[10px] font-black flex items-center gap-3 border border-orange-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all cursor-default group">
              {a} <button onClick={() => setAreas(areas.filter(x => x !== a))} className="text-slate-300 group-hover:text-rose-600 font-bold text-lg leading-none">×</button>
            </span>
          ))}
        </div>
      </div>

      <div className="glass-card bg-white p-12 border border-orange-100 shadow-xl">
        <h3 className="text-2xl font-black mb-10 flex items-center gap-4">
          <span className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shadow-inner">🎓</span> 
          Especialidades Médicas
        </h3>
        <div className="flex gap-4 mb-10">
          <input className="flex-1 bg-orange-50/20 border-2 border-orange-50 rounded-2xl p-5 text-sm font-bold outline-none focus:border-amber-400 transition-all" value={newSpec} onChange={e => setNewSpec(e.target.value)} placeholder="Ej: Pediatría" />
          <button onClick={() => { if(newSpec) setSpecialties([...specialties, newSpec]); setNewSpec(''); }} className="w-16 h-16 bg-orange-500 text-white rounded-2xl font-black text-3xl shadow-xl shadow-orange-100 hover:scale-105 active:scale-95 transition-all">+</button>
        </div>
        <div className="flex flex-wrap gap-3">
          {specialties.map(s => (
            <span key={s} className="px-5 py-3 bg-white text-slate-700 rounded-2xl text-[10px] font-black flex items-center gap-3 border border-orange-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all cursor-default group">
              {s} <button onClick={() => setSpecialties(specialties.filter(x => x !== s))} className="text-slate-300 group-hover:text-rose-600 font-bold text-lg leading-none">×</button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
