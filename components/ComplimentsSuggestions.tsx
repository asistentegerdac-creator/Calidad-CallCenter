
import React, { useState, useMemo } from 'react';
import { Complaint, ComplaintStatus, ComplaintType, User } from '../types';
import { getCurrentTimeInTimezone } from '../src/utils/timeUtils';

interface Props {
  complaints: Complaint[];
  currentUser: User | null;
  onUpdateFull: (c: Complaint) => void;
  onDelete: (id: string) => void;
  timezone: string;
  areas: string[];
  users: User[];
}

export const ComplimentsSuggestions: React.FC<Props> = ({ 
  complaints, currentUser, onUpdateFull, onDelete, timezone, areas, users
}) => {
  const [activeTab, setActiveTab] = useState<ComplaintType>(ComplaintType.FELICITACION);
  const [filterArea, setFilterArea] = useState('Todas');
  const [filterManager, setFilterManager] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [isApplicable, setIsApplicable] = useState<boolean | null>(null);
  const [reason, setReason] = useState('');
  const [implementationDetail, setImplementationDetail] = useState('');
  const [referredArea, setReferredArea] = useState('');

  const filtered = useMemo(() => {
    return complaints.filter(c => {
      const type = (c.complaintType || '').toLowerCase();
      const dim = (c.dimension || '').toLowerCase();
      
      let matchesTab = false;
      if (activeTab === ComplaintType.FELICITACION) {
        matchesTab = type === 'felicitación' || type === 'felicitacion' || dim.includes('felicitaci');
      } else {
        matchesTab = type === 'sugerencia' || dim.includes('sugerencia');
      }

      if (!matchesTab) return false;

      const matchArea = filterArea === 'Todas' ? true : c.area === filterArea;
      const matchManager = filterManager === 'Todas' ? true : c.managerName === filterManager;
      const matchStatus = filterStatus === 'Todos' ? true : c.status === filterStatus;

      return matchArea && matchManager && matchStatus;
    });
  }, [complaints, activeTab, filterArea, filterManager, filterStatus]);

  const handleMarkAsRead = (c: Complaint) => {
    onUpdateFull({
      ...c,
      status: ComplaintStatus.LEIDO,
      resolvedBy: currentUser?.name || 'Sistema',
      resolvedAt: getCurrentTimeInTimezone(timezone)
    });
  };

  const handleSaveSuggestionResponse = () => {
    if (selected && isApplicable !== null) {
      if (!isApplicable && !reason.trim()) {
        alert("Por favor indique el motivo de por qué no es aplicable.");
        return;
      }

      if (isApplicable && (!implementationDetail.trim() || !referredArea.trim())) {
        alert("Por favor complete el detalle de implementación y el área derivada.");
        return;
      }

      onUpdateFull({
        ...selected,
        status: ComplaintStatus.RESUELTO,
        isApplicable: isApplicable,
        notApplicableReason: isApplicable ? '' : reason,
        implementationDetail: isApplicable ? implementationDetail : '',
        referredArea: isApplicable ? referredArea : '',
        resolvedBy: currentUser?.name || 'Sistema',
        resolvedAt: getCurrentTimeInTimezone(timezone),
        managementResponse: isApplicable ? `Aplicable - Derivado a: ${referredArea}` : `No Aplicable: ${reason}`
      });
      setSelected(null);
      setIsApplicable(null);
      setReason('');
      setImplementationDetail('');
      setReferredArea('');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="glass-card bg-white p-8 shadow-sm border border-slate-100 no-print flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex-1">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Felicitaciones y Sugerencias</h3>
          <p className="text-[10px] font-black uppercase text-slate-400 mt-1 tracking-widest">Panel de Reconocimiento y Mejora Continua</p>
        </div>
        
        <div className="flex flex-wrap gap-4 items-end w-full md:w-auto">
          <div className="flex-1 md:flex-none space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Jefatura</label>
            <select 
              className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl p-3 text-[10px] font-bold shadow-sm min-w-[140px]" 
              value={filterManager} 
              onChange={e => setFilterManager(e.target.value)}
            >
              <option value="Todas">Todas</option>
              {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          </div>

          <div className="flex-1 md:flex-none space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Área</label>
            <select 
              className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl p-3 text-[10px] font-bold shadow-sm min-w-[140px]" 
              value={filterArea} 
              onChange={e => setFilterArea(e.target.value)}
            >
              <option value="Todas">Todas</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="flex-1 md:flex-none space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Estado</label>
            <select 
              className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl p-3 text-[10px] font-bold shadow-sm min-w-[120px]" 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="Todos">Todos</option>
              <option value={ComplaintStatus.PENDIENTE}>{ComplaintStatus.PENDIENTE}</option>
              <option value={ComplaintStatus.LEIDO}>{ComplaintStatus.LEIDO}</option>
              <option value={ComplaintStatus.RESUELTO}>{ComplaintStatus.RESUELTO}</option>
            </select>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 h-[46px] items-center">
            {[ComplaintType.FELICITACION, ComplaintType.SUGERENCIA].map(type => (
              <button
                key={type}
                onClick={() => { setActiveTab(type); setSelected(null); }}
                className={`px-6 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${activeTab === type ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {type}S
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full py-20 text-center glass-card bg-white border-dashed border-2 border-slate-200">
             <p className="text-slate-400 font-black uppercase text-[10px]">No hay {activeTab.toLowerCase()}s registradas</p>
          </div>
        ) : (
          filtered.map(c => (
            <div key={c.id} className="glass-card bg-white p-8 border-t-[6px] border-slate-900 hover:shadow-2xl transition-all flex flex-col min-h-[300px]">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{c.id}</span>
                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${c.status === ComplaintStatus.LEIDO || c.status === ComplaintStatus.RESUELTO ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white'}`}>
                  {c.status}
                </span>
              </div>
              
              <div className="mb-6">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Área</p>
                <h4 className="text-sm font-black text-slate-900 uppercase">{c.area}</h4>
              </div>

              {activeTab === ComplaintType.SUGERENCIA && (
                <div className="mb-6">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Paciente</p>
                  <p className="text-xs font-bold text-slate-700">{c.patientName}</p>
                </div>
              )}

              {activeTab === ComplaintType.FELICITACION && c.patientName && (
                <div className="mb-6">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">De:</p>
                  <p className="text-xs font-bold text-slate-700">{c.patientName}</p>
                </div>
              )}

              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex-1 mb-6">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  {activeTab === ComplaintType.FELICITACION ? 'Detalle' : 'Sugerencia'}
                </p>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">"{c.description}"</p>
              </div>

              <div className="pt-6 border-t border-slate-100">
                {activeTab === ComplaintType.FELICITACION ? (
                  c.status !== ComplaintStatus.LEIDO ? (
                    <button 
                      onClick={() => handleMarkAsRead(c)}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg"
                    >
                      Marcar como Leído
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-emerald-600 font-black text-[10px] uppercase">
                      <span>✓</span> Leído por {c.resolvedBy}
                    </div>
                  )
                ) : (
                  c.status !== ComplaintStatus.RESUELTO ? (
                    <button 
                      onClick={() => setSelected(c)}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg"
                    >
                      Gestionar Sugerencia
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className={`text-center py-2 rounded-xl text-[9px] font-black uppercase ${c.isApplicable ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {c.isApplicable ? 'Aplicable' : 'No Aplicable'}
                      </div>
                      {!c.isApplicable && (
                        <p className="text-[10px] text-slate-400 italic text-center">"{c.notApplicableReason}"</p>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-lg flex items-center justify-center p-4 z-[500] animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md p-10 rounded-[2.5rem] shadow-2xl relative border border-white/20">
            <button onClick={() => setSelected(null)} className="absolute top-6 right-6 text-2xl font-light text-slate-300 hover:text-rose-500 transition-all">✕</button>
            
            <div className="mb-8">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Gestionar Sugerencia</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">ID: {selected.id}</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">¿Es aplicable?</label>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setIsApplicable(true)}
                    className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase transition-all ${isApplicable === true ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                  >
                    Sí
                  </button>
                  <button 
                    onClick={() => setIsApplicable(false)}
                    className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase transition-all ${isApplicable === false ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                  >
                    No
                  </button>
                </div>
              </div>

              {isApplicable === true && (
                <div className="space-y-4 animate-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Área a la que se deriva</label>
                    <input 
                      className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl text-sm font-bold outline-none"
                      placeholder="Ej: Admisión, Limpieza..."
                      value={referredArea}
                      onChange={e => setReferredArea(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Descargo de implementación</label>
                    <textarea 
                      className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl text-sm font-bold outline-none h-24"
                      placeholder="Describa cómo se aplicará esta sugerencia..."
                      value={implementationDetail}
                      onChange={e => setImplementationDetail(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {isApplicable === false && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Motivo</label>
                  <textarea 
                    className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-rose-500 rounded-2xl text-sm font-bold outline-none h-24"
                    placeholder="Indique por qué no se puede aplicar..."
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                  />
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => { setSelected(null); setIsApplicable(null); setReason(''); setImplementationDetail(''); setReferredArea(''); }}
                  className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  disabled={isApplicable === null}
                  onClick={handleSaveSuggestionResponse}
                  className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl disabled:opacity-50"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
