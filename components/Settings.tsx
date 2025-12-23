
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
        if (confirm("¿Importar backup? Se sobrescribirá la base local.")) {
          if (data.complaints) localStorage.setItem('dac_complaints', JSON.stringify(data.complaints));
          if (data.users) localStorage.setItem('dac_users', JSON.stringify(data.users));
          if (data.areas) setAreas(data.areas);
          if (data.specialties) setSpecialties(data.specialties);
          alert("Backup restaurado. Sincronizando si hay red...");
          window.location.reload();
        }
      } catch {
        alert("Error al procesar el archivo.");
      }
    };
    reader.readAsText(file);
  };

  const handleMigration = async () => {
    const localComplaints = JSON.parse(localStorage.getItem('dac_complaints') || '[]');
    const localUsers = JSON.parse(localStorage.getItem('dac_users') || '[]');
    
    if (localComplaints.length === 0 && localUsers.length === 0) {
      return alert("Sin datos locales.");
    }

    setSyncing(true);
    let cCount = 0, uCount = 0;
    try {
      for (const u of localUsers) {
        if (await dbService.saveUser(u)) uCount++;
      }
      for (const c of localComplaints) {
        if (await dbService.saveComplaint(c)) cCount++;
      }
      alert(`Sincronización manual: ${uCount} USR / ${cCount} INC`);
      loadUsers();
    } catch (err) { alert("Fallo: " + err); } 
    finally { setSyncing(false); }
  };

  const handleCreateUser = async () => {
    if (!newUserForm.username || !newUserForm.password) return alert("Complete todos los campos");
    
    const newUser: User = {
      id: `USR-${Date.now().toString().slice(-4)}`,
      username: newUserForm.username,
      password: newUserForm.password,
      name: newUserForm.username,
      role: newUserForm.role,
      permissions: newUserForm.permissions
    };

    // Guardar Local
    const localUsers = JSON.parse(localStorage.getItem('dac_users') || '[]');
    localStorage.setItem('dac_users', JSON.stringify([...localUsers, newUser]));

    // Guardar Online si existe
    if (isOnline) {
      await dbService.saveUser(newUser);
      loadUsers();
    }
    
    setNewUserForm({ username: '', password: '', role: 'agent', permissions: ['dashboard'] });
    alert("Usuario creado con éxito.");
  };

  const togglePermission = (perm: string) => {
    setNewUserForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm) 
        ? prev.permissions.filter(p => p !== perm) 
        : [...prev.permissions, perm]
    }));
  };

  return (
    <div className="space-y-12 pb-20">
      {/* SECCIÓN CONFIGURACIÓN NODO */}
      <div className="glass-card p-10 bg-slate-900 text-white shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-black mb-2 flex items-center gap-3">
              <span className="text-2xl">🐘</span> Nodo Central de Datos
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sincronización Automática Activa</p>
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
                alert(ok ? '✅ Nodo vinculado' : '❌ Error de conexión');
              }} className="bg-amber-500 py-4 rounded-xl font-black text-[10px] uppercase">Vincular Nodo</button>
            </div>
            
            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row gap-4">
              <button onClick={handleMigration} disabled={syncing} className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">
                {syncing ? 'Sincronizando...' : 'Forzar Sincronización Manual'}
              </button>
              <button onClick={async () => {
                if (confirm("¿Limpiar tablas del servidor?")) {
                  const ok = await dbService.clearData();
                  if (ok) window.location.reload();
                }
              }} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black text-[10px] uppercase">
                🗑️ Limpiar Tablas de Producción
              </button>
            </div>
          </div>
        )}
      </div>

      {/* GESTION DE USUARIOS Y ACCESOS */}
      <div className="glass-card bg-white p-10 border border-orange-100 shadow-xl">
        <h3 className="text-xl font-black mb-10 text-slate-900 uppercase">👥 Usuarios y Niveles de Acceso</h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          {/* Formulario de Creación */}
          <div className="space-y-6 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Crear Nuevo Auditor</h4>
            <div className="grid grid-cols-2 gap-4">
              <input className="p-4 rounded-xl text-sm font-bold border border-slate-200 outline-none" placeholder="Username" value={newUserForm.username} onChange={e => setNewUserForm({...newUserForm, username: e.target.value})} />
              <input className="p-4 rounded-xl text-sm font-bold border border-slate-200 outline-none" type="password" placeholder="Password" value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} />
            </div>
            <div className="space-y-4">
               <label className="text-[9px] font-black text-slate-400 uppercase">Rol Maestro</label>
               <div className="flex gap-4">
                 {['admin', 'agent'].map(r => (
                   <button key={r} onClick={() => setNewUserForm({...newUserForm, role: r as any})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${newUserForm.role === r ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>{r}</button>
                 ))}
               </div>
            </div>
            <div className="space-y-4">
               <label className="text-[9px] font-black text-slate-400 uppercase">Módulos Permitidos</label>
               <div className="flex flex-wrap gap-2">
                 {['dashboard', 'incidences', 'new-incidence', 'reports', 'settings'].map(p => (
                   <button key={p} onClick={() => togglePermission(p)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${newUserForm.permissions.includes(p) ? 'bg-amber-500 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>{p}</button>
                 ))}
               </div>
            </div>
            <button onClick={handleCreateUser} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-amber-500 transition-all">Registrar Auditor</button>
          </div>

          {/* Listado de Usuarios */}
          <div className="overflow-x-auto max-h-[500px] scrollbar-hide">
             <table className="w-full text-left">
               <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400">
                 <tr>
                   <th className="px-4 py-3">Nombre / Rol</th>
                   <th className="px-4 py-3">Accesos</th>
                   <th className="px-4 py-3">Acción</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {dbUsers.map(user => (
                   <tr key={user.id} className="text-xs">
                     <td className="py-4 px-4">
                       <p className="font-black text-slate-900">{user.username}</p>
                       <span className={`text-[8px] font-black uppercase ${user.role === 'admin' ? 'text-amber-500' : 'text-slate-400'}`}>{user.role}</span>
                     </td>
                     <td className="py-4 px-4">
                       <div className="flex flex-wrap gap-1">
                         {user.permissions.map(p => <span key={p} className="bg-slate-100 text-[7px] font-black uppercase px-1.5 py-0.5 rounded text-slate-400">{p}</span>)}
                       </div>
                     </td>
                     <td className="py-4 px-4">
                       <button onClick={async () => {
                         const nR = user.role === 'admin' ? 'agent' : 'admin';
                         if (await dbService.updateUserRole(user.id, nR)) loadUsers();
                       }} className="text-amber-500 font-black uppercase text-[8px]">Swap Rol</button>
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
        <h3 className="text-xl font-black mb-6 text-slate-900 uppercase">💾 Respaldo Integral del Sistema</h3>
        <p className="text-xs text-slate-400 mb-8">Exporta incidencias, usuarios (con permisos), áreas y especialidades.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button onClick={handleExportBackup} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase">Exportar JSON Maestro</button>
          <div className="relative">
            <input type="file" accept=".json" onChange={handleImportBackup} className="absolute inset-0 opacity-0 cursor-pointer" />
            <button className="w-full py-4 bg-amber-50 text-amber-600 border border-amber-200 rounded-2xl font-black text-[10px] uppercase">Importar JSON Maestro</button>
          </div>
        </div>
      </div>

      {/* ÁREAS Y ESPECIALIDADES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="glass-card bg-white p-10 border border-orange-100 shadow-xl">
          <h3 className="text-xl font-black mb-8 uppercase">🏢 Áreas Operativas</h3>
          <div className="flex gap-4 mb-8">
            <input className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold" value={newArea} onChange={e => setNewArea(e.target.value)} placeholder="Ej. Admisión" />
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
          <h3 className="text-xl font-black mb-8 uppercase">🎓 Especialidades Médicas</h3>
          <div className="flex gap-4 mb-8">
            <input className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold" value={newSpec} onChange={e => setNewSpec(e.target.value)} placeholder="Ej. Urología" />
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
