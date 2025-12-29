
import React, { useState, useEffect } from 'react';
import { Complaint, ComplaintStatus, User } from '../types';

interface Props { 
  complaints: Complaint[]; 
  currentUser: User | null;
  onUpdate: (id: string, s: ComplaintStatus, r: string, auditor: string) => void; 
}

export const ComplaintList: React.FC<Props> = ({ complaints, onUpdate, currentUser }) => {
  const [selected, setSelected] = useState<Complaint | null>(null);
  
  // Estados de buffer para el modal
  const [localResponse, setLocalResponse] = useState('');
  const [localStatus, setLocalStatus] = useState<ComplaintStatus>(ComplaintStatus.PENDIENTE);

  // Sincronizar buffer cuando se selecciona un reclamo
  useEffect(() => {
    if (selected) {
      setLocalResponse(selected.managementResponse || '');
      setLocalStatus(selected.status);
    }
  }, [selected]);

  const openModal = (c: Complaint) => {
    setSelected(c);
  };

  const getPriorityStyle = (p: string) => {
    switch(p) {
      case 'Crítica': return 'bg-rose-500';
      case 'Alta': return 'bg-orange-500';
      case 'Media': return 'bg-amber-500';
      default: return 'bg-slate-400';
    }
  };

  const handleFinalUpdate = () => {
    if (selected) {
      onUpdate(selected.id, localStatus, localResponse, currentUser?.name || 'Administrador');
      setSelected(null);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      {complaints.length === 0 && (
        <div className="col-span-full py-32 text-center glass-card bg-white/50 border-dashed border-2 border-orange-100">
          <div className="text-6xl mb-6">🏥</div>
          <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[11px]">Sistema Gestión Calidad Limpio</p>
        </div>
      )}

      {complaints.map(c => (
        <div key={c.id} onClick={() => openModal(c)} className="glass-card bg-white p-10 border-l-8 border-l-amber-500 cursor-pointer hover:translate-y-[-4px] transition-all duration-300 group shadow-lg">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{c.id} | {c.date}</p>
              <h4 className="text-2xl font-black text-slate-900 tracking-tighter">{c.patientName}</h4>
            </div>
            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase text-white shadow-lg ${getPriorityStyle(c.priority)}`}>
              {c.priority}
            </span>
          </div>

          <div className="flex gap-3 mb-6">
            <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black rounded-lg uppercase">{c.area}</span>
            <span className="px-3 py-1 bg-slate-50 text-slate-500 text-[10px] font-black rounded-lg uppercase">DR. {c.doctorName}</span>
          </div>
          
          <div className="bg-orange-50/30 p-6 rounded-3xl mb-8 border border-orange-100 shadow-inner">
            <p className="text-sm text-slate-700 italic font-medium leading-relaxed">"{c.description}"</p>
          </div>

          <div className="flex justify-between items-center pt-6 border-t border-orange-50">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${c.status === ComplaintStatus.RESUELTO ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}`}></div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${c.status === ComplaintStatus.RESUELTO ? 'text-emerald-600' : 'text-orange-600'}`}>{c.status}</span>
            </div>
            {c.resolvedBy && <span className="text-[9px] font-black text-slate-400 uppercase">AUDITADO POR: {c.resolvedBy}</span>}
          </div>
        </div>
      ))}

      {selected && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl flex items-center justify-center p-6 z-[200] animate-in fade-in duration-300">
          <div className="bg-white rounded-[3.5rem] w-full max-w-2xl p-14 relative shadow-2xl border border-orange-100 overflow-y-auto max-h-[90vh]">
            <button onClick={() => setSelected(null)} className="absolute top-10 right-10 text-3xl text-slate-300 hover:text-amber-500 transition-colors font-light">✕</button>
            
            <div className="mb-10">
              <h3 className="text-3xl font-black tracking-tighter text-slate-900">Resolución de Gestión de Calidad DAC</h3>
              <p className="text-amber-600 font-black uppercase text-[10px] tracking-[0.3em] mt-2">EXPEDIENTE: {selected.id}</p>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Paciente</p>
                  <p className="font-bold text-slate-900 text-sm">{selected.patientName}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Especialidad</p>
                  <p className="font-bold text-slate-900 text-sm">{selected.specialty}</p>
                </div>
              </div>

              <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl">
                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-3">Sugerencia del Sistema (IA)</p>
                <p className="text-sm text-slate-700 italic font-medium leading-relaxed">"{selected.suggestedResponse}"</p>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado de la Gestión</label>
                <div className="flex gap-4">
                  {[ComplaintStatus.PENDIENTE, ComplaintStatus.PROCESO, ComplaintStatus.RESUELTO].map(s => (
                    <button 
                      key={s} 
                      type="button"
                      onClick={() => setLocalStatus(s)} 
                      className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${localStatus === s ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50 text-slate-400'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Conclusión Administrativa / Solución Aplicada</label>
                <textarea 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-8 text-sm h-40 outline-none focus:border-amber-400 font-bold text-slate-900 transition-all" 
                  value={localResponse} 
                  onChange={e => setLocalResponse(e.target.value)} 
                  placeholder="Detalle la acción tomada por el equipo de calidad..." 
                />
              </div>

              <button 
                onClick={handleFinalUpdate}
                className="w-full py-6 neo-warm-button text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-[0.3em] shadow-xl"
              >
                FIRMAR Y CERRAR EXPEDIENTE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
