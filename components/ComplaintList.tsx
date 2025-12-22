import React, { useState } from 'react';
import { Complaint, ComplaintStatus } from '../types';

interface Props { complaints: Complaint[]; onDial: (n: string) => void; onUpdate: (id: string, s: ComplaintStatus, r: string) => void; }

export const ComplaintList: React.FC<Props> = ({ complaints, onDial, onUpdate }) => {
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState<ComplaintStatus>(ComplaintStatus.PENDIENTE);

  const openModal = (c: Complaint) => {
    setSelected(c);
    setResponse(c.managementResponse || '');
    setStatus(c.status);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {complaints.map(c => (
        <div key={c.id} className="glass-card bg-white p-8 rounded-3xl border-l-4 border-l-blue-600 hover:shadow-lg transition-all">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 mb-1">{c.id} • {c.date}</p>
              <h4 className="text-xl font-black text-slate-800 tracking-tight">{c.patientName}</h4>
              <p className="text-blue-600 font-bold text-[11px] uppercase tracking-wider">{c.area} — Dr. {c.doctorName}</p>
            </div>
            <span className={`status-badge ${c.priority === 'Crítica' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>{c.priority}</span>
          </div>
          
          <div className="bg-slate-50 p-5 rounded-2xl mb-6 border border-slate-100 min-h-[80px]">
            <p className="text-sm text-slate-600 italic leading-relaxed">"{c.description}"</p>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <button onClick={() => onDial(c.patientPhone)} className="px-5 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all">Llamar 📞</button>
            <button onClick={() => openModal(c)} className="px-5 py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">Gestionar Caso</button>
            <span className={`ml-auto px-4 py-2 rounded-lg text-[10px] font-black uppercase ${c.status === ComplaintStatus.RESUELTO ? 'text-emerald-600' : 'text-amber-600'}`}>• {c.status}</span>
          </div>
        </div>
      ))}

      {selected && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-[200]">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-10 relative shadow-2xl">
            <button onClick={() => setSelected(null)} className="absolute top-6 right-8 text-2xl text-slate-300 hover:text-slate-600">✕</button>
            
            <h3 className="text-2xl font-black tracking-tight mb-2">Resolución DAC</h3>
            <p className="text-blue-600 font-bold uppercase text-[10px] tracking-widest mb-8">Expediente: {selected.id}</p>

            <div className="space-y-6">
              {selected.suggestedResponse && (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-[9px] font-black text-blue-500 uppercase mb-1">Análisis IA</p>
                  <p className="text-xs text-slate-600 italic">"{selected.suggestedResponse}"</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dictamen de Jefatura</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm" value={status} onChange={e => setStatus(e.target.value as ComplaintStatus)}>
                    <option value={ComplaintStatus.PENDIENTE}>🔴 Pendiente</option>
                    <option value={ComplaintStatus.PROCESO}>🟡 En Proceso</option>
                    <option value={ComplaintStatus.RESUELTO}>🔵 Resuelto</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Respuesta Oficial</label>
                  <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm h-32 outline-none focus:border-blue-500" value={response} onChange={e => setResponse(e.target.value)} placeholder="Escriba la respuesta oficial para el paciente..." />
                </div>
              </div>

              <button 
                onClick={() => { onUpdate(selected.id, status, response); setSelected(null); }}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-[11px] tracking-widest shadow-lg shadow-blue-500/20"
              >
                Guardar y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};