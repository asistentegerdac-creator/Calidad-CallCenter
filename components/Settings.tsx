import React, { useState } from 'react';
import { dbService } from '../services/apiService';
import { Complaint } from '../types';

interface Props {
  areas: string[];
  setAreas: (a: string[]) => void;
  specialties: string[];
  setSpecialties: (s: string[]) => void;
  adminPassword: string;
  onConnStatusChange: (s: boolean) => void;
}

export const Settings: React.FC<Props> = ({ areas, setAreas, specialties, setSpecialties, adminPassword, onConnStatusChange }) => {
  const [newArea, setNewArea] = useState('');
  const [newSpec, setNewSpec] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [dbPasswordAuth, setDbPasswordAuth] = useState('');
  const [migrating, setMigrating] = useState(false);
  
  const [dbParams, setDbParams] = useState({
    host: '192.168.99.180',
    port: '3008',
    database: 'calidad_dac_db',
    user: 'postgres',
    password: ''
  });

  const handleTestConnection = async () => {
    const success = await dbService.testConnection(dbParams);
    onConnStatusChange(success);
    if (success) alert('✅ Nodo PostgreSQL vinculado con éxito.');
    else alert('❌ Error de conexión al servidor.');
  };

  const handleMigration = async () => {
    if (!confirm("¿Mover todos los datos locales a PostgreSQL?")) return;
    setMigrating(true);
    const localData = JSON.parse(localStorage.getItem('dac_complaints') || '[]');
    if (localData.length === 0) {
      alert("No hay datos para migrar.");
      setMigrating(false);
      return;
    }
    const result = await dbService.bulkSync(localData);
    if (result.success) alert(`¡Éxito! Migrados ${result.count} registros.`);
    setMigrating(false);
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="glass-card bg-white p-12 border-2 border-dashed border-amber-300 shadow-inner">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h3 className="text-2xl font-black flex items-center gap-4 text-slate-900">
              <span className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center">🐘</span> Enlace PostgreSQL
            </h3>
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-2 ml-16">Infraestructura de Datos Centralizada</p>
          </div>
          {!isUnlocked && (
            <div className="flex items-center gap-3">
              <input type="password" placeholder="Clave Administrativa" className="p-4 bg-slate-50 rounded-2xl text-sm border-2 border-slate-100 outline-none focus:border-amber-500 font-bold" value={dbPasswordAuth} onChange={e => setDbPasswordAuth(e.target.value)} />
              <button onClick={() => dbPasswordAuth === adminPassword ? setIsUnlocked(true) : alert('Clave Incorrecta')} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Entrar</button>
            </div>
          )}
        </div>

        {isUnlocked && (
          <div className="animate-in slide-in-from-top-6 duration-700 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8 bg-slate-50 rounded-[3rem] border border-slate-100">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">IP del Servidor</label>
                <input className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 font-bold text-slate-900 text-sm outline-none focus:border-amber-400" value={dbParams.host} onChange={e => setDbParams({...dbParams, host: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Puerto de Servicio</label>
                <input className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 font-bold text-slate-900 text-sm outline-none focus:border-amber-400" value={dbParams.port} onChange={e => setDbParams({...dbParams, port: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nombre de la Base</label>
                <input className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 font-bold text-slate-900 text-sm outline-none focus:border-amber-400" value={dbParams.database} onChange={e => setDbParams({...dbParams, database: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Usuario Postgres</label>
                <input className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 font-bold text-slate-900 text-sm outline-none focus:border-amber-400" value={dbParams.user} onChange={e => setDbParams({...dbParams, user: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Contraseña</label>
                <input type="password" placeholder="••••••••" className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 font-bold text-slate-900 text-sm outline-none focus:border-amber-400" value={dbParams.password} onChange={e => setDbParams({...dbParams, password: e.target.value})} />
              </div>
              <div className="flex items-end gap-4">
                <button onClick={handleTestConnection} className="w-full py-5 bg-amber-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Vincular Nodo</button>
              </div>
            </div>

            <button onClick={handleMigration} disabled={migrating} className="w-full py-6 bg-emerald-500 text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest shadow-xl disabled:opacity-50">
              {migrating ? 'Sincronizando...' : 'Migrar Datos Locales a Postgres'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="glass-card bg-white p-12 border border-orange-100 shadow-xl">
          <h3 className="text-2xl font-black mb-10 flex items-center gap-4">🏢 Áreas</h3>
          <div className="flex gap-4 mb-10">
            <input className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:border-amber-400" value={newArea} onChange={e => setNewArea(e.target.value)} placeholder="Ej. Laboratorio" />
            <button onClick={() => { if(newArea) { setAreas([...areas, newArea]); setNewArea(''); } }} className="w-16 h-16 bg-amber-500 text-white rounded-2xl font-black text-3xl shadow-xl">+</button>
          </div>
          <div className="flex flex-wrap gap-3">
            {areas.map(a => <span key={a} className="px-5 py-3 bg-slate-50 text-slate-700 rounded-2xl text-[10px] font-black border border-slate-200 uppercase">{a}</span>)}
          </div>
        </div>

        <div className="glass-card bg-white p-12 border border-orange-100 shadow-xl">
          <h3 className="text-2xl font-black mb-10 flex items-center gap-4">🎓 Especialidades</h3>
          <div className="flex gap-4 mb-10">
            <input className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:border-amber-400" value={newSpec} onChange={e => setNewSpec(e.target.value)} placeholder="Ej. Pediatría" />
            <button onClick={() => { if(newSpec) { setSpecialties([...specialties, newSpec]); setNewSpec(''); } }} className="w-16 h-16 bg-orange-500 text-white rounded-2xl font-black text-3xl shadow-xl">+</button>
          </div>
          <div className="flex flex-wrap gap-3">
            {specialties.map(s => <span key={s} className="px-5 py-3 bg-slate-50 text-slate-700 rounded-2xl text-[10px] font-black border border-slate-200 uppercase">{s}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
};