
import React, { useState, useEffect, useMemo } from 'react';
import { Complaint, ComplaintStatus, Priority, NoCallPatient } from '../types';
import { analyzeComplaint } from '../services/geminiService';
import { dbService } from '../services/apiService';

interface Props { 
  areas: string[]; 
  specialties: string[]; 
  onAdd: (c: Complaint) => void;
  noCallList: NoCallPatient[];
}

export const ComplaintForm: React.FC<Props> = ({ areas, specialties, onAdd, noCallList }) => {
  const [loading, setLoading] = useState(false);
  const [mappings, setMappings] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    patientName: '', patientPhone: '', doctorName: '', 
    specialty: specialties[0] || '', 
    area: areas[0] || '', managerName: '',
    description: '', status: ComplaintStatus.PENDIENTE, satisfaction: 3,
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    dbService.fetchAreasConfig().then(setMappings);
  }, []);

  useEffect(() => {
    const map = mappings.find(m => m.areaName === formData.area);
    if (map) {
      setFormData(prev => ({ ...prev, managerName: map.managerName }));
    } else {
      setFormData(prev => ({ ...prev, managerName: '' }));
    }
  }, [formData.area, mappings]);

  // Alerta de Lista Negra en tiempo real
  const isOnNoCallList = useMemo(() => {
    if (!formData.patientPhone && !formData.patientName) return false;
    return noCallList.some(p => 
      (formData.patientPhone && p.patientPhone === formData.patientPhone) || 
      (formData.patientName && p.patientName.toLowerCase() === formData.patientName.toLowerCase())
    );
  }, [formData.patientPhone, formData.patientName, noCallList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description) return;
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
    setFormData({ ...formData, patientName: '', description: '', patientPhone: '', doctorName: '', satisfaction: 3, date: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="glass-card bg-white p-6 md:p-12 border-orange-100 shadow-2xl relative overflow-hidden">
      {/* ALERTA DE SEGURIDAD LISTA NEGRA */}
      {isOnNoCallList && (
        <div className="mb-8 bg-rose-600 p-6 rounded-[2rem] border-4 border-rose-300 animate-pulse shadow-[0_0_30px_rgba(225,29,72,0.4)] flex items-center gap-6">
           <div className="text-4xl">🚫</div>
           <div>
              <h4 className="text-white font-black uppercase text-lg leading-none">Alerta de Seguridad DAC</h4>
              <p className="text-rose-100 font-bold text-[10px] uppercase mt-1 tracking-widest">Este paciente está registrado en la lista de NO LLAMAR. Proceda con extrema precaución.</p>
           </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-10">
        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-xl">📋</div>
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase">Gestión de Calidad DAC</h3>
          <p className="text-[9px] font-black uppercase text-slate-400 mt-1 tracking-widest">Reporte de Incidencia Hospitalaria</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Fecha del Reporte</label>
            <input type="date" required className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-sm" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Área del Evento</label>
            <select className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-sm" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})}>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Jefe Responsable (Auto)</label>
            <input disabled className="w-full bg-slate-100 border border-slate-200 rounded-xl p-4 font-black text-sm text-amber-600" value={formData.managerName || 'SIN ASIGNAR'} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Nombre del Paciente</label>
            <input required className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-sm" value={formData.patientName} onChange={e => setFormData({...formData, patientName: e.target.value})} placeholder="Nombre completo..." />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Teléfono / Celular</label>
            <input required className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-sm" value={formData.patientPhone} onChange={e => setFormData({...formData, patientPhone: e.target.value})} placeholder="Número de contacto..." />
          </div>
          <div className="space-y-1 md:col-span-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Médico / Personal</label>
            <input className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-sm" value={formData.doctorName} onChange={e => setFormData({...formData, doctorName: e.target.value})} placeholder="Dr. Nombre..." />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Relato de la Incidencia</label>
          <textarea required className="w-full bg-slate-50 border rounded-2xl p-6 font-bold text-sm h-32 focus:ring-2 ring-amber-500 outline-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Describa detalladamente lo ocurrido..." />
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-center justify-between p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
          <div className="space-y-3">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Grado de Satisfacción</label>
            <div className="flex gap-2">
               {[1,2,3,4,5].map(n => (
                 <button type="button" key={n} onClick={() => setFormData({...formData, satisfaction: n})} className={`w-12 h-12 rounded-xl font-black text-lg transition-all ${formData.satisfaction >= n ? 'bg-amber-500 text-white shadow-lg' : 'bg-white text-slate-300'}`}>
                   {n}
                 </button>
               ))}
            </div>
          </div>
          <button disabled={loading} className="w-full md:w-auto px-16 py-6 neo-warm-button rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl disabled:opacity-50">
            {loading ? 'ANALIZANDO...' : 'GRABAR REPORTE'}
          </button>
        </div>
      </form>
    </div>
  );
};
