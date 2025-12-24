
import React, { useState, useEffect } from 'react';
import { Complaint, ComplaintStatus, Priority } from '../types';
import { analyzeComplaint } from '../services/geminiService';
import { dbService } from '../services/apiService';

interface Props { areas: string[]; specialties: string[]; onAdd: (c: Complaint) => void; }

export const ComplaintForm: React.FC<Props> = ({ areas, specialties, onAdd }) => {
  const [loading, setLoading] = useState(false);
  const [showDoctor, setShowDoctor] = useState(true);
  const [mappings, setMappings] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    patientName: '', patientPhone: '', doctorName: '', 
    specialty: specialties[0] || 'Servicio General', 
    area: areas[0] || 'Triaje', managerName: '',
    description: '', status: ComplaintStatus.PENDIENTE, satisfaction: 3,
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    dbService.fetchAreasConfig().then(setMappings);
  }, []);

  useEffect(() => {
    const isConsultas = formData.area.toLowerCase().includes('consultas') || formData.area.toLowerCase().includes('médico');
    setShowDoctor(isConsultas);
    
    // Auto-asignar Jefe
    const map = mappings.find(m => m.areaName === formData.area);
    if (map) setFormData(prev => ({ ...prev, managerName: map.managerName }));
  }, [formData.area, mappings]);

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
      <div className="flex items-center gap-4 mb-10">
        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-xl">📋</div>
        <div><h3 className="text-xl font-black text-slate-900 uppercase">Registro de Calidad DAC</h3></div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase">Área Operativa</label>
            <select className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-sm" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})}>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase">Especialidad Clínica</label>
            <select className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-sm" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})}>
              {specialties.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase">Jefe Responsable (Automático)</label>
            <input disabled className="w-full bg-slate-100 border border-slate-200 rounded-xl p-4 font-black text-sm text-slate-500" value={formData.managerName || 'Sin Jefe Asignado'} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-[9px] font-black text-slate-400 uppercase">Nombre del Paciente</label>
            <input required className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-sm" value={formData.patientName} onChange={e => setFormData({...formData, patientName: e.target.value})} placeholder="Nombre completo" />
          </div>
          {showDoctor && (
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase">Médico Atendiente</label>
              <input required className="w-full bg-white border-2 border-amber-200 rounded-xl p-4 font-bold text-sm" value={formData.doctorName} onChange={e => setFormData({...formData, doctorName: e.target.value})} placeholder="Nombre del Médico" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-400 uppercase">Incidencia Reportada</label>
          <textarea required className="w-full bg-slate-50 border rounded-2xl p-6 font-bold text-sm h-32" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Describa el evento..." />
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-center justify-between p-6 bg-slate-50 rounded-2xl">
          <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">Calificación</label>
            <div className="flex gap-2">
               {[1,2,3,4,5].map(n => <button type="button" key={n} onClick={() => setFormData({...formData, satisfaction: n})} className={`w-10 h-10 rounded-lg font-black transition-all ${formData.satisfaction >= n ? 'bg-amber-500 text-white shadow-lg' : 'bg-white text-slate-300'}`}>{n}</button>)}
            </div>
          </div>
          <button disabled={loading} className="w-full md:w-auto px-12 py-5 neo-warm-button rounded-2xl font-black text-[10px] uppercase shadow-2xl">
            {loading ? 'Analizando...' : 'Registrar Auditoría'}
          </button>
        </div>
      </form>
    </div>
  );
};
