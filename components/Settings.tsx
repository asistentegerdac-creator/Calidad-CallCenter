
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/apiService';
import { User } from '../types';

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

// Fixed props interface and destructuring to resolve TypeScript error in App.tsx
export const Settings: React.FC<Props> = ({ 
  areas, setAreas, specialties, setSpecialties,
  users, setUsers, currentUser,
  isOnline, onConnStatusChange,
  currentTheme, setTheme
}) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connMessage, setConnMessage] = useState<string | null>(null);
  
  const [newUserForm, setNewUserForm] = useState({ username: '', password: '', role: 'agent' as 'admin' | 'agent' });

  const [dbParams, setDbParams] = useState({
    host: localStorage.getItem('last_db_host') || 'localhost',
    port: '5432',
    database: 'calidad_dac_db',
    user: 'postgres',
    password: ''
  });

  const loadAllUsers = async () => {
    if (isOnline) {
      const remoteUsers = await dbService.fetchUsers();
      if (remoteUsers) setUsers(remoteUsers);
    }
  };

  useEffect(() => { loadAllUsers(); }, [isOnline]);

  const handleTestConnection = async () => {
    setTesting(true);
    setConnMessage(null);
    const result = await dbService.testConnection(dbParams);
    
    if (result.success) {
      onConnStatusChange(true);
      setConnMessage("✅ CONEXIÓN EXITOSA: Nodo vinculado y estructura sincronizada.");
      localStorage.setItem('last_db_host', dbParams.host);
      setIsUnlocked(false);
    } else {
      onConnStatusChange(false);
      setConnMessage(`❌ FALLO DE CONEXIÓN: ${result.message}`);
    }
    setTesting(false);
  };

  const handleCreateUser = async () => {
    if (!newUserForm.username || !newUserForm.password) return alert("Faltan datos de usuario.");
    
    if (!isOnline) return alert("⚠️ El sistema debe estar ONLINE para grabar auditores en la base central.");

    const newUser: User = { 
      id: `USR-${Date.now().toString().slice(-4)}`, 
      username: newUserForm.username, 
      password: newUserForm.password, 
      name: newUserForm.username, 
      role: newUserForm.role, 
      permissions: ['dashboard', 'incidences', 'new-incidence'] 
    };

    const saved = await dbService.saveUser(newUser);
    if (saved) {
      alert("✅ Usuario grabado correctamente en PostgreSQL.");
      await loadAllUsers();
      setNewUserForm({ ...newUserForm, username: '', password: '' });
    } else {
      alert("❌ El servidor rechazó la grabación. Compruebe que la conexión sea real.");
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="glass-card p-10 bg-slate-900 !text-white shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <h3 className="text-2xl font-black mb-2 flex items-center gap-3 !text-white">
              🐘 Parámetros del Nodo Central
            </h3>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'bg-rose-500 animate-pulse'}`}></div>
              <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isOnline ? 'CONECTADO A POSTGRESQL' : 'SIN VINCULACIÓN DE DATOS'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsUnlocked(!isUnlocked)} 
            className="px-8 py-4 bg-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all border border-white/5"
          >
            {isUnlocked ? 'Cerrar Ajustes' : 'Configurar Conexión'}
          </button>
        </div>

        {isUnlocked && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12 p-8 bg-black/40 rounded-[2rem] border border-white/5 animate-in fade-in slide-in-from-top-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Dirección IP / Host</label>
              <input className="w-full bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white focus:ring-2 ring-amber-500 outline-none" value={dbParams.host} onChange={e => setDbParams({...dbParams, host: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Puerto</label>
              <input className="w-full bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white" value={dbParams.port} onChange={e => setDbParams({...dbParams, port: e.target.value})} />
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
              <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Contraseña</label>
              <input className="w-full bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white" type="password" value={dbParams.password} onChange={e => setDbParams({...dbParams, password: e.target.value})} />
            </div>
            <div className="flex items-end">
              <button 
                onClick={handleTestConnection} 
                disabled={testing} 
                className="w-full bg-amber-500 py-4 rounded-xl font-black text-[10px] uppercase shadow-2xl hover:bg-amber-400 transition-all text-white disabled:opacity-50"
              >
                {testing ? 'VERIFICANDO...' : 'PROBAR Y GUARDAR VÍNCULO'}
              </button>
            </div>
          </div>
        )}

        {connMessage && (
          <div className={`mt-6 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center ${connMessage.includes('EXITOSA') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
            {connMessage}
          </div>
        )}
      </div>

      <div className="glass-card p-10 bg-white shadow-xl">
        <h3 className="text-xl font-black mb-10 uppercase text-slate-900">👥 Gestión de Auditores Médicos</h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          <div className="space-y-6 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
            <h4 className="text-[10px] font-black uppercase mb-4 text-slate-400 tracking-[0.2em]">Nuevo Registro Central</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 ml-1">USUARIO</label>
                <input className="w-full p-4 rounded-xl text-sm font-bold border bg-white" placeholder="Ej: auditor_01" value={newUserForm.username} onChange={e => setNewUserForm({...newUserForm, username: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 ml-1">PASSWORD</label>
                <input className="w-full p-4 rounded-xl text-sm font-bold border bg-white" type="password" value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setNewUserForm({...newUserForm, role: 'admin'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${newUserForm.role === 'admin' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-100'}`}>Administrador</button>
              <button onClick={() => setNewUserForm({...newUserForm, role: 'agent'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${newUserForm.role === 'agent' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-100'}`}>Auditor de Área</button>
            </div>
            <button 
              onClick={handleCreateUser} 
              disabled={!isOnline} 
              className="w-full py-5 neo-warm-button rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl disabled:opacity-30 disabled:grayscale"
            >
              Grabar en PostgreSQL
            </button>
            {!isOnline && (
              <p className="text-[9px] text-center font-bold text-rose-500 uppercase animate-pulse">
                El nodo debe estar vinculado para registrar usuarios
              </p>
            )}
          </div>

          <div className="overflow-hidden border rounded-[2rem] bg-white">
             <table className="w-full text-left">
               <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b">
                 <tr><th className="px-6 py-4">Usuario Registrado</th><th className="px-6 py-4 text-right">Perfil</th></tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {users.length === 0 ? (
                   <tr><td colSpan={2} className="px-6 py-10 text-center text-[10px] font-black text-slate-300 uppercase">Sin auditores registrados</td></tr>
                 ) : users.map(user => (
                   <tr key={user.id} className="hover:bg-slate-50">
                     <td className="py-4 px-6">
                        <p className="font-black text-sm text-slate-900">{user.username}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{user.id}</p>
                     </td>
                     <td className="py-4 px-6 text-right">
                        <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase ${user.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                          {user.role}
                        </span>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  );
};
