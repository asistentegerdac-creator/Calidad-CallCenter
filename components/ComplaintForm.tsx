import React, { useState } from 'react';
import { Complaint, ComplaintStatus, Priority } from '../types';
import { analyzeComplaint } from '../services/geminiService';

interface Props { areas: string[]; specialties: string[]; onAdd: (c: Complaint) => void; }

export const ComplaintForm: React.FC<Props> = ({ areas, specialties, onAdd }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    patientName: '', 
    patientPhone: '', 
    doctorName: '', 
    specialty: specialties[0] || 'Medicina General', 
    area: areas[0] || 'Consultas', 
    description: '',
    status: ComplaintStatus.PENDIENTE,
    satisfaction: 3,
    date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientPhone) return alert("El teléfono del paciente es un requisito obligatorio de calidad.");
    
    setLoading(true);
    const analysis = await analyzeComplaint(formData.description);
    onAdd({
      ...formData,
      id: `INC-${Date.now().toString().slice(-6)}`,
      priority: analysis?.priority as Priority || Priority.MEDIA,
      sentiment: analysis?.sentiment,
      suggestedResponse: analysis?.suggestedResponse,
      managementResponse: ''
    });
    setLoading(false);
    setFormData({
      ...formData, 
      patientName: '', 
      description: '', 
      patientPhone: '', 
      doctorName: '',
      satisfaction: 3
    });
  };

  return (
    <div className="glass-card bg-white p-12 border border-orange-100 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -mr-10 -mt-10 opacity-50"></div>
      <div className="flex items-center gap-5 mb-10">
        <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">📋</div>
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Nueva Incidencia Médica</h3>
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-1">Registro formal para control de calidad</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de Suceso</label>
            <input type="date" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold text-slate-900 outline-none focus:border-amber-400" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Paciente (Nombre Completo)</label>
            <input required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold text-slate-900 outline-none focus:border-amber-400" value={formData.patientName} onChange={e => setFormData({...formData, patientName: e.target.value})} placeholder="Ej. Juan Pérez" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono Directo <span className="text-rose-500">*</span></label>
            <input required type="tel" className="w-full bg-white border-2 border-amber-200 rounded-xl p-4 font-bold text-slate-900 outline-none focus:border-amber-400 shadow-sm" value={formData.patientPhone} onChange={e => setFormData({...formData, patientPhone: e.target.value})} placeholder="Obligatorio" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Médico Involucrado</label>
            <input required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold text-slate-900 outline-none focus:border-amber-400" value={formData.doctorName} onChange={e => setFormData({...formData, doctorName: e.target.value})} placeholder="Nombre del Facultativo" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Especialidad</label>
            <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold text-slate-900 outline-none focus:border-amber-400" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})}>
              {specialties.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Área / Departamento</label>
            <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold text-slate-900 outline-none focus:border-amber-400" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})}>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Satisfacción del Paciente</label>
            <div className="flex items-center gap-4 bg-slate-50 border-2 border-slate-100 rounded-xl p-3.5">
               {[1,2,3,4,5].map(n => (
                 <button type="button" key={n} onClick={() => setFormData({...formData, satisfaction: n})} className={`w-10 h-10 rounded-xl font-black text-sm transition-all shadow-sm ${formData.satisfaction >= n ? 'bg-amber-500 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                   {n}
                 </button>
               ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción Detallada del Evento</label>
          <textarea required className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-8 font-bold text-slate-900 h-40 outline-none focus:border-amber-400 transition-all shadow-inner leading-relaxed" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Describa la incidencia con la mayor precisión posible..." />
        </div>

        <button disabled={loading} className="w-full py-6 neo-warm-button rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl disabled:opacity-50">
          {loading ? 'PROCESANDO ANALÍTICA...' : 'REGISTRAR INCIDENCIA OFICIAL'}
        </button>
      </form>
    </div>
  );
};