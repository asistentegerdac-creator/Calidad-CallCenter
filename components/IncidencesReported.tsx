
import React, { useState, useEffect } from 'react';
import { Complaint, ComplaintStatus, User } from '../types';
import { dbService } from '../services/apiService';

interface Props { 
  complaints: Complaint[]; 
  currentUser: User | null;
  onUpdate: (id: string, s: ComplaintStatus, r: string, auditor: string) => void;
  onUpdateFull: (c: Complaint) => void;
  onDelete: (id: string) => void;
  isOnline: boolean;
  areas: string[];
  specialties: string[];
}

export const IncidencesReported: React.FC<Props> = ({ 
  complaints: initialComplaints, 
  currentUser, 
  onUpdate, 
  onUpdateFull,
  onDelete,
  isOnline,
  areas,
  specialties
}) => {
  const [complaints, setComplaints] = useState(initialComplaints);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [editing, setEditing] = useState<Complaint | null>(null);
  const [status, setStatus] = useState<ComplaintStatus>(ComplaintStatus.PENDIENTE);

  useEffect(() => {
    if (isOnline) dbService.fetchComplaints().then(setComplaints);
    else setComplaints(initialComplaints);
  }, [isOnline, initialComplaints]);

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      onUpdateFull(editing);
      setEditing(null);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {complaints.map(c => (
          <div key={c.id} className="glass-card bg-white p-10 border-l-[12px] border-amber-500 hover:shadow-2xl transition-all group relative">
            <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity no-print">
               <button 
                 onClick={(e) => { e.stopPropagation(); setEditing(c); }}
                 className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                 title="Editar Datos"
               >
                 ✎
               </button>
               <button 
                 onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                 className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                 title="Eliminar Registro"
               >
                 ✕
               </button>
            </div>

            <div onClick={() => { setSelected(c); setStatus(c.status); }} className="cursor-pointer">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.id} • {c.date}</p>
                  <h4 className="text-2xl font-black text-slate-900 mt-1">{c.patientName}</h4>
                </div>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black text-white shadow-lg ${c.priority === 'Crítica' ? 'bg-rose-500' : 'bg-amber-500'}`}>{c.priority}</span>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="text-[11px] font-black text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl uppercase border border-amber-100">Área: {c.area}</span>
                <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl uppercase border border-indigo-100">Jefe: {c.managerName || 'No asignado'}</span>
              </div>

              <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner group-hover:bg-white transition-colors">
                 <p className="text-lg text-slate-800 font-bold leading-relaxed italic">"{c.description}"</p>
              </div>

              <div className="mt-8 pt-6 border-t flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <div className={`w-3 h-3 rounded-full ${c.status === ComplaintStatus.RESUELTO ? 'bg-emerald-500' : (c.status === ComplaintStatus.PROCESO ? 'bg-indigo-500 animate-pulse' : 'bg-amber-500 animate-pulse')}`}></div>
                   <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${c.status === ComplaintStatus.RESUELTO ? 'text-emerald-500' : 'text-amber-500'}`}>{c.status}</span>
                </div>
                <span className="text-[10px] font-black text-slate-300 uppercase group-hover:text-amber-500 transition-colors">Ver Detalles del Caso</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE EDICIÓN DE DATOS */}
      {editing && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[600] animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl p-14 rounded-[3.5rem] shadow-2xl relative overflow-y-auto max-h-[90vh] border border-white/20">
              <button onClick={() => setEditing(null)} className="absolute top-10 right-10 text-4xl font-light text-slate-300 hover:text-rose-500 transition-colors">✕</button>
              
              <div className="mb-10">
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Gestión de Calidad DAC</h3>
                <p className="text-amber-600 font-black text-[10px] uppercase tracking-[0.4em] mt-2">ID REPORTE: {editing.id}</p>
              </div>

              <form onSubmit={handleEditSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Fecha del Reporte</label>
                    <input type="date" className="w-full p-4 bg-slate-50 border rounded-xl font-bold text-sm" value={editing.date} onChange={e => setEditing({...editing, date: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Nombre del Paciente</label>
                    <input className="w-full p-4 bg-slate-50 border rounded-xl font-bold text-sm" value={editing.patientName} onChange={e => setEditing({...editing, patientName: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Área</label>
                    <select className="w-full p-4 bg-slate-50 border rounded-xl font-bold text-sm" value={editing.area} onChange={e => setEditing({...editing, area: e.target.value})}>
                      {areas.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  
                  {/* Especialidad condicional */}
                  {editing.area.toLowerCase().includes('consulta') && (
                    <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Especialidad</label>
                      <select className="w-full p-4 bg-slate-50 border rounded-xl font-bold text-sm" value={editing.specialty} onChange={e => setEditing({...editing, specialty: e.target.value})}>
                        {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Médico Involucrado</label>
                    <input className="w-full p-4 bg-slate-50 border rounded-xl font-bold text-sm" value={editing.doctorName} onChange={e => setEditing({...editing, doctorName: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Relato / Descripción</label>
                  <textarea className="w-full p-6 bg-slate-50 border rounded-2xl font-bold text-sm h-32" value={editing.description} onChange={e => setEditing({...editing, description: e.target.value})} />
                </div>

                <button type="submit" className="w-full py-6 neo-warm-button rounded-[2.5rem] font-black uppercase text-[12px] tracking-widest shadow-2xl">
                  GUARDAR CAMBIOS
                </button>
              </form>
           </div>
        </div>
      )}

      {/* MODAL DE GESTIÓN ADMINISTRATIVA */}
      {selected && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[500] animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl p-14 rounded-[3.5rem] shadow-2xl relative overflow-y-auto max-h-[90vh] border border-white/20">
              <button onClick={() => setSelected(null)} className="absolute top-10 right-10 text-4xl font-light text-slate-300 hover:text-rose-500 transition-colors">✕</button>
              
              <div className="mb-10">
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Gestión de Calidad DAC</h3>
                <p className="text-amber-600 font-black text-[10px] uppercase tracking-[0.4em] mt-2">NÚMERO DE REPORTE: {selected.id}</p>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                   <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Responsable de Área</p>
                      <p className="text-sm font-black text-slate-900">{selected.managerName || 'Pendiente asignar'}</p>
                   </div>
                   <div className="space-y-1 text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Especialidad</p>
                      <p className="text-sm font-black text-slate-900">{selected.specialty}</p>
                   </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Actualizar Estado de Gestión</label>
                  <div className="flex gap-4">
                    {[ComplaintStatus.PENDIENTE, ComplaintStatus.PROCESO, ComplaintStatus.RESUELTO].map(s => (
                      <button key={s} onClick={() => setStatus(s)} className={`flex-1 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${status === s ? 'bg-slate-900 text-white shadow-2xl scale-105' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Resolución del Caso / Acciones Tomadas</label>
                   <textarea id="resp_adm" className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-8 text-sm font-bold min-h-[150px] outline-none focus:border-amber-400 transition-all" defaultValue={selected.managementResponse} placeholder="Escriba la conclusión de la gestión..." />
                </div>

                <button onClick={() => {
                  const r = (document.getElementById('resp_adm') as HTMLTextAreaElement).value;
                  onUpdate(selected.id, status, r, currentUser?.name || 'Administrador');
                  setSelected(null);
                }} className="w-full py-6 neo-warm-button rounded-[2.5rem] font-black uppercase text-[12px] tracking-widest shadow-2xl hover:scale-105 transition-all">
                  FIRMAR Y ARCHIVAR RESOLUCIÓN
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
