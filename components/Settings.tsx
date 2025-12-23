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

  const loadUsers = async () => {
    if (isOnline) {
      const users = await dbService.fetchUsers();
      setDbUsers(users);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [isOnline]);

  const removeArea = (idx: number) => setAreas(areas.filter((_, i) => i !== idx));
  const removeSpec = (idx: number) => setSpecialties(specialties.filter((_, i) => i !== idx));

  const handleMigration = async () => {
    const localComplaints = JSON.parse(localStorage.getItem('dac_complaints') || '[]');
    const localUsers = JSON.parse(localStorage.getItem('dac_users') || '[]');
    
    if (localComplaints.length === 0 && localUsers.length === 0) {
      return alert("No hay datos locales para migrar.");
    }

    if (!confirm(`Se migrarán ${localComplaints.length} incidencias y ${localUsers.length} usuarios al servidor. ¿Continuar?`)) return;
    
    setSyncing(true);
    let cCount = 0;
    let uCount = 0;

    // Migrar Usuarios primero para mantener integridad
    for (const u of localUsers) {
      const ok = await dbService.saveUser(u);
      if (ok) uCount++;
    }

    // Migrar Incidencias
    for (const c of localComplaints) {
      const ok = await dbService.saveComplaint(c);
      if (ok) cCount++;
    }
    
    setSyncing(false);
    alert(`Sincronización finalizada:\n- ${uCount} Usuarios migrados\n- ${cCount} Incidencias migradas`);
    loadUsers();
  };

  const handleClearTables = async () => {
    const pass = prompt("CONFIRMACIÓN DE SEGURIDAD: Ingrese la clave de administrador para LIMPIAR TABLAS:");
    if (pass === 'admin') {
      if (confirm("⚠️ ADVERTENCIA CRÍTICA: Se borrarán permanentemente todas las incidencias y estadísticas del servidor. Esta acción NO se puede deshacer. ¿Desea proceder?")) {
        const ok = await dbService.clearData();
        if (ok) {
          alert("Limpieza completada. El sistema se refrescará.");
          window.location.reload();
        } else {
          alert("Error de servidor al intentar limpiar datos.");
        }
      }
    } else {
      alert("Clave de administrador incorrecta. Acceso denegado.");
    }
  };

  const toggleUserRole = async (user: User) => {
    const newRole = user.role === 'admin' ? 'agent' : 'admin';
    const msg = `¿Desea cambiar el rol de ${user.username} a ${newRole === 'admin' ? 'Administrador (Acceso total)' : 'Auditor Común (Sin acceso a ajustes)'}?`;
    
    if (!confirm(msg)) return;
    
    const ok = await dbService.updateUserRole(user.id, newRole);
    if (ok) {
      setDbUsers(dbUsers.map(u => u.id === user.id ? {...u, role: newRole as any} : u));
    } else {
      alert("Error al actualizar el rol en el servidor.");
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="glass-card p-10 bg-slate-900 text-white shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-black mb-2 flex items-center gap-3">
              <span className="text-2xl">🐘</span> Nodo Central de Datos
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">PostgreSQL Server & Maintenance</p>
          </div>
          {!isUnlocked && (
            <button onClick={() => setIsUnlocked(true)} className="px-8 py-4 bg-amber-500 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-white hover:text-amber-500 transition-all">Configurar Servidor</button>
          )}
        </div>

        {isUnlocked && (
          <div className="animate-in slide-in-from-top-4 duration-300 space-y-8 mt-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase">Host</label>
                 <input className="w-full bg-white/10 p-4 rounded-xl text-sm font-bold outline-none" value={dbParams.host} onChange={e => setDbParams({...dbParams, host: e.target.value})} />
              </div>
              <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase">Puerto</label>
                 <input className="w-full bg-white/10 p-4 rounded-xl text-sm font-bold outline-none" value={dbParams.port} onChange={e => setDbParams({...dbParams, port: e.target.value})} />
              </div>
              <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase">DB Name</label>
                 <input className="w-full bg-white/10 p-4 rounded-xl text-sm font-bold outline-none" value={dbParams.database} onChange={e => setDbParams({...dbParams, database: e.target.value})} />
              </div>
              <input className="bg-white/10 p-4 rounded-xl text-sm font-bold outline-none" placeholder="User" value={dbParams.user} onChange={e => setDbParams({...dbParams, user: e.target.value})} />
              <input className="bg-white/10 p-4 rounded-xl text-sm font-bold outline-none" type="password" placeholder="Pass" value={dbParams.password} onChange={e => setDbParams({...dbParams, password: e.target.value})} />
              <button onClick={async () => {
                const ok = await dbService.testConnection(dbParams);
                onConnStatusChange(ok);
                alert(ok ? '✅ Nodo vinculado correctamente' : '❌ Error de vinculación');
              }} className="bg-amber-500 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl">Vincular Nodo</button>
            </div>
            
            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row gap-4">
              <button onClick={handleMigration} disabled={syncing} className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg">
                {syncing ? 'Migrando datos locales...' : 'Migrar Todo al Servidor'}
              </button>
              <button onClick={handleClearTables} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg">
                🗑️ Limpiar Tablas de Pruebas
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="glass-card bg-white p-10 border border-orange-100 shadow-xl overflow-hidden">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h3 className="text-xl font-black flex items-center gap-4 text-slate-900 uppercase">👥 Gestión de Auditores</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Control de accesos y roles del sistema</p>
          </div>
          <button onClick={loadUsers} className="text-[9px] font-black text-amber-500 uppercase border border-amber-200 px-4 py-2 rounded-xl hover:bg-amber-50 transition-all">Refrescar Lista</button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                <th className="px-6 py-5">Nombre de Usuario</th>
                <th className="px-6 py-5">Identificador</th>
                <th className="px-6 py-5">Rol del Sistema</th>
                <th className="px-6 py-5 text-center">Acciones de Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dbUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-300 font-black uppercase text-[10px]">Sin usuarios registrados en el nodo</td>
                </tr>
              ) : dbUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-5">
                    <p className="font-black text-slate-900 text-sm">{user.username}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{user.id}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {user.role === 'admin' ? 'Administrador' : 'Auditor Común'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <button 
                      onClick={() => toggleUserRole(user)} 
                      className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase transition-all shadow-sm ${user.role === 'admin' ? 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600' : 'bg-slate-900 text-white hover:bg-amber-500'}`}
                    >
                      {user.role === 'admin' ? 'Quitar Admin' : 'Hacer Admin'}
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
          <h3 className="text-xl font-black mb-8 flex items-center gap-4 text-slate-900 uppercase">🏢 Áreas</h3>
          <div className="flex gap-4 mb-8">
            <input className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-amber-400" value={newArea} onChange={e => setNewArea(e.target.value)} placeholder="Añadir nueva área..." />
            <button onClick={() => { if(newArea) { setAreas([...areas, newArea]); setNewArea(''); } }} className="w-14 h-14 bg-amber-500 text-white rounded-2xl font-black text-2xl shadow-lg hover:scale-105 transition-all">+</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {areas.map((a, i) => (
              <span key={i} className="px-4 py-2 bg-slate-50 text-slate-700 rounded-xl text-[9px] font-black border border-slate-100 flex items-center gap-3">
                {a.toUpperCase()}
                <button onClick={() => removeArea(i)} className="text-rose-500 hover:bg-rose-50 w-5 h-5 rounded-full flex items-center justify-center">✕</button>
              </span>
            ))}
          </div>
        </div>

        <div className="glass-card bg-white p-10 border border-orange-100 shadow-xl">
          <h3 className="text-xl font-black mb-8 flex items-center gap-4 text-slate-900 uppercase">🎓 Especialidades</h3>
          <div className="flex gap-4 mb-8">
            <input className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-amber-400" value={newSpec} onChange={e => setNewSpec(e.target.value)} placeholder="Añadir especialidad..." />
            <button onClick={() => { if(newSpec) { setSpecialties([...specialties, newSpec]); setNewSpec(''); } }} className="w-14 h-14 bg-orange-500 text-white rounded-2xl font-black text-2xl shadow-lg hover:scale-105 transition-all">+</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {specialties.map((s, i) => (
              <span key={i} className="px-4 py-2 bg-slate-50 text-slate-700 rounded-xl text-[9px] font-black border border-slate-100 flex items-center gap-3">
                {s.toUpperCase()}
                <button onClick={() => removeSpec(i)} className="text-rose-500 hover:bg-rose-50 w-5 h-5 rounded-full flex items-center justify-center">✕</button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};