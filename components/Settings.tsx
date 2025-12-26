
import React, { useState, useEffect } from 'react';
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
  const [connMessage, setConnMessage] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  
  // Gestión de Jefaturas
  const [areaMappings, setAreaMappings] = useState<AreaMapping[]>([]);
  const [newMapping, setNewMapping] = useState({ area: '', manager: '' });

  // Gestión de Usuarios y Catálogos
  const [newUser, setNewUser] = useState({ id: '', username: '', name: '', password: '', role: 'agent' as 'admin' | 'agent' });
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
      dbService.fetchAreasConfig().then(setAreaMappings);
    }
  }, [isOnline]);

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

  const handleSaveMapping = async () => {
    if (!newMapping.area || !newMapping.manager) return;
    const mapping = { areaName: newMapping.area, managerName: newMapping.manager };
    await dbService.saveAreaConfig(mapping);
    setAreaMappings([...areaMappings.filter(m => m.areaName !== mapping.areaName), mapping]);
    setNewMapping({ area: '', manager: '' });
  };

  const handleDeleteMapping = async (areaName: string) => {
    if (!confirm(`¿Eliminar la jefatura para el área ${areaName}?`)) return;
    await dbService.deleteAreaConfig(areaName);
    setAreaMappings(areaMappings.filter(m => m.areaName !== areaName));
  };

  const handleEditMapping = (m: AreaMapping) => {
    setNewMapping({ area: m.areaName, manager: m.managerName });
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password) return;
    const userToSave: User = { 
      ...newUser, 
      id: newUser.id || `USR-${Date.now()}`, 
      permissions: ['dashboard'] 
    };
    if (isOnline) {
      await dbService.saveUser(userToSave);
      const updatedUsers = await dbService.fetchUsers();
      setUsers(updatedUsers);
      setNewUser({ id: '', username: '', name: '', password: '', role: 'agent' });
      alert(newUser.id ? "Usuario actualizado." : "Usuario guardado en Postgres.");
    } else {
      alert("Debe estar online para gestionar usuarios permanentes.");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("¿Seguro que desea eliminar este usuario permanentemente?")) return;
    if (isOnline) {
      await dbService.deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
    }
  };

  const handleEditUser = (u: User) => {
    setNewUser({ id: u.id, username: u.username, name: u.name, password: u.password || '', role: u.role });
  };

  const handleMigrate = async () => {
    if (!isOnline) return alert("Conecte el Nodo primero.");
    setMigrating(true);
    let count = 0;
    for (const c of complaints) {
      const ok = await dbService.saveComplaint(c);
      if (ok) count++;
    }
    setMigrating(false);
    alert(`Migración terminada. ${count} incidencias subidas al servidor.`);
  };

  const handleExport = () => {
    const data = { complaints, areas, specialties, areaMappings, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DAC_FULL_BACKUP_${new Date().getTime()}.json`;
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
        // Aquí no disparamos API masiva por seguridad, pero actualizamos local
        alert("Restauración completa realizada localmente. Use 'Subir Incidencias' para persistir en DB.");
      } catch (err) { alert("Archivo JSON inválido."); }
    };
    reader.readAsText(file);
  };

  const addItem = () => {
    if (!newItem.value) return;
    if (newItem.type === 'area') onAddArea(newItem.value);
    else onAddSpecialty(newItem.value);
    setNewItem({ ...newItem, value: '' });
  };

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-500">
      
      {/* 1. SECCIÓN JEFATURAS POR ÁREA */}
      <div className="glass-card p-10 bg-white shadow-xl border border-slate-100">
        <h3 className="text-xl font-black mb-8 uppercase text-slate-900 flex items-center gap-3">
          <span className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white text-sm">👔</span>
          Organigrama: Jefaturas por Área
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
             <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400">Seleccionar Área Médica</label>
                <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-sm" value={newMapping.area} onChange={e => setNewMapping({...newMapping, area: e.target.value})}>
                   <option value="">-- Seleccione Área --</option>
                   {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400">Nombre del Jefe Responsable</label>
                <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-sm" placeholder="Ej: Dr. Roberto Pérez" value={newMapping.manager} onChange={e => setNewMapping({...newMapping, manager: e.target.value})} />
             </div>
             <button onClick={handleSaveMapping} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-black transition-colors">Vincular/Actualizar Jefatura</button>
          </div>
          <div className="bg-slate-50 rounded-[2rem] p-6 max-h-[250px] overflow-y-auto border border-slate-100 shadow-inner">
             <table className="w-full text-left">
                <thead className="text-[9px] font-black uppercase text-slate-400 border-b"><tr><th className="pb-3">Área</th><th className="pb-3">Jefe</th><th className="pb-3 text-right">Acciones</th></tr></thead>
                <tbody className="divide-y divide-white">
                   {areaMappings.map(m => (
                     <tr key={m.areaName} className="text-[10px] font-black text-slate-700">
                       <td className="py-2">{m.areaName}</td>
                       <td className="py-2 text-amber-600">{m.managerName}</td>
                       <td className="py-2 text-right space-x-2">
                         <button onClick={() => handleEditMapping(m)} className="text-indigo-500 hover:text-indigo-700">✎</button>
                         <button onClick={() => handleDeleteMapping(m.areaName)} className="text-rose-500 hover:text-rose-700">✕</button>
                       </td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>
      </div>

      {/* 2. CATÁLOGOS DINÁMICOS */}
      <div className="glass-card p-10 bg-white">
        <h3 className="text-xl font-black mb-8 uppercase text-slate-900 flex items-center gap-3">
          <span className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white text-sm">📚</span>
          Gestión de Catálogos (Sincronizado con Postgres)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4">
             <p className="text-[10px] font-black uppercase text-slate-400">Departamentos / Áreas</p>
             <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl">
                {areas.map(a => <span key={a} className="px-3 py-1.5 bg-white text-[10px] font-bold rounded-lg flex items-center gap-2 shadow-sm border">{a} <button onClick={() => onRemoveArea(a)} className="text-rose-500 font-black hover:scale-125 transition-transform">×</button></span>)}
             </div>
             <div className="flex gap-2">
                <input className="flex-1 p-3 bg-slate-50 border rounded-xl text-xs font-bold" placeholder="Nueva área..." value={newItem.type === 'area' ? newItem.value : ''} onChange={e => setNewItem({type:'area', value: e.target.value})} />
                <button onClick={addItem} className="px-6 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Añadir</button>
             </div>
          </div>
          <div className="space-y-4">
             <p className="text-[10px] font-black uppercase text-slate-400">Especialidades Médicas</p>
             <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl">
                {specialties.map(s => <span key={s} className="px-3 py-1.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-lg flex items-center gap-2 border border-amber-100 shadow-sm">{s} <button onClick={() => onRemoveSpecialty(s)} className="text-rose-500 font-black hover:scale-125 transition-transform">×</button></span>)}
             </div>
             <div className="flex gap-2">
                <input className="flex-1 p-3 bg-slate-50 border rounded-xl text-xs font-bold" placeholder="Nueva especialidad..." value={newItem.type === 'spec' ? newItem.value : ''} onChange={e => setNewItem({type:'spec', value: e.target.value})} />
                <button onClick={addItem} className="px-6 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase">Añadir</button>
             </div>
          </div>
        </div>
      </div>

      {/* 3. NODO POSTGRES */}
      <div className="glass-card p-10 bg-slate-900 !text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="flex justify-between items-center relative z-10">
          <div>
            <h3 className="text-2xl font-black !text-white">🐘 Configuración de Nodo Postgres</h3>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Sincronización de Base de Datos Central</p>
          </div>
          <button onClick={() => setIsUnlocked(!isUnlocked)} className="px-8 py-4 bg-white/10 rounded-2xl font-black text-[10px] uppercase border border-white/5 hover:bg-white/20 transition-all">
            {isUnlocked ? 'Cerrar Panel' : 'Configurar Nodo'}
          </button>
        </div>
        {isUnlocked && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12 p-8 bg-black/40 rounded-[2.5rem] border border-white/5 animate-in slide-in-from-top-4">
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Host</label><input className="w-full bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white outline-none" value={dbParams.host} onChange={e => setDbParams({...dbParams, host: e.target.value})} /></div>
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Puerto</label><input className="w-full bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white outline-none" value={dbParams.port} onChange={e => setDbParams({...dbParams, port: e.target.value})} /></div>
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Base de Datos</label><input className="w-full bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white outline-none" value={dbParams.database} onChange={e => setDbParams({...dbParams, database: e.target.value})} /></div>
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Usuario</label><input className="w-full bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white outline-none" value={dbParams.user} onChange={e => setDbParams({...dbParams, user: e.target.value})} /></div>
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Password</label><input className="w-full bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white outline-none" type="password" value={dbParams.password} onChange={e => setDbParams({...dbParams, password: e.target.value})} /></div>
            <div className="flex items-end"><button onClick={handleTestConnection} disabled={testing} className="w-full bg-amber-500 py-4 rounded-xl font-black text-[10px] uppercase shadow-2xl hover:bg-amber-400 text-white disabled:opacity-50">{testing ? 'SINCRONIZANDO...' : 'VINCULAR Y CREAR TABLAS'}</button></div>
          </div>
        )}
        {connMessage && <div className={`mt-6 p-4 rounded-2xl text-[10px] font-black uppercase text-center ${connMessage.includes('VINCULADO') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{connMessage}</div>}
      </div>

      {/* 4. TEMAS VISUALES */}
      <div className="glass-card p-10 bg-white shadow-sm border">
        <h3 className="text-xl font-black mb-8 uppercase text-slate-900">Personalización del Entorno</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {themes.map(t => (
            <button key={t.id} onClick={() => setTheme(t.id)} className={`p-5 rounded-[2rem] border-4 transition-all ${currentTheme === t.id ? 'border-amber-500 bg-amber-50' : 'border-slate-50 opacity-60 hover:opacity-100'}`}>
              <div className="w-full h-10 rounded-xl mb-3" style={{ background: t.color }}></div>
              <p className="text-[9px] font-black uppercase text-center">{t.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 5. GESTIÓN DE AUDITORES */}
      <div className="glass-card p-10 bg-white shadow-xl border border-slate-50">
        <h3 className="text-xl font-black mb-8 uppercase text-slate-900 flex items-center gap-3">
          <span className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white text-sm">👥</span>
          Gestión de Auditores
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4 bg-slate-50 p-8 rounded-[2.5rem] shadow-inner">
             <p className="text-[10px] font-black uppercase text-slate-400 mb-4">{newUser.id ? 'Modificar Auditor' : 'Registrar Nuevo Perfil'}</p>
             <input className="w-full p-4 bg-white border rounded-xl text-xs font-bold shadow-sm" placeholder="Username" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
             <input className="w-full p-4 bg-white border rounded-xl text-xs font-bold shadow-sm" placeholder="Nombre Completo" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
             <input className="w-full p-4 bg-white border rounded-xl text-xs font-bold shadow-sm" type="password" placeholder="Password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
             <select className="w-full p-4 bg-white border rounded-xl text-xs font-bold shadow-sm" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                <option value="agent">Auditor Estándar</option>
                <option value="admin">Administrador Maestro</option>
             </select>
             <div className="flex gap-2">
                <button onClick={handleCreateUser} className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-black transition-colors">{newUser.id ? 'Guardar Cambios' : 'Grabar Auditor'}</button>
                {newUser.id && <button onClick={() => setNewUser({ id: '', username: '', name: '', password: '', role: 'agent' })} className="py-4 px-6 bg-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase">Cancelar</button>}
             </div>
          </div>
          <div className="border rounded-[2rem] overflow-hidden shadow-sm bg-white">
             <table className="w-full text-left">
                <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b"><tr><th className="px-6 py-4">Usuario</th><th className="px-6 py-4">Rol</th><th className="px-6 py-4 text-right">Acciones</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => (
                    <tr key={u.id} className="text-[10px] font-black group hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                         <p className="text-slate-900">{u.username}</p>
                         <p className="text-[8px] text-slate-400 uppercase">{u.name}</p>
                      </td>
                      <td className="px-6 py-4 uppercase text-slate-400 text-[8px]">{u.role}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                         <button onClick={() => handleEditUser(u)} className="text-indigo-500 font-bold hover:scale-110 transition-transform">✎</button>
                         <button onClick={() => handleDeleteUser(u.id)} className="text-rose-500 font-bold hover:scale-110 transition-transform">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>
      </div>

      {/* 6. BACKUP Y MIGRACIÓN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card p-10 bg-emerald-50 border-none shadow-xl">
           <h4 className="text-sm font-black text-emerald-900 uppercase mb-4">Mantenimiento de Datos</h4>
           <p className="text-xs text-emerald-700/70 mb-8 font-medium">Sincroniza incidencias huérfanas locales hacia Postgres.</p>
           <button onClick={handleMigrate} disabled={migrating || !isOnline} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg disabled:opacity-30 hover:bg-emerald-700 transition-all">
             {migrating ? 'Subiendo...' : `Subir ${complaints.length} incidencias a DB`}
           </button>
        </div>
        <div className="glass-card p-10 bg-slate-50 border-none shadow-xl">
           <h4 className="text-sm font-black text-slate-900 uppercase mb-4">Respaldo Total (Full JSON)</h4>
           <p className="text-xs text-slate-500 mb-8 font-medium">Descargue un archivo de respaldo manual.</p>
           <div className="flex gap-4">
             <button onClick={handleExport} className="flex-1 py-4 bg-white border border-slate-200 text-slate-900 text-[10px] font-black uppercase rounded-xl shadow-sm hover:bg-slate-50 transition-colors">Exportar JSON</button>
             <label className="flex-1 py-4 bg-white border border-slate-200 text-slate-900 text-[10px] font-black uppercase rounded-xl text-center cursor-pointer shadow-sm hover:bg-slate-50 transition-colors">
                Importar JSON
                <input type="file" hidden accept=".json" onChange={handleImport} />
             </label>
           </div>
        </div>
      </div>
    </div>
  );
};
