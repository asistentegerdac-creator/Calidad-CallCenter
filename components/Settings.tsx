
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/apiService';
import { User, Complaint, AreaMapping } from '../types';

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
  const [areaMappings, setAreaMappings] = useState<AreaMapping[]>([]);
  const [newMapping, setNewMapping] = useState({ area: '', manager: '' });

  useEffect(() => {
    if (isOnline) {
      dbService.fetchAreasConfig().then(setAreaMappings);
    }
  }, [isOnline]);

  const handleTestConnection = async () => {
    setTesting(true);
    const params = { host: 'localhost', port: '5432', database: 'calidad_dac_db', user: 'postgres', password: '' };
    const r = await dbService.testConnection(params);
    onConnStatusChange(r.success);
    setTesting(false);
    alert(r.success ? "Conexión y Esquema Sincronizados" : "Error de Conexión");
  };

  const handleSaveMapping = async () => {
    if (!newMapping.area || !newMapping.manager) return;
    const mapping = { areaName: newMapping.area, managerName: newMapping.manager };
    await dbService.saveAreaConfig(mapping);
    setAreaMappings([...areaMappings.filter(m => m.areaName !== mapping.areaName), mapping]);
    setNewMapping({ area: '', manager: '' });
  };

  const handleExport = () => {
    const data = { complaints, areas, specialties, areaMappings, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DAC_TOTAL_BACKUP_${new Date().getTime()}.json`;
    link.click();
  };

  const removeItem = (type: 'area' | 'spec', value: string) => {
    if (type === 'area') setAreas(areas.filter(a => a !== value));
    else setSpecialties(specialties.filter(s => s !== value));
  };

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-500">
      <div className="glass-card p-10 bg-white">
        <h3 className="text-xl font-black mb-8 uppercase text-slate-900">Configuración de Jefaturas por Área</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div className="space-y-4">
             <label className="text-[10px] font-black uppercase text-slate-400">Asignar Jefe Responsable</label>
             <div className="flex gap-2">
               <select className="flex-1 p-3 bg-slate-50 border rounded-xl text-xs font-bold" value={newMapping.area} onChange={e => setNewMapping({...newMapping, area: e.target.value})}>
                 <option value="">Seleccionar Área</option>
                 {areas.map(a => <option key={a} value={a}>{a}</option>)}
               </select>
               <input className="flex-1 p-3 bg-slate-50 border rounded-xl text-xs font-bold" placeholder="Nombre del Jefe" value={newMapping.manager} onChange={e => setNewMapping({...newMapping, manager: e.target.value})} />
               <button onClick={handleSaveMapping} className="px-6 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Vincular</button>
             </div>
          </div>
          <div className="bg-slate-50 p-6 rounded-2xl max-h-48 overflow-y-auto">
             <table className="w-full text-left text-[10px] font-bold">
               <thead><tr className="border-b text-slate-400 uppercase"><th>Área</th><th>Jefe Responsable</th></tr></thead>
               <tbody>
                 {areaMappings.map(m => (
                   <tr key={m.areaName} className="border-b border-white"><td>{m.areaName}</td><td>{m.managerName}</td></tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>

        <h3 className="text-xl font-black mb-8 uppercase text-slate-900">Gestión de Catálogos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-slate-400">Áreas Médicas</p>
            <div className="flex flex-wrap gap-2">
              {areas.map(a => <span key={a} className="px-3 py-1.5 bg-slate-100 rounded-lg text-[10px] font-bold">{a} <button onClick={() => removeItem('area', a)} className="ml-1 text-rose-500">✕</button></span>)}
            </div>
            <input className="w-full p-3 bg-slate-50 border rounded-xl text-xs" placeholder="Añadir área..." onKeyDown={e => { if(e.key === 'Enter') setAreas([...areas, (e.target as HTMLInputElement).value]); }} />
          </div>
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-slate-400">Especialidades</p>
            <div className="flex flex-wrap gap-2">
              {specialties.map(s => <span key={s} className="px-3 py-1.5 bg-amber-50 rounded-lg text-[10px] font-bold text-amber-700">{s} <button onClick={() => removeItem('spec', s)} className="ml-1 text-rose-500">✕</button></span>)}
            </div>
            <input className="w-full p-3 bg-slate-50 border rounded-xl text-xs" placeholder="Añadir especialidad..." onKeyDown={e => { if(e.key === 'Enter') setSpecialties([...specialties, (e.target as HTMLInputElement).value]); }} />
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <button onClick={handleExport} className="flex-1 py-5 bg-white border border-slate-200 text-slate-900 rounded-3xl font-black text-[10px] uppercase shadow-sm">Exportar Backup Full JSON</button>
        <button onClick={handleTestConnection} disabled={testing} className="flex-1 py-5 bg-amber-500 text-white rounded-3xl font-black text-[10px] uppercase shadow-xl">Sincronizar Tablas y Postgres</button>
      </div>
    </div>
  );
};
