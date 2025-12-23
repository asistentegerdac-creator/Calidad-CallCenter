
import React, { useState } from 'react';
import { Complaint, ComplaintStatus, Priority } from '../types';
import { analyzeComplaint } from '../services/geminiService';

interface Props { areas: string[]; specialties: string[]; onAdd: (c: Complaint) => void; }

export const ComplaintForm: React.FC<Props> = ({ areas, specialties, onAdd }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    patientName: '', patientPhone: '', doctorName: '', 
    specialty: specialties[0], area: areas[0], description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const analysis = await analyzeComplaint(formData.description);
    onAdd({
      ...formData,
      id: `DAC-${Date.now().toString().slice(-6)}`,
      status: ComplaintStatus.PENDIENTE,
      priority: analysis?.priority as Priority || Priority.MEDIA,
      sentiment: analysis?.sentiment,
      suggestedResponse: analysis?.suggestedResponse
    });
    setLoading(false);
    setFormData({...formData, patientName: '', description: '', patientPhone: '', doctorName: ''});
  };

  return (
    <div className="glass-card bg-white p-12 lg:p-16 border border-orange-100/50 shadow-[0_20px_50px_-10px_rgba(245,158,11,0.08)]">
      <div className="flex items-center gap-4 mb-12">
        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner text-amber-600">✍️</div>
        <div>
          <h3 className="text-2xl font-black tracking-tight text-slate-800">Nueva Auditoría</h3>
          <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mt-1">Registro de Incidencia de Calidad</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Paciente</label>
            <input required className="w-full bg-orange-50/20 border-2 border-orange-50/50 rounded-2xl p-4 font-bold text-sm outline-none focus:border-amber-400 transition-all placeholder:text-slate-300" value={formData.patientName} onChange={e => setFormData({...formData, patientName: e.target.value})} placeholder="Nombre del paciente" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Teléfono de Contacto</label>
            <input required className="w-full bg-orange-50/20 border-2 border-orange-50/50 rounded-2xl p-4 font-bold text-sm outline-none focus:border-amber-400 transition-all placeholder:text-slate-300" value={formData.patientPhone} onChange={e => setFormData({...formData, patientPhone: e.target.value})} placeholder="Ej: 987 654 321" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Médico Responsable</label>
            <input required className="w-full bg-orange-50/20 border-2 border-orange-50/50 rounded-2xl p-4 font-bold text-sm outline-none focus:border-amber-400 transition-all placeholder:text-slate-300" value={formData.doctorName} onChange={e => setFormData({...formData, doctorName: e.target.value})} placeholder="Dr. / Dra." />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Especialidad Clínica</label>
            <select className="w-full bg-orange-50/20 border-2 border-orange-50/50 rounded-2xl p-4 font-bold text-sm outline-none focus:border-amber-400 appearance-none cursor-pointer" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})}>
              {specialties.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Área o Departamento</label>
            <select className="w-full bg-orange-50/20 border-2 border-orange-50/50 rounded-2xl p-4 font-bold text-sm outline-none focus:border-amber-400 appearance-none cursor-pointer" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})}>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Descripción Detallada</label>
          <textarea required className="w-full bg-orange-50/20 border-2 border-orange-50/50 rounded-[2.5rem] p-8 font-medium text-sm h-40 outline-none focus:border-amber-400 transition-all shadow-inner" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Relate la incidencia ocurrida..." />
        </div>

        <div className="flex justify-end pt-4">
          <button 
            disabled={loading}
            className="w-full md:w-auto px-12 py-5 neo-warm-button text-white rounded-[2rem] font-black uppercase tracking-[0.25em] text-[10px] disabled:opacity-50"
          >
            {loading ? 'ANALIZANDO CON IA...' : 'REGISTRAR Y PRIORIZAR AUDITORÍA'}
          </button>
        </div>
      </form>
    </div>
  );
};
