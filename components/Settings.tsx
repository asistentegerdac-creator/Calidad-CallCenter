
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
  currentTheme: string;
  setTheme: (t: string) => void;
}

export const Settings: React.FC<Props> = ({ 
  areas, setAreas, specialties, setSpecialties, 
  users, setUsers, currentUser, isOnline, onConnStatusChange,
  currentTheme, setTheme
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

  const [dbParams, setDbParams] = useState(() => {
    const saved = localStorage.getItem('dac_db_config');
    return saved ? JSON.parse(saved) : {
      host: '192.168.99.180',
      port: '3008',
      database: 'calidad_dac_db',
      user: 'postgres',
      password: ''
    };
  });

  const themes = [
    { id: 'classic', name: 'Dac Classic', color: '#f59e0b', desc: 'Ámbar Cálido (Claro)' },
    { id: 'midnight', name: 'Midnight Node', color: '#6366f1', desc: 'Modo Oscuro Profundo' },
    { id: 'emerald', name: 'Emerald Glass', color: '#10b981', desc: 'Médico Profesional' },
    { id: 'cyber', name: 'Cyber 3D', color: '#d946ef', desc: 'Contraste Alto 3D' },
    { id: 'oceanic', name: 'Oceanic Gradient', color: '#06b6d4', desc: 'Relajante / Auditivo' },
  ];

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

  const handleManualMigration = async () => {
    if (!isOnline) return alert("❌ Vincule el Nodo primero para migrar.");
    setSyncing(true);
    
    const localComplaints: Complaint[] = JSON.parse(localStorage.getItem('dac_complaints') || '[]');
    const localUsers: User[] = JSON.parse(localStorage.getItem('dac_users') || '[]');
    
    try {
      for (const u of localUsers) await dbService.saveUser(u);
      for (const c of localComplaints) await dbService.saveComplaint(c);
      
      localStorage.setItem('dac_complaints', '[]');
      localStorage.setItem('dac_users', '[]');
      alert("✅ Migración a PostgreSQL terminada con éxito.");
      window.location.reload();
    } catch {
      alert("❌ Fallo parcial en la migración.");
    } finally { setSyncing(false); }
  };

  const handleRepairDB = async () => {
    setRepairing(true);
    const ok = await dbService.repairDatabase();
    alert(ok ? "✅ Estructura revisada y reparada en Postgres." : "❌ El Nodo no responde.");
    setRepairing(false);
  };

  const handleCreateUser = async () => {
    if (!newUserForm.username || !newUserForm.password) return alert("Faltan datos.");
    const newUser: User = {
      id: `USR-${Date.now().toString().slice(-4)}`,
      username: newUserForm.username,
      password: newUserForm.password,
      name: newUserForm.username,
      role: newUserForm.role,
      permissions: newUserForm.permissions
    };

    if (isOnline) {
      const saved = await dbService.saveUser(newUser);
      if (saved) {
        alert("✅ Usuario grabado en Base de Datos PostgreSQL.");
        await loadAllUsers();
      } else {
        alert("❌ Error: No se pudo grabar el usuario. Re-vincule el nodo.");
      }
    } else {
      setUsers([...users, newUser]);
      alert("⚠️ Guardado en Local.");
    }
    setNewUserForm({ ...newUserForm, username: '', password: '' });
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-12 pb-20">
      <div className="glass-card p-10">
        <h3 className="text-xl font-black mb-10 uppercase flex items-center gap-3">🎨 Personalización</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {themes.map(t => (
            <button key={t.id} onClick={() => setTheme(t.id)} className={`flex flex-col items-center p-6 rounded-3xl border-2 ${currentTheme === t.id ? 'border-amber-500' : 'border-transparent opacity-60'}`}>
              <div className="w-12 h-12 rounded-2xl mb-4 shadow-lg" style={{ background: t.color }}></div>
              <p className="text-[10px] font-black uppercase mb-1">{t.name}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card p-10 bg-slate-900 !text-white">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-black mb-2 flex items-center gap-3 !text-white">🐘 Nodo Central (PostgreSQL)</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase">{isOnline ? '🟢 Sincronización Activa' : '🔴 Nodo no Inicializado'}</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setIsUnlocked(!isUnlocked)} className="px-6 py-4 bg-white/10 rounded-2xl font-black text-[10px] uppercase">Ajustes IP</button>
            <button onClick={handleRepairDB} disabled={repairing} className="px-6 py-4 bg-emerald-500 rounded-2xl font-black text-[10px] uppercase">{repairing ? 'Revisando...' : 'Revisar Base'}</button>
          </div>
        </div>

        {isUnlocked && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 p-8 bg-black/20 rounded-3xl animate-in fade-in">
            <input className="bg-slate-800 p-4 rounded-xl text-sm font-bold border-none" placeholder="IP" value={dbParams.host} onChange={e => setDbParams({...dbParams, host: e.target.value})} />
            <input className="bg-slate-800 p-4 rounded-xl text-sm font-bold border-none" placeholder="Base de Datos" value={dbParams.database} onChange={e => setDbParams({...dbParams, database: e.target.value})} />
            <input className="bg-slate-800 p-4 rounded-xl text-sm font-bold border-none" placeholder="Usuario" value={dbParams.user} onChange={e => setDbParams({...dbParams, user: e.target.value})} />
            <input className="bg-slate-800 p-4 rounded-xl text-sm font-bold border-none" type="password" placeholder="Clave" value={dbParams.password} onChange={e => setDbParams({...dbParams, password: e.target.value})} />
            <button onClick={async () => {
              const ok = await dbService.testConnection(dbParams);
              onConnStatusChange(ok);
              alert(ok ? '✅ Nodo Vinculado' : '❌ Fallo de Conexión');
            }} className="bg-amber-500 py-4 rounded-xl font-black text-[10px] uppercase">Vincular Ahora</button>
            <button onClick={handleManualMigration} disabled={syncing} className="bg-indigo-600 py-4 rounded-xl font-black text-[10px] uppercase">{syncing ? 'Migrando...' : '🚀 Migración Manual'}</button>
          </div>
        )}
      </div>

      <div className="glass-card p-10">
        <h3 className="text-xl font-black mb-10 uppercase">👥 Auditores</h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          <div className={`space-y-6 bg-slate-50/5 p-8 rounded-[2.5rem] border ${!isAdmin ? 'opacity-50' : ''}`}>
            <h4 className="text-[10px] font-black uppercase mb-4">Nuevo Acceso</h4>
            <div className="grid grid-cols-2 gap-4">
              <input className="p-4 rounded-xl text-sm font-bold" placeholder="Username" value={newUserForm.username} onChange={e => setNewUserForm({...newUserForm, username: e.target.value})} />
              <input className="p-4 rounded-xl text-sm font-bold" type="password" placeholder="Password" value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} />
            </div>
            <button onClick={handleCreateUser} className="w-full py-5 neo-warm-button rounded-2xl font-black text-[10px] uppercase">Grabar en PostgreSQL</button>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead className="text-[9px] font-black uppercase text-slate-400">
                 <tr><th className="px-4 py-3">Usuario</th><th className="px-4 py-3 text-right">Rol</th></tr>
               </thead>
               <tbody className="divide-y divide-slate-100/10">
                 {users.map(user => (
                   <tr key={user.id}><td className="py-4 px-4 font-black text-sm">{user.username}</td><td className="py-4 px-4 text-right uppercase text-[8px] font-black">{user.role}</td></tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  );
};
