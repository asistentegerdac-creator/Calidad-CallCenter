
import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/apiService';
import { User, Complaint, AreaMapping } from '../types';

interface Props {
  areas: string[]; onAddArea: (a: string) => void; onRemoveArea: (a: string) => void;
  specialties: string[]; onAddSpecialty: (s: string) => void; onRemoveSpecialty: (s: string) => void;
  users: User[]; setUsers: (u: User[]) => void;
  currentUser: User | null;
  isOnline: boolean; onConnStatusChange: (s: boolean) => void;
  currentTheme: string; setTheme: (t: string) => void;
  complaints: Complaint[]; setComplaints: (c: Complaint[]) => void;
}

export const Settings: React.FC<Props> = ({ 
  users, setUsers, isOnline, onConnStatusChange,
  currentTheme, setTheme, areas, onAddArea, onRemoveArea,
  specialties, onAddSpecialty, onRemoveSpecialty,
  complaints, setComplaints
}) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [connMessage, setConnMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [areaMappings, setAreaMappings] = useState<AreaMapping[]>([]);
  const [newMapping, setNewMapping] = useState({ area: '', manager: '' });
  const [newUser, setNewUser] = useState({ id: '', username: '', name: '', password: '', role: 'agent' as 'admin' | 'agent' });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ type: 'area', value: '' });

  const [dbParams, setDbParams] = useState({
    host: localStorage.getItem('last_db_host') || 'localhost',
    port: '5432', database: 'calidad_dac_db', user: 'postgres', password: ''
  });

  const themes = [
    { id: 'classic', name: 'Dac Classic', color: '#f59e0b' },
    { id: 'midnight', name: 'Midnight', color: '#6366f1' },
    { id: 'emerald', name: 'Emerald', color: '#10b981' },
    { id: 'cyber', name: 'Cyber 3D', color: '#d946ef' },
    { id: 'oceanic', name: 'Oceanic', color: '#06b6d4' },
  ];

  useEffect(() => {
    if (isOnline) {
      const loadData = async () => {
        try {
          const mappings = await dbService.fetchAreasConfig();
          setAreaMappings(mappings);
          const remoteUsers = await dbService.fetchUsers();
          setUsers(remoteUsers);
        } catch (e) { console.error("Error cargando configuración inicial:", e); }
      };
      loadData();
    }
  }, [isOnline, setUsers]);

  const handleTestConnection = async () => {
    setTesting(true);
    setConnMessage(null);
    try {
      const result = await dbService.testConnection(dbParams);
      if (result.success) {
        onConnStatusChange(true);
        setConnMessage("✅ NODO VINCULADO CORRECTAMENTE");
        localStorage.setItem('last_db_host', dbParams.host);
        setIsUnlocked(false);
      } else {
        onConnStatusChange(false);
        setConnMessage(`❌ FALLO DE CONEXIÓN`);
      }
    } catch (e) {
      setConnMessage("❌ ERROR DE RED");
    } finally { setTesting(false); }
  };

  const handleCreateOrUpdateUser = async () => {
    if (!newUser.username || !newUser.password) {
      alert("Usuario y clave son obligatorios");
      return;
    }
    const userToSave: User = { 
      ...newUser, 
      id: editingUserId || `USR-${Date.now()}`, 
      permissions: ['dashboard'] 
    };
    if (isOnline) {
      const ok = await dbService.saveUser(userToSave);
      if (ok) {
        const updatedUsers = await dbService.fetchUsers();
        setUsers(updatedUsers);
        setNewUser({ id: '', username: '', name: '', password: '', role: 'agent' });
        setEditingUserId(null);
        alert(editingUserId ? "Auditor actualizado" : "Auditor registrado");
      } else {
        alert("Error al guardar en el Nodo");
      }
    } else {
      alert("Debe estar conectado al Nodo");
    }
  };

  const startEditUser = (u: User) => {
    setEditingUserId(u.id);
    setNewUser({
      id: u.id,
      username: u.username,
      name: u.name,
      password: u.password || '',
      role: u.role
    });
  };

  const cancelEditUser = () => {
    setEditingUserId(null);
    setNewUser({ id: '', username: '', name: '', password: '', role: 'agent' });
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("¿Eliminar usuario?")) return;
    if (isOnline) {
      await dbService.deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
    }
  };

  const addItem = () => {
    if (!newItem.value) return;
    if (newItem.type === 'area') onAddArea(newItem.value);
    else onAddSpecialty(newItem.value);
    setNewItem({ ...newItem, value: '' });
  };

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-500">
      {/* NODO POSTGRES */}
      <div className="glass-card p-10 bg-slate-900 !text-white border-none">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black !text-white">🐘 Nodo Postgres</h3>
            <p className="text-[10px] font-black uppercase text-slate-400 mt-1">Estado: {isOnline ? 'VINCULADO' : 'SIN CONEXIÓN'}</p>
          </div>
          <button onClick={() => setIsUnlocked(!isUnlocked)} className="px-8 py-4 bg-white/10 rounded-2xl font-black text-[10px] uppercase border border-white/5">
            {isUnlocked ? 'Cerrar Panel' : 'Configurar Nodo'}
          </button>
        </div>
        {isUnlocked && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12 p-8 bg-black/40 rounded-[2.5rem] border border-white/5">
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Host / IP</label><input className="w-full bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white outline-none" value={dbParams.host} onChange={e => setDbParams({...dbParams, host: e.target.value})} /></div>
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Base de Datos</label><input className="w-full bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white outline-none" value={dbParams.database} onChange={e => setDbParams({...dbParams, database: e.target.value})} /></div>
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Usuario</label><input className="w-full bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white outline-none" value={dbParams.user} onChange={e => setDbParams({...dbParams, user: e.target.value})} /></div>
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Contraseña</label><input className="w-full bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white outline-none" type="password" value={dbParams.password} onChange={e => setDbParams({...dbParams, password: e.target.value})} /></div>
            <div className="flex items-end">
              <button onClick={handleTestConnection} disabled={testing} className="w-full bg-amber-500 py-4 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-white hover:text-amber-600 transition-all">
                {testing ? 'VINCULANDO...' : 'Sincronizar Nodo'}
              </button>
            </div>
            {connMessage && <div className="col-span-full mt-4 text-[10px] font-black text-center animate-bounce">{connMessage}</div>}
          </div>
        )}
      </div>

      {/* GESTIÓN DE AUDITORES */}
      <div className="glass-card p-10 bg-white shadow-xl border border-slate-50">
        <h3 className="text-xl font-black mb-8 uppercase text-slate-900 flex items-center gap-3">
          <span className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white text-sm">👥</span>
          Gestión de Auditores
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
             <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Usuario (Login)</label>
                <input className="w-full p-4 bg-white border rounded-xl text-xs font-bold" placeholder="Ejem: mgarcia" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
             </div>
             <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Nombre Completo</label>
                <input className="w-full p-4 bg-white border rounded-xl text-xs font-bold" placeholder="Ej: Mario García" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
             </div>
             <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Contraseña</label>
                <input className="w-full p-4 bg-white border rounded-xl text-xs font-bold" type="password" placeholder="********" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
             </div>
             <div className="flex gap-2">
                <button onClick={handleCreateOrUpdateUser} className={`flex-1 py-4 text-white rounded-xl font-black text-[10px] uppercase shadow-md transition-all ${editingUserId ? 'bg-amber-600' : 'bg-slate-900'}`}>
                  {editingUserId ? 'Actualizar Auditor' : 'Registrar Auditor'}
                </button>
                {editingUserId && (
                  <button onClick={cancelEditUser} className="px-6 py-4 bg-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase">Cancelar</button>
                )}
             </div>
          </div>
          <div className="border rounded-[2rem] overflow-hidden bg-white shadow-inner">
             <table className="w-full text-left">
                <thead className="bg-slate-50 text-[9px] font-black text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Auditor</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.length === 0 ? (
                    <tr><td colSpan={2} className="px-6 py-10 text-center text-slate-400 font-bold uppercase text-[10px]">Sin auditores registrados</td></tr>
                  ) : (
                    users.map(u => (
                      <tr key={u.id} className={`text-[10px] font-black group transition-colors ${editingUserId === u.id ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                        <td className="px-6 py-4">
                          <span className="text-slate-900 font-black">{u.username}</span>
                          <span className="block text-[8px] text-slate-400 font-bold uppercase">{u.name}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => startEditUser(u)} className="text-indigo-500 hover:scale-125 transition-transform px-3 text-sm">✎</button>
                          <button onClick={() => handleDeleteUser(u.id)} className="text-rose-500 hover:scale-125 transition-transform px-3 text-sm">✕</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
             </table>
          </div>
        </div>
      </div>

      {/* GESTIÓN DE CATÁLOGOS */}
      <div className="glass-card p-10 bg-white">
        <h3 className="text-xl font-black mb-8 uppercase text-slate-900 flex items-center gap-3">
          <span className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white text-sm">📚</span>
          Gestión de Catálogos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4">
             <p className="text-[10px] font-black uppercase text-slate-400">Áreas</p>
             <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl">
                {areas.map(a => <span key={a} className="px-3 py-1.5 bg-white text-[10px] font-bold rounded-lg flex items-center gap-2 shadow-sm border">{a} <button onClick={() => onRemoveArea(a)} className="text-rose-500 font-black">×</button></span>)}
             </div>
             <div className="flex gap-2">
                <input className="flex-1 p-3 bg-slate-50 border rounded-xl text-xs font-bold" placeholder="Nueva área..." value={newItem.type === 'area' ? newItem.value : ''} onChange={e => setNewItem({type:'area', value: e.target.value})} />
                <button onClick={addItem} className="px-6 bg-slate-900 text-white rounded-xl text-[10px] font-black">Añadir</button>
             </div>
          </div>
          <div className="space-y-4">
             <p className="text-[10px] font-black uppercase text-slate-400">Especialidades</p>
             <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl">
                {specialties.map(s => <span key={s} className="px-3 py-1.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-lg flex items-center gap-2 border border-amber-100">{s} <button onClick={() => onRemoveSpecialty(s)} className="text-rose-500 font-black">×</button></span>)}
             </div>
             <div className="flex gap-2">
                <input className="flex-1 p-3 bg-slate-50 border rounded-xl text-xs font-bold" placeholder="Nueva especialidad..." value={newItem.type === 'spec' ? newItem.value : ''} onChange={e => setNewItem({type:'spec', value: e.target.value})} />
                <button onClick={addItem} className="px-6 bg-amber-500 text-white rounded-xl text-[10px] font-black">Añadir</button>
             </div>
          </div>
        </div>
      </div>

      {/* TEMAS VISUALES */}
      <div className="glass-card p-10 bg-white">
        <h3 className="text-xl font-black mb-8 uppercase text-slate-900">Temas Visuales</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {themes.map(t => (
            <button key={t.id} onClick={() => setTheme(t.id)} className={`p-5 rounded-[2rem] border-4 transition-all ${currentTheme === t.id ? 'border-amber-500 bg-amber-50' : 'border-slate-50 opacity-60'}`}>
              <div className="w-full h-10 rounded-xl mb-3" style={{ background: t.color }}></div>
              <p className="text-[9px] font-black uppercase text-center">{t.name}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
