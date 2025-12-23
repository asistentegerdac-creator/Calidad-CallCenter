
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/apiService';
import { User, Complaint } from '../types';

interface Props {
  areas: string[];
  setAreas: (a: string[]) => void;
  specialties: string[];
  setSpecialties: (s: string[]) => void;
  users: User[];
  setUsers: (u: User[]) => void;
  currentUser: User | null;
  isOnline: boolean;
  onConnStatusChange: (s: boolean) => void;
}

export const Settings: React.FC<Props> = ({ 
  areas, setAreas, specialties, setSpecialties, 
  users, setUsers, currentUser, isOnline, onConnStatusChange 
}) => {
  const [newArea, setNewArea] = useState('');
  const [newSpec, setNewSpec] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [repairing, setRepairing] = useState(false);
  
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    password: '',
    role: 'agent' as 'admin' | 'agent',
    permissions: ['dashboard', 'incidences', 'new-incidence'] as string[]
  });

  const [dbParams, setDbParams] = useState({
    host: '192.168.99.180',
    port: '3008',
    database: 'calidad_dac_db',
    user: 'postgres',
    password: ''
  });

  const loadAllUsers = async () => {
    if (isOnline) {
      const remoteUsers = await dbService.fetchUsers();
      if (remoteUsers && remoteUsers.length > 0) {
        setUsers(remoteUsers);
      }
    }
  };

  useEffect(() => {
    loadAllUsers();
  }, [isOnline]);

  const handleExportBackup = () => {
    const backupData = {
      complaints: JSON.parse(localStorage.getItem('dac_complaints') || '[]'),
      users: users,
      areas,
      specialties,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SISTEMA_DAC_FULL_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
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
        if (confirm("⚠️ ¿RESTAURAR BACKUP? Se reemplazará la configuración actual.")) {
          if (data.complaints) localStorage.setItem('dac_complaints', JSON.stringify(data.complaints));
          if (data.users) setUsers(data.users);
          if (data.areas) setAreas(data.areas);
          if (data.specialties) setSpecialties(data.specialties);
          alert("Backup cargado con éxito.");
          window.location.reload();
        }
      } catch {
        alert("Error: El archivo JSON no es válido.");
      }
    };
    reader.readAsText(file);
  };

  const handleCreateUser = async () => {
    if (!newUserForm.username || !newUserForm.password) return alert("Complete los datos requeridos.");
    
    const newUser: User = {
      id: `USR-${Date.now().toString().slice(-4)}`,
      username: newUserForm.username,
      password: newUserForm.password,
      name: newUserForm.username,
      role: newUserForm.role,
      permissions: newUserForm.permissions
    };

    try {
      if (isOnline) {
        const savedUser = await dbService.saveUser(newUser);
        if (savedUser) {
          alert(`Usuario ${savedUser.username} guardado en Servidor.`);
          await loadAllUsers();
        } else {
          throw new Error("El servidor rechazó el registro.");
        }
      } else {
        const updatedUsers = [...users, newUser];
        setUsers(updatedUsers);
        alert("Usuario guardado localmente (Offline).");
      }
      
      setNewUserForm({ username: '', password: '', role: 'agent', permissions: ['dashboard', 'incidences', 'new-incidence'] });
    } catch (err) {
      alert("Error en creación Online: " + err);
    }
  };

  const handleManualMigration = async () => {
    if (!isOnline) return alert("Debe estar ONLINE para migrar datos.");
    
    const localComplaints = JSON.parse(localStorage.getItem('dac_complaints') || '[]');
    const localUsers = JSON.parse(localStorage.getItem('dac_users') || '[]');
    
    if (localComplaints.length === 0 && localUsers.length === 0) {
      return alert("No hay datos locales nuevos para migrar.");
    }

    setSyncing(true);
    let uCount = 0, cCount = 0;
    
    try {
      // 1. Migrar Usuarios
      for (const u of localUsers) {
        const ok = await dbService.saveUser(u);
        if (ok) uCount++;
      }
      // 2. Migrar Incidencias
      for (const c of localComplaints) {
        const ok = await dbService.saveComplaint(c);
        if (ok) cCount++;
      }

      localStorage.setItem('dac_complaints', '[]');
      alert(`Migración Exitosa: ${uCount} Usuarios y ${cCount} Incidencias enviadas.`);
      window.location.reload();
    } catch (err) {
      alert("Error durante la migración: " + err);
    } finally {
      setSyncing(false);
    }
  };

  const handleRepairDB = async () => {
    setRepairing(true);
    const ok = await dbService.repairDatabase();
    setRepairing(false);
    alert(ok ? "✅ Estructura de base de datos verificada y reparada." : "❌ No se pudo conectar con el backend para reparar.");
  };

  const togglePermission = (perm: string) => {
    setNewUserForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm) 
        ? prev.permissions.filter(p => p !== perm) 
        : [...prev.permissions, perm]
    }));
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-12 pb-20">
      {/* SECCIÓN CONFIGURACIÓN NODO */}
      <div className="glass-card p-10 bg-slate-900 text-white shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-black mb-2 flex items-center gap-3">
              <span className="text-2xl">🐘</span> Nodo Central Hospitalario
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Servidor: {isOnline ? 'CONECTADO' : 'DESCONECTADO'}</p>
          </div>
          <div className="flex gap-4">
            {!isUnlocked && (
              <button onClick={() => setIsUnlocked(true)} className="px-6 py-4 bg-amber-500 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-white hover:text-amber-500 transition-all">Configurar Red</button>
            )}
            {isOnline && (
               <button onClick={handleRepairDB} disabled={repairing} className="px-6 py-4 bg-emerald-500 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-white hover:text-emerald-500 transition-all disabled:opacity-50">
                 {repairing ? 'Revisando...' : 'Revisar Base'}
               </button>
            )}
          </div>
        </div>

        {isUnlocked && (
          <div className="animate-in slide-in-from-top-4 duration-300 space-y-8 mt-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <input className="bg-white/10 p-4 rounded-xl text-sm font-bold outline-none border border-white/5" placeholder="IP del Servidor" value={dbParams.host} onChange={e => setDbParams({...dbParams, host: e.target.value})} />
              <input className="bg-white/10 p-4 rounded-xl text-sm font-bold outline-none border border-white/5" placeholder="Puerto" value={dbParams.port} onChange={e => setDbParams({...dbParams, port: e.target.value})} />
              <input className="bg-white/10 p-4 rounded-xl text-sm font-bold outline-none border border-white/5" placeholder="Base de Datos" value={dbParams.database} onChange={e => setDbParams({...dbParams, database: e.target.value})} />
              <input className="bg-white/10 p-4 rounded-xl text-sm font-bold outline-none border border-white/5" placeholder="Usuario" value={dbParams.user} onChange={e => setDbParams({...dbParams, user: e.target.value})} />
              <input className="bg-white/10 p-4 rounded-xl text-sm font-bold outline-none border border-white/5" type="password" placeholder="Contraseña" value={dbParams.password} onChange={e => setDbParams({...dbParams, password: e.target.value})} />
              <button onClick={async () => {
                const ok = await dbService.testConnection(dbParams);
                onConnStatusChange(ok);
                alert(ok ? '✅ Nodo vinculado' : '❌ Error de conexión');
              }} className="bg-amber-500 py-4 rounded-xl font-black text-[10px] uppercase shadow-lg">Sincronizar Nodo</button>
            </div>
            
            {isAdmin && (
              <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row gap-4">
                <button onClick={handleManualMigration} disabled={syncing || !isOnline} className="flex-1 py-4 bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg disabled:opacity-50">
                  {syncing ? 'Migrando...' : 'Migrar Datos Local al Servidor'}
                </button>
                <button onClick={async () => {
                  if (confirm("⚠️ ¿Desea resetear la base de datos del servidor?")) {
                    const ok = await dbService.clearData();
                    if (ok) window.location.reload();
                  }
                }} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg">
                  🗑️ Formatear Nodo Central
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* GESTION DE USUARIOS */}
      <div className="glass-card bg-white p-10 border border-orange-100 shadow-xl">
        <h3 className="text-xl font-black mb-10 text-slate-900 uppercase">👥 Gestión de Cuentas y Accesos</h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          
          <div className={`space-y-6 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 ${!isAdmin ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Registrar Nuevo Auditor</h4>
            <div className="grid grid-cols-2 gap-4">
              <input className="p-4 rounded-xl text-sm font-bold border border-slate-200 outline-none focus:border-amber-400" placeholder="Username" value={newUserForm.username} onChange={e => setNewUserForm({...newUserForm, username: e.target.value})} />
              <input className="p-4 rounded-xl text-sm font-bold border border-slate-200 outline-none focus:border-amber-400" type="password" placeholder="Contraseña" value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} />
            </div>
            <div className="space-y-4">
               <label className="text-[9px] font-black text-slate-400 uppercase">Nivel de Acceso</label>
               <div className="flex gap-4">
                 {['admin', 'agent'].map(r => (
                   <button key={r} onClick={() => setNewUserForm({...newUserForm, role: r as any})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${newUserForm.role === r ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}>{r}</button>
                 ))}
               </div>
            </div>
            <div className="space-y-4">
               <label className="text-[9px] font-black text-slate-400 uppercase">Secciones Permitidas</label>
               <div className="flex flex-wrap gap-2">
                 {['dashboard', 'incidences', 'new-incidence', 'reports', 'settings'].map(p => (
                   <button key={p} onClick={() => togglePermission(p)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${newUserForm.permissions.includes(p) ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-slate-400 border border-slate-200'}`}>
                     {p.toUpperCase()}
                   </button>
                 ))}
               </div>
            </div>
            <button onClick={handleCreateUser} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-amber-500 transition-all">Guardar Auditor</button>
          </div>

          <div className="overflow-x-auto">
             <div className="flex justify-between items-center mb-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auditores Detectados</h4>
                <button onClick={loadAllUsers} className="text-[8px] font-black text-amber-500 uppercase">Refrescar</button>
             </div>
             <table className="w-full text-left">
               <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400">
                 <tr>
                   <th className="px-4 py-3">Usuario</th>
                   <th className="px-4 py-3">Módulos</th>
                   <th className="px-4 py-3 text-right">Rol</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {users.map(user => (
                   <tr key={user.id}>
                     <td className="py-4 px-4 font-black text-slate-900 text-sm">{user.username}</td>
                     <td className="py-4 px-4">
                       <div className="flex flex-wrap gap-1">
                         {user.permissions?.map(p => <span key={p} className="bg-slate-100 text-[7px] font-black uppercase px-1.5 py-0.5 rounded text-slate-400">{p}</span>)}
                       </div>
                     </td>
                     <td className="py-4 px-4 text-right">
                       <span className={`text-[8px] font-black uppercase ${user.role === 'admin' ? 'text-amber-500' : 'text-slate-300'}`}>{user.role}</span>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      </div>

      <div className="glass-card bg-white p-10 border border-orange-100 shadow-xl">
        <h3 className="text-xl font-black mb-6 text-slate-900 uppercase">💾 Backup del Sistema</h3>
        <p className="text-xs text-slate-400 mb-8">Exporta incidencias, usuarios (con permisos) y áreas en un solo archivo JSON.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button onClick={handleExportBackup} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl">Descargar Backup Maestro</button>
          <div className="relative">
            <input type="file" accept=".json" onChange={handleImportBackup} className="absolute inset-0 opacity-0 cursor-pointer" />
            <button className="w-full py-5 bg-amber-50 text-amber-600 border border-amber-200 rounded-2xl font-black text-[10px] uppercase shadow-sm">Restaurar desde JSON</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="glass-card bg-white p-10 border border-orange-100 shadow-xl">
          <h3 className="text-xl font-black mb-8 uppercase text-slate-900">🏢 Áreas</h3>
          <div className="flex gap-4 mb-8">
            <input className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none" value={newArea} onChange={e => setNewArea(e.target.value)} placeholder="Añadir área..." />
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
          <h3 className="text-xl font-black mb-8 uppercase text-slate-900">🎓 Especialidades</h3>
          <div className="flex gap-4 mb-8">
            <input className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none" value={newSpec} onChange={e => setNewSpec(e.target.value)} placeholder="Añadir esp..." />
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
