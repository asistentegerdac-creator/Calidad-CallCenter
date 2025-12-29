
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

  const [tempStatus, setTempStatus] = useState<ComplaintStatus>(ComplaintStatus.PENDIENTE);
  const [tempResponse, setTempResponse] = useState('');

  useEffect(() => {
    dbService.fetchNoCallList().then(list => { if (list) setNoCallList(list); });
  }, []);

  useEffect(() => {
    if (selected) {
      setTempStatus(selected.status);
      setTempResponse(selected.managementResponse || '');
    }
  }, [selected]);

  const isNoCall = (phone: string, name: string) => {
    return noCallList.some(p => p.patientPhone === phone || p.patientName.toLowerCase() === name.toLowerCase());
  };

  const filtered = useMemo(() => {
    const statusOrder = {
      [ComplaintStatus.PENDIENTE]: 0,
      [ComplaintStatus.PROCESO]: 1,
      [ComplaintStatus.RESUELTO]: 2,
    };

    return [...complaints]
      .filter(c => filterManager === 'Todos' || c.managerName === filterManager)
      .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  }, [complaints, filterManager]);

  const managers = useMemo(() => Array.from(new Set(complaints.map(c => c.managerName).filter(Boolean))), [complaints]);

  const getStatusBadgeClass = (status: ComplaintStatus) => {
    switch(status) {
      case ComplaintStatus.PENDIENTE: return 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]';
      case ComplaintStatus.PROCESO: return 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]';
      case ComplaintStatus.RESUELTO: return 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]';
      default: return 'bg-slate-400 text-white';
    }
  };

  const handleFullEditSave = () => {
    if (editing) {
      onUpdateFull(editing);
      setEditing(null);
      setSelected(null);
    }
  };

  const handleQuickResolutionSave = () => {
    if (selected) {
      onUpdateFull({
        ...selected,
        status: tempStatus,
        managementResponse: tempResponse,
        resolvedBy: currentUser?.name || 'Administrador'
      });
      setSelected(null);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="glass-card bg-white p-8 shadow-sm border border-slate-100 flex justify-between items-center no-print">
         <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
           <span className="w-2 h-6 bg-orange-500 rounded-full"></span>
           Centro de Gestión Activa DAC
         </h3>
         <div className="flex gap-4">
           <select className="bg-slate-50 border rounded-xl p-3 text-xs font-bold" value={filterManager} onChange={e => setFilterManager(e.target.value)}>
             <option value="Todos">Todas las Jefaturas</option>
             {managers.map(m => <option key={String(m)} value={String(m)}>{String(m)}</option>)}
           </select>
           {onRefresh && <button onClick={onRefresh} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-black">Sincronizar Nodo</button>}
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(c => {
          const noLlamar = isNoCall(c.patientPhone, c.patientName);
          return (
            <div key={c.id} className={`glass-card bg-white p-6 border-t-[6px] hover:shadow-2xl transition-all relative flex flex-col min-h-[380px] cursor-pointer group ${noLlamar ? 'ring-2 ring-rose-500 ring-offset-4' : ''}`} 
                 style={{ borderTopColor: c.status === ComplaintStatus.PENDIENTE ? '#f97316' : c.status === ComplaintStatus.PROCESO ? '#2563eb' : '#10b981' }}
                 onClick={() => setSelected(c)}>
              <div className="mb-4">
                <div className="flex justify-between items-start">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{c.id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black text-white ${c.priority === 'Crítica' ? 'bg-rose-600 shadow-lg shadow-rose-200' : 'bg-slate-800'}`}>{c.priority}</span>
                </div>
                <h4 className="text-xl font-black text-slate-900 leading-tight mt-2 group-hover:text-orange-600 transition-colors uppercase">{c.patientName}</h4>
                <p className="text-[10px] font-bold text-slate-400 mt-1">{c.date}</p>
                {noLlamar && <div className="mt-2 bg-rose-50 p-2 rounded-lg border border-rose-100 animate-pulse"><span className="text-rose-600 text-[9px] font-black uppercase">⚠️ RESTRICCIÓN: NO LLAMAR</span></div>}
              </div>
              <div className="space-y-3 mb-4">
                 <div className="flex flex-wrap gap-2">
                    <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 uppercase">{c.area}</span>
                    {c.specialty && <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 uppercase">{c.specialty}</span>}
                 </div>
                 <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 group-hover:bg-slate-100 transition-colors">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">Personal Involucrado</p>
                    <p className="text-[12px] font-black text-slate-900 uppercase truncate">Dr. {c.doctorName || 'No especificado'}</p>
                 </div>
              </div>
              <div className="bg-slate-50/50 p-5 rounded-[1.5rem] border border-slate-100 flex-1 mb-5 overflow-hidden relative shadow-inner">
                 <p className="text-[12px] text-slate-600 font-medium leading-relaxed line-clamp-4">"{c.description}"</p>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                 <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider ${getStatusBadgeClass(c.status)}`}>{c.status}</span>
                 <button onClick={(e) => { e.stopPropagation(); setEditing(c); }} className="p-2.5 bg-slate-900 text-white rounded-xl text-[9px] uppercase font-black hover:bg-orange-500 transition-all">Editar Ficha</button>
              </div>
            </div>
          );
        })}
      </div>

      {(editing || selected) && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-lg flex items-center justify-center p-4 z-[500] animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl p-12 rounded-[3rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] relative overflow-y-auto max-h-[95vh] border border-white/20">
              <button onClick={() => { setEditing(null); setSelected(null); }} className="absolute top-8 right-8 text-3xl font-light text-slate-300 hover:text-rose-500 transition-all">✕</button>
              
              <div className="mb-10">
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                   {editing ? 'Modificar Registro Maestro' : 'Resolución de Expediente'}
                </h3>
                <div className="h-1.5 w-24 bg-orange-500 mt-4 rounded-full"></div>
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] mt-3">ID DAC: {(editing || selected)?.id}</p>
              </div>

              <div className="space-y-8">
                {editing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nombre Paciente</label>
                      <input className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-2xl text-sm font-bold transition-all outline-none" value={editing.patientName} onChange={e => setEditing({...editing, patientName: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Teléfono de Contacto</label>
                      <input className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-2xl text-sm font-bold transition-all outline-none" value={editing.patientPhone} onChange={e => setEditing({...editing, patientPhone: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Médico Responsable</label>
                      <input className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-2xl text-sm font-bold transition-all outline-none" value={editing.doctorName} onChange={e => setEditing({...editing, doctorName: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nivel de Prioridad</label>
                      <select className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-2xl text-sm font-bold transition-all outline-none" value={editing.priority} onChange={e => setEditing({...editing, priority: e.target.value as Priority})}>
                        {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Descripción del Incidente</label>
                      <textarea className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-[1.5rem] text-sm font-bold h-32 transition-all outline-none" value={editing.description} onChange={e => setEditing({...editing, description: e.target.value})} />
                    </div>
                    <div className="md:col-span-2 flex gap-4 mt-6">
                      <button onClick={handleFullEditSave} className="flex-1 py-5 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-black transition-all">Guardar Cambios Maestros</button>
                      <button onClick={() => setEditing(null)} className="py-5 px-10 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase text-xs">Descartar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-full bg-slate-50 border-l-4 border-orange-500 rounded-3xl p-6 text-[13px] font-semibold text-slate-700 italic shadow-inner">
                       "{selected?.description}"
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Cambiar Estado de Gestión</label>
                       <div className="flex gap-4">
                         {[ComplaintStatus.PENDIENTE, ComplaintStatus.PROCESO, ComplaintStatus.RESUELTO].map(s => (
                           <button 
                             key={s} 
                             type="button"
                             onClick={() => setTempStatus(s)} 
                             className={`flex-1 py-4 rounded-[1.5rem] text-[10px] font-black uppercase transition-all border-2 ${tempStatus === s ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-105' : 'bg-white border-slate-100 text-slate-300'}`}
                           >
                             {s}
                           </button>
                         ))}
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Conclusión / Gestión de Empresa</label>
                       <textarea 
                         className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[2rem] p-6 text-sm font-bold min-h-[180px] outline-none transition-all shadow-inner" 
                         value={tempResponse} 
                         onChange={e => setTempResponse(e.target.value)} 
                         placeholder="Escriba aquí la resolución o los pasos seguidos para solventar el reclamo..." 
                       />
                    </div>
                    <button 
                      onClick={handleQuickResolutionSave} 
                      className="w-full py-6 bg-orange-500 text-white rounded-3xl font-black uppercase text-xs tracking-[0.3em] shadow-2xl hover:bg-orange-600 transition-all transform hover:-translate-y-1"
                    >
                      FINALIZAR GESTIÓN Y CERRAR MODAL
                    </button>
                  </>
                )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
