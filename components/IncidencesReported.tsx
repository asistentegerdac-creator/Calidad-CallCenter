
import React, { useState, useEffect } from 'react';
import { Complaint, ComplaintStatus, User } from '../types';
import { dbService } from '../services/apiService';

interface Props { 
  complaints: Complaint[]; currentUser: User | null;
  onUpdate: (id: string, s: ComplaintStatus, r: string, auditor: string) => void;
  isOnline: boolean;
}

export const IncidencesReported: React.FC<Props> = ({ complaints: initialComplaints, currentUser, onUpdate, isOnline }) => {
  const [complaints, setComplaints] = useState(initialComplaints);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [status, setStatus] = useState<ComplaintStatus>(ComplaintStatus.PENDIENTE);

  useEffect(() => {
    if (isOnline) dbService.fetchComplaints().then(setComplaints);
    else setComplaints(initialComplaints);
  }, [isOnline, initialComplaints]);

  return (
    <div className="space-y-8 pb-20">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {complaints.map(c => (
          <div key={c.id} onClick={() => { setSelected(c); setStatus(c.status); }} className="glass-card bg-white p-10 border-l-[12px] border-amber-500 cursor-pointer hover:shadow-2xl transition-all group">
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
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[500] animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl p-14 rounded-[3.5rem] shadow-2xl relative overflow-y-auto max-h-[90vh] border border-white/20">
              <button onClick={() => setSelected(null)} className="absolute top-10 right-10 text-4xl font-light text-slate-300 hover:text-rose-500 transition-colors">✕</button>
              
              <div className="mb-10">
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Gestión Administrativa</h3>
                <p className="text-amber-600 font-black text-[10px] uppercase tracking-[0.4em] mt-2">NÚMERO DE AUDITORÍA: {selected.id}</p>
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
                   <textarea id="resp_adm" className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-8 text-sm font-bold min-h-[150px] outline-none focus:border-amber-400 transition-all" defaultValue={selected.managementResponse} placeholder="Escriba la conclusión de la auditoría..." />
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
