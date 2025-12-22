
import React, { useState, useMemo } from 'react';
import { Complaint, ComplaintStatus, Priority } from '../types';
import { analyzeComplaint } from '../services/geminiService';

interface ComplaintFormProps {
  onAdd: (complaint: Omit<Complaint, 'id'>) => void;
  onCancel: () => void;
  existingComplaints: Complaint[];
  specialties: string[];
  areas: string[];
  onUpdateLists: (type: 'specialties' | 'areas', newList: string[]) => void;
}

export const ComplaintForm: React.FC<ComplaintFormProps> = ({ 
  onAdd, onCancel, existingComplaints, specialties, areas, onUpdateLists 
}) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    patientName: '',
    doctorName: '',
    specialty: specialties[0] || '',
    area: areas[0] || '',
    description: '',
    status: ComplaintStatus.PENDIENTE,
    priority: Priority.MEDIA
  });
  
  const [analyzing, setAnalyzing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [newItemName, setNewItemName] = useState('');
  const [showAddList, setShowAddList] = useState<'specialties' | 'areas' | null>(null);

  const areaStats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const stats: Record<string, number> = {};
    areas.forEach(a => stats[a] = 0);
    existingComplaints.forEach(c => {
      if (new Date(c.date).getMonth() === currentMonth) stats[c.area] = (stats[c.area] || 0) + 1;
    });
    return stats;
  }, [existingComplaints, areas]);

  const handleAddListItem = () => {
    if (!newItemName.trim() || !showAddList) return;
    const currentList = showAddList === 'specialties' ? specialties : areas;
    if (!currentList.includes(newItemName)) {
      onUpdateLists(showAddList, [...currentList, newItemName]);
    }
    setNewItemName('');
    setShowAddList(null);
  };

  const handleRemoveListItem = (type: 'specialties' | 'areas', name: string) => {
    const currentList = type === 'specialties' ? specialties : areas;
    const newList = currentList.filter(i => i !== name);
    onUpdateLists(type, newList);
    
    if(type === 'areas' && formData.area === name) {
      setFormData({...formData, area: newList[0] || ''});
    } else if (type === 'specialties' && formData.specialty === name) {
      setFormData({...formData, specialty: newList[0] || ''});
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const followUp = new Date(formData.date);
    followUp.setDate(followUp.getDate() + 2); 
    onAdd({
      ...formData,
      managementResponse: aiSuggestion?.suggestedResponse || '',
      followUpDate: followUp.toISOString().split('T')[0]
    });
  };

  const handleAiAnalysis = async () => {
    if (!formData.description) return;
    setAnalyzing(true);
    const result = await analyzeComplaint(formData.description);
    setAiSuggestion(result);
    setAnalyzing(false);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-8 max-w-7xl mx-auto pb-20">
      <div className="flex-1 bg-white rounded-[40px] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden order-2 xl:order-1">
        <div className="bg-slate-900 p-10 text-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-10 text-6xl font-black italic">DAC</div>
          <h2 className="text-3xl font-black tracking-tight">Registro de Inconformidad</h2>
          <p className="text-blue-400 font-bold text-xs uppercase tracking-widest mt-1">SISTEMA DE CALIDAD INTEGRADO</p>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha del Incidente</label>
              <input 
                type="date" required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:border-blue-500 outline-none font-bold text-slate-800"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div className="md:col-span-2 space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre Completo del Paciente</label>
              <input 
                type="text" required placeholder="Ej: Juan Pérez"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:border-blue-500 outline-none font-bold text-slate-800"
                value={formData.patientName}
                onChange={(e) => setFormData({...formData, patientName: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Ubicación del Servicio</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Área de Atención</label>
                  <button type="button" onClick={() => setShowAddList('areas')} className="text-[10px] text-blue-600 font-bold hover:underline transition-all">+ Añadir Nueva</button>
                </div>
                <div className="flex gap-2">
                  <select 
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:border-blue-500 outline-none font-bold text-slate-800 appearance-none shadow-sm"
                    value={formData.area}
                    onChange={(e) => setFormData({...formData, area: e.target.value})}
                  >
                    {areas.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <button type="button" onClick={() => handleRemoveListItem('areas', formData.area)} className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all">✕</button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Cuerpo Médico</h3>
              <input 
                type="text" required placeholder="Médico responsable"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:border-blue-500 outline-none transition-all font-bold text-slate-800"
                value={formData.doctorName}
                onChange={(e) => setFormData({...formData, doctorName: e.target.value})}
              />
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Especialidad</label>
                  <button type="button" onClick={() => setShowAddList('specialties')} className="text-[10px] text-blue-600 font-bold hover:underline transition-all">+ Añadir Nueva</button>
                </div>
                <div className="flex gap-2">
                  <select 
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:border-blue-500 outline-none font-bold text-slate-800 appearance-none shadow-sm"
                    value={formData.specialty}
                    onChange={(e) => setFormData({...formData, specialty: e.target.value})}
                  >
                    {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button type="button" onClick={() => handleRemoveListItem('specialties', formData.specialty)} className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all">✕</button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Severidad del Reporte</label>
              <div className="grid grid-cols-4 gap-2">
                {Object.values(Priority).map(p => (
                  <button key={p} type="button" onClick={() => setFormData({...formData, priority: p})} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${formData.priority === p ? 'bg-blue-600 text-white border-blue-600 shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-200'}`}>{p}</button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado de Gestión</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none font-bold text-slate-800 shadow-sm" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as ComplaintStatus})}>
                <option value={ComplaintStatus.PENDIENTE}>🔴 Pendiente</option>
                <option value={ComplaintStatus.PROCESO}>🟡 En Proceso</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Descripción de la Queja</h3>
            <textarea required className="w-full bg-slate-50 border border-slate-200 rounded-[35px] p-8 focus:border-blue-500 outline-none min-h-[160px] text-lg font-medium text-slate-700 italic shadow-sm" placeholder="Detalle la inconformidad del paciente..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
            <div className="flex items-center gap-6 mt-4">
               <button type="button" onClick={handleAiAnalysis} disabled={!formData.description || analyzing} className="px-8 py-5 bg-white text-blue-600 rounded-2xl font-black text-[10px] border border-blue-100 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-3 uppercase tracking-widest shadow-sm">
                  {analyzing ? '⌛ Analizando...' : '⚡ DAC-AI Asistente'}
               </button>
               {aiSuggestion && (
                 <div className="flex-1 bg-blue-50/50 border border-blue-100 p-6 rounded-[30px] animate-in slide-in-from-left-4">
                   <p className="text-[10px] font-black text-blue-600 uppercase mb-2 tracking-widest">Sugerencia Operativa:</p>
                   <p className="text-sm text-slate-700 font-bold leading-relaxed">"{aiSuggestion.suggestedResponse}"</p>
                 </div>
               )}
            </div>
          </div>

          <div className="pt-10 border-t border-slate-100 flex gap-6">
            <button type="button" onClick={onCancel} className="px-10 py-5 text-slate-400 font-black uppercase tracking-widest hover:text-slate-600 transition-colors">Cancelar</button>
            <button type="submit" className="flex-1 py-6 bg-blue-600 text-white font-black text-xl uppercase tracking-widest rounded-[30px] shadow-2xl hover:bg-blue-500 transition-all">Guardar Reporte</button>
          </div>
        </form>
      </div>

      <div className="w-full xl:w-96 space-y-6 order-1 xl:order-2">
        <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-100">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-4xl mb-6 shadow-xl">📡</div>
          <h3 className="text-2xl font-black text-slate-900 leading-tight">Estado del Área</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Métricas de Frecuencia</p>
          <div className="mt-8 space-y-6">
            {Object.entries(areaStats).length === 0 ? (
               <p className="text-slate-400 text-xs italic">Aún no hay reportes para este mes...</p>
            ) : (
              (Object.entries(areaStats) as [string, number][]).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([area, count]) => (
                <div key={area} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-black text-slate-600">{area}</span>
                    <span className={`text-xs font-black ${count > 5 ? 'text-rose-500' : 'text-blue-500'}`}>{count}</span>
                  </div>
                  <div className="w-full bg-slate-50 h-3 rounded-full overflow-hidden border border-slate-100">
                    <div className={`h-full rounded-full transition-all duration-1000 ${count > 5 ? 'bg-rose-500' : 'bg-blue-600'}`} style={{ width: `${Math.min(100, (count / (existingComplaints.length || 1)) * 100)}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showAddList && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-[60]">
          <div className="bg-white rounded-[40px] p-12 w-full max-w-md shadow-2xl border border-white">
            <h4 className="text-2xl font-black text-slate-900 mb-6">Nuevo Elemento</h4>
            <input autoFocus className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 outline-none focus:border-blue-500 font-bold mb-8 text-slate-800" placeholder="Nombre..." value={newItemName} onChange={(e) => setNewItemName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddListItem()} />
            <div className="flex gap-4">
               <button onClick={() => setShowAddList(null)} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs tracking-widest">Cerrar</button>
               <button onClick={handleAddListItem} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest">Añadir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
