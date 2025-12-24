
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
    <div className="space-y-8">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {complaints.map(c => (
          <div key={c.id} onClick={() => { setSelected(c); setStatus(c.status); }} className="glass-card bg-white p-10 border-l-8 border-amber-500 cursor-pointer hover:shadow-2xl transition-all">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">{c.id} • {c.date}</p>
                <h4 className="text-2xl font-black text-slate-900">{c.patientName}</h4>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black text-white ${c.priority === 'Crítica' ? 'bg-rose-500' : 'bg-amber-500'}`}>{c.priority}</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg uppercase">{c.area}</span>
              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg uppercase">Jefe: {c.managerName || 'No asignado'}</span>
            </div>
            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
               <p className="text-base text-slate-800 font-bold leading-relaxed">"{c.description}"</p>
            </div>
            <div className="mt-8 pt-6 border-t flex justify-between items-center">
              <span className={`text-[10px] font-black uppercase tracking-widest ${c.status === ComplaintStatus.RESUELTO ? 'text-emerald-500' : 'text-amber-500 animate-pulse'}`}>{c.status}</span>
              <span className="text-[9px] font-black text-slate-300">GESTIONAR EXPEDIENTE</span>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 z-[500]">
           <div className="bg-white w-full max-w-2xl p-14 rounded-[3.5rem] shadow-2xl relative overflow-y-auto max-h-[90vh]">
              <button onClick={() => setSelected(null)} className="absolute top-10 right-10 text-3xl">✕</button>
              <h3 className="text-2xl font-black mb-8 uppercase tracking-tighter">Auditoría Clínica {selected.id}</h3>
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-4 text-[10px] font-black uppercase text-slate-400">
                   <div>Área: <span className="text-slate-900">{selected.area}</span></div>
                   <div>Jefatura: <span className="text-slate-900">{selected.managerName}</span></div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cambiar Estado</label>
                  <div className="flex gap-4">
                    {[ComplaintStatus.PENDIENTE, ComplaintStatus.PROCESO, ComplaintStatus.RESUELTO].map(s => (
                      <button key={s} onClick={() => setStatus(s)} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${status === s ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'}`}>{s}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase">Acción Correctiva / Solución</label>
                   <textarea id="resp_adm" className="w-full bg-slate-50 border rounded-[2rem] p-8 text-sm font-bold min-h-[150px]" defaultValue={selected.managementResponse} />
                </div>
                <button onClick={() => {
                  const r = (document.getElementById('resp_adm') as HTMLTextAreaElement).value;
                  onUpdate(selected.id, status, r, currentUser?.name || 'Admin');
                  setSelected(null);
                }} className="w-full py-6 neo-warm-button rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest shadow-2xl hover:scale-[1.02] transition-transform">Firmar Resolución</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
