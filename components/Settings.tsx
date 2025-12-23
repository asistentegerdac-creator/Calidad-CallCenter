
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/apiService';
import { User, Complaint } from '../types';

interface Props {
  areas: string[]; setAreas: (a: string[]) => void;
  specialties: string[]; setSpecialties: (s: string[]) => void;
  users: User[]; setUsers: (u: User[]) => void;
  currentUser: User | null; isOnline: boolean;
  onConnStatusChange: (s: boolean) => void;
  currentTheme: string; setTheme: (t: string) => void;
}

export const Settings: React.FC<Props> = ({ 
  areas, setAreas, specialties, setSpecialties, 
  users, setUsers, currentUser, isOnline, onConnStatusChange,
  currentTheme, setTheme
}) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [testing, setTesting] = useState(false);
  
  const [newUserForm, setNewUserForm] = useState({ username: '', password: '', role: 'agent' as 'admin' | 'agent', permissions: ['dashboard', 'incidences'] });

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
      setUsers(remoteUsers);
    }
  };

  useEffect(() => { loadAllUsers(); }, [isOnline]);

  const handleTestConnection = async () => {
    setTesting(true);
    const ok = await dbService.testConnection(dbParams);
    onConnStatusChange(ok);
    setTesting(false);
    if (ok) alert("✅ Conexión establecida y persistida.");
    else alert("❌ Error: No se pudo conectar a PostgreSQL. Verifique IP, Puerto y Credenciales.");
  };

  const handleRepairDB = async () => {
    setRepairing(true);
    const ok = await dbService.repairDatabase();
    setRepairing(false);
    alert(ok ? "✅ Tablas reconstruidas con éxito." : "❌ Fallo al reparar la base de datos.");
  };

  const handleCreateUser = async () => {
    if (!newUserForm.username || !newUserForm.password) return alert("Faltan datos.");
    const newUser: User = { id: `USR-${Date.now().toString().slice(-4)}`, username: newUserForm.username, password: newUserForm.password, name: newUserForm.username, role: newUserForm.role, permissions: newUserForm.permissions };

    if (isOnline) {
      const saved = await dbService.saveUser(newUser);
      if (saved) {
        alert("✅ Usuario grabado en PostgreSQL.");
        await loadAllUsers();
        setNewUserForm({ ...newUserForm, username: '', password: '' });
      } else {
        alert("❌ El Nodo rechazó la grabación. Verifique el log del servidor.");
      }
    } else {
      alert("⚠️ El sistema debe estar ONLINE para grabar auditores en la base central.");
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="glass-card p-10 bg-slate-900 !text-white shadow-2xl">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h3 className="text-2xl font-black mb-2 flex items-center gap-3 !text-white">🐘 Vinculación de Nodo Central</h3>
            <p className={`text-[11px] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
              ESTADO: {isOnline ? 'SINCRONIZACIÓN ACTIVA' : 'DESCONECTADO DE POSTGRES'}
            </p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setIsUnlocked(!isUnlocked)} className="px-6 py-4 bg-white/10 rounded-2xl font-black text-[10px] uppercase hover:bg-white/20">Configurar</button>
            <button onClick={handleRepairDB} disabled={repairing || !isOnline} className="px-6 py-4 bg-emerald-500 rounded-2xl font-black text-[10px] uppercase disabled:opacity-30">{repairing ? 'Reconstruyendo...' : 'Reparar Base'}</button>
          </div>
        </div>

        {isUnlocked && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 p-8 bg-black/20 rounded-3xl animate-in fade-in slide-in-from-top-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Host / IP</label>
              <input className="w-full bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white" value={dbParams.host} onChange={e => setDbParams({...dbParams, host: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Base de Datos</label>
              <input className="w-full bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white" value={dbParams.database} onChange={e => setDbParams({...dbParams, database: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Usuario Postgres</label>
              <input className="w-full bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white" value={dbParams.user} onChange={e => setDbParams({...dbParams, user: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Password Postgres</label>
              <input className="w-full bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white" type="password" value={dbParams.password} onChange={e => setDbParams({...dbParams, password: e.target.value})} />
            </div>
            <div className="flex items-end">
              <button onClick={handleTestConnection} disabled={testing} className="w-full bg-amber-500 py-4 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-amber-400 transition-all text-white">
                {testing ? 'Verificando...' : 'Vincular Nodo y Guardar'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="glass-card p-10">
        <h3 className="text-xl font-black mb-10 uppercase">👥 Gestión de Auditores</h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          <div className="space-y-6 bg-slate-50 p-8 rounded-[2.5rem] border">
            <h4 className="text-[10px] font-black uppercase mb-4 text-slate-400">Registrar en Base Central</h4>
            <div className="grid grid-cols-2 gap-4">
              <input className="p-4 rounded-xl text-sm font-bold border" placeholder="Username" value={newUserForm.username} onChange={e => setNewUserForm({...newUserForm, username: e.target.value})} />
              <input className="p-4 rounded-xl text-sm font-bold border" type="password" placeholder="Password" value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setNewUserForm({...newUserForm, role: 'admin'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase border ${newUserForm.role === 'admin' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400'}`}>Admin</button>
              <button onClick={() => setNewUserForm({...newUserForm, role: 'agent'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase border ${newUserForm.role === 'agent' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400'}`}>Auditor</button>
            </div>
            <button onClick={handleCreateUser} disabled={!isOnline} className="w-full py-5 neo-warm-button rounded-2xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50">Grabar en PostgreSQL</button>
            {!isOnline && <p className="text-[9px] text-center font-bold text-rose-500 uppercase">Nodo Desconectado - Grabación Deshabilitada</p>}
          </div>

          <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead className="text-[9px] font-black uppercase text-slate-400 border-b">
                 <tr><th className="px-4 py-3">Usuario</th><th className="px-4 py-3 text-right">Rol</th></tr>
               </thead>
               <tbody className="divide-y">
                 {users.map(user => (
                   <tr key={user.id}><td className="py-4 px-4 font-black text-sm">{user.username}</td><td className="py-4 px-4 text-right uppercase text-[8px] font-black text-slate-500">{user.role}</td></tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  );
};
