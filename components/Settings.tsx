
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/apiService';
import { User, Complaint } from '../types';

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

  const handleExportBackup = () => {
    const backupData = {
      complaints: JSON.parse(localStorage.getItem('dac_complaints') || '[]'),
      users: JSON.parse(localStorage.getItem('dac_users') || '[]'),
      areas,
      specialties,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_dac_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (confirm("¿Está seguro de importar este backup? Se sobrescribirán los datos locales actuales.")) {
          if (data.complaints) localStorage.setItem('dac_complaints', JSON.stringify(data.complaints));
          if (data.users) localStorage.setItem('dac_users', JSON.stringify(data.users));
          if (data.areas) setAreas(data.areas);
          if (data.specialties) setSpecialties(data.specialties);
          alert("Backup importado con éxito. Refrescando sistema...");
          window.location.reload();
        }
      } catch {
        alert("Error al procesar el archivo de backup.");
      }
    };
    reader.readAsText(file);
  };

  const handleMigration = async () => {
    const localComplaints = JSON.parse(localStorage.getItem('dac_complaints') || '[]');
    const localUsers = JSON.parse(localStorage.getItem('dac_users') || '[]');
    
    if (localComplaints.length === 0 && localUsers.length === 0) {
      return alert("No hay datos locales para migrar.");
    }

    if (!confirm(`Se enviarán ${localComplaints.length} incidencias y ${localUsers.length} usuarios al servidor. ¿Continuar?`)) return;
    
    setSyncing(true);
    let cCount = 0;
    let uCount = 0;

    try {
      // Migrar Usuarios
      for (const u of localUsers) {
        const ok = await dbService.saveUser(u);
        if (ok) uCount++;
      }

      // Migrar Incidencias
      for (const c of localComplaints) {
        const ok = await dbService.saveComplaint(c);
        if (ok) cCount++;
      }
      
      alert(`Sincronización Exitosa:\n- ${uCount} Usuarios\n- ${cCount} Incidencias`);
      loadUsers();
    } catch (err) {
      alert("Error durante la migración: " + err);
    } finally {
      setSyncing(false);
    }
  };

  const handleClearTables = async () => {
    const pass = prompt("SEGURIDAD: Ingrese clave de administrador para LIMPIAR TABLAS:");
    if (pass === 'admin') {
      if (confirm("⚠️ ADVERTENCIA: Se borrarán todos los datos del servidor para producción. ¿Proceder?")) {
        const ok = await dbService.clearData();
        if (ok) {
          alert("Base de datos limpia.");
          window.location.reload();
        } else {
          alert("Error al limpiar servidor.");
        }
      }
    } else {
      alert("Clave incorrecta.");
    }
  };

  const toggleUserRole = async (user: User) => {
    const newRole = user.role === 'admin' ? 'agent' : 'admin';
    if (!confirm(`¿Cambiar rol de ${user.username} a ${newRole}?`)) return;
    const ok = await dbService.updateUserRole(user.id, newRole);
    if (ok) loadUsers();
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="glass-card p-10 bg-slate-900 text-white shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-black mb-2 flex items-center gap-3">
              <span className="text-2xl">🐘</span> Configuración del Nodo Central
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PostgreSQL Server & Production Tools</p>
          </div>
          {!isUnlocked && (
            <button onClick={() => setIsUnlocked(true)} className="px-8 py-4 bg-amber-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-amber-500 transition-all">Configurar Servidor</button>
          )}
        </div>

        {isUnlocked && (
          <div className="animate-in slide-in-from-top-4 duration-300 space-y-8 mt-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <input className="bg-white/10 p-4 rounded-xl text-sm font-bold outline-none" placeholder="Host IP" value={dbParams.host} onChange={e => setDbParams({...dbParams, host: e.target.value})} />
              <input className="bg-white/10 p-4 rounded-xl text-sm font-bold outline-none" placeholder="Port" value={dbParams.port} onChange={e => setDbParams({...dbParams, port: e.target.value})} />
              <input className="bg-white/10 p-4 rounded-xl text-sm font-bold outline-none" placeholder="Database" value={dbParams.database} onChange={e => setDbParams({...dbParams, database: e.target.value})} />
              <input className="bg-white/10 p-4 rounded-xl text-sm font-bold outline-none" placeholder="User" value={dbParams.user} onChange={e => setDbParams({...dbParams, user: e.target.value})} />
              <input className="bg-white/10 p-4 rounded-xl text-sm font-bold outline-none" type="password" placeholder="Pass" value={dbParams.password} onChange={e => setDbParams({...dbParams, password: e.target.value})} />
              <button onClick={async () => {
                const ok = await dbService.testConnection(dbParams);
                onConnStatusChange(ok);
                alert(ok ? '✅ Conexión establecida' : '❌ Error de conexión');
              }} className="bg-amber-500 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest">Vincular Nodo</button>
            </div>
            
            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row gap-4">
              <button onClick={handleMigration} disabled={syncing} className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">
                {syncing ? 'Sincronizando...' : 'Migrar Todo al Servidor'}
              </button>
              <button onClick={handleClearTables} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">
                🗑️ Limpiar Tablas de Pruebas
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card bg-white p-10 border border-orange-100 shadow-xl">
          <h3 className="text-xl font-black mb-6 text-slate-900 uppercase">💾 Copia de Seguridad</h3>
          <p className="text-xs text-slate-400 mb-8 font-medium">Exporta o importa toda la información local en formato JSON.</p>
          <div className="flex flex-col gap-4">
            <button onClick={handleExportBackup} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Generar Backup JSON</button>
            <div className="relative">
              <input type="file" accept=".json" onChange={handleImportBackup} className="absolute inset-0 opacity-0 cursor-pointer" />
              <button className="w-full py-4 bg-amber-50 text-amber-600 border border-amber-200 rounded-2xl font-black text-[10px] uppercase tracking-widest">Importar Backup JSON</button>
            </div>
          </div>
        </div>

        <div className="glass-card bg-white p-10 border border-orange-100 shadow-xl">
          <h3 className="text-xl font-black mb-6 text-slate-900 uppercase">👥 Auditores en Nodo</h3>
          <div className="overflow-x-auto max-h-[250px] scrollbar-hide">
            <table className="w-full text-left">
              <tbody className="divide-y divide-slate-100">
                {dbUsers.map(user => (
                  <tr key={user.id}>
                    <td className="py-4">
                      <p className="font-black text-slate-900 text-sm">{user.username}</p>
                      <span className={`text-[8px] font-black uppercase ${user.role === 'admin' ? 'text-amber-500' : 'text-slate-400'}`}>{user.role}</span>
                    </td>
                    <td className="py-4 text-right">
                      <button onClick={() => toggleUserRole(user)} className="px-3 py-1 bg-slate-100 rounded-lg text-[8px] font-black uppercase hover:bg-amber-100">Rol</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="glass-card bg-white p-10 border border-orange-100 shadow-xl">
          <h3 className="text-xl font-black mb-8 flex items-center gap-4 text-slate-900 uppercase">🏢 Áreas</h3>
          <div className="flex gap-4 mb-8">
            <input className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold" value={newArea} onChange={e => setNewArea(e.target.value)} placeholder="Ej. Odontología" />
            <button onClick={() => { if(newArea) { setAreas([...areas, newArea]); setNewArea(''); } }} className="w-14 h-14 bg-amber-500 text-white rounded-2xl font-black text-2xl shadow-lg">+</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {areas.map((a, i) => (
              <span key={i} className="px-4 py-2 bg-slate-50 text-slate-700 rounded-xl text-[9px] font-black border border-slate-100 flex items-center gap-3">
                {a.toUpperCase()}
                <button onClick={() => setAreas(areas.filter((_, idx) => idx !== i))} className="text-rose-500">✕</button>
              </span>
            ))}
          </div>
        </div>

        <div className="glass-card bg-white p-10 border border-orange-100 shadow-xl">
          <h3 className="text-xl font-black mb-8 flex items-center gap-4 text-slate-900 uppercase">🎓 Especialidades</h3>
          <div className="flex gap-4 mb-8">
            <input className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold" value={newSpec} onChange={e => setNewSpec(e.target.value)} placeholder="Ej. Pediatría" />
            <button onClick={() => { if(newSpec) { setSpecialties([...specialties, newSpec]); setNewSpec(''); } }} className="w-14 h-14 bg-orange-500 text-white rounded-2xl font-black text-2xl shadow-lg">+</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {specialties.map((s, i) => (
              <span key={i} className="px-4 py-2 bg-slate-50 text-slate-700 rounded-xl text-[9px] font-black border border-slate-100 flex items-center gap-3">
                {s.toUpperCase()}
                <button onClick={() => setSpecialties(specialties.filter((_, idx) => idx !== i))} className="text-rose-500">✕</button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
