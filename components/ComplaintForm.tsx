import React, { useState, useEffect } from 'react';
import { Complaint, ComplaintStatus, Priority } from '../types';
import { analyzeComplaint } from '../services/geminiService';

interface Props { areas: string[]; specialties: string[]; onAdd: (c: Complaint) => void; }

export const ComplaintForm: React.FC<Props> = ({ areas, specialties, onAdd }) => {
  const [loading, setLoading] = useState(false);
  const [showDoctor, setShowDoctor] = useState(true);
  
  const [formData, setFormData] = useState({
    patientName: '', 
    patientPhone: '', 
    doctorName: '', 
    specialty: specialties[0] || 'Servicio General', 
    area: areas[0] || 'Triaje', 
    description: '',
    status: ComplaintStatus.PENDIENTE,
    satisfaction: 3,
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    // Si el área no es asistencial médica directa, ocultar médico
    const nonMedicalAreas = ['Triaje', 'Botica', 'Farmacia', 'Rayos X', 'Laboratorio', 'Ecografía', 'Caja', 'Admisión'];
    const isNonMedical = nonMedicalAreas.some(a => formData.area.toLowerCase().includes(a.toLowerCase()));
    setShowDoctor(!isNonMedical);
    if (isNonMedical) setFormData(prev => ({ ...prev, doctorName: 'Personal del Área' }));
  }, [formData.area]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const analysis = await analyzeComplaint(formData.description);
    onAdd({
      ...formData,
      id: `INC-${Date.now().toString().slice(-6)}`,
      priority: analysis?.priority as Priority || Priority.MEDIA,
      sentiment: analysis?.sentiment,
      suggestedResponse: analysis?.suggestedResponse,
    });
    setLoading(false);
    setFormData({ ...formData, patientName: '', description: '', patientPhone: '', doctorName: '', satisfaction: 3 });
  };

  return (
    <div className="glass-card bg-white p-6 md:p-12 border-orange-100 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -mr-10 -mt-10 opacity-30"></div>
      <div className="flex items-center gap-4 mb-10">
        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-xl">📋</div>
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase">Nueva Incidencia de Servicio</h3>
          <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">Protocolo de Control de Calidad</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</label>
            <input type="date" required className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-sm" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nombre del Paciente</label>
            <input required className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-sm" value={formData.patientName} onChange={e => setFormData({...formData, patientName: e.target.value})} placeholder="Nombre completo" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Teléfono (Opcional)</label>
            <input type="tel" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-sm" value={formData.patientPhone} onChange={e => setFormData({...formData, patientPhone: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Área / Departamento</label>
            <select className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-sm" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})}>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          {showDoctor && (
            <div className="space-y-1 animate-in zoom-in-95 duration-200">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Médico Responsable</label>
              <input required className="w-full bg-white border-2 border-amber-200 rounded-xl p-4 font-bold text-sm" value={formData.doctorName} onChange={e => setFormData({...formData, doctorName: e.target.value})} placeholder="Nombre del Facultativo" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Relato de la Incidencia</label>
          <textarea required className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-6 font-bold text-sm h-32 outline-none focus:border-amber-400 transition-all" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Detalle lo sucedido..." />
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-center justify-between p-6 bg-slate-50 rounded-2xl">
          <div className="space-y-2 w-full md:w-auto">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nivel de Satisfacción</label>
            <div className="flex gap-2">
               {[1,2,3,4,5].map(n => (
                 <button type="button" key={n} onClick={() => setFormData({...formData, satisfaction: n})} className={`w-10 h-10 rounded-lg font-black transition-all ${formData.satisfaction >= n ? 'bg-amber-500 text-white shadow-lg' : 'bg-white text-slate-300'}`}>
                   {n}
                 </button>
               ))}
            </div>
          </div>
          <button disabled={loading} className="w-full md:w-auto px-12 py-5 neo-warm-button rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl disabled:opacity-50">
            {loading ? 'Analizando con IA...' : 'Registrar Incidencia'}
          </button>
        </div>
      </form>
    </div>
  );
};