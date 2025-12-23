
import React, { useState } from 'react';
import { Complaint, ComplaintStatus } from '../types';

interface Props { complaints: Complaint[]; onUpdate: (id: string, s: ComplaintStatus, r: string) => void; }

export const ComplaintList: React.FC<Props> = ({ complaints, onUpdate }) => {
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState<ComplaintStatus>(ComplaintStatus.PENDIENTE);

  const openModal = (c: Complaint) => {
    setSelected(c);
    setResponse(c.managementResponse || '');
    setStatus(c.status);
  };

  const getPriorityStyle = (p: string) => {
    switch(p) {
      case 'Crítica': return 'bg-rose-500 text-white shadow-rose-100';
      case 'Alta': return 'bg-orange-500 text-white shadow-orange-100';
      case 'Media': return 'bg-amber-500 text-white shadow-amber-100';
      default: return 'bg-slate-500 text-white shadow-slate-100';
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      {complaints.length === 0 && (
        <div className="col-span-full py-24 text-center glass-card">
          <div className="text-6xl mb-6">✨</div>
          <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Sin auditorías pendientes</p>
        </div>
      )}

      {complaints.map(c => (
        <div key={c.id} className="glass-card bg-white p-10 border-l-8 border-l-amber-500 relative group">
          <div className="absolute top-8 right-8">
            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg ${getPriorityStyle(c.priority)}`}>
              {c.priority}
            </span>
          </div>

          <div className="mb-8">
            <p className="text-[9px] font-black text-slate-400 mb-2 uppercase tracking-widest">{c.id} • {c.date}</p>
            <h4 className="text-2xl font-black text-slate-800 tracking-tighter">{c.patientName}</h4>
            <div className="flex items-center gap-3 mt-3">
              <span className="px-3 py-1 bg-amber-50 text-amber-600 font-black text-[9px] rounded-lg uppercase tracking-wider">{c.area}</span>
              <span className="text-slate-400 font-bold text-xs">Dr. {c.doctorName}</span>
            </div>
          </div>
          
          <div className="bg-orange-50/20 p-6 rounded-3xl mb-8 border border-orange-50/50 shadow-inner">
            <p className="text-sm text-slate-600 italic leading-relaxed font-medium">"{c.description}"</p>
          </div>

          <div className="flex justify-between items-center">
             <button 
              onClick={() => openModal(c)} 
              className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 shadow-xl transition-all active:scale-95"
            >
              Gestionar Expediente
            </button>
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${c.status === ComplaintStatus.RESUELTO ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}`}></div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${c.status === ComplaintStatus.RESUELTO ? 'text-emerald-600' : 'text-orange-600'}`}>
                {c.status}
              </span>
            </div>
          </div>
        </div>
      ))}

      {selected && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl flex items-center justify-center p-6 z-[200] animate-in fade-in duration-300">
          <div className="bg-white rounded-[3.5rem] w-full max-w-2xl p-14 relative shadow-2xl border border-orange-100">
            <button onClick={() => setSelected(null)} className="absolute top-10 right-10 text-3xl text-slate-300 hover:text-orange-500 transition-colors">✕</button>
            
            <div className="mb-12">
              <h3 className="text-3xl font-black tracking-tighter text-slate-900">Resolución de Auditoría</h3>
              <p className="text-orange-500 font-black uppercase text-[10px] tracking-[0.3em] mt-2">CASO: {selected.id}</p>
            </div>

            <div className="space-y-8">
              <div className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-3xl">
                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-3">Sugerencia IA</p>
                <p className="text-sm text-slate-700 italic font-medium leading-relaxed">"{selected.suggestedResponse}"</p>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Estatus</label>
                  <select 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-sm outline-none focus:border-amber-400" 
                    value={status} 
                    onChange={e => setStatus(e.target.value as ComplaintStatus)}
                  >
                    <option value={ComplaintStatus.PENDIENTE}>PENDIENTE</option>
                    <option value={ComplaintStatus.PROCESO}>EN PROCESO</option>
                    <option value={ComplaintStatus.RESUELTO}>RESUELTO</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Paciente</label>
                  <div className="w-full bg-slate-50 rounded-2xl p-4 font-bold text-slate-600 text-sm">{selected.patientName}</div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Conclusión Administrativa</label>
                <textarea 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-8 text-sm h-44 outline-none focus:border-amber-400 font-medium transition-all" 
                  value={response} 
                  onChange={e => setResponse(e.target.value)} 
                  placeholder="Detalle la resolución aplicada..." 
                />
              </div>

              <button 
                onClick={() => { onUpdate(selected.id, status, response); setSelected(null); }}
                className="w-full py-6 neo-warm-button text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-[0.25em] shadow-xl"
              >
                CERRAR Y ARCHIVAR EXPEDIENTE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
