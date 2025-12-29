
import React, { useState, useMemo, useEffect } from 'react';
import { Complaint, ComplaintStatus, User, NoCallPatient, Priority } from '../types';
import { dbService } from '../services/apiService';

interface Props { 
  complaints: Complaint[]; 
  currentUser: User | null;
  onUpdateFull: (c: Complaint) => void;
  onDelete: (id: string) => void;
  isOnline: boolean;
  areas: string[];
  specialties: string[];
  onRefresh?: () => void;
}

export const IncidencesReported: React.FC<Props> = ({ 
  complaints, currentUser, onUpdateFull, onDelete, areas, specialties, onRefresh 
}) => {
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [editing, setEditing] = useState<Complaint | null>(null);
  const [noCallList, setNoCallList] = useState<NoCallPatient[]>([]);
  const [filterManager, setFilterManager] = useState('Todos');

  useEffect(() => {
    dbService.fetchNoCallList().then(list => { if (list) setNoCallList(list); });
  }, []);

  const isNoCall = (phone: string, name: string) => {
    return noCallList.some(p => p.patientPhone === phone || p.patientName.toLowerCase() === name.toLowerCase());
  };

  const filtered = useMemo(() => {
    return complaints.filter(c => filterManager === 'Todos' || c.managerName === filterManager);
  }, [complaints, filterManager]);

  const managers = useMemo(() => Array.from(new Set(complaints.map(c => c.managerName).filter(Boolean))), [complaints]);

  const handleFullEditSave = () => {
    if (editing) {
      onUpdateFull(editing);
      setEditing(null);
      setSelected(null);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="glass-card bg-white p-8 shadow-sm border border-slate-100 flex justify-between items-center no-print">
         <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Gestión Directa DAC</h3>
         <div className="flex gap-4">
           <select className="bg-slate-50 border rounded-xl p-3 text-xs font-bold" value={filterManager} onChange={e => setFilterManager(e.target.value)}>
             <option value="Todos">Todas las Jefaturas</option>
             {managers.map(m => <option key={String(m)} value={String(m)}>{String(m)}</option>)}
           </select>
           {onRefresh && <button onClick={onRefresh} className="bg-amber-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg">Sincronizar Nodo</button>}
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(c => {
          const noLlamar = isNoCall(c.patientPhone, c.patientName);
          return (
            <div key={c.id} className={`glass-card bg-white p-6 border-t-4 border-t-amber-500 hover:shadow-xl transition-all relative flex flex-col min-h-[380px] cursor-pointer ${noLlamar ? 'ring-2 ring-rose-500 ring-offset-2' : ''}`} onClick={() => setSelected(c)}>
              <div className="mb-4">
                <div className="flex justify-between items-start">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{c.id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black text-white ${c.priority === 'Crítica' ? 'bg-rose-500' : 'bg-slate-400'}`}>{c.priority}</span>
                </div>
                <h4 className="text-lg font-black text-slate-900 leading-tight mt-1 line-clamp-1">{c.patientName}</h4>
                <p className="text-[9px] font-bold text-slate-400">{c.date}</p>
                {noLlamar && <span className="text-rose-600 text-[8px] font-black uppercase mt-1 block animate-pulse">⚠️ ALERTA: NO LLAMAR</span>}
              </div>
              <div className="space-y-2 mb-4">
                 <div className="flex flex-wrap gap-1.5">
                    <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 uppercase">{c.area}</span>
                    {c.specialty && <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 uppercase">{c.specialty}</span>}
                 </div>
                 <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Médico Responsable</p>
                    <p className="text-[11px] font-black text-slate-900 uppercase truncate">{c.doctorName || 'Personal no especificado'}</p>
                 </div>
              </div>
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex-1 mb-4 overflow-hidden relative">
                 <p className="text-[11px] text-slate-600 font-semibold leading-relaxed line-clamp-4">"{c.description}"</p>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                 <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${c.status === 'Resuelto' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span>
                 <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setEditing(c); }} className="p-2 bg-slate-900 text-white rounded-lg text-[10px] uppercase font-black">Editar</button>
                 </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DE EDICIÓN COMPLETA (RESTAURADO) */}
      {(editing || selected) && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[500] animate-in fade-in">
           <div className="bg-white w-full max-w-2xl p-10 rounded-[2.5rem] shadow-2xl relative overflow-y-auto max-h-[95vh]">
              <button onClick={() => { setEditing(null); setSelected(null); }} className="absolute top-6 right-6 text-2xl font-light text-slate-300 hover:text-rose-500 transition-colors">✕</button>
              
              <div className="mb-8">
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">
                   {editing ? 'Modificar Registro Original' : 'Resolución Administrativa'}
                </h3>
                <p className="text-amber-600 font-black text-[9px] uppercase tracking-[0.3em] mt-1">Expediente: {(editing || selected)?.id}</p>
              </div>

              <div className="space-y-6">
                {editing ? (
                  // FORMULARIO DE EDICIÓN COMPLETA
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Nombre Paciente</label>
                      <input className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold" value={editing.patientName} onChange={e => setEditing({...editing, patientName: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Teléfono</label>
                      <input className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold" value={editing.patientPhone} onChange={e => setEditing({...editing, patientPhone: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Médico / Personal</label>
                      <input className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold" value={editing.doctorName} onChange={e => setEditing({...editing, doctorName: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Prioridad</label>
                      <select className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold" value={editing.priority} onChange={e => setEditing({...editing, priority: e.target.value as Priority})}>
                        {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Área</label>
                      <select className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold" value={editing.area} onChange={e => setEditing({...editing, area: e.target.value})}>
                        {areas.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Especialidad</label>
                      <select className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold" value={editing.specialty} onChange={e => setEditing({...editing, specialty: e.target.value})}>
                        {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Relato / Queja</label>
                      <textarea className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold h-24" value={editing.description} onChange={e => setEditing({...editing, description: e.target.value})} />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Respuesta / Gestión de Calidad</label>
                      <textarea className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold h-24" value={editing.managementResponse} onChange={e => setEditing({...editing, managementResponse: e.target.value})} placeholder="Acciones tomadas..." />
                    </div>
                    <div className="md:col-span-2 flex gap-4 mt-4">
                      <button onClick={handleFullEditSave} className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Guardar Cambios</button>
                      <button onClick={() => setEditing(null)} className="py-4 px-8 bg-slate-200 text-slate-600 rounded-2xl font-black uppercase text-[10px]">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  // VISTA DE RESOLUCIÓN RÁPIDA (MODAL ORIGINAL)
                  <>
                    <div className="w-full bg-amber-50/50 border border-amber-100 rounded-2xl p-5 text-[11px] font-semibold text-slate-700 italic max-h-40 overflow-y-auto">
                       "{selected?.description}"
                    </div>
                    <div className="flex gap-2">
                      {[ComplaintStatus.PENDIENTE, ComplaintStatus.PROCESO, ComplaintStatus.RESUELTO].map(s => (
                        <button key={s} onClick={() => selected && onUpdateFull({...selected, status: s})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${selected?.status === s ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>{s}</button>
                      ))}
                    </div>
                    <textarea className="w-full bg-slate-50 border rounded-2xl p-5 text-xs font-bold min-h-[120px] outline-none" value={selected?.managementResponse || ''} onChange={e => selected && onUpdateFull({...selected, managementResponse: e.target.value, resolvedBy: currentUser?.name || 'Administrador'})} placeholder="Escriba las acciones tomadas..." />
                    <button onClick={() => setSelected(null)} className="w-full py-5 bg-amber-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Confirmar Resolución</button>
                  </>
                )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
