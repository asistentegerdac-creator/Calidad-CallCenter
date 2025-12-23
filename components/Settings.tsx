import React, { useState } from 'react';
import { dbService } from '../services/apiService';

interface Props {
  areas: string[];
  setAreas: (a: string[]) => void;
  specialties: string[];
  setSpecialties: (s: string[]) => void;
  onConnStatusChange: (s: boolean) => void;
}

export const Settings: React.FC<Props> = ({ areas, setAreas, specialties, setSpecialties, onConnStatusChange }) => {
  const [newArea, setNewArea] = useState('');
  const [newSpec, setNewSpec] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  
  const [dbParams, setDbParams] = useState({
    host: '192.168.99.180',
    port: '3008',
    database: 'calidad_dac_db',
    user: 'postgres',
    password: ''
  });

  const removeArea = (idx: number) => setAreas(areas.filter((_, i) => i !== idx));
  const removeSpec = (idx: number) => setSpecialties(specialties.filter((_, i) => i !== idx));

  return (
    <div className="space-y-12 pb-20">
      <div className="glass-card p-10 bg-slate-900 text-white shadow-2xl relative overflow-hidden">
        <h3 className="text-xl font-black mb-2 flex items-center gap-3">
          <span className="text-2xl">🐘</span> Configuración del Nodo Central
        </h3>
        {!isUnlocked ? (
          <div className="mt-6">
            <button onClick={() => setIsUnlocked(true)} className="px-8 py-4 bg-amber-500 rounded-2xl font-black text-[10px] uppercase tracking-widest">Configurar Servidor</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 animate-in slide-in-from-top-4 duration-300">
            <input className="bg-white/10 p-4 rounded-xl text-sm" placeholder="Host IP" value={dbParams.host} onChange={e => setDbParams({...dbParams, host: e.target.value})} />
            <input className="bg-white/10 p-4 rounded-xl text-sm" placeholder="Port" value={dbParams.port} onChange={e => setDbParams({...dbParams, port: e.target.value})} />
            <input className="bg-white/10 p-4 rounded-xl text-sm" placeholder="DB Name" value={dbParams.database} onChange={e => setDbParams({...dbParams, database: e.target.value})} />
            <input className="bg-white/10 p-4 rounded-xl text-sm" placeholder="User" value={dbParams.user} onChange={e => setDbParams({...dbParams, user: e.target.value})} />
            <input className="bg-white/10 p-4 rounded-xl text-sm" type="password" placeholder="Pass" value={dbParams.password} onChange={e => setDbParams({...dbParams, password: e.target.value})} />
            <button onClick={async () => {
              const ok = await dbService.testConnection(dbParams);
              onConnStatusChange(ok);
              alert(ok ? 'Conectado' : 'Error');
            }} className="bg-amber-500 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest">Guardar y Vincular</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="glass-card bg-white p-10 border border-orange-100 shadow-xl">
          <h3 className="text-xl font-black mb-8 flex items-center gap-4 text-slate-900">🏢 Gestión de Áreas</h3>
          <div className="flex gap-4 mb-8">
            <input className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold" value={newArea} onChange={e => setNewArea(e.target.value)} placeholder="Ej. Odontología" />
            <button onClick={() => { if(newArea) { setAreas([...areas, newArea]); setNewArea(''); } }} className="w-14 h-14 bg-amber-500 text-white rounded-2xl font-black text-2xl">+</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {areas.map((a, i) => (
              <span key={i} className="group px-4 py-2 bg-slate-50 text-slate-700 rounded-xl text-[9px] font-black border border-slate-100 flex items-center gap-2">
                {a}
                <button onClick={() => removeArea(i)} className="text-rose-500 font-black">✕</button>
              </span>
            ))}
          </div>
        </div>

        <div className="glass-card bg-white p-10 border border-orange-100 shadow-xl">
          <h3 className="text-xl font-black mb-8 flex items-center gap-4 text-slate-900">🎓 Gestión de Especialidades</h3>
          <div className="flex gap-4 mb-8">
            <input className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold" value={newSpec} onChange={e => setNewSpec(e.target.value)} placeholder="Ej. Oftalmología" />
            <button onClick={() => { if(newSpec) { setSpecialties([...specialties, newSpec]); setNewSpec(''); } }} className="w-14 h-14 bg-orange-500 text-white rounded-2xl font-black text-2xl">+</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {specialties.map((s, i) => (
              <span key={i} className="group px-4 py-2 bg-slate-50 text-slate-700 rounded-xl text-[9px] font-black border border-slate-100 flex items-center gap-2">
                {s}
                <button onClick={() => removeSpec(i)} className="text-rose-500 font-black">✕</button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};