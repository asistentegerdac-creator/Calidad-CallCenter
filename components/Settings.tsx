import React, { useState, useEffect } from 'react';
import { dbService } from '../services/apiService';
import { User } from '../types';

interface Props {
  areas: string[];
  setAreas: (a: string[]) => void;
  specialties: string[];
  setSpecialties: (s: string[]) => void;
  isOnline: boolean;
  onConnStatusChange: (s: boolean) => void;
}

export const Settings: React.FC<Props> = ({ areas, setAreas, specialties, setSpecialties, isOnline, onConnStatusChange }) => {
  const [newArea, setNewArea] = useState('');
  const [newSpec, setNewSpec] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [dbUsers, setDbUsers] = useState<User[]>([]);
  
  const [dbParams, setDbParams] = useState({
    host: '192.168.99.180',
    port: '3008',
    database: 'calidad_dac_db',
    user: 'postgres',
    password: ''
  });

  useEffect(() => {
    if (isOnline) {
      dbService.fetchUsers().then(setDbUsers);
    }
  }, [isOnline]);

  const removeArea = (idx: number) => setAreas(areas.filter((_, i) => i !== idx));
  const removeSpec = (idx: number) => setSpecialties(specialties.filter((_, i) => i !== idx));

  const handleMigration = async () => {
    const localData = JSON.parse(localStorage.getItem('dac_complaints') || '[]');
    if (localData.length === 0) return alert("No hay datos locales para migrar.");
    if (!confirm(`Se enviarán ${localData.length} incidencias al servidor central. ¿Continuar?`)) return;
    setSyncing(true);
    let count = 0;
    for (const c of localData) {
      const ok = await dbService.saveComplaint(c);
      if (ok) count++;
    }
    setSyncing(false);
    alert(`Sincronización finalizada: ${count} de ${localData.length} registros subidos.`);
  };

  const handleClearTables = async () => {
    const pass = prompt("Para confirmar la limpieza total, ingrese la clave de administrador:");
    if (pass === 'admin') {
      if (confirm("⚠️ ADVERTENCIA: Se borrarán todas las incidencias y estadísticas de forma PERMANENTE. ¿Desea continuar?")) {
        const ok = await dbService.clearData();
        if (ok) {
          alert("Base de datos limpia. El sistema se reiniciará.");
          window.location.reload();
        } else {
          alert("Error al intentar limpiar la base de datos.");
        }
      }
    } else {
      alert("Clave incorrecta.");
    }
  };

  const toggleUserRole = async (user: User) => {
    const newRole = user.role === 'admin' ? 'agent' : 'admin';
    if (!confirm(`¿Cambiar rol de ${user.username} a ${newRole === 'admin' ? 'Administrador' : 'Auditor Común'}?`)) return;
    const ok = await dbService.updateUserRole(user.id, newRole);
    if (ok) {
      setDbUsers(dbUsers.map(u => u.id === user.id ? {...u, role: newRole} : u));
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="glass-card p-10 bg-slate-900 text-white shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-black mb-2 flex items-center gap-3">
              <span className="text-2xl">🐘</span> Configuración del Nodo Central
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">PostgreSQL Server Integration</p>
          </div>
          {!isUnlocked && (
            <button onClick={() => setIsUnlocked(true)} className="px-8 py-4 bg-amber-500 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-white hover:text-amber-500 transition-all">Configurar Servidor</button>
          )}
        </div>

        {isUnlocked && (
          <div className="animate-in slide-in-from-top-4 duration-300 space-y-8 mt-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <input className="bg-white/10 p-4 rounded-xl text-sm font-bold outline-none" placeholder="Host" value={dbParams.host} onChange={e => setDbParams({...dbParams, host: e.target.value})} />
              <input className="bg-white/10 p-4 rounded-xl text-sm font-bold outline-none" placeholder="Port" value={dbParams.port} onChange={e => setDbParams({...dbParams, port: e.target.value})} />
              <input className="bg-white/10 p-4 rounded-xl text-sm font-bold outline-none" placeholder="Database" value={dbParams.database} onChange={e => setDbParams({...dbParams, database: e.target.value})} />
              <input className="bg-white/10 p-4 rounded-xl text-sm font-bold outline-none" placeholder="User" value={dbParams.user} onChange={e => setDbParams({...dbParams, user: e.target.value})} />
              <input className="bg-white/10 p-4 rounded-xl text-sm font-bold outline-none" type="password" placeholder="Pass" value={dbParams.password} onChange={e => setDbParams({...dbParams, password: e.target.value})} />
              <button onClick={async () => {
                const ok = await dbService.testConnection(dbParams);
                onConnStatusChange(ok);
                alert(ok ? '✅ Conectado' : '❌ Error');
              }} className="bg-amber-500 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest">Vincular Nodo</button>
            </div>
            
            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row gap-4">
              <button onClick={handleMigration} disabled={syncing} className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase">
                {syncing ? 'Migrando...' : 'Migrar Datos Locales'}
              </button>
              <button onClick={handleClearTables} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black text-[10px] uppercase">
                🗑️ Limpiar Base de Datos (Producción)
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="glass-card bg-white p-10 border border-orange-100 shadow-xl overflow-hidden">
        <h3 className="text-xl font-black mb-8 flex items-center gap-4 text-slate-900 uppercase">👥 Gestión de Usuarios en Nodo</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Rol Actual</th>
                <th className="px-6 py-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dbUsers.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4">
                    <p className="font-black text-slate-900 text-sm">{user.username}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{user.id}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${user.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                      {user.role === 'admin' ? 'Administrador' : 'Auditor Común'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => toggleUserRole(user)} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase hover:bg-amber-500 transition-all">
                      Cambiar Rol
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="glass-card bg-white p-10 border border-orange-100 shadow-xl">
          <h3 className="text-xl font-black mb-8 flex items-center gap-4 text-slate-900">🏢 Áreas Operativas</h3>
          <div className="flex gap-4 mb-8">
            <input className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold" value={newArea} onChange={e => setNewArea(e.target.value)} placeholder="Ej. Odontología" />
            <button onClick={() => { if(newArea) { setAreas([...areas, newArea]); setNewArea(''); } }} className="w-14 h-14 bg-amber-500 text-white rounded-2xl font-black text-2xl shadow-lg">+</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {areas.map((a, i) => (
              <span key={i} className="px-4 py-2 bg-slate-50 text-slate-700 rounded-xl text-[9px] font-black border border-slate-100 flex items-center gap-3">
                {a.toUpperCase()}
                <button onClick={() => removeArea(i)} className="text-rose-500">✕</button>
              </span>
            ))}
          </div>
        </div>

        <div className="glass-card bg-white p-10 border border-orange-100 shadow-xl">
          <h3 className="text-xl font-black mb-8 flex items-center gap-4 text-slate-900">🎓 Especialidades</h3>
          <div className="flex gap-4 mb-8">
            <input className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold" value={newSpec} onChange={e => setNewSpec(e.target.value)} placeholder="Ej. Oftalmología" />
            <button onClick={() => { if(newSpec) { setSpecialties([...specialties, newSpec]); setNewSpec(''); } }} className="w-14 h-14 bg-orange-500 text-white rounded-2xl font-black text-2xl shadow-lg">+</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {specialties.map((s, i) => (
              <span key={i} className="px-4 py-2 bg-slate-50 text-slate-700 rounded-xl text-[9px] font-black border border-slate-100 flex items-center gap-3">
                {s.toUpperCase()}
                <button onClick={() => removeSpec(i)} className="text-rose-500">✕</button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};