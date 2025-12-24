
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/apiService';
import { User, Complaint } from '../types';

interface Props {
  areas: string[]; setAreas: (a: string[]) => void;
  specialties: string[]; setSpecialties: (s: string[]) => void;
  users: User[]; setUsers: (u: User[]) => void;
  currentUser: User | null;
  isOnline: boolean; onConnStatusChange: (s: boolean) => void;
  currentTheme: string; setTheme: (t: string) => void;
  complaints: Complaint[]; setComplaints: (c: Complaint[]) => void;
}

export const Settings: React.FC<Props> = ({ 
  users, setUsers, isOnline, onConnStatusChange,
  currentTheme, setTheme, areas, setAreas, specialties, setSpecialties,
  complaints, setComplaints
}) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connMessage, setConnMessage] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  
  const [newItem, setNewItem] = useState({ type: 'area', value: '' });
  const [newUserForm, setNewUserForm] = useState({ username: '', password: '', role: 'agent' as 'admin' | 'agent', name: '' });

  const themes = [
    { id: 'classic', name: 'Dac Classic', color: '#f59e0b' },
    { id: 'midnight', name: 'Midnight', color: '#6366f1' },
    { id: 'emerald', name: 'Emerald', color: '#10b981' },
    { id: 'cyber', name: 'Cyber 3D', color: '#d946ef' },
    { id: 'oceanic', name: 'Oceanic', color: '#06b6d4' },
  ];

  const [dbParams, setDbParams] = useState({
    host: localStorage.getItem('last_db_host') || 'localhost',
    port: '5432', database: 'calidad_dac_db', user: 'postgres', password: ''
  });

  const handleTestConnection = async () => {
    setTesting(true);
    setConnMessage(null);
    try {
      const result = await dbService.testConnection(dbParams);
      if (result.success) {
        onConnStatusChange(true);
        setConnMessage("✅ NODO VINCULADO");
        localStorage.setItem('last_db_host', dbParams.host);
        setIsUnlocked(false);
      } else {
        onConnStatusChange(false);
        setConnMessage(`❌ FALLO: ${result.message}`);
      }
    } catch (e) {
      setConnMessage("❌ ERROR RED");
    } finally { setTesting(false); }
  };

  const handleMigrate = async () => {
    if (!isOnline) return alert("Debe estar online para migrar.");
    if (!confirm(`¿Desea migrar ${complaints.length} registros locales a la base de datos central?`)) return;
    
    setMigrating(true);
    let count = 0;
    for (const c of complaints) {
      const ok = await dbService.saveComplaint(c);
      if (ok) count++;
    }
    setMigrating(false);
    alert(`Migración finalizada. ${count} registros sincronizados exitosamente.`);
  };

  const handleExport = () => {
    const data = { complaints, areas, specialties, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DAC_BACKUP_${new Date().getTime()}.json`;
    link.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.complaints) setComplaints(data.complaints);
        if (data.areas) setAreas(data.areas);
        if (data.specialties) setSpecialties(data.specialties);
        alert("Restauración completada con éxito.");
      } catch (err) { alert("Archivo inválido."); }
    };
    reader.readAsText(file);
  };

  const addItem = () => {
    if (!newItem.value) return;
    if (newItem.type === 'area') setAreas([...areas, newItem.value]);
    else setSpecialties([...specialties, newItem.value]);
    setNewItem({ ...newItem, value: '' });
  };

  const removeItem = (type: 'area' | 'spec', value: string) => {
    if (type === 'area') setAreas(areas.filter(a => a !== value));
    else setSpecialties(specialties.filter(s => s !== value));
  };

  const handleCreateUser = async () => {
    if (!newUserForm.username || !newUserForm.password) return alert("Faltan datos.");
    const user: User = { 
      id: `USR-${Date.now().toString().slice(-4)}`, 
      ...newUserForm, 
      permissions: ['all'] 
    };
    if (isOnline) {
      const saved = await dbService.saveUser(user);
      if (saved) { alert("Usuario grabado en DB."); setUsers([...users, saved]); }
    } else { alert("Debe estar online para crear usuarios permanentes."); }
  };

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-500">
      {/* SECCIÓN MANTENIMIENTO CATÁLOGOS */}
      <div className="glass-card p-10 bg-white">
        <h3 className="text-xl font-black mb-8 uppercase tracking-widest text-slate-900 flex items-center gap-3">
          <span className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white text-sm">🛠️</span>
          Gestión de Catálogos Médicos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Áreas */}
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-slate-400">Departamentos / Áreas</p>
            <div className="flex flex-wrap gap-2">
              {areas.map(a => (
                <div key={a} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg group">
                  {a}
                  <button onClick={() => removeItem('area', a)} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <input className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold" placeholder="Nueva Área" value={newItem.type === 'area' ? newItem.value : ''} onChange={e => setNewItem({type:'area', value: e.target.value})} />
              <button onClick={addItem} className="px-6 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Añadir</button>
            </div>
          </div>
          {/* Especialidades */}
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-slate-400">Especialidades Médicas</p>
            <div className="flex flex-wrap gap-2">
              {specialties.map(s => (
                <div key={s} className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-lg group">
                  {s}
                  <button onClick={() => removeItem('spec', s)} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <input className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold" placeholder="Nueva Especialidad" value={newItem.type === 'spec' ? newItem.value : ''} onChange={e => setNewItem({type:'spec', value: e.target.value})} />
              <button onClick={addItem} className="px-6 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase">Añadir</button>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN MIGRACIÓN Y RESPALDO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card p-10 bg-slate-50 border-none shadow-xl">
           <h4 className="text-sm font-black text-slate-900 uppercase mb-6">Backup de Datos</h4>
           <p className="text-xs text-slate-500 mb-6 font-medium">Descargue una copia local de todas las incidencias y configuraciones para respaldo o migración manual.</p>
           <div className="flex gap-4">
             <button onClick={handleExport} className="flex-1 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-[10px] uppercase shadow-sm hover:shadow-md transition-all">Exportar JSON</button>
             <label className="flex-1 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-[10px] uppercase text-center cursor-pointer hover:shadow-md transition-all">
               Importar JSON
               <input type="file" hidden accept=".json" onChange={handleImport} />
             </label>
           </div>
        </div>
        <div className="glass-card p-10 bg-emerald-50 border-none shadow-xl">
           <h4 className="text-sm font-black text-emerald-900 uppercase mb-6">Sincronización Masiva</h4>
           <p className="text-xs text-emerald-700/70 mb-6 font-medium">Suba todos los registros acumulados en este navegador hacia la base de datos PostgreSQL central.</p>
           <button 
             onClick={handleMigrate} 
             disabled={migrating || !isOnline} 
             className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-emerald-700 transition-all disabled:opacity-30"
           >
             {migrating ? 'Migrando...' : `Migrar ${complaints.length} registros a la DB`}
           </button>
           {!isOnline && <p className="text-[9px] text-rose-500 font-bold uppercase text-center mt-3 animate-pulse">Debe vincular el Nodo primero</p>}
        </div>
      </div>

      {/* SECCIÓN TEMAS */}
      <div className="glass-card p-10 bg-white shadow-xl">
        <h3 className="text-xl font-black mb-8 uppercase text-slate-900">Personalización Visual</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {themes.map(t => (
            <button key={t.id} onClick={() => setTheme(t.id)} className={`p-5 rounded-[2rem] border-4 transition-all ${currentTheme === t.id ? 'border-amber-500 bg-amber-50' : 'border-slate-50 opacity-60 hover:opacity-100'}`}>
              <div className="w-full h-10 rounded-xl mb-3" style={{ background: t.color }}></div>
              <p className="text-[9px] font-black uppercase text-center">{t.id}</p>
            </button>
          ))}
        </div>
      </div>

      {/* POSTGRES CONFIG */}
      <div className="glass-card p-10 bg-slate-900 !text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="flex justify-between items-center relative z-10">
          <div>
             <h3 className="text-2xl font-black !text-white">🐘 Vinculación de Nodo Postgres</h3>
             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Conexión a la Base de Datos Centralizada</p>
          </div>
          <button onClick={() => setIsUnlocked(!isUnlocked)} className="px-8 py-4 bg-white/10 rounded-2xl font-black text-[10px] uppercase border border-white/5 hover:bg-white/20 transition-all">
            {isUnlocked ? 'Cerrar' : 'Configurar'}
          </button>
        </div>
        {isUnlocked && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12 p-8 bg-black/40 rounded-[2rem] border border-white/5 animate-in slide-in-from-top-4">
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Host</label><input className="w-full bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white outline-none" value={dbParams.host} onChange={e => setDbParams({...dbParams, host: e.target.value})} /></div>
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Puerto</label><input className="w-full bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white outline-none" value={dbParams.port} onChange={e => setDbParams({...dbParams, port: e.target.value})} /></div>
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Base de Datos</label><input className="w-full bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white outline-none" value={dbParams.database} onChange={e => setDbParams({...dbParams, database: e.target.value})} /></div>
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Usuario</label><input className="w-full bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white outline-none" value={dbParams.user} onChange={e => setDbParams({...dbParams, user: e.target.value})} /></div>
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Password</label><input className="w-full bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white outline-none" type="password" value={dbParams.password} onChange={e => setDbParams({...dbParams, password: e.target.value})} /></div>
            <div className="flex items-end"><button onClick={handleTestConnection} disabled={testing} className="w-full bg-amber-500 py-4 rounded-xl font-black text-[10px] uppercase shadow-2xl hover:bg-amber-400 text-white disabled:opacity-50">{testing ? 'PROBANDO...' : 'VINCULAR NODO'}</button></div>
          </div>
        )}
        {connMessage && <div className={`mt-6 p-4 rounded-2xl text-[10px] font-black uppercase text-center ${connMessage.includes('VINCULADO') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{connMessage}</div>}
      </div>

      {/* GESTIÓN DE AUDITORES */}
      <div className="glass-card p-10 bg-white shadow-xl">
        <h3 className="text-xl font-black mb-8 uppercase text-slate-900">👥 Gestión de Auditores</h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          <div className="space-y-6 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
            <h4 className="text-[10px] font-black uppercase mb-4 text-slate-400">Registrar Auditor Médico</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="p-4 rounded-xl text-sm font-bold border bg-white" placeholder="Username" value={newUserForm.username} onChange={e => setNewUserForm({...newUserForm, username: e.target.value})} />
              <input className="p-4 rounded-xl text-sm font-bold border bg-white" placeholder="Nombre Real" value={newUserForm.name} onChange={e => setNewUserForm({...newUserForm, name: e.target.value})} />
              <input className="p-4 rounded-xl text-sm font-bold border bg-white" type="password" placeholder="Password" value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} />
              <select className="p-4 rounded-xl text-sm font-bold border bg-white" value={newUserForm.role} onChange={e => setNewUserForm({...newUserForm, role: e.target.value as any})}>
                <option value="agent">Auditor de Área</option>
                <option value="admin">Administrador General</option>
              </select>
            </div>
            <button onClick={handleCreateUser} disabled={!isOnline} className="w-full py-5 neo-warm-button rounded-2xl font-black text-[10px] uppercase shadow-xl disabled:opacity-30">Grabar Auditor Permanente</button>
          </div>
          <div className="border rounded-[2.5rem] bg-white overflow-hidden shadow-sm">
             <table className="w-full text-left">
               <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b"><tr><th className="px-6 py-4">Usuario</th><th className="px-6 py-4 text-right">Perfil</th></tr></thead>
               <tbody className="divide-y divide-slate-100">
                 {users.map(u => (
                   <tr key={u.id} className="hover:bg-slate-50"><td className="py-4 px-6 font-black text-slate-900">{u.username} <span className="text-[8px] text-slate-400 font-bold ml-2">({u.name})</span></td><td className="py-4 px-6 text-right uppercase text-[8px] font-black text-slate-500"><span className={`px-2 py-0.5 rounded-md ${u.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>{u.role}</span></td></tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  );
};
