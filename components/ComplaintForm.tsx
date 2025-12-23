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
    setLoading(true);
    const analysis = await analyzeComplaint(formData.description);
    onAdd({
      ...formData,
      id: `AUD-${Date.now().toString().slice(-6)}`,
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
    <div className="glass-card bg-white p-12 border border-orange-100 shadow-2xl">
      <div className="flex items-center gap-5 mb-10">
        <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">📋</div>
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Registro de Auditoría Médica</h3>
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-1">SISTEMA DE CALIDAD DAC v2.5</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Incidencia</label>
            <input type="date" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold text-slate-900 outline-none focus:border-amber-400" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Paciente Completo</label>
            <input required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold text-slate-900 outline-none focus:border-amber-400 placeholder:text-slate-300" value={formData.patientName} onChange={e => setFormData({...formData, patientName: e.target.value})} placeholder="Nombre y Apellidos" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
            <input required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold text-slate-900 outline-none focus:border-amber-400" value={formData.patientPhone} onChange={e => setFormData({...formData, patientPhone: e.target.value})} placeholder="999-999-999" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Médico Responsable</label>
            <input required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold text-slate-900 outline-none focus:border-amber-400" value={formData.doctorName} onChange={e => setFormData({...formData, doctorName: e.target.value})} placeholder="Dr. / Dra." />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Especialidad</label>
            <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold text-slate-900 outline-none focus:border-amber-400" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})}>
              {specialties.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Departamento</label>
            <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold text-slate-900 outline-none focus:border-amber-400" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})}>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado Inicial</label>
            <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold text-slate-900 outline-none focus:border-amber-400" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ComplaintStatus})}>
              <option value={ComplaintStatus.PENDIENTE}>PENDIENTE</option>
              <option value={ComplaintStatus.PROCESO}>EN PROCESO</option>
              <option value={ComplaintStatus.RESUELTO}>RESUELTO</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nivel de Satisfacción (1-5)</label>
            <div className="flex items-center gap-4 bg-slate-50 border-2 border-slate-100 rounded-xl p-3.5">
               {[1,2,3,4,5].map(n => (
                 <button type="button" key={n} onClick={() => setFormData({...formData, satisfaction: n})} className={`w-8 h-8 rounded-full font-black text-xs transition-all ${formData.satisfaction >= n ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                   {n}
                 </button>
               ))}
               <span className="text-xs font-black text-slate-400 ml-auto">
                 {formData.satisfaction <= 2 ? '☹️ Insatisfecho' : formData.satisfaction === 3 ? '😐 Neutro' : '😊 Satisfecho'}
               </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción de la Queja / Incidencia</label>
          <textarea required className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 font-bold text-slate-900 h-32 outline-none focus:border-amber-400 transition-all shadow-inner" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Detalle lo sucedido para el análisis de calidad..." />
        </div>

        <button disabled={loading} className="w-full py-5 neo-warm-button rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl disabled:opacity-50">
          {loading ? 'ANALIZANDO CON INTELIGENCIA ARTIFICIAL...' : 'REGISTRAR AUDITORÍA EN SISTEMA'}
        </button>
      </form>
    </div>
  );
};