
import React, { useState } from 'react';
import { Complaint, ComplaintStatus } from '../types';

interface ComplaintListProps {
  complaints: Complaint[];
  onUpdateStatus: (id: string, status: ComplaintStatus, response?: string) => void;
}

export const ComplaintList: React.FC<ComplaintListProps> = ({ complaints, onUpdateStatus }) => {
  const [filter, setFilter] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editResponse, setEditResponse] = useState<string>('');
  const [editStatus, setEditStatus] = useState<ComplaintStatus>(ComplaintStatus.PENDIENTE);

  const filtered = complaints.filter(c => 
    c.patientName.toLowerCase().includes(filter.toLowerCase()) ||
    c.doctorName.toLowerCase().includes(filter.toLowerCase()) ||
    c.specialty.toLowerCase().includes(filter.toLowerCase())
  );

  const handleEdit = (complaint: Complaint) => {
    setEditingId(complaint.id);
    setEditResponse(complaint.managementResponse || '');
    setEditStatus(complaint.status);
  };

  const handleSave = () => {
    if (editingId) {
      onUpdateStatus(editingId, editStatus, editResponse);
      setEditingId(null);
    }
  };

  const getStatusColor = (status: ComplaintStatus) => {
    switch (status) {
      case ComplaintStatus.PENDIENTE: return 'bg-rose-50 text-rose-500 border-rose-100';
      case ComplaintStatus.PROCESO: return 'bg-amber-50 text-amber-500 border-amber-100';
      case ComplaintStatus.RESUELTO: return 'bg-sky-50 text-sky-500 border-sky-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  return (
    <div className="bg-white rounded-[40px] border border-sky-50 shadow-xl shadow-sky-100/40 overflow-hidden">
      <div className="p-10 border-b border-sky-50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Expedientes de Calidad</h2>
          <p className="text-sm text-slate-400 font-medium">Gestionando {filtered.length} casos registrados.</p>
        </div>
        <div className="relative group">
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sky-400 group-focus-within:text-sky-600 transition-colors text-xl">🔍</span>
          <input 
            type="text" 
            placeholder="Buscar paciente o especialidad..." 
            className="pl-14 pr-6 py-4 bg-sky-50/50 border border-sky-100 rounded-3xl focus:ring-4 focus:ring-sky-500/10 focus:bg-white focus:outline-none w-full sm:w-96 transition-all font-medium text-slate-700"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-sky-50/30 text-sky-600/60 uppercase text-[10px] font-black tracking-[0.2em]">
              <th className="px-10 py-6">Datos de Atención</th>
              <th className="px-10 py-6">Referencia Médica</th>
              <th className="px-10 py-6">Inconformidad</th>
              <th className="px-10 py-6 text-center">Estado</th>
              <th className="px-10 py-6 text-right">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-50/40">
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-sky-50/20 transition-colors group">
                <td className="px-10 py-8">
                  <div className="font-black text-slate-800 text-lg mb-1">{c.patientName}</div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-sky-400 rounded-full"></span>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{c.area}</span>
                  </div>
                </td>
                <td className="px-10 py-8">
                  <div className="text-slate-700 font-bold">{c.doctorName}</div>
                  <div className="text-xs text-sky-500 font-black uppercase tracking-widest mt-1">{c.specialty}</div>
                </td>
                <td className="px-10 py-8 max-w-sm">
                  <p className="text-sm text-slate-500 line-clamp-2 italic">"{c.description}"</p>
                </td>
                <td className="px-10 py-8 text-center">
                  <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(c.status)}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-10 py-8 text-right">
                  <button 
                    onClick={() => handleEdit(c)}
                    className="w-12 h-12 bg-white border border-sky-100 rounded-2xl shadow-sm text-sky-500 hover:bg-sky-600 hover:text-white hover:shadow-sky-200 transition-all flex items-center justify-center mx-auto"
                  >
                    ➔
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-3xl overflow-hidden border border-white">
            <div className="p-10 border-b border-sky-50 flex items-center justify-between bg-sky-50/30">
              <div>
                <h3 className="text-3xl font-black text-slate-800">Responder Caso</h3>
                <p className="text-sky-600 font-bold text-sm">Folio: #{editingId.slice(-4)}</p>
              </div>
              <button onClick={() => setEditingId(null)} className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl text-slate-400 hover:text-rose-500 shadow-sm transition-colors">&times;</button>
            </div>
            
            <div className="p-12 space-y-10">
              <div className="grid grid-cols-2 gap-10">
                <div className="bg-sky-50/50 p-6 rounded-3xl border border-sky-100">
                  <label className="text-[10px] font-black text-sky-500 uppercase tracking-widest block mb-2">Paciente</label>
                  <p className="text-xl font-black text-slate-800">{complaints.find(c => c.id === editingId)?.patientName}</p>
                </div>
                <div className="bg-sky-50/50 p-6 rounded-3xl border border-sky-100">
                  <label className="text-[10px] font-black text-sky-500 uppercase tracking-widest block mb-2">Especialista</label>
                  <p className="text-xl font-black text-slate-800">{complaints.find(c => c.id === editingId)?.doctorName}</p>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-sky-500 uppercase tracking-widest block mb-4">Relato Original</label>
                <div className="p-8 bg-slate-50 rounded-[32px] text-slate-600 italic border border-slate-100 leading-relaxed text-lg">
                  "{complaints.find(c => c.id === editingId)?.description}"
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-black text-slate-800 mb-3 uppercase tracking-widest">Estado Resolutivo</label>
                  <select 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:border-sky-500 focus:outline-none transition-all font-bold"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as ComplaintStatus)}
                  >
                    <option value={ComplaintStatus.PENDIENTE}>🔴 Pendiente</option>
                    <option value={ComplaintStatus.PROCESO}>🟡 En Proceso</option>
                    <option value={ComplaintStatus.RESUELTO}>🔵 Resuelto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-800 mb-3 uppercase tracking-widest">Respuesta Jefatura</label>
                  <textarea 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:border-sky-500 focus:outline-none transition-all min-h-[120px] font-medium"
                    placeholder="Dictamen final del caso..."
                    value={editResponse}
                    onChange={(e) => setEditResponse(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="p-10 border-t border-sky-50 bg-sky-50/20 flex justify-end gap-6">
              <button onClick={() => setEditingId(null)} className="px-10 py-5 text-slate-400 font-black uppercase tracking-widest hover:text-slate-600 transition-colors">Cerrar</button>
              <button onClick={handleSave} className="px-12 py-5 bg-sky-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-sky-600/30 hover:bg-sky-700 transition-all">Actualizar Caso</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
