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
    setFormData({...formData, patientName: '', description: '', patientPhone: ''});
  };

  return (
    <div className="bg-white p-8 lg:p-12 rounded-[2.5rem] border border-slate-200 shadow-sm">
      <h3 className="text-xl font-black mb-8 flex items-center gap-3">
        <span className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">📝</span>
        Nueva Auditoría de Atención
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Paciente</label>
            <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold outline-none focus:border-blue-500" value={formData.patientName} onChange={e => setFormData({...formData, patientName: e.target.value})} placeholder="Nombre completo" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Teléfono</label>
            <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold outline-none focus:border-blue-500" value={formData.patientPhone} onChange={e => setFormData({...formData, patientPhone: e.target.value})} placeholder="999 999 999" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Médico Responsable</label>
            <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold outline-none focus:border-blue-500" value={formData.doctorName} onChange={e => setFormData({...formData, doctorName: e.target.value})} placeholder="Dr. Ejemplo" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Especialidad</label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})}>
              {specialties.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Área</label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})}>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Descripción de la Queja</label>
          <textarea required className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-6 font-medium h-32 outline-none focus:border-blue-500" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Relato detallado de la inconformidad..." />
        </div>

        <button 
          disabled={loading}
          className="w-full py-5 bg-blue-600 text-white rounded-xl font-black uppercase tracking-[0.2em] text-[11px] shadow-lg shadow-blue-500/10 hover:bg-blue-700 transition-all disabled:opacity-50"
        >
          {loading ? 'Analizando con IA...' : 'Registrar y Priorizar Caso'}
        </button>
      </form>
    </div>
  );
};