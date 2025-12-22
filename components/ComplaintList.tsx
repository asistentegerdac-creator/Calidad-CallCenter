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

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'Crítica': return 'from-rose-500 to-rose-600 shadow-rose-200';
      case 'Alta': return 'from-amber-500 to-amber-600 shadow-amber-200';
      case 'Media': return 'from-blue-500 to-blue-600 shadow-blue-200';
      default: return 'from-slate-500 to-slate-600 shadow-slate-200';
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      {complaints.length === 0 && (
        <div className="col-span-full py-20 text-center glass-card bg-white/50">
          <div className="text-6xl mb-4">✨</div>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Sin quejas pendientes de atención</p>
        </div>
      )}

      {complaints.map(c => (
        <div key={c.id} className="glass-card bg-white p-10 border-t-8 border-t-blue-600 relative overflow-hidden group">
          <div className="absolute top-4 right-6">
            <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase text-white bg-gradient-to-r ${getPriorityColor(c.priority)}`}>
              {c.priority}
            </span>
          </div>

          <div className="mb-6">
            <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-tighter">{c.id} • {c.date}</p>
            <h4 className="text-2xl font-black text-slate-800 tracking-tight">{c.patientName}</h4>
            <div className="flex items-center gap-3 mt-2">
              <span className="px-3 py-1 bg-blue-50 text-blue-600 font-black text-[10px] rounded-lg uppercase tracking-wider">{c.area}</span>
              <span className="text-slate-400 font-bold text-xs">— Dr. {c.doctorName}</span>
            </div>
          </div>
          
          <div className="bg-slate-50/50 p-6 rounded-2xl mb-8 border border-slate-100/50 min-h-[100px] shadow-inner">
            <p className="text-sm text-slate-600 italic leading-relaxed font-medium">"{c.description}"</p>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <button 
              onClick={() => onDial(c.patientPhone)} 
              className="px-6 py-4 btn-vibrant text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95"
            >
              📞 Llamar Paciente
            </button>
            <button 
              onClick={() => openModal(c)} 
              className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 shadow-xl transition-all"
            >
              ⚙️ Gestionar Caso
            </button>
            
            <div className="ml-auto flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${c.status === ComplaintStatus.RESUELTO ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-bounce'}`}></div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${c.status === ComplaintStatus.RESUELTO ? 'text-emerald-600' : 'text-amber-600'}`}>
                {c.status}
              </span>
            </div>
          </div>
        </div>
      ))}

      {selected && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-[200] animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl p-12 relative shadow-2xl neo-3d">
            <button onClick={() => setSelected(null)} className="absolute top-8 right-10 text-3xl text-slate-300 hover:text-slate-600 transition-colors">✕</button>
            
            <div className="mb-10">
              <h3 className="text-3xl font-black tracking-tight text-slate-900">Resolución Administrativa</h3>
              <p className="text-blue-600 font-black uppercase text-[10px] tracking-widest mt-2">EXPEDIENTE DIGITAL: {selected.id}</p>
            </div>

            <div className="space-y-8">
              {selected.suggestedResponse && (
                <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🤖</span>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Análisis Predictivo IA</p>
                  </div>
                  <p className="text-sm text-slate-700 italic font-medium leading-relaxed">"{selected.suggestedResponse}"</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estatus del Proceso</label>
                  <select 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-sm outline-none focus:border-blue-500 transition-all cursor-pointer" 
                    value={status} 
                    onChange={e => setStatus(e.target.value as ComplaintStatus)}
                  >
                    <option value={ComplaintStatus.PENDIENTE}>🔴 PENDIENTE</option>
                    <option value={ComplaintStatus.PROCESO}>🟡 EN PROCESO</option>
                    <option value={ComplaintStatus.RESUELTO}>🟢 RESUELTO</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Paciente</label>
                  <div className="w-full bg-slate-50 border border-transparent rounded-2xl p-4 font-bold text-slate-600 text-sm">{selected.patientName}</div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Respuesta de Jefatura</label>
                <textarea 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-8 text-sm h-48 outline-none focus:border-blue-500 font-medium transition-all shadow-inner" 
                  value={response} 
                  onChange={e => setResponse(e.target.value)} 
                  placeholder="Redacte aquí la resolución oficial para el paciente..." 
                />
              </div>

              <button 
                onClick={() => { onUpdate(selected.id, status, response); setSelected(null); }}
                className="w-full py-6 btn-vibrant text-white rounded-[2rem] font-black uppercase text-[12px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all"
              >
                Finalizar Gestión y Notificar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};