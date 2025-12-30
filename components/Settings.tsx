
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

  const downloadBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(complaints, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `DAC_BACKUP_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleRestoreBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (Array.isArray(json)) {
          if (confirm(`Se han detectado ${json.length} registros. ¿Desea restaurar este respaldo y sobreescribir los datos actuales?`)) {
            setComplaints(json);
            localStorage.setItem('dac_complaints', JSON.stringify(json));
            alert("Respaldo restaurado exitosamente en el navegador. Si desea enviarlos a la nube, use el botón 'Subir Local a Nodo Cloud'.");
          }
        } else {
          alert("El archivo no tiene un formato de respaldo DAC válido.");
        }
      } catch (err) {
        alert("Error al procesar el archivo JSON.");
      }
    };
    reader.readAsText(file);
  };

  const handleRepairDB = async () => {
    if (!isOnline) return alert("Debe estar conectado al Nodo Postgres");
    setRepairing(true);
    try {
      const res = await dbService.initDatabase();
      if (res.success) {
        alert("✅ Verificación completada: Todas las tablas han sido creadas o reparadas correctamente.");
      } else {
        alert("❌ Error: " + res.message);
      }
    } catch (e) {
      alert("❌ Error de comunicación con el Nodo.");
    } finally {
      setRepairing(false);
    }
  };

  const syncLocalToCloud = async () => {
    if (!isOnline) return alert("Debe estar conectado al Nodo Postgres");
    if (!confirm("¿Desea subir todos los registros locales al Nodo Postgres? Se combinarán con los existentes.")) return;
    
    setSyncing(true);
    let successCount = 0;
    for (const c of complaints) {
      const ok = await dbService.saveComplaint(c);
      if (ok) successCount++;
    }
    setSyncing(false);
    alert(`Migración finalizada. Se sincronizaron ${successCount} de ${complaints.length} registros.`);
    const remoteData = await dbService.fetchComplaints();
    setComplaints(remoteData);
  };

  const handleSaveMapping = async () => {
    if (!newMapping.area || !newMapping.manager) return;
    const mapping = { areaName: newMapping.area, managerName: newMapping.manager };
    
    if (isOnline) {
      await dbService.saveAreaConfig(mapping);
      const mappings = await dbService.fetchAreasConfig();
      setAreaMappings(mappings);
      const remoteComplaints = await dbService.fetchComplaints();
      setComplaints(remoteComplaints);
      setNewMapping({ area: '', manager: '' });
      alert(`Jefatura vinculada. Los casos activos se han reasignado.`);
    } else {
      alert("Debe estar online.");
    }
  };

  const handleDeleteMapping = async (areaName: string) => {
    if (!confirm(`¿Eliminar la jefatura?`)) return;
    if (isOnline) {
      await dbService.deleteAreaConfig(areaName);
      setAreaMappings(areaMappings.filter(m => m.areaName !== areaName));
    }
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
      alert("Auditor registrado.");
    }
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
      {/* SECCIÓN HERRAMIENTAS DE DATOS Y RESPALDO */}
      <div className="glass-card p-10 bg-slate-900 !text-white border-none shadow-2xl">
         <h3 className="text-xl font-black mb-8 uppercase flex items-center gap-3">
            <span className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white">💾</span>
            Mantenimiento y Respaldo DAC
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 bg-white/5 rounded-[2rem] border border-white/5 space-y-4">
               <p className="text-[10px] font-black uppercase text-slate-400">Seguridad</p>
               <h4 className="text-sm font-bold">Respaldo Externo</h4>
               <p className="text-[9px] text-slate-500">Descargue o restaure copias físicas de seguridad.</p>
               <div className="flex flex-col gap-2">
                 <button onClick={downloadBackup} className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-400 transition-colors">Bajar JSON</button>
                 <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-slate-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-600 transition-colors">Subir JSON</button>
                 <input type="file" ref={fileInputRef} onChange={handleRestoreBackup} accept=".json" className="hidden" />
               </div>
            </div>
            <div className="p-8 bg-white/5 rounded-[2rem] border border-white/5 space-y-4">
               <p className="text-[10px] font-black uppercase text-slate-400">Migración</p>
               <h4 className="text-sm font-bold">Local a Nube</h4>
               <p className="text-[9px] text-slate-500">Vuelca los datos del navegador al Nodo centralizado.</p>
               <button 
                 disabled={syncing || !isOnline}
                 onClick={syncLocalToCloud} 
                 className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-amber-600 transition-all disabled:opacity-20 mt-auto"
               >
                 {syncing ? 'SINCRONIZANDO...' : 'Sincronizar Todo'}
               </button>
            </div>
            <div className="p-8 bg-white/5 rounded-[2rem] border border-white/5 space-y-4">
               <p className="text-[10px] font-black uppercase text-slate-400">Postgres</p>
               <h4 className="text-sm font-bold">Reparar Estructura</h4>
               <p className="text-[9px] text-slate-500">Verifica que todas las tablas existan en el servidor.</p>
               <button 
                 disabled={repairing || !isOnline}
                 onClick={handleRepairDB} 
                 className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-rose-600 transition-all disabled:opacity-20"
               >
                 {repairing ? 'REPARANDO...' : 'Reparar Tablas'}
               </button>
            </div>
         </div>
      </div>

      {/* ORGANIGRAMA JEFATURAS */}
      <div className="glass-card p-10 bg-white shadow-xl border border-slate-100">
        <h3 className="text-xl font-black mb-8 uppercase text-slate-900 flex items-center gap-3">
          <span className="w-8 h-8 bg-indigo-900 rounded-lg flex items-center justify-center text-white text-sm">👔</span>
          Organigrama: Jefaturas por Área
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
             <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400">Área Médica</label>
                <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-sm" value={newMapping.area} onChange={e => setNewMapping({...newMapping, area: e.target.value})}>
                   <option value="">-- Seleccione Área --</option>
                   {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400">Jefe Responsable</label>
                <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-sm" placeholder="Dr. Ejemplo" value={newMapping.manager} onChange={e => setNewMapping({...newMapping, manager: e.target.value})} />
             </div>
             <button onClick={handleSaveMapping} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-black transition-colors">Vincular y Actualizar Casos</button>
          </div>
          <div className="bg-slate-50 rounded-[2rem] p-6 max-h-[250px] overflow-y-auto border border-slate-100 shadow-inner">
             <table className="w-full text-left">
                <thead className="text-[9px] font-black uppercase text-slate-400 border-b"><tr><th className="pb-3">Área</th><th className="pb-3">Jefe</th><th className="pb-3 text-right"></th></tr></thead>
                <tbody className="divide-y divide-white">
                   {areaMappings.map(m => (
                     <tr key={m.areaName} className="text-[10px] font-black text-slate-700">
                       <td className="py-2">{m.areaName}</td>
                       <td className="py-2 text-amber-600">{m.managerName}</td>
                       <td className="py-2 text-right">
                         <button onClick={() => handleEditMapping(m)} className="text-indigo-500 hover:text-indigo-700 mr-2">✎</button>
                         <button onClick={() => handleDeleteMapping(m.areaName)} className="text-rose-500 hover:text-rose-700">✕</button>
                       </td>
                     </tr>
                   ))}
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

      {/* NODO POSTGRES */}
      <div className="glass-card p-10 bg-slate-900 !text-white border-none">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black !text-white">🐘 Nodo Postgres</h3>
            <p className="text-[10px] font-black uppercase text-slate-400 mt-1">Sincronización de Base de Datos Central</p>
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
        <h3 className="text-xl font-black mb-8 uppercase text-slate-900">Gestión de Auditores</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4 bg-slate-50 p-8 rounded-[2.5rem]">
             <input className="w-full p-4 bg-white border rounded-xl text-xs font-bold" placeholder="Usuario" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
             <input className="w-full p-4 bg-white border rounded-xl text-xs font-bold" placeholder="Nombre Completo" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
             <input className="w-full p-4 bg-white border rounded-xl text-xs font-bold" type="password" placeholder="Contraseña" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
             <button onClick={handleCreateUser} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase shadow-md">Registrar Auditor</button>
          </div>
          <div className="border rounded-[2rem] overflow-hidden">
             <table className="w-full text-left">
                <thead className="bg-slate-50 text-[9px] font-black text-slate-400"><tr><th className="px-6 py-4">Auditor</th><th className="px-6 py-4 text-right"></th></tr></thead>
                <tbody className="divide-y">
                  {users.map(u => (
                    <tr key={u.id} className="text-[10px] font-black group">
                      <td className="px-6 py-4">{u.username} <span className="block text-[8px] text-slate-400">{u.name}</span></td>
                      <td className="px-6 py-4 text-right"><button onClick={() => handleDeleteUser(u.id)} className="text-rose-500 hover:scale-125 transition-transform px-4">✕</button></td>
                    </tr>
                  ))}
                </tbody>
             </table>
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
