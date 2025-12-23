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
    if (success) alert('✅ Conexión establecida con PostgreSQL en 192.168.99.180:3008');
    else alert('❌ Fallo de conexión. Verifique el backend.');
  };

  const handleMigration = async () => {
    if (!confirm("¿Desea mover todos los datos del navegador a PostgreSQL? Los datos locales se sincronizarán con la base de datos central.")) return;
    
    setMigrating(true);
    try {
      // Obtener incidencias de localStorage si existen
      const localData: Complaint[] = JSON.parse(localStorage.getItem('dac_complaints') || '[]');
      if (localData.length === 0) {
        alert("No hay datos locales para migrar.");
        setMigrating(false);
        return;
      }

      const result = await dbService.bulkSync(localData);
      if (result.success) {
        alert(`¡Migración Exitosa! Se han movido ${result.count} registros a PostgreSQL.`);
      } else {
        alert("Error durante la migración masiva.");
      }
    } catch (e) {
      alert("Fallo en la conexión durante la migración.");
    }
    setMigrating(false);
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Botones de Acción de Sistema */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="glass-card p-10 bg-amber-500 text-white shadow-2xl border-none">
            <h4 className="text-xl font-black mb-2 flex items-center gap-3">
              <span className="text-2xl">📦</span> Sincronización Masiva
            </h4>
            <p className="text-[11px] font-bold text-amber-100 opacity-80 mb-8 leading-relaxed">
              Utilice esta herramienta para volcar toda la auditoría capturada offline hacia el servidor central PostgreSQL de forma segura.
            </p>
            <button 
              onClick={handleMigration} 
              disabled={migrating}
              className="w-full py-5 bg-white text-amber-600 rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              {migrating ? 'MIGRANDO DATOS...' : 'MIGRAR LOCAL A POSTGRES'}
            </button>
         </div>

         <div className="glass-card p-10 bg-slate-900 text-white shadow-2xl border-none relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20"></div>
            <h4 className="text-xl font-black mb-2 flex items-center gap-3">
              <span className="text-2xl">🐘</span> Configuración del Nodo
            </h4>
            <p className="text-[11px] font-bold text-slate-400 mb-8">Estado de conexión con el backend IP: 192.168.99.180</p>
            {!isUnlocked ? (
              <div className="flex gap-4">
                <input type="password" placeholder="Clave Admin" className="flex-1 p-5 bg-white/10 rounded-[2rem] text-sm font-bold outline-none border border-white/10" value={dbPasswordAuth} onChange={e => setDbPasswordAuth(e.target.value)} />
                <button onClick={() => dbPasswordAuth === adminPassword ? setIsUnlocked(true) : alert('Clave Errónea')} className="px-10 py-5 bg-amber-500 rounded-[2rem] font-black text-[11px] uppercase tracking-widest">Entrar</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <input className="col-span-2 p-5 bg-white/10 rounded-2xl text-xs font-bold" value={dbParams.host} readOnly />
                <button onClick={handleTestConnection} className="col-span-2 py-4 bg-emerald-500 rounded-2xl font-black text-[10px] uppercase tracking-widest">Re-Validar Enlace</button>
              </div>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="glass-card bg-white p-12 border border-orange-100 shadow-xl">
          <h3 className="text-2xl font-black mb-10 flex items-center gap-4 text-slate-900">
            <span className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg">🏢</span> Áreas
          </h3>
          <div className="flex gap-4 mb-10">
            <input className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:border-amber-400" value={newArea} onChange={e => setNewArea(e.target.value)} placeholder="Nueva Área..." />
            <button onClick={() => { if(newArea) { setAreas([...areas, newArea]); setNewArea(''); } }} className="w-16 h-16 bg-amber-500 text-white rounded-2xl font-black text-3xl shadow-xl">+</button>
          </div>
          <div className="flex flex-wrap gap-3">
            {areas.map(a => <span key={a} className="px-5 py-3 bg-slate-50 text-slate-700 rounded-2xl text-[10px] font-black border border-slate-200">{a}</span>)}
          </div>
        </div>

        <div className="glass-card bg-white p-12 border border-orange-100 shadow-xl">
          <h3 className="text-2xl font-black mb-10 flex items-center gap-4 text-slate-900">
            <span className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg">🎓</span> Especialidades
          </h3>
          <div className="flex gap-4 mb-10">
            <input className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:border-amber-400" value={newSpec} onChange={e => setNewSpec(e.target.value)} placeholder="Nueva Especialidad..." />
            <button onClick={() => { if(newSpec) { setSpecialties([...specialties, newSpec]); setNewSpec(''); } }} className="w-16 h-16 bg-orange-500 text-white rounded-2xl font-black text-3xl shadow-xl">+</button>
          </div>
          <div className="flex flex-wrap gap-3">
            {specialties.map(s => <span key={s} className="px-5 py-3 bg-slate-50 text-slate-700 rounded-2xl text-[10px] font-black border border-slate-200">{s}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
};