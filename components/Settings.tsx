
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

export const Settings: React.FC<Props> = ({ 
  users, setUsers, isOnline, onConnStatusChange,
  currentTheme, setTheme, areas, setAreas, specialties, setSpecialties
}) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connMessage, setConnMessage] = useState<string | null>(null);
  const [newUserForm, setNewUserForm] = useState({ username: '', password: '', role: 'agent' as 'admin' | 'agent' });

  const themes = [
    { id: 'classic', name: 'Dac Classic', color: '#f59e0b', desc: 'Ámbar Cálido' },
    { id: 'midnight', name: 'Midnight', color: '#6366f1', desc: 'Modo Oscuro' },
    { id: 'emerald', name: 'Emerald', color: '#10b981', desc: 'Médico Pro' },
    { id: 'cyber', name: 'Cyber 3D', color: '#d946ef', desc: 'Alto Contraste' },
    { id: 'oceanic', name: 'Oceanic', color: '#06b6d4', desc: 'Gradiente Mar' },
  ];

  const [dbParams, setDbParams] = useState({
    host: localStorage.getItem('last_db_host') || 'localhost',
    port: '5432',
    database: 'calidad_dac_db',
    user: 'postgres',
    password: ''
  });

  useEffect(() => {
    if (isOnline) {
      dbService.fetchUsers().then(u => u && setUsers(u));
    }
  }, [isOnline, setUsers]);

  const handleTestConnection = async () => {
    setTesting(true);
    setConnMessage(null);
    try {
      const result = await dbService.testConnection(dbParams);
      if (result.success) {
        onConnStatusChange(true);
        setConnMessage("✅ CONEXIÓN EXITOSA: Nodo vinculado correctamente.");
        localStorage.setItem('last_db_host', dbParams.host);
        setIsUnlocked(false);
      } else {
        onConnStatusChange(false);
        setConnMessage(`❌ FALLO: ${result.message}`);
      }
    } catch (e) {
      setConnMessage("❌ ERROR CRÍTICO: Backend no responde.");
    } finally {
      setTesting(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserForm.username || !newUserForm.password) return alert("Faltan datos.");
    if (!isOnline) return alert("⚠️ Debe estar ONLINE para grabar auditores.");

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
      alert("✅ Usuario registrado.");
      setNewUserForm({ ...newUserForm, username: '', password: '' });
      dbService.fetchUsers().then(u => u && setUsers(u));
    } else {
      alert("❌ Error al grabar.");
    }
  };

  return (
    <div className="space-y-12 pb-20">
      {/* SECCIÓN TEMAS */}
      <div className="glass-card p-10 bg-white">
        <h3 className="text-xl font-black mb-10 uppercase tracking-widest text-slate-900">🎨 Estética del Sistema</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {themes.map(t => (
            <button 
              key={t.id} 
              onClick={() => setTheme(t.id)} 
              className={`flex flex-col items-center p-6 rounded-[2rem] border-4 transition-all ${currentTheme === t.id ? 'border-amber-500 bg-amber-50 shadow-xl' : 'border-slate-50 opacity-60 hover:opacity-100'}`}
            >
              <div className="w-12 h-12 rounded-2xl mb-4 shadow-lg" style={{ background: t.color }}></div>
              <p className="text-[10px] font-black uppercase text-slate-900">{t.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* SECCIÓN POSTGRES */}
      <div className="glass-card p-10 bg-slate-900 !text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
          <div>
            <h3 className="text-2xl font-black mb-2 !text-white">🐘 Configuración del Nodo</h3>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-rose-500 animate-pulse'}`}></div>
              <p className={`text-[11px] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isOnline ? 'VÍNCULO ACTIVO' : 'NODO DESCONECTADO'}
              </p>
            </div>
          </div>
          <button onClick={() => setIsUnlocked(!isUnlocked)} className="px-8 py-4 bg-white/10 rounded-2xl font-black text-[10px] uppercase border border-white/5 hover:bg-white/20 transition-all">
            {isUnlocked ? 'Ocultar' : 'Configurar'}
          </button>
        </div>

        {isUnlocked && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12 p-8 bg-black/40 rounded-[2rem] border border-white/5 animate-in slide-in-from-top-4">
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Host (IP o Localhost)</label><input className="w-full bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white outline-none" value={dbParams.host} onChange={e => setDbParams({...dbParams, host: e.target.value})} /></div>
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Puerto</label><input className="w-full bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white outline-none" value={dbParams.port} onChange={e => setDbParams({...dbParams, port: e.target.value})} /></div>
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Nombre Base de Datos</label><input className="w-full bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white outline-none" value={dbParams.database} onChange={e => setDbParams({...dbParams, database: e.target.value})} /></div>
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Usuario Postgres</label><input className="w-full bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white outline-none" value={dbParams.user} onChange={e => setDbParams({...dbParams, user: e.target.value})} /></div>
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Contraseña</label><input className="w-full bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white outline-none" type="password" value={dbParams.password} onChange={e => setDbParams({...dbParams, password: e.target.value})} /></div>
            <div className="flex items-end"><button onClick={handleTestConnection} disabled={testing} className="w-full bg-amber-500 py-4 rounded-xl font-black text-[10px] uppercase shadow-2xl hover:bg-amber-400 text-white disabled:opacity-50">{testing ? 'PROBANDO...' : 'PROBAR Y GUARDAR VÍNCULO'}</button></div>
          </div>
        )}
        {connMessage && <div className={`mt-6 p-4 rounded-2xl text-[10px] font-black uppercase text-center ${connMessage.includes('EXITOSA') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{connMessage}</div>}
      </div>

      {/* SECCIÓN USUARIOS */}
      <div className="glass-card p-10 bg-white">
        <h3 className="text-xl font-black mb-10 uppercase text-slate-900">👥 Gestión de Auditores</h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          <div className="space-y-6 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
            <h4 className="text-[10px] font-black uppercase mb-4 text-slate-400">Nuevo Registro Central</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="p-4 rounded-xl text-sm font-bold border" placeholder="Username" value={newUserForm.username} onChange={e => setNewUserForm({...newUserForm, username: e.target.value})} />
              <input className="p-4 rounded-xl text-sm font-bold border" type="password" placeholder="Password" value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} />
            </div>
            <button onClick={handleCreateUser} disabled={!isOnline} className="w-full py-5 neo-warm-button rounded-2xl font-black text-[10px] uppercase disabled:opacity-30">Grabar en PostgreSQL</button>
          </div>
          <div className="border rounded-[2rem] bg-white overflow-hidden">
             <table className="w-full text-left">
               <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b"><tr><th className="px-6 py-4">Usuario</th><th className="px-6 py-4 text-right">Rol</th></tr></thead>
               <tbody className="divide-y divide-slate-100">
                 {users.map(u => (
                   <tr key={u.id} className="hover:bg-slate-50"><td className="py-4 px-6 font-black text-slate-900">{u.username}</td><td className="py-4 px-6 text-right uppercase text-[8px] font-black text-slate-500">{u.role}</td></tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  );
};
