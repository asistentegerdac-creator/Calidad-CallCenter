
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { dbService } from '../services/apiService';
import { User, Complaint, AreaMapping, ComplaintStatus, DimensionCatalogEntry } from '../types';
import { getCurrentTimeInTimezone } from '../src/utils/timeUtils';

interface Props {
  areas: string[]; onAddArea: (a: string) => void; onRemoveArea: (a: string) => void;
  specialties: string[]; onAddSpecialty: (s: string) => void; onRemoveSpecialty: (s: string) => void;
  users: User[]; setUsers: (u: User[]) => void;
  currentUser: User | null;
  isOnline: boolean; onConnStatusChange: (s: boolean) => void;
  currentTheme: string; setTheme: (t: string) => void;
  timezone: string; setTimezone: (tz: string) => void;
  complaints: Complaint[]; setComplaints: (c: Complaint[]) => void;
  dimensions: DimensionCatalogEntry[];
  onAddDimension: (dimension: string, subDimension: string) => void;
  onRemoveDimension: (id?: number, dimension?: string, subDimension?: string) => void;
}

export const Settings: React.FC<Props> = ({ 
  users, setUsers, currentUser, isOnline, onConnStatusChange,
  currentTheme, setTheme, timezone, setTimezone, areas, onAddArea, onRemoveArea,
  specialties, onAddSpecialty, onRemoveSpecialty,
  complaints, setComplaints,
  dimensions, onAddDimension, onRemoveDimension
}) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [connMessage, setConnMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [areaMappings, setAreaMappings] = useState<AreaMapping[]>([]);
  const [newMapping, setNewMapping] = useState({ area: '', manager: '' });
  const [newUser, setNewUser] = useState({ id: '', username: '', name: '', password: '', role: 'agent' as 'admin' | 'agent' | 'auditor' });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ type: 'area', value: '' });

  const [newDim, setNewDim] = useState('');
  const [newSubDim, setNewSubDim] = useState('');
  const [selectedParentDim, setSelectedParentDim] = useState('');
  const [dimSearchFilter, setDimSearchFilter] = useState('');

  // ESTADOS PARA MODIFICACIÓN DE ESTADO MASIVO
  const [bulkManager, setBulkManager] = useState('Todas');
  const [bulkDateFrom, setBulkDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    return d.toISOString().split('T')[0];
  });
  const [bulkDateTo, setBulkDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [bulkTypeFilter, setBulkTypeFilter] = useState('Todos');
  const [bulkResponse, setBulkResponse] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isResolvingBulk, setIsResolvingBulk] = useState(false);

  // Guardado seguro en localStorage para evitar errores de QuotaExceeded
  const safeSaveLocalComplaints = (data: Complaint[]) => {
    try {
      localStorage.setItem('dac_complaints', JSON.stringify(data));
    } catch (e) {
      console.warn("Storage quota limit reached for localStorage:", e);
      try {
        const sanitized = data.map(c => ({
          ...c,
          evidenceImages: (c.evidenceImages || []).map(img => img.length > 500 ? '[imagen_local]' : img)
        }));
        localStorage.setItem('dac_complaints', JSON.stringify(sanitized));
      } catch {}
    }
  };

  // Solo mostrar nombres de Jefaturas con áreas a cargo en el organigrama, excluyendo a auditores
  const managerOptions = useMemo(() => {
    const auditorNames = new Set(
      users.filter(u => u.role === 'auditor').map(u => u.name.trim().toLowerCase())
    );

    const set = new Set<string>();
    areaMappings.forEach(m => {
      const mgr = (m.managerName || '').trim();
      const area = (m.areaName || '').trim();
      if (mgr && area && !auditorNames.has(mgr.toLowerCase())) {
        set.add(mgr);
      }
    });

    // Fallback únicamente si el organigrama no tiene jefaturas asignadas aún
    if (set.size === 0) {
      users.forEach(u => {
        if (u.role !== 'auditor' && u.name) {
          set.add(u.name.trim());
        }
      });
    }

    return Array.from(set).sort();
  }, [users, areaMappings]);

  // Mostrar únicamente registros pendientes, en proceso u observados (los cerrados / resueltos / leídos NO se muestran)
  const bulkComplaintsList = useMemo(() => {
    return complaints.filter(c => {
      // 1. Excluir explícitamente registros cerrados / resueltos / leídos
      if (
        c.status === ComplaintStatus.RESUELTO ||
        c.status === ComplaintStatus.LEIDO ||
        c.status === ComplaintStatus.CERRADO
      ) {
        return false;
      }

      // 2. Filtro por Jefatura
      if (bulkManager && bulkManager !== 'Todas') {
        if (c.managerName !== bulkManager) return false;
      }

      // 3. Filtro por Rango de Fechas
      const cDate = (c.date || '').trim().substring(0, 10);
      if (bulkDateFrom && cDate < bulkDateFrom) return false;
      if (bulkDateTo && cDate > bulkDateTo) return false;

      // 4. Filtro por Tipo de Registro (Incidencia, Felicitación, Sugerencia)
      const type = (c.complaintType || '').toLowerCase();
      const dim = (c.dimension || '').toLowerCase();
      const isFelicitacion = type.includes('felicitaci') || dim.includes('felicitaci');
      const isSugerencia = type.includes('sugerencia') || dim.includes('sugerencia');
      const isIncidencia = !isFelicitacion && !isSugerencia;

      if (bulkTypeFilter === 'Incidencia' && !isIncidencia) return false;
      if (bulkTypeFilter === 'Felicitación' && !isFelicitacion) return false;
      if (bulkTypeFilter === 'Sugerencia' && !isSugerencia) return false;

      // Un registro no resuelto ni leído se considera pendiente / en proceso / observado
      return true;
    });
  }, [complaints, bulkManager, bulkDateFrom, bulkDateTo, bulkTypeFilter]);

  const handleResolveBulk = async () => {
    if (bulkComplaintsList.length === 0) {
      alert("No hay registros pendientes para los filtros seleccionados.");
      return;
    }

    const itemsToResolve = selectedIds.size > 0 
      ? bulkComplaintsList.filter(c => selectedIds.has(c.id))
      : bulkComplaintsList;

    if (itemsToResolve.length === 0) {
      alert("Seleccione al menos un registro para resolver.");
      return;
    }

    const managerLabel = bulkManager && bulkManager !== 'Todas' ? `de la jefatura "${bulkManager}"` : 'de todas las jefaturas';
    if (!confirm(`¿Está seguro de marcar como RESUELTOS / LEÍDOS los ${itemsToResolve.length} registros pendientes ${managerLabel}?`)) {
      return;
    }

    setIsResolvingBulk(true);
    try {
      const timestamp = getCurrentTimeInTimezone(timezone);
      const resolvedByName = currentUser?.name || 'Administrador';
      const itemsToResolveIds = new Set(itemsToResolve.map(x => x.id));
      const savePromises: Promise<any>[] = [];

      const updatedComplaints = complaints.map(c => {
        if (!itemsToResolveIds.has(c.id)) return c;

        const type = (c.complaintType || '').toLowerCase();
        const dim = (c.dimension || '').toLowerCase();
        const isFelicitacion = type.includes('felicitaci') || dim.includes('felicitaci');

        const history = c.responseHistory || [];
        const newHistory = [
          ...history,
          {
            text: bulkResponse.trim() || 'Resolución masiva de estado desde Ajustes.',
            user: resolvedByName,
            timestamp,
            type: 'manager' as const
          }
        ];

        const updatedItem: Complaint = {
          ...c,
          status: isFelicitacion ? ComplaintStatus.LEIDO : ComplaintStatus.RESUELTO,
          resolvedAt: timestamp,
          resolvedBy: resolvedByName,
          managementResponse: c.managementResponse || bulkResponse.trim() || 'Resolución masiva de estado.',
          responseHistory: newHistory,
          isObserved: false
        };

        if (isOnline) {
          savePromises.push(
            dbService.saveComplaint(updatedItem).catch(err => {
              console.warn("Error guardando elemento en nodo:", c.id, err);
            })
          );
        }

        return updatedItem;
      });

      if (isOnline && savePromises.length > 0) {
        await Promise.all(savePromises);
      }

      setComplaints(updatedComplaints);
      safeSaveLocalComplaints(updatedComplaints);
      setSelectedIds(new Set());
      setBulkResponse('');
      alert(`✅ Se han resuelto masivamente ${itemsToResolve.length} registros con éxito.`);
    } catch (err) {
      console.error("Error en resolución masiva:", err);
      alert("Ocurrió un inconveniente al procesar la resolución masiva.");
    } finally {
      setIsResolvingBulk(false);
    }
  };

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

  const timezones = [
    { value: 'America/Lima', label: 'Perú (PET)' },
    { value: 'America/Mexico_City', label: 'México (CST)' },
    { value: 'America/Bogota', label: 'Colombia (COT)' },
    { value: 'America/Santiago', label: 'Chile (CLT)' },
    { value: 'America/Argentina/Buenos_Aires', label: 'Argentina (ART)' },
    { value: 'America/New_York', label: 'EE.UU. (EST)' },
    { value: 'Europe/Madrid', label: 'España (CET)' },
    { value: 'UTC', label: 'Universal (UTC)' },
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

  const uniqueDimensions = Array.from(new Set(dimensions.map(d => d.dimension).filter(Boolean)));

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
                <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={newMapping.manager} onChange={e => setNewMapping({...newMapping, manager: e.target.value})}>
                   <option value="">-- Seleccione Jefe --</option>
                   {users.map(u => <option key={u.id} value={u.name}>{u.name} ({u.username})</option>)}
                </select>
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

      {/* SECCIÓN MODIFICACIÓN DE ESTADO MASIVO */}
      <div className="glass-card p-8 md:p-10 bg-white shadow-xl border border-amber-100 rounded-[2.5rem]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b pb-6">
          <div>
            <h3 className="text-xl font-black uppercase text-slate-900 flex items-center gap-3">
              <span className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center text-slate-950 font-black text-base shadow-md">⚡</span>
              Modificación de Estado Masivo
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              Filtre casos pendientes o en proceso por Jefatura y Rango de Fechas para resolver masivamente
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 px-5 py-3 rounded-2xl text-center">
            <span className="text-[9px] font-black text-amber-700 uppercase block tracking-wider">Pendientes Detectados</span>
            <span className="text-xl font-black text-amber-900 font-mono">{bulkComplaintsList.length}</span>
          </div>
        </div>

        {/* FILTROS DE BÚSQUEDA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100 mb-8">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-wider">Jefatura / Responsable</label>
            <select 
              className="w-full bg-white border-2 border-slate-200 rounded-xl p-3.5 text-xs font-bold shadow-sm outline-none focus:border-amber-500 transition-all"
              value={bulkManager}
              onChange={e => setBulkManager(e.target.value)}
            >
              <option value="Todas">-- Todas las Jefaturas --</option>
              {managerOptions.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-wider">Fecha Desde</label>
            <input 
              type="date"
              className="w-full bg-white border-2 border-slate-200 rounded-xl p-3.5 text-xs font-bold shadow-sm outline-none focus:border-amber-500 transition-all"
              value={bulkDateFrom}
              onChange={e => setBulkDateFrom(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-wider">Fecha Hasta</label>
            <input 
              type="date"
              className="w-full bg-white border-2 border-slate-200 rounded-xl p-3.5 text-xs font-bold shadow-sm outline-none focus:border-amber-500 transition-all"
              value={bulkDateTo}
              onChange={e => setBulkDateTo(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-wider">Tipo de Registro</label>
            <select 
              className="w-full bg-white border-2 border-slate-200 rounded-xl p-3.5 text-xs font-bold shadow-sm outline-none focus:border-amber-500 transition-all"
              value={bulkTypeFilter}
              onChange={e => setBulkTypeFilter(e.target.value)}
            >
              <option value="Todos">Todos (Incidencias, Felicitaciones y Sugerencias)</option>
              <option value="Incidencia">Solo Incidencias</option>
              <option value="Felicitación">Solo Felicitaciones</option>
              <option value="Sugerencia">Solo Sugerencias</option>
            </select>
          </div>
        </div>

        {/* ACCIÓN Y RESPUESTA DE RESOLUCIÓN MASIVA */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl mb-8 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 shadow-xl">
          <div className="flex-1 space-y-2">
            <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">
              Descargo / Comentario de Resolución Masiva
            </label>
            <input 
              type="text"
              className="w-full bg-white/10 border border-white/20 rounded-xl p-3.5 text-xs font-bold text-white placeholder-slate-400 outline-none focus:border-amber-400 transition-all"
              placeholder="Ej: Resuelto en lote por actualización de jefatura..."
              value={bulkResponse}
              onChange={e => setBulkResponse(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <button 
              disabled={isResolvingBulk || bulkComplaintsList.length === 0}
              onClick={handleResolveBulk}
              className={`w-full lg:w-auto px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-2 ${
                bulkComplaintsList.length === 0 || isResolvingBulk
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950 hover:shadow-amber-500/30 hover:-translate-y-0.5'
              }`}
            >
              <span className="text-base">✓</span>
              {isResolvingBulk ? 'PROCESANDO...' : `RESOLVER ${selectedIds.size > 0 ? selectedIds.size : bulkComplaintsList.length} PENDIENTES`}
            </button>
          </div>
        </div>

        {/* TABLA DE REGISTROS PENDIENTES Y EN PROCESO */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-inner">
          <div className="p-4 bg-slate-100/80 border-b flex justify-between items-center text-xs font-bold">
            <div className="flex items-center gap-3">
              <input 
                type="checkbox"
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                checked={bulkComplaintsList.length > 0 && selectedIds.size === bulkComplaintsList.length}
                onChange={e => {
                  if (e.target.checked) {
                    setSelectedIds(new Set(bulkComplaintsList.map(c => c.id)));
                  } else {
                    setSelectedIds(new Set());
                  }
                }}
              />
              <span className="text-[10px] font-black uppercase text-slate-600">
                {selectedIds.size > 0 ? `${selectedIds.size} de ${bulkComplaintsList.length} seleccionados` : 'Seleccionar Todos'}
              </span>
            </div>
            <span className="text-[10px] font-black uppercase text-slate-400">
              Mostrando {bulkComplaintsList.length} registros pendientes/en proceso
            </span>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-wider sticky top-0 border-b">
                <tr>
                  <th className="px-4 py-3 w-10 text-center">#</th>
                  <th className="px-4 py-3">FECHA / ID</th>
                  <th className="px-4 py-3">TIPO</th>
                  <th className="px-4 py-3">JEFATURA / ÁREA</th>
                  <th className="px-4 py-3">PACIENTE</th>
                  <th className="px-4 py-3">DESCRIPCIÓN</th>
                  <th className="px-4 py-3 text-center">ESTADO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold">
                {bulkComplaintsList.map(c => {
                  const isChecked = selectedIds.has(c.id);
                  const type = (c.complaintType || 'Incidencia');
                  const isFelicitacion = type.toLowerCase().includes('felicitaci');
                  const isSugerencia = type.toLowerCase().includes('sugerencia');

                  return (
                    <tr key={c.id} className={`hover:bg-amber-50/40 transition-colors ${isChecked ? 'bg-amber-50/60' : ''}`}>
                      <td className="px-4 py-3.5 text-center">
                        <input 
                          type="checkbox"
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                          checked={isChecked}
                          onChange={e => {
                            const newSet = new Set(selectedIds);
                            if (e.target.checked) newSet.add(c.id);
                            else newSet.delete(c.id);
                            setSelectedIds(newSet);
                          }}
                        />
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px]">
                        <span className="block font-black text-slate-800">{c.date}</span>
                        <span className="text-[9px] text-slate-400 font-mono">#{c.id.substring(0, 8)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase ${
                          isFelicitacion ? 'bg-amber-100 text-amber-800' :
                          isSugerencia ? 'bg-blue-100 text-blue-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 uppercase text-slate-700">
                        <span className="font-black block">{c.managerName || 'SIN JEFE'}</span>
                        <span className="text-[9px] text-slate-400 block">{c.area}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-800 font-black uppercase max-w-[140px] truncate">
                        {c.patientName}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-[250px] truncate text-[11px]" title={c.description}>
                        {c.description}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-black text-[9px] rounded-full uppercase">
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {bulkComplaintsList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 font-black uppercase text-xs">
                      No hay incidencias, felicitaciones ni sugerencias pendientes para la jefatura y rango seleccionados.
                    </td>
                  </tr>
                )}
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
             <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400">Rol de Usuario</label>
                <select className="w-full p-4 bg-white border rounded-xl font-bold text-xs" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                   <option value="agent">AGENTE (VISTA LIMITADA)</option>
                   <option value="admin">ADMINISTRADOR (VISTA TOTAL)</option>
                   <option value="auditor">AUDITOR (CONTROL DE CALIDAD)</option>
                </select>
             </div>
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

      {/* GESTIÓN DE DIMENSIONES Y SUBDIMENSIONES */}
      <div className="glass-card p-10 bg-white shadow-xl border border-slate-50">
        <h3 className="text-xl font-black mb-8 uppercase text-slate-900 flex items-center gap-3">
          <span className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white text-sm">📊</span>
          Dimensiones y Subdimensiones
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            {/* CARGAR DIMENSIÓN */}
            <div className="space-y-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
               <h4 className="text-xs font-black uppercase text-teal-600 flex items-center gap-2">
                 <span className="w-2 h-2 bg-teal-600 rounded-full"></span>
                 Cargar Dimensión Principal
               </h4>
               <p className="text-[10px] text-slate-400 font-bold uppercase leading-tight">
                 Registra una categoría de dimensionamiento independiente.
               </p>
               
               <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 block">Nombre de la Dimensión</label>
                  <input 
                    className="w-full p-4 bg-white border rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-teal-500" 
                    placeholder="Ej: Fiabilidad o Confiabilidad, Buen trato, etc." 
                    value={newDim} 
                    onChange={e => setNewDim(e.target.value)} 
                  />
               </div>

               <button 
                 onClick={() => {
                   if (!newDim.trim()) {
                     alert("Debe ingresar el nombre de la Dimensión.");
                     return;
                   }
                   onAddDimension(newDim, "General");
                   setNewDim('');
                   alert("Dimensión principal registrada con éxito.");
                 }} 
                 className="w-full py-4 bg-teal-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-teal-700 transition-all shadow-md"
               >
                 Agregar Dimensión
               </button>
            </div>

            {/* CARGAR SUBDIMENSIÓN */}
            <div className="space-y-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
               <h4 className="text-xs font-black uppercase text-indigo-600 flex items-center gap-2">
                 <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                 Cargar Subdimensión
               </h4>
               <p className="text-[10px] text-slate-400 font-bold uppercase leading-tight">
                 Asocia una sub-categoría específica a una dimensión ya existente.
               </p>

               <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 block">Dimensión Principal</label>
                  <select 
                    className="w-full p-4 bg-white border rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    value={selectedParentDim}
                    onChange={e => setSelectedParentDim(e.target.value)}
                  >
                    <option value="">-- Seleccionar Dimensión Principal --</option>
                    {uniqueDimensions.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
               </div>

               <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 block">Nombre de la Subdimensión</label>
                  <input 
                    className="w-full p-4 bg-white border rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500" 
                    placeholder="Ej: Demora en consulta, Desidia, etc." 
                    value={newSubDim} 
                    onChange={e => setNewSubDim(e.target.value)} 
                  />
               </div>

               <button 
                 onClick={() => {
                   if (!selectedParentDim) {
                     alert("Debe seleccionar una Dimensión Principal.");
                     return;
                   }
                   if (!newSubDim.trim()) {
                     alert("Debe ingresar el nombre de la Subdimensión.");
                     return;
                   }
                   onAddDimension(selectedParentDim, newSubDim);
                   setNewSubDim('');
                   alert("Subdimensión registrada con éxito.");
                 }} 
                 className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md"
               >
                 Agregar Subdimensión
               </button>
            </div>
          </div>

          <div className="space-y-4 flex flex-col">
             <div className="flex justify-between items-center">
                <h4 className="text-xs font-black uppercase text-slate-500">Elementos Registrados ({dimensions.length})</h4>
                <input 
                  className="p-2 bg-slate-50 border rounded-xl text-xs w-48 font-semibold outline-none" 
                  placeholder="🔍 Filtrar dimensión..." 
                  value={dimSearchFilter} 
                  onChange={e => setDimSearchFilter(e.target.value)} 
                />
             </div>

             <div className="border rounded-[2rem] overflow-hidden bg-white max-h-[300px] overflow-y-auto shadow-inner">
                <table className="w-full text-left">
                   <thead className="bg-slate-50 text-[9px] font-black text-slate-400 sticky top-0">
                     <tr>
                       <th className="px-6 py-4">Dimensión</th>
                       <th className="px-6 py-4">Subdimensión</th>
                       <th className="px-6 py-4 text-right">Acción</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y text-[10px] font-black">
                      {dimensions
                        .filter(d => !dimSearchFilter || d.dimension.toLowerCase().includes(dimSearchFilter.toLowerCase()))
                        .map((d, index) => (
                           <tr key={d.id || index} className="hover:bg-slate-50">
                              <td className="px-6 py-3 text-slate-700">{d.dimension}</td>
                              <td className="px-6 py-3 text-teal-600">{d.subDimension}</td>
                              <td className="px-6 py-3 text-right">
                                 <button 
                                   onClick={() => onRemoveDimension(d.id, d.dimension, d.subDimension)} 
                                   className="text-rose-500 hover:scale-110 transition-all font-bold px-2 py-1"
                                 >
                                   ✕
                                 </button>
                              </td>
                           </tr>
                        ))
                      }
                      {dimensions.length === 0 && (
                        <tr>
                          <td colSpan={3} className="text-center py-8 text-slate-400 font-bold uppercase text-[9px]">Sin dimensiones registradas</td>
                        </tr>
                      )}
                   </tbody>
                </table>
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

      {/* ZONA HORARIA */}
      <div className="glass-card p-10 bg-white shadow-xl">
        <h3 className="text-xl font-black mb-8 uppercase text-slate-900 flex items-center gap-3">
          <span className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white text-sm">🕒</span>
          Configuración de Tiempo
        </h3>
        <div className="max-w-md space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400">Zona Horaria del Sistema</label>
            <select 
              className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" 
              value={timezone} 
              onChange={e => setTimezone(e.target.value)}
            >
              {timezones.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            <p className="text-[8px] text-slate-400 mt-2 italic">Esta zona horaria se utilizará para registrar la hora exacta de las incidencias y resoluciones.</p>
          </div>
        </div>
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
