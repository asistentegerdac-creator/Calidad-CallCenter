
import React, { useState, useMemo, useEffect } from 'react';
import { Complaint, ComplaintStatus, User } from '../types';

interface Props { 
  complaints: Complaint[]; 
  currentUser: User | null;
  onUpdate: (id: string, s: ComplaintStatus, r: string, auditor: string) => void;
  onUpdateFull: (c: Complaint) => void;
  onDelete: (id: string) => void;
  isOnline: boolean;
  areas: string[];
  specialties: string[];
  onRefresh?: () => void;
}

export const IncidencesReported: React.FC<Props> = ({ 
  complaints, 
  currentUser, 
  onUpdate, 
  onUpdateFull,
  onDelete,
  areas,
  specialties,
  onRefresh
}) => {
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [editing, setEditing] = useState<Complaint | null>(null);
  
  const [mgmtStatus, setMgmtStatus] = useState<ComplaintStatus>(ComplaintStatus.PENDIENTE);
  const [mgmtResponse, setMgmtResponse] = useState('');

  const [filterManager, setFilterManager] = useState('Todos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (selected) {
      setMgmtStatus(selected.status);
      setMgmtResponse(selected.managementResponse || '');
    }
  }, [selected]);

  const managers = useMemo(() => {
    const mSet = new Set(complaints.map(c => c.managerName).filter(Boolean));
    return Array.from(mSet) as string[];
  }, [complaints]);

  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      const matchManager = filterManager === 'Todos' || c.managerName === filterManager;
      let matchDate = true;
      if (startDate) matchDate = matchDate && c.date >= startDate;
      if (endDate) matchDate = matchDate && c.date <= endDate;
      return matchManager && matchDate;
    });
  }, [complaints, filterManager, startDate, endDate]);

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      onUpdateFull(editing);
      setEditing(null);
    }
  };

  const getStatusBadge = (s: ComplaintStatus) => {
    switch(s) {
      case ComplaintStatus.RESUELTO: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case ComplaintStatus.PROCESO: return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default: return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* BARRA DE FILTROS AVANZADA */}
      <div className="glass-card bg-white p-8 shadow-sm border border-slate-100 no-print">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Gestión de Expedientes</h3>
            <div className="flex items-center gap-4">
              <p className="text-[10px] text-slate-400 font-bold uppercase">{filteredComplaints.length} incidencias filtradas</p>
              {onRefresh && (
                <button 
                  onClick={onRefresh} 
                  className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase shadow-md transition-all active:scale-95 flex items-center gap-2"
                >
                  <span>🔄</span> Actualizar Datos
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full xl:w-auto">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Encargado (Jefe):</label>
              <select 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:ring-2 ring-amber-500 transition-all"
                value={filterManager}
                onChange={(e) => setFilterManager(e.target.value)}
              >
                <option value="Todos">Todos los responsables</option>
                {managers.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Desde Fecha:</label>
              <input 
                type="date"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:ring-2 ring-amber-500 transition-all"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Hasta Fecha:</label>
              <input 
                type="date"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:ring-2 ring-amber-500 transition-all"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* GRID DE TARJETAS */}
      {filteredComplaints.length === 0 ? (
        <div className="py-20 text-center glass-card bg-white/50 border-dashed border-2">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No se encontraron incidencias con estos criterios</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredComplaints.map(c => (
            <div 
              key={c.id} 
              className="glass-card bg-white p-6 border-t-4 border-t-amber-500 hover:shadow-xl transition-all group relative flex flex-col min-h-[350px] cursor-pointer"
              onClick={() => setSelected(c)}
            >
              <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                 <button 
                   onClick={(e) => { e.stopPropagation(); setEditing(c); }}
                   className="w-8 h-8 bg-white/90 backdrop-blur shadow-sm rounded-lg flex items-center justify-center text-slate-600 hover:bg-amber-500 hover:text-white transition-all border border-slate-100"
                 >
                   <span className="text-xs">✎</span>
                 </button>
                 <button 
                   onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                   className="w-8 h-8 bg-white/90 backdrop-blur shadow-sm rounded-lg flex items-center justify-center text-slate-600 hover:bg-rose-500 hover:text-white transition-all border border-slate-100"
                 >
                   <span className="text-xs">✕</span>
                 </button>
              </div>

              <div className="flex-1">
                <div className="mb-4">
                  <div className="flex justify-between items-start">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{c.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black text-white ${c.priority === 'Crítica' ? 'bg-rose-500' : 'bg-slate-400'}`}>{c.priority}</span>
                  </div>
                  <h4 className="text-lg font-black text-slate-900 leading-tight mt-1 line-clamp-1 group-hover:text-amber-600 transition-colors">{c.patientName}</h4>
                  <p className="text-[9px] font-bold text-slate-400 mt-0.5">{c.date}</p>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 uppercase">{c.area}</span>
                  {c.specialty && <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 uppercase">{c.specialty}</span>}
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4 h-32 overflow-y-auto relative scrollbar-thin scrollbar-thumb-slate-200">
                   <p className="text-[11px] text-slate-600 font-semibold leading-relaxed">"{c.description}"</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center mt-auto">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${getStatusBadge(c.status)}`}>
                    {c.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-[7px] font-black text-slate-400 uppercase leading-none">Jefe Resp.</p>
                  <p className="text-[9px] font-black text-slate-800 uppercase truncate max-w-[100px]">{c.managerName || 'Pendiente'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE EDICIÓN DE DATOS BASE */}
      {editing && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[600] animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-xl p-10 rounded-[2.5rem] shadow-2xl relative overflow-y-auto max-h-[90vh]">
              <button onClick={() => setEditing(null)} className="absolute top-6 right-6 text-2xl font-light text-slate-300 hover:text-rose-500 transition-colors">✕</button>
              
              <div className="mb-8">
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Editar Datos Base</h3>
                <p className="text-amber-600 font-black text-[9px] uppercase tracking-[0.3em] mt-1">Expediente: {editing.id}</p>
              </div>

              <form onSubmit={handleEditSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Fecha del Reporte</label>
                    <input type="date" className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-xs" value={editing.date} onChange={e => setEditing({...editing, date: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Nombre del Paciente</label>
                    <input className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-xs" value={editing.patientName} onChange={e => setEditing({...editing, patientName: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Área</label>
                    <select className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-xs" value={editing.area} onChange={e => setEditing({...editing, area: e.target.value})}>
                      {areas.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  {editing.area.toLowerCase().includes('consulta') && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Especialidad</label>
                      <select className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-xs" value={editing.specialty} onChange={e => setEditing({...editing, specialty: e.target.value})}>
                        {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Médico Involucrado</label>
                    <input className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-xs" value={editing.doctorName} onChange={e => setEditing({...editing, doctorName: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Relato / Descripción</label>
                  <textarea className="w-full p-4 bg-slate-50 border rounded-xl font-bold text-xs h-28" value={editing.description} onChange={e => setEditing({...editing, description: e.target.value})} />
                </div>

                <button type="submit" className="w-full py-5 neo-warm-button rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">
                  ACTUALIZAR REGISTRO
                </button>
              </form>
           </div>
        </div>
      )}

      {/* MODAL DE RESOLUCIÓN ADMINISTRATIVA */}
      {selected && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[500] animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-xl p-10 rounded-[2.5rem] shadow-2xl relative overflow-y-auto max-h-[90vh] border border-white/20">
              <button onClick={() => setSelected(null)} className="absolute top-6 right-6 text-2xl font-light text-slate-300 hover:text-rose-500 transition-colors">✕</button>
              
              <div className="mb-8">
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Resolución Administrativa</h3>
                <p className="text-amber-600 font-black text-[9px] uppercase tracking-[0.3em] mt-1">Reporte DAC: {selected.id}</p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                   <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Jefatura Responsable</p>
                      <p className="text-[11px] font-black text-slate-900 uppercase">{selected.managerName || 'Sin asignar'}</p>
                   </div>
                   <div className="space-y-0.5 text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Prioridad Sistema</p>
                      <p className="text-[11px] font-black text-amber-600 uppercase">{selected.priority}</p>
                   </div>
                </div>

                {/* VISUALIZACIÓN DEL RECLAMO ORIGINAL */}
                <div className="space-y-2">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Relato Original del Paciente</label>
                   <div className="w-full bg-amber-50/50 border border-amber-100 rounded-2xl p-5 text-[11px] font-semibold text-slate-700 italic max-h-40 overflow-y-auto">
                      "{selected.description}"
                   </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Actualizar Estado de Gestión</label>
                  <div className="flex gap-2">
                    {[ComplaintStatus.PENDIENTE, ComplaintStatus.PROCESO, ComplaintStatus.RESUELTO].map(s => (
                      <button 
                        key={s} 
                        type="button"
                        onClick={() => setMgmtStatus(s)} 
                        className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${mgmtStatus === s ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Acciones Correctivas / Comentario del Jefe</label>
                   <textarea 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs font-bold min-h-[120px] outline-none focus:border-amber-400 transition-all" 
                    value={mgmtResponse} 
                    onChange={(e) => setMgmtResponse(e.target.value)}
                    placeholder="Escriba aquí la conclusión o acciones tomadas..." 
                   />
                </div>

                <button 
                  type="button"
                  onClick={() => {
                    onUpdate(selected.id, mgmtStatus, mgmtResponse, currentUser?.name || 'Administrador');
                    setSelected(null);
                  }} 
                  className="w-full py-5 neo-warm-button rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 transition-all"
                >
                  ARCHIVAR RESOLUCIÓN DAC
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
