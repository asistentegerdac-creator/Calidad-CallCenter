
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
  
  // Estado para creación de usuario
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    password: '',
    role: 'agent' as 'admin' | 'agent',
    permissions: ['dashboard'] as string[]
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
      if (remoteUsers.length > 0) setUsers(remoteUsers);
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
    link.download = `backup_dac_v5_${new Date().toISOString().split('T')[0]}.json`;
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
        if (confirm("¿Restaurar Backup Maestro? Se sobrescribirá la configuración actual.")) {
          if (data.complaints) localStorage.setItem('dac_complaints', JSON.stringify(data.complaints));
          if (data.users) setUsers(data.users);
          if (data.areas) setAreas(data.areas);
          if (data.specialties) setSpecialties(data.specialties);
          alert("Respaldo restaurado con éxito.");
          window.location.reload();
        }
      } catch {
        alert("Error crítico al procesar el archivo JSON.");
      }
    };
    reader.readAsText(file);
  };

  const handleCreateUser = async () => {
    if (!newUserForm.username || !newUserForm.password) return alert("Complete Usuario y Contraseña");
    
    const newUser: User = {
      id: `USR-${Date.now().toString().slice(-4)}`,
      username: newUserForm.username,
      password: newUserForm.password,
      name: newUserForm.username,
      role: newUserForm.role,
      permissions: newUserForm.permissions
    };

    // 1. Actualización Local Inmediata
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);

    // 2. Sincronización Remota si hay red
    if (isOnline) {
      const ok = await dbService.saveUser(newUser);
      if (ok) {
        console.log("Usuario sincronizado en PostgreSQL");
        loadAllUsers();
      }
    }
    
    setNewUserForm({ username: '', password: '', role: 'agent', permissions: ['dashboard'] });
    alert("Usuario registrado exitosamente.");
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
      {/* SECCIÓN CONFIGURACIÓN NODO (PROTEGIDA PARA ADMINS) */}
      <div className="glass-card p-10 bg-slate-900 text-white shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-black mb-2 flex items-center gap-3">
              <span className="text-2xl">🐘</span> Nodo Central de Datos
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado del Nodo: {isOnline ? 'Online' : 'Offline'}</p>
          </div>
          {isAdmin && !isUnlocked && (
            <button onClick={() => setIsUnlocked(true)} className="px-8 py-4 bg-amber-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-amber-500 transition-all shadow-xl">Desbloquear Servidor</button>
          )}
        </div>

        {isAdmin && isUnlocked && (
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
                alert(ok ? '✅ Nodo vinculado con éxito' : '❌ Error de conexión al servidor');
              }} className="bg-amber-500 py-4 rounded-xl font-black text-[10px] uppercase shadow-lg">Vincular Nodo</button>
            </div>
            
            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row gap-4">
              <button onClick={async () => {
                if (confirm("¿Limpiar tablas del servidor? Se borrará todo para el paso a producción.")) {
                  const ok = await dbService.clearData();
                  if (ok) window.location.reload();
                }
              }} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg">
                🗑️ Limpiar Tablas de Producción
              </button>
            </div>
          </div>
        )}
        
        {!isAdmin && (
          <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
            <p className="text-[9px] font-black uppercase text-amber-500 mb-2">Aviso de Privilegio</p>
            <p className="text-xs text-slate-400">La configuración avanzada del servidor PostgreSQL está restringida a perfiles de Super Administrador.</p>
          </div>
        )}
      </div>

      {/* GESTION DE USUARIOS Y ACCESOS (VISIBLE PARA TODOS, EDICION PARA ADMINS) */}
      <div className="glass-card bg-white p-10 border border-orange-100 shadow-xl">
        <h3 className="text-xl font-black mb-10 text-slate-900 uppercase">👥 Usuarios y Niveles de Acceso</h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          
          {/* Formulario de Creación (Solo Admin) */}
          <div className={`space-y-6 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 ${!isAdmin ? 'opacity-50 pointer-events-none' : ''}`}>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Registrar Nuevo Auditor</h4>
            <div className="grid grid-cols-2 gap-4">
              <input className="p-4 rounded-xl text-sm font-bold border border-slate-200 outline-none focus:border-amber-400 bg-white" placeholder="Username" value={newUserForm.username} onChange={e => setNewUserForm({...newUserForm, username: e.target.value})} />
              <input className="p-4 rounded-xl text-sm font-bold border border-slate-200 outline-none focus:border-amber-400 bg-white" type="password" placeholder="Password" value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} />
            </div>
            <div className="space-y-4">
               <label className="text-[9px] font-black text-slate-400 uppercase">Privilegio de Cuenta</label>
               <div className="flex gap-4">
                 {['admin', 'agent'].map(r => (
                   <button key={r} onClick={() => setNewUserForm({...newUserForm, role: r as any})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newUserForm.role === r ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}>{r}</button>
                 ))}
               </div>
            </div>
            <div className="space-y-4">
               <label className="text-[9px] font-black text-slate-400 uppercase">Módulos de Acceso Permitidos</label>
               <div className="flex flex-wrap gap-2">
                 {[
                   {id: 'dashboard', icon: '📈'}, 
                   {id: 'incidences', icon: '📑'}, 
                   {id: 'new-incidence', icon: '➕'}, 
                   {id: 'reports', icon: '📋'}, 
                   {id: 'settings', icon: '⚙️'}
                 ].map(p => (
                   <button key={p.id} onClick={() => togglePermission(p.id)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${newUserForm.permissions.includes(p.id) ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-slate-400 border border-slate-200'}`}>
                     {p.icon} {p.id}
                   </button>
                 ))}
               </div>
            </div>
            <button onClick={handleCreateUser} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-amber-500 transition-all">Registrar Auditor en Nodo</button>
          </div>

          {/* Listado de Usuarios */}
          <div className="overflow-x-auto max-h-[500px] scrollbar-hide">
             <div className="flex justify-between items-center mb-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auditores Detectados</h4>
                <button onClick={loadAllUsers} className="text-[8px] font-black text-amber-500 uppercase border border-amber-100 px-3 py-1.5 rounded-lg">Refrescar</button>
             </div>
             <table className="w-full text-left">
               <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400">
                 <tr>
                   <th className="px-4 py-3">Auditor / Rol</th>
                   <th className="px-4 py-3">Permisos</th>
                   <th className="px-4 py-3 text-right">Acción</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {users.map(user => (
                   <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                     <td className="py-4 px-4">
                       <p className="font-black text-slate-900 text-sm">{user.username}</p>
                       <span className={`text-[8px] font-black uppercase ${user.role === 'admin' ? 'text-amber-500' : 'text-slate-300'}`}>{user.role}</span>
                     </td>
                     <td className="py-4 px-4">
                       <div className="flex flex-wrap gap-1">
                         {user.permissions?.map(p => <span key={p} className="bg-slate-100 text-[7px] font-black uppercase px-1.5 py-0.5 rounded text-slate-400">{p}</span>)}
                       </div>
                     </td>
                     <td className="py-4 px-4 text-right">
                       {isAdmin && (
                         <button onClick={async () => {
                           const nR = user.role === 'admin' ? 'agent' : 'admin';
                           if (await dbService.updateUserRole(user.id, nR)) loadAllUsers();
                         }} className="text-amber-500 font-black uppercase text-[8px] hover:underline">Cambiar Rol</button>
                       )}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      </div>

      {/* COPIA DE SEGURIDAD INTEGRAL */}
      <div className="glass-card bg-white p-10 border border-orange-100 shadow-xl">
        <h3 className="text-xl font-black mb-6 text-slate-900 uppercase">💾 Respaldo Maestro del Sistema</h3>
        <p className="text-xs text-slate-400 mb-8 font-medium italic">Exporta incidencias, usuarios con sus niveles de acceso y configuraciones de área.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button onClick={handleExportBackup} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:translate-y-[-1px] transition-all">Exportar JSON de Seguridad</button>
          <div className="relative">
            <input type="file" accept=".json" onChange={handleImportBackup} className="absolute inset-0 opacity-0 cursor-pointer" />
            <button className="w-full py-5 bg-amber-50 text-amber-600 border border-amber-200 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm">Importar Respaldo Maestro</button>
          </div>
        </div>
      </div>

      {/* ÁREAS Y ESPECIALIDADES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="glass-card bg-white p-10 border border-orange-100 shadow-xl">
          <h3 className="text-xl font-black mb-8 uppercase text-slate-900">🏢 Áreas Hospitalarias</h3>
          <div className="flex gap-4 mb-8">
            <input className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-amber-400" value={newArea} onChange={e => setNewArea(e.target.value)} placeholder="Ej. Admisión Central" />
            <button onClick={() => { if(newArea) { setAreas([...areas, newArea]); setNewArea(''); } }} className="w-14 h-14 bg-amber-500 text-white rounded-2xl font-black text-2xl shadow-lg hover:scale-105 transition-all">+</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {areas.map((a, i) => (
              <span key={i} className="px-4 py-2 bg-slate-50 text-slate-700 rounded-xl text-[9px] font-black border border-slate-100 flex items-center gap-3">
                {a.toUpperCase()}
                <button onClick={() => setAreas(areas.filter((_, idx) => idx !== i))} className="text-rose-500 hover:scale-110">✕</button>
              </span>
            ))}
          </div>
        </div>

        <div className="glass-card bg-white p-10 border border-orange-100 shadow-xl">
          <h3 className="text-xl font-black mb-8 uppercase text-slate-900">🎓 Especialidades Médicas</h3>
          <div className="flex gap-4 mb-8">
            <input className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-amber-400" value={newSpec} onChange={e => setNewSpec(e.target.value)} placeholder="Ej. Urología" />
            <button onClick={() => { if(newSpec) { setSpecialties([...specialties, newSpec]); setNewSpec(''); } }} className="w-14 h-14 bg-orange-500 text-white rounded-2xl font-black text-2xl shadow-lg hover:scale-105 transition-all">+</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {specialties.map((s, i) => (
              <span key={i} className="px-4 py-2 bg-slate-50 text-slate-700 rounded-xl text-[9px] font-black border border-slate-100 flex items-center gap-3">
                {s.toUpperCase()}
                <button onClick={() => setSpecialties(specialties.filter((_, idx) => idx !== i))} className="text-rose-500 hover:scale-110">✕</button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
