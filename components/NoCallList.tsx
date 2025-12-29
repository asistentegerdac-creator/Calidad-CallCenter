
import React, { useState } from 'react';
import { NoCallPatient } from '../types';
import { dbService } from '../services/apiService';

interface Props {
  noCallList: NoCallPatient[];
  isOnline: boolean;
  onRefresh: () => void;
}

export const NoCallList: React.FC<Props> = ({ noCallList, isOnline, onRefresh }) => {
  const [formData, setFormData] = useState({
    patientName: '',
    patientPhone: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientName || !formData.patientPhone) return;
    
    setLoading(true);
    const newPatient: NoCallPatient = {
      id: `NC-${Date.now()}`,
      patientName: formData.patientName,
      patientPhone: formData.patientPhone,
      reason: formData.reason,
      registeredAt: new Date().toISOString()
    };

    if (isOnline) {
      await dbService.saveNoCallPatient(newPatient);
      onRefresh();
      setFormData({ patientName: '', patientPhone: '', reason: '' });
    } else {
      alert("Debe estar online para registrar en la lista de No Llamar.");
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este paciente de la lista de No Llamar?")) return;
    if (isOnline) {
      await dbService.deleteNoCallPatient(id);
      onRefresh();
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="glass-card p-10 bg-white shadow-xl border border-slate-100">
        <h3 className="text-xl font-black uppercase text-slate-900 flex items-center gap-3 mb-8">
           <span className="w-10 h-10 bg-rose-500 rounded-2xl flex items-center justify-center text-white text-lg shadow-lg">📵</span>
           Registrar en Lista "No Llamar"
        </h3>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Nombre del Paciente</label>
              <input 
                required 
                className="w-full bg-slate-50 border rounded-xl p-4 font-bold text-sm" 
                value={formData.patientName} 
                onChange={e => setFormData({...formData, patientName: e.target.value})} 
                placeholder="Nombre completo"
              />
           </div>
           <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Teléfono / Celular</label>
              <input 
                required 
                className="w-full bg-slate-50 border rounded-xl p-4 font-bold text-sm" 
                value={formData.patientPhone} 
                onChange={e => setFormData({...formData, patientPhone: e.target.value})} 
                placeholder="Ej: 999888777"
              />
           </div>
           <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Motivo (Opcional)</label>
              <input 
                className="w-full bg-slate-50 border rounded-xl p-4 font-bold text-sm" 
                value={formData.reason} 
                onChange={e => setFormData({...formData, reason: e.target.value})} 
                placeholder="Ej: Prefiere correo"
              />
           </div>
           <div className="md:col-span-3">
              <button 
                disabled={loading || !isOnline} 
                className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl hover:bg-rose-700 transition-all disabled:opacity-50"
              >
                {loading ? 'PROCESANDO...' : 'AGREGAR A LISTA DE RESTRICCIÓN'}
              </button>
           </div>
        </form>
      </div>

      <div className="glass-card p-10 bg-white border border-slate-100">
         <h4 className="text-sm font-black text-slate-900 uppercase mb-6 tracking-widest">Pacientes Restringidos</h4>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="text-[9px] font-black text-slate-400 uppercase border-b">
                     <th className="pb-4">Paciente</th>
                     <th className="pb-4">Teléfono</th>
                     <th className="pb-4">Motivo</th>
                     <th className="pb-4 text-right">Acciones</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {noCallList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-400 font-black uppercase text-[10px]">No hay pacientes restringidos</td>
                    </tr>
                  ) : (
                    noCallList.map(p => (
                      <tr key={p.id} className="text-xs">
                         <td className="py-4 font-bold text-slate-900 uppercase">{p.patientName}</td>
                         <td className="py-4 text-slate-500 font-bold">{p.patientPhone}</td>
                         <td className="py-4 text-slate-400 italic font-medium">{p.reason || 'Sin motivo especificado'}</td>
                         <td className="py-4 text-right">
                            <button onClick={() => handleDelete(p.id)} className="text-rose-500 hover:text-rose-700 font-black">ELIMINAR</button>
                         </td>
                      </tr>
                    ))
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};
