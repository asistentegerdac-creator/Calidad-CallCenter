
import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/apiService';
import { User, Complaint, AreaMapping, ComplaintStatus } from '../types';

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

  const [dbParams, setDbParams] = useState(() => {
    let host = 'localhost';
    try {
      host = localStorage.getItem('last_db_host') || 'localhost';
    } catch {}
    return {
      host,
      port: '5432', database: 'calidad_dac_db', user: 'postgres', password: ''
    };
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
        } catch (e) { console.error("Error cargando configuración:", e); }
      };
      loadData();
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
          if (confirm(`¿Restaurar ${json.length} registros? Los datos actuales se sobreescribirán localmente.`)) {
            setComplaints(json);
            localStorage.setItem('dac_complaints', JSON.stringify(json));
            alert("Restaurado localmente. Use Sincronizar para subir al Nodo.");
          }
        }
      } catch (err) { alert("Error al procesar el archivo JSON."); }
    };
    reader.readAsText(file);
  };

  const handleRepairDB = async () => {
    if (!isOnline) return alert("Conéctese al Nodo primero");
    setRepairing(true);
    try {
      const res = await dbService.initDatabase();
      alert(res.success ? "✅ Nodo reparado exitosamente." : "❌ Error: " + res.message);
    } catch (e) { alert("Error de comunicación."); } finally { setRepairing(false); }
  };

  const syncLocalToCloud = async () => {
    if (!isOnline) return alert("Conéctese al Nodo primero");
    if (!confirm("¿Subir todos los registros locales al servidor?")) return;
    setSyncing(true);
    let count = 0;
    for (const c of complaints) {
      const ok = await dbService.saveComplaint(c);
      if (ok) count++;
    }
    setSyncing(false);
    alert(`Migración finalizada: ${count} registros sincronizados.`);
  };

  const handleSaveMapping = async () => {
    if (!newMapping.area || !newMapping.manager) return;
    if (isOnline) {
      // 1. Guardar la configuración del organigrama
      await dbService.saveAreaConfig({ areaName: newMapping.area, managerName: newMapping.manager });
      const mappings = await dbService.fetchAreasConfig();
      setAreaMappings(mappings);

      // 2. Lógica de Reasignación Automática
      // Buscamos todas las quejas del área que NO estén resueltas
      const updatedComplaints = complaints.map(c => {
        if (c.area === newMapping.area && c.status !== ComplaintStatus.RESUELTO) {
          const updated = { ...c, managerName: newMapping.manager };
          // Sincronizamos cada ficha actualizada con el Nodo
          dbService.saveComplaint(updated);
          return updated;
        }
        return c;
      });

      // 3. Actualizamos el estado local y el almacenamiento
      setComplaints(updatedComplaints);
      localStorage.setItem('dac_complaints', JSON.stringify(updatedComplaints));

      setNewMapping({ area: '', manager: '' });
      alert(`Jefatura vinculada. Se han reasignado automáticamente las fichas pendientes y en proceso del área ${newMapping.area}.`);
    } else {
      alert("Debe estar conectado al Nodo para actualizar jefaturas.");
    }
  };

  const handleCreateOrUpdateUser = async () => {
    if (!newUser.username || !newUser.password) return alert("Campos requeridos vacíos");
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
        alert("Usuario procesado correctamente.");
      }
    } else { alert("Debe estar online."); }
  };

  const startEditUser = (u: User) => {
    setEditingUserId(u.id);
    setNewUser({ id: u.id, username: u.username, name: u.name, password: u.password || '', role: u.role });
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("¿Eliminar usuario?")) return;
    if (isOnline) {
      await dbService.deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
    }
  };

  return (
    <div className="space-y-12 pb-20">
      {/* HERRAMIENTAS DE DATOS */}
      <div className="glass-card p-10 bg-slate-900 text-white border-none shadow-2xl">
         <h3 className="text-xl font-black mb-8 uppercase flex items-center gap-3">
            <span className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">💾</span>
            Mantenimiento DAC
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 space-y-4">
               <h4 className="text-xs font-black uppercase text-slate-400">Respaldo Externo</h4>
               <div className="flex flex-col gap-2">
                 <button onClick={downloadBackup} className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase">Bajar JSON</button>
                 <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-slate-700 rounded-2xl font-black text-[10px] uppercase">Subir JSON</button>
                 <input type="file" ref={fileInputRef} onChange={handleRestoreBackup} className="hidden" />
               </div>
            </div>
            <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 space-y-4">
               <h4 className="text-xs font-black uppercase text-slate-400">Migración Nube</h4>
               <button disabled={syncing || !isOnline} onClick={syncLocalToCloud} className="w-full py-4 bg-amber-500 rounded-2xl font-black text-[10px] uppercase">
                 {syncing ? 'SINCRONIZANDO...' : 'Sincronizar Local a Nube'}
               </button>
            </div>
            <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 space-y-4">
               <h4 className="text-xs font-black uppercase text-slate-400">Postgres Estructura</h4>
               <button disabled={repairing || !isOnline} onClick={handleRepairDB} className="w-full py-4 bg-rose-500 rounded-2xl font-black text-[10px] uppercase">
                 {repairing ? 'REPARANDO...' : 'Reparar Nodo'}
               </button>
            </div>
         </div>
      </div>

      {/* ORGANIGRAMA */}
      <div className="glass-card p-10 bg-white shadow-xl">
        <h3 className="text-xl font-black mb-8 uppercase text-slate-900 flex items-center gap-3">
          <span className="w-8 h-8 bg-indigo-900 rounded-lg flex items-center justify-center text-white text-sm">👔</span>
          Organigrama Jefaturas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4">
             <div className="space-y-1"><label className="text-[9px] font-black uppercase text-slate-400">Área Médica</label>
                <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={newMapping.area} onChange={e => setNewMapping({...newMapping, area: e.target.value})}>
                   <option value="">-- Seleccione Área --</option>
                   {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
             </div>
             <div className="space-y-1"><label className="text-[9px] font-black uppercase text-slate-400">Jefe Responsable</label>
                <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={newMapping.manager} onChange={e => setNewMapping({...newMapping, manager: e.target.value})} />
             </div>
             <button onClick={handleSaveMapping} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Vincular y Reasignar</button>
          </div>
          <div className="bg-slate-50 rounded-[2rem] p-6 max-h-[250px] overflow-y-auto border">
             <table className="w-full text-left text-[10px] font-black uppercase">
                <thead className="text-slate-400 border-b pb-2"><tr><th className="pb-2">Área</th><th className="pb-2">Jefe</th></tr></thead>
                <tbody className="divide-y divide-white">
                   {areaMappings.map(m => <tr key={m.areaName}><td className="py-2">{m.areaName}</td><td className="py-2 text-amber-600">{m.managerName}</td></tr>)}
                </tbody>
             </table>
          </div>
        </div>
      </div>

      {/* GESTIÓN DE AUDITORES */}
      <div className="glass-card p-10 bg-white shadow-xl border border-slate-50">
        <h3 className="text-xl font-black mb-8 uppercase text-slate-900 flex items-center gap-3">
          <span className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white text-sm">👥</span>
          Gestión de Auditores
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4 bg-slate-50 p-8 rounded-[2.5rem] border">
             <input className="w-full p-4 bg-white border rounded-xl font-bold text-xs" placeholder="Usuario" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
             <input className="w-full p-4 bg-white border rounded-xl font-bold text-xs" placeholder="Nombre" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
             <input className="w-full p-4 bg-white border rounded-xl font-bold text-xs" type="password" placeholder="Clave" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
             <div className="flex gap-2">
                <button onClick={handleCreateOrUpdateUser} className={`flex-1 py-4 text-white rounded-xl font-black text-[10px] uppercase tracking-widest ${editingUserId ? 'bg-amber-600' : 'bg-slate-900'}`}>
                  {editingUserId ? 'Actualizar' : 'Registrar'}
                </button>
                {editingUserId && <button onClick={() => { setEditingUserId(null); setNewUser({id:'',username:'',name:'',password:'',role:'agent'}); }} className="px-6 bg-slate-200 rounded-xl font-black text-[10px] uppercase">Cerrar</button>}
             </div>
          </div>
          <div className="border rounded-[2rem] overflow-hidden bg-white">
             <table className="w-full text-left">
                <thead className="bg-slate-50 text-[9px] font-black text-slate-400"><tr><th className="px-6 py-4">Usuario</th><th className="px-6 py-4 text-right"></th></tr></thead>
                <tbody className="divide-y">
                   {users.map(u => (
                     <tr key={u.id} className="text-[10px] font-black">
                       <td className="px-6 py-4">{u.username} <span className="block text-[8px] text-slate-400">{u.name}</span></td>
                       <td className="px-6 py-4 text-right">
                         <button onClick={() => startEditUser(u)} className="text-indigo-500 mr-4">✎</button>
                         <button onClick={() => handleDeleteUser(u.id)} className="text-rose-500">✕</button>
                       </td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>
      </div>

      {/* CATÁLOGOS */}
      <div className="glass-card p-10 bg-white">
        <h3 className="text-xl font-black mb-8 uppercase text-slate-900 flex items-center gap-3">
          <span className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white text-sm">📚</span>
          Catálogos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4">
             <p className="text-[10px] font-black uppercase text-slate-400">Áreas</p>
             <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-xl max-h-40 overflow-y-auto">
                {areas.map(a => <span key={a} className="px-3 py-1 bg-white text-[10px] font-bold rounded-lg border">{a} <button onClick={() => onRemoveArea(a)} className="text-rose-500">×</button></span>)}
             </div>
             <div className="flex gap-2">
                <input className="flex-1 p-3 bg-slate-50 border rounded-xl text-xs" value={newItem.type==='area'?newItem.value:''} onChange={e=>setNewItem({type:'area', value:e.target.value})} />
                <button onClick={() => { if(newItem.value) onAddArea(newItem.value); setNewItem({...newItem, value:''}); }} className="px-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Ok</button>
             </div>
          </div>
          <div className="space-y-4">
             <p className="text-[10px] font-black uppercase text-slate-400">Especialidades</p>
             <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-xl max-h-40 overflow-y-auto">
                {specialties.map(s => <span key={s} className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-lg border border-amber-100">{s} <button onClick={() => onRemoveSpecialty(s)} className="text-rose-500">×</button></span>)}
             </div>
             <div className="flex gap-2">
                <input className="flex-1 p-3 bg-slate-50 border rounded-xl text-xs" value={newItem.type==='spec'?newItem.value:''} onChange={e=>setNewItem({type:'spec', value:e.target.value})} />
                <button onClick={() => { if(newItem.value) onAddSpecialty(newItem.value); setNewItem({...newItem, value:''}); }} className="px-4 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase">Ok</button>
             </div>
          </div>
        </div>
      </div>

      {/* CONFIG NODO */}
      <div className="glass-card p-10 bg-slate-900 text-white border-none">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-black">🐘 Nodo Postgres</h3>
          <button onClick={() => setIsUnlocked(!isUnlocked)} className="px-8 py-3 bg-white/10 rounded-2xl font-black text-[10px] uppercase">
            {isUnlocked ? 'Cerrar' : 'Configurar'}
          </button>
        </div>
        {isUnlocked && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
            <input className="bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white" placeholder="Host" value={dbParams.host} onChange={e => setDbParams({...dbParams, host: e.target.value})} />
            <input className="bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white" placeholder="DB Name" value={dbParams.database} onChange={e => setDbParams({...dbParams, database: e.target.value})} />
            <input className="bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white" placeholder="Usuario" value={dbParams.user} onChange={e => setDbParams({...dbParams, user: e.target.value})} />
            <input className="bg-slate-800 p-4 rounded-xl text-sm font-bold border-none text-white" type="password" placeholder="Pass" value={dbParams.password} onChange={e => setDbParams({...dbParams, password: e.target.value})} />
            <button onClick={handleTestConnection} className="bg-amber-500 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest">Sincronizar Nodo</button>
            {connMessage && <div className="col-span-full mt-4 text-[10px] font-black text-center">{connMessage}</div>}
          </div>
        )}
      </div>

      {/* TEMAS */}
      <div className="glass-card p-10 bg-white">
        <h3 className="text-xl font-black mb-8 uppercase text-slate-900">Temas Visuales</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {themes.map(t => (
            <button key={t.id} onClick={() => setTheme(t.id)} className={`p-5 rounded-[2rem] border-4 ${currentTheme === t.id ? 'border-amber-500 bg-amber-50' : 'border-slate-50 opacity-60'}`}>
              <div className="w-full h-10 rounded-xl mb-3" style={{ background: t.color }}></div>
              <p className="text-[9px] font-black uppercase">{t.name}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
