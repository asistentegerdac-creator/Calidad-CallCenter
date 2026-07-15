
import React, { useState, useMemo, useEffect } from 'react';
import { Complaint, ComplaintStatus, User, NoCallPatient, Priority, DimensionCatalogEntry } from '../types';
import { dbService } from '../services/apiService';
import { getCurrentTimeInTimezone } from '../src/utils/timeUtils';

interface Props { 
  complaints: Complaint[]; 
  currentUser: User | null;
  onUpdateFull: (c: Complaint) => void;
  onDelete: (id: string) => void;
  isOnline: boolean;
  areas: string[];
  specialties: string[];
  onRefresh?: () => void;
  timezone: string;
  onPreviewImage?: (img: string) => void;
  users?: User[];
  dimensions: DimensionCatalogEntry[];
  onAddDimension: (dimension: string, subDimension: string) => void;
}

// Componente de Tarjeta Memoizado para mejor rendimiento
const ComplaintCard = React.memo(({ 
  c, 
  currentUser, 
  isNoCall, 
  onSelect, 
  onEdit, 
  onDerive, 
  onPreviewImage,
  getStatusBadgeClass
}: { 
  c: Complaint, 
  currentUser: User | null, 
  isNoCall: boolean, 
  onSelect: (c: Complaint) => void, 
  onEdit: (c: Complaint) => void,
  onDerive: (c: Complaint) => void,
  onPreviewImage: (img: string) => void,
  getStatusBadgeClass: (status: ComplaintStatus, isObserved?: boolean) => string
}) => {
  return (
    <div className={`glass-card bg-white p-6 border-t-[6px] hover:shadow-2xl transition-all duration-300 relative flex flex-col min-h-[380px] cursor-pointer group hover:scale-[1.05] hover:z-30 ${isNoCall ? 'ring-2 ring-rose-500 ring-offset-4' : ''} ${c.isObserved ? 'border-rose-600 bg-rose-50/30 ring-2 ring-rose-600 ring-offset-2' : ''}`} 
         style={{ borderTopColor: c.isObserved ? '#e11d48' : (c.status === ComplaintStatus.PENDIENTE ? '#f97316' : c.status === ComplaintStatus.PROCESO ? '#2563eb' : '#10b981') }}
         onClick={() => onSelect(c)}>
      <div className="mb-4">
        <div className="flex justify-between items-start">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{c.id}</span>
          <div className="flex gap-2">
             {c.evidenceImages && c.evidenceImages.length > 0 && <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-blue-600 text-white flex items-center gap-1">🖼️ SUSTENTO</span>}
             {c.isObserved && <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-rose-600 text-white animate-pulse">OBSERVADO</span>}
             <span className={`px-2 py-0.5 rounded-full text-[8px] font-black text-white ${c.priority === 'Crítica' ? 'bg-rose-600 shadow-lg shadow-rose-200' : 'bg-slate-800'}`}>{c.priority}</span>
          </div>
        </div>
        <h4 className="text-xl font-black text-slate-900 leading-tight mt-2 group-hover:text-orange-600 transition-colors uppercase">{c.patientName}</h4>
        <p className="text-[10px] font-bold text-slate-400 mt-1">{c.date}</p>
        {isNoCall && <div className="mt-2 bg-rose-50 p-2 rounded-lg border border-rose-100 animate-pulse"><span className="text-rose-600 text-[9px] font-black uppercase">⚠️ RESTRICCIÓN: NO LLAMAR</span></div>}
      </div>
      <div className="space-y-3 mb-4">
         <div className="flex flex-wrap gap-2">
            <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 uppercase">{c.dimension}</span>
            <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 uppercase">{c.area}</span>
            {c.specialty && <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 uppercase">{c.specialty}</span>}
         </div>
         <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 group-hover:bg-slate-100 transition-colors">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">Personal Involucrado</p>
            <p className="text-[12px] font-black text-slate-900 uppercase truncate">Dr. {c.doctorName || 'No especificado'}</p>
         </div>
      </div>
      <div className="bg-slate-50/50 p-5 rounded-[1.5rem] border border-slate-100 flex-1 mb-5 overflow-hidden relative shadow-inner group-hover:bg-white transition-all group-hover:overflow-y-auto">
         {c.evidenceImages && c.evidenceImages.length > 0 && (
           <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
             {c.evidenceImages.slice(0, 3).map((img, idx) => (
               <img 
                 key={idx} 
                 src={img} 
                 className="w-10 h-10 object-cover rounded-lg border border-slate-200 cursor-zoom-in" 
                 alt="Sustento" 
                 onClick={(e) => { e.stopPropagation(); onPreviewImage?.(img); }}
               />
             ))}
             {c.evidenceImages.length > 3 && (
               <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center text-[8px] font-black text-slate-500">+{c.evidenceImages.length - 3}</div>
             )}
           </div>
         )}
         <p className="text-[12px] group-hover:text-[16px] text-slate-600 font-medium leading-relaxed line-clamp-4 group-hover:line-clamp-none transition-all duration-300">"{c.description}"</p>
      </div>
      <div className="pt-4 border-t border-slate-100 flex justify-between items-center mt-auto">
         <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider ${getStatusBadgeClass(c.status, c.isObserved)}`}>{c.status}</span>
         {(currentUser?.role === 'admin' || currentUser?.role === 'auditor') && (
           <div className="flex gap-2">
             <button 
               onClick={(e) => { e.stopPropagation(); onDerive(c); }} 
               className="p-2.5 bg-amber-500 text-slate-900 rounded-xl text-[9px] uppercase font-black hover:bg-amber-600 transition-all"
               title="Derivar a otro jefe"
             >
               Derivar
             </button>
             <button 
               onClick={(e) => { e.stopPropagation(); onEdit(c); }} 
               className="p-2.5 bg-slate-900 text-white rounded-xl text-[9px] uppercase font-black hover:bg-orange-500 transition-all"
             >
               Editar Ficha
             </button>
           </div>
         )}
      </div>
    </div>
  );
});

export const IncidencesReported: React.FC<Props> = ({ 
  complaints, currentUser, onUpdateFull, onDelete, areas, specialties, onRefresh, timezone, onPreviewImage, users = [], dimensions = [], onAddDimension 
}) => {
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [editing, setEditing] = useState<Complaint | null>(null);
  const [deriving, setDeriving] = useState<Complaint | null>(null);
  const [isVistaTotal, setIsVistaTotal] = useState(false);
  const [noCallList, setNoCallList] = useState<NoCallPatient[]>([]);
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setEvidenceImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };
  
  // Filtros
  const [filterManager, setFilterManager] = useState('Todos');
  const [filterArea, setFilterArea] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterDimension, setFilterDimension] = useState('Todas');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [tempStatus, setTempStatus] = useState<ComplaintStatus>(ComplaintStatus.PENDIENTE);
  const [tempResponse, setTempResponse] = useState('');
  const [evidenceImages, setEvidenceImages] = useState<string[]>([]);
  const [involvedPersonnel, setInvolvedPersonnel] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [correctiveMeasure, setCorrectiveMeasure] = useState('');
  const [correctiveMeasureOther, setCorrectiveMeasureOther] = useState('');
  const [tempDimension, setTempDimension] = useState('General');
  const [tempSubDimension, setTempSubDimension] = useState('');

  const [customDimension, setCustomDimension] = useState('');
  const [customSubDimension, setCustomSubDimension] = useState('');

  const uniqueDimensions = useMemo(() => {
    const dSet = new Set(dimensions.map(d => d.dimension));
    return Array.from(dSet);
  }, [dimensions]);

  const availableSubDimensionsEditing = useMemo(() => {
    if (!editing || !editing.dimension || editing.dimension === 'ADD_NEW_DIM') return [];
    const filtered = dimensions.filter(d => d.dimension === editing.dimension);
    const sSet = new Set(filtered.map(d => d.subDimension));
    return Array.from(sSet).filter(Boolean);
  }, [dimensions, editing?.dimension]);

  const availableSubDimensionsResolving = useMemo(() => {
    if (!tempDimension || tempDimension === 'ADD_NEW_DIM') return [];
    const filtered = dimensions.filter(d => d.dimension === tempDimension);
    const sSet = new Set(filtered.map(d => d.subDimension));
    return Array.from(sSet).filter(Boolean);
  }, [dimensions, tempDimension]);

  useEffect(() => {
    dbService.fetchNoCallList().then(list => { if (list) setNoCallList(list); });
  }, []);

  useEffect(() => {
    if (selected) {
      setTempStatus(selected.status);
      setTempDimension(selected.dimension || 'General');
      setTempSubDimension(selected.subDimension || '');
      // Si es auditor o está observado, empezamos con campo vacío para nueva respuesta/observación
      const shouldClear = currentUser?.role === 'auditor' || selected.isObserved;
      setTempResponse(shouldClear ? '' : (selected.managementResponse || ''));
      setEvidenceImages([]);
      setInvolvedPersonnel(selected.involvedPersonnel || '');
      setActionTaken(selected.actionTaken || '');
      setCorrectiveMeasure(selected.correctiveMeasure || '');
      setCorrectiveMeasureOther(selected.correctiveMeasureOther || '');
    }
  }, [selected, currentUser]);

  const isNoCall = (phone: string, name: string) => {
    return noCallList.some(p => p.patientPhone === phone || (p.patientName && p.patientName.toLowerCase() === name.toLowerCase()));
  };

  const filtered = useMemo(() => {
    const statusOrder = {
      [ComplaintStatus.PENDIENTE]: 0,
      [ComplaintStatus.PROCESO]: 1,
      [ComplaintStatus.RESUELTO]: 2,
      [ComplaintStatus.CERRADO]: 3,
      [ComplaintStatus.LEIDO]: 4,
    };

    return [...complaints]
      .filter(c => {
        // Restricción para agentes: solo ven sus propios reclamos
        if (currentUser?.role === 'agent') {
          if (c.managerName !== currentUser.name) return false;
        }

        if (currentUser?.role === 'auditor' && !isVistaTotal) {
          if (c.isObserved) return false;
          if (c.status !== ComplaintStatus.RESUELTO) return false;
        }
        const matchManager = filterManager === 'Todos' ? true : c.managerName === filterManager;
        const matchArea = filterArea === 'Todas' ? true : c.area === filterArea;
        const matchStatus = filterStatus === 'Todos' ? true : (filterStatus === 'Observados' ? c.isObserved : c.status === filterStatus);
        const matchDimension = filterDimension === 'Todas' ? true : c.dimension === filterDimension;
        const matchDateFrom = dateFrom === '' ? true : c.date >= dateFrom;
        const matchDateTo = dateTo === '' ? true : c.date <= dateTo;
        
        // Refuerzo de seguridad: No mostrar felicitaciones ni sugerencias en este módulo
        const type = (c.complaintType || '').toLowerCase();
        const dim = (c.dimension || '').toLowerCase();
        const isSpecial = type.includes('felicitaci') || dim.includes('felicitaci') || 
                          type.includes('sugerencia') || dim.includes('sugerencia');
        if (isSpecial) return false;

        return matchManager && matchArea && matchStatus && matchDimension && matchDateFrom && matchDateTo;
      })
      .sort((a, b) => (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0));
  }, [complaints, filterManager, filterArea, filterStatus, filterDimension, dateFrom, dateTo, currentUser]);

  const managers = useMemo(() => Array.from(new Set(complaints.map(c => c.managerName).filter(Boolean))), [complaints]);

  const getStatusBadgeClass = (status: ComplaintStatus, isObserved?: boolean) => {
    if (isObserved && status === ComplaintStatus.PENDIENTE) return 'bg-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)] animate-pulse';
    switch(status) {
      case ComplaintStatus.PENDIENTE: return 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]';
      case ComplaintStatus.PROCESO: return 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]';
      case ComplaintStatus.RESUELTO: return 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]';
      case ComplaintStatus.CERRADO: return 'bg-slate-900 text-white shadow-[0_0_15px_rgba(15,23,42,0.4)]';
      default: return 'bg-slate-400 text-white';
    }
  };

  const handleFullEditSave = async () => {
    if (editing) {
      let finalDim = editing.dimension;
      let finalSub = editing.subDimension;

      if (editing.dimension === 'ADD_NEW_DIM') {
        if (!customDimension.trim()) {
          alert("Por favor ingrese la nueva dimensión.");
          return;
        }
        finalDim = customDimension.trim();
      }

      if (editing.subDimension === 'ADD_NEW_SUB_DIM') {
        if (!customSubDimension.trim()) {
          alert("Por favor ingrese la nueva subdimensión.");
          return;
        }
        finalSub = customSubDimension.trim();
      }

      if (editing.dimension === 'ADD_NEW_DIM' || editing.subDimension === 'ADD_NEW_SUB_DIM') {
        await onAddDimension(finalDim, finalSub || 'General');
      }

      const updated = {
        ...editing,
        dimension: finalDim,
        subDimension: finalSub || 'General'
      };

      onUpdateFull(updated);
      setEditing(null);
      setSelected(null);
      setCustomDimension('');
      setCustomSubDimension('');
    }
  };

  const handleQuickResolutionSave = async (auditAction?: 'observe' | 'close' | 'approve') => {
    if (selected) {
      if (selected.status === ComplaintStatus.CERRADO && currentUser?.role !== 'admin') {
        return alert("Este caso ya está cerrado y no se puede modificar.");
      }

      const history = selected.responseHistory || [];
      const newHistory = [...history];
      
      // Si el usuario es auditor
      if (currentUser?.role === 'auditor') {
        // Para observar o cerrar, el descargo es obligatorio (según lógica previa, pero el usuario pidió que para aprobar no sea obligatorio)
        if (auditAction !== 'approve' && !tempResponse.trim()) {
           return alert("Debe ingresar una observación.");
        }
        
        if (tempResponse.trim()) {
          newHistory.push({
            text: tempResponse,
            user: currentUser.name,
            timestamp: getCurrentTimeInTimezone(timezone),
            type: 'auditor'
          });
        }

        const isMarkingObserved = auditAction === 'observe';
        const isApproving = auditAction === 'approve';
        
        let finalDim = tempDimension;
        let finalSub = tempSubDimension;

        if (tempDimension === 'ADD_NEW_DIM') {
          if (!customDimension.trim()) {
            return alert("Por favor ingrese la nueva dimensión.");
          }
          finalDim = customDimension.trim();
        }

        if (tempSubDimension === 'ADD_NEW_SUB_DIM') {
          if (!customSubDimension.trim()) {
            return alert("Por favor ingrese la nueva subdimensión.");
          }
          finalSub = customSubDimension.trim();
        }

        if (tempDimension === 'ADD_NEW_DIM' || tempSubDimension === 'ADD_NEW_SUB_DIM') {
          await onAddDimension(finalDim, finalSub || 'General');
        }

        const updatedData: Complaint = {
          ...selected,
          status: (isApproving) ? ComplaintStatus.CERRADO : (isMarkingObserved ? ComplaintStatus.PENDIENTE : ComplaintStatus.CERRADO),
          isObserved: isMarkingObserved,
          responseHistory: newHistory,
          evidenceImages: [...(selected.evidenceImages || []), ...evidenceImages],
          resolvedBy: isMarkingObserved ? undefined : (selected.resolvedBy || currentUser.name),
          managementResponse: isMarkingObserved ? '' : selected.managementResponse,
          dimension: finalDim,
          subDimension: finalSub || 'General'
        };

        onUpdateFull(updatedData);
        setSelected(null);
        setCustomDimension('');
        setCustomSubDimension('');
        setTempResponse('');
        return;
      }

      // Si el usuario es manager/jefe (o admin)
      const missingFields: string[] = [];

      if (!tempResponse.trim()) {
        missingFields.push("- Detalles de la acción tomada / Seguimiento de control");
      }
      if (!involvedPersonnel.trim()) {
        missingFields.push("- Personal Involucrado");
      }
      if (!actionTaken.trim()) {
        missingFields.push("- Acción Tomada por Jefatura");
      }
      if (!correctiveMeasure) {
        missingFields.push("- Medida Correctiva");
      } else {
        if (correctiveMeasure === 'otra' && !correctiveMeasureOther.trim()) {
          missingFields.push("- Especificación de la otra medida correctiva");
        }
        if (correctiveMeasure === 'Memorandum' && (!evidenceImages || !evidenceImages.length)) {
          missingFields.push("- Sustento fotográfico (Imagen de evidencia obligatoria para la medida correctiva 'Memorandum')");
        }
      }

      if (missingFields.length > 0) {
        return alert(`No se puede guardar el descargo porque faltan cargar datos obligatorios:\n\n${missingFields.join('\n')}`);
      }

      newHistory.push({
        text: tempResponse,
        user: currentUser?.name || 'Administrador',
        timestamp: getCurrentTimeInTimezone(timezone),
        type: 'manager'
      });

      const updatedData: Complaint = {
        ...selected,
        status: tempStatus,
        managementResponse: tempResponse,
        responseHistory: newHistory,
        isObserved: false, // Al responder, deja de estar observado
        resolvedBy: currentUser?.name || 'Administrador',
        evidenceImages: [...(selected.evidenceImages || []), ...evidenceImages],
        involvedPersonnel: involvedPersonnel.trim(),
        actionTaken: actionTaken.trim(),
        correctiveMeasure: correctiveMeasure,
        correctiveMeasureOther: correctiveMeasure === 'Otra' ? correctiveMeasureOther.trim() : '',
      };
      
      if (updatedData.status === ComplaintStatus.RESUELTO && !updatedData.resolvedAt) {
        updatedData.resolvedAt = getCurrentTimeInTimezone(timezone);
      }
      
      onUpdateFull(updatedData);
      setSelected(null);
      setTempResponse('');
      setEvidenceImages([]);
      setInvolvedPersonnel('');
      setActionTaken('');
      setCorrectiveMeasure('');
      setCorrectiveMeasureOther('');
    }
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    setEditing(null);
    setSelected(null);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="glass-card bg-white p-6 md:p-8 shadow-sm border border-slate-100 no-print space-y-6">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-6 bg-orange-500 rounded-full"></span>
              Gestión Activa de Incidencias
            </h3>
            <div className="flex items-center gap-3">
              {currentUser?.role === 'auditor' && (
                <button 
                  onClick={() => setIsVistaTotal(!isVistaTotal)}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg ${
                    isVistaTotal 
                     ? 'bg-amber-500 text-slate-950' 
                     : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {isVistaTotal ? '👁️ Vista Total' : '🕶️ Vista Auditor'}
                </button>
              )}
              {onRefresh && <button onClick={onRefresh} className="bg-slate-900 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-black transition-all">Sincronizar Nodo</button>}
            </div>
         </div>

         {/* Barra de Filtros */}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
            <div className="space-y-1">
               <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Desde</label>
               <input type="date" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold outline-none" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
               <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Hasta</label>
               <input type="date" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold outline-none" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-1">
               <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Área</label>
               <select className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold outline-none" value={filterArea} onChange={e => setFilterArea(e.target.value)}>
                  <option value="Todas">Todas las Unidades</option>
                  {areas.map(a => <option key={a} value={a}>{a}</option>)}
               </select>
            </div>
            <div className="space-y-1">
               <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Jefatura</label>
               <select className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold outline-none" value={filterManager} onChange={e => setFilterManager(e.target.value)}>
                  <option value="Todos">Todos los Jefes</option>
                  {managers.map(m => <option key={String(m)} value={String(m)}>{String(m)}</option>)}
               </select>
            </div>
            <div className="space-y-1">
               <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Estado</label>
               <select className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="Todos">Todos</option>
                  <option value="Observados">SÓLO OBSERVADOS</option>
                  {Object.values(ComplaintStatus).map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
               </select>
            </div>
            <div className="space-y-1">
               <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Dimensión</label>
               <select className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold outline-none" value={filterDimension} onChange={e => setFilterDimension(e.target.value)}>
                  <option value="Todas">Todas</option>
                  {uniqueDimensions.map(d => <option key={d} value={d}>{d}</option>)}
               </select>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full py-20 text-center glass-card bg-white border-dashed border-2 border-slate-200">
             <p className="text-slate-400 font-black uppercase text-[10px]">Sin incidencias que coincidan con los filtros</p>
          </div>
        ) : (
          filtered.map(c => (
            <ComplaintCard 
              key={c.id}
              c={c}
              currentUser={currentUser}
              isNoCall={isNoCall(c.patientPhone, c.patientName)}
              onSelect={setSelected}
              onEdit={setEditing}
              onDerive={setDeriving}
              onPreviewImage={onPreviewImage || (() => {})}
              getStatusBadgeClass={getStatusBadgeClass}
            />
          ))
        )}
      </div>

      {/* MODAL DE DERIVACIÓN */}
      {deriving && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-lg flex items-center justify-center p-4 z-[600] animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md p-10 rounded-[2.5rem] shadow-2xl relative border border-white/20">
            <button onClick={() => setDeriving(null)} className="absolute top-6 right-6 text-2xl font-light text-slate-300 hover:text-rose-500 transition-all">✕</button>
            <div className="mb-6">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Derivar Reclamo</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">ID: {deriving.id}</p>
            </div>
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Asignar a Jefatura</label>
                <select 
                  className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-amber-500 rounded-2xl text-sm font-bold outline-none transition-all"
                  onChange={(e) => {
                    const newManager = e.target.value;
                    if (newManager) {
                      const updated = { ...deriving, managerName: newManager };
                      onUpdateFull(updated);
                      setDeriving(null);
                    }
                  }}
                  value={deriving.managerName || ''}
                >
                  <option value="">-- Seleccionar Jefe --</option>
                  {users.filter(u => u.role === 'agent' || u.role === 'admin').map(u => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                  ))}
                </select>
              </div>
              <p className="text-[9px] text-slate-400 italic">Al derivar este reclamo, el jefe anterior ya no podrá visualizarlo en su panel de gestión.</p>
              <button 
                onClick={() => setDeriving(null)}
                className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {(editing || selected) && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-lg flex items-center justify-center p-4 z-[500] animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl p-12 rounded-[3rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] relative overflow-y-auto max-h-[95vh] border border-white/20">
              <button onClick={() => { setEditing(null); setSelected(null); }} className="absolute top-8 right-8 text-3xl font-light text-slate-300 hover:text-rose-500 transition-all">✕</button>
              
              <div className="mb-10">
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                   {editing ? 'Modificar Registro Maestro' : 'Resolución de Expediente'}
                </h3>
                <div className="h-1.5 w-24 bg-orange-500 mt-4 rounded-full"></div>
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] mt-3">ID DAC: {(editing || selected)?.id}</p>
              </div>

              <div className="space-y-8">
                {editing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Fecha del Incidente</label>
                      <input type="date" className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-2xl text-sm font-bold transition-all outline-none" value={editing.date} onChange={e => setEditing({...editing, date: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nombre Paciente</label>
                      <input className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-2xl text-sm font-bold transition-all outline-none" value={editing.patientName} onChange={e => setEditing({...editing, patientName: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Teléfono de Contacto</label>
                      <input className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-2xl text-sm font-bold transition-all outline-none" value={editing.patientPhone} onChange={e => setEditing({...editing, patientPhone: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Área</label>
                      <select className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-2xl text-sm font-bold outline-none" value={editing.area} onChange={e => setEditing({...editing, area: e.target.value})}>
                        {areas.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Especialidad</label>
                      <select className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-2xl text-sm font-bold outline-none" value={editing.specialty} onChange={e => setEditing({...editing, specialty: e.target.value})}>
                        {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Médico Responsable</label>
                      <input className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-2xl text-sm font-bold transition-all outline-none" value={editing.doctorName} onChange={e => setEditing({...editing, doctorName: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Dimensión</label>
                      <select 
                        className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-2xl text-sm font-bold outline-none" 
                        value={editing.dimension || ''} 
                        onChange={e => setEditing({...editing, dimension: e.target.value, subDimension: ''})}
                      >
                        <option value="">-- Seleccione Dimensión --</option>
                        {uniqueDimensions.map(d => <option key={d} value={d}>{d}</option>)}
                        <option value="ADD_NEW_DIM" className="text-teal-600 font-bold">+ Agregar nueva...</option>
                      </select>
                      {editing.dimension === 'ADD_NEW_DIM' && (
                        <input 
                          required
                          className="w-full bg-teal-50 border border-teal-200 rounded-xl p-3 font-bold text-xs mt-1 outline-none"
                          placeholder="Escriba nueva dimensión..."
                          value={customDimension}
                          onChange={e => setCustomDimension(e.target.value)}
                        />
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Sub Dimensión</label>
                      <select 
                        className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-2xl text-sm font-bold outline-none" 
                        value={editing.subDimension || ''} 
                        onChange={e => setEditing({...editing, subDimension: e.target.value})}
                      >
                        <option value="">-- Seleccione Subdimensión --</option>
                        {availableSubDimensionsEditing.map(s => <option key={s} value={s}>{s}</option>)}
                        <option value="ADD_NEW_SUB_DIM" className="text-teal-600 font-bold">+ Agregar nueva...</option>
                      </select>
                      {editing.subDimension === 'ADD_NEW_SUB_DIM' && (
                        <input 
                          required
                          className="w-full bg-teal-50 border border-teal-200 rounded-xl p-3 font-bold text-xs mt-1 outline-none"
                          placeholder="Escriba nueva subdimensión..."
                          value={customSubDimension}
                          onChange={e => setCustomSubDimension(e.target.value)}
                        />
                      )}
                    </div>
                    <div className="space-y-1 md:col-span-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nivel de Prioridad</label>
                      <select className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-2xl text-sm font-bold transition-all outline-none" value={editing.priority} onChange={e => setEditing({...editing, priority: e.target.value as Priority})}>
                        {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Descripción del Incidente</label>
                      <textarea className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-[1.5rem] text-sm font-bold h-32 transition-all outline-none" value={editing.description} onChange={e => setEditing({...editing, description: e.target.value})} />
                    </div>
                    {editing.evidenceImages && editing.evidenceImages.length > 0 && (
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Imágenes de Sustento Existentes</label>
                        <div className="flex flex-wrap gap-2">
                          {editing.evidenceImages.map((img, idx) => (
                            <div key={idx} className="relative group">
                              <img src={img} alt="Sustento" className="w-20 h-20 object-cover rounded-xl border border-slate-200" />
                              <button onClick={() => setEditing({...editing, evidenceImages: editing.evidenceImages?.filter((_, i) => i !== idx)})} className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-100">×</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="md:col-span-2 flex flex-col md:flex-row gap-4 mt-6">
                      <button onClick={handleFullEditSave} className="flex-1 py-5 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-black transition-all">Guardar Cambios Maestros</button>
                      <button onClick={() => handleDelete(editing.id)} className="py-5 px-10 bg-rose-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-rose-700 transition-all">Eliminar Queja</button>
                      <button onClick={() => setEditing(null)} className="py-5 px-10 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase text-xs">Descartar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 italic">
                         <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Dimensión de Calidad</h4>
                         <p className="text-sm font-black text-slate-800 mb-3">{selected?.dimension}</p>
                         {selected?.subDimension && (
                           <>
                             <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Sub Dimensión</h4>
                             <p className="text-sm font-black text-slate-800 mb-3">{selected.subDimension}</p>
                           </>
                         )}
                         <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Relato Original</h4>
                         <p className="text-sm text-slate-700 leading-relaxed">"{selected?.description}"</p>
                      </div>

                      {selected?.evidenceImages && selected.evidenceImages.length > 0 && (
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Sustento (Imágenes)</label>
                           <div className="flex flex-wrap gap-2">
                              {selected.evidenceImages.map((img, idx) => (
                                <img key={idx} src={img} alt="Sustento" className="w-16 h-16 object-cover rounded-xl border border-slate-100 hover:scale-105 transition-all cursor-zoom-in" onClick={() => onPreviewImage?.(img)} />
                              ))}
                           </div>
                        </div>
                      )}
                    </div>

                    {/* HISTORIAL DE RESPUESTAS - Mostrar solo si hay historial y NO es auditor viendo un caso no resuelto */}
                    {((selected?.responseHistory && selected.responseHistory.length > 0) || selected?.managementResponse) && (
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Respuesta de Jefatura / Seguimiento</label>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                          {selected?.responseHistory && selected.responseHistory.map((entry, idx) => (
                            <div key={idx} className={`p-5 rounded-[1.5rem] border ${entry.type === 'auditor' ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                              <div className="flex justify-between items-center mb-2">
                                <span className={`text-[9px] font-black uppercase ${entry.type === 'auditor' ? 'text-rose-600' : 'text-slate-600'}`}>
                                  {entry.type === 'auditor' ? 'AUDITORÍA' : 'DESCARGO JEFATURA'}
                                </span>
                                <span className="text-[8px] text-slate-400 font-bold">{entry.timestamp}</span>
                              </div>
                              <p className="text-[11px] font-bold text-slate-800 mb-1">{entry.user}</p>
                              <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{entry.text}</p>
                            </div>
                          ))}
                          
                          {/* Mostrar managementResponse actual si no está en el historial (compatibilidad) */}
                          {selected?.managementResponse && (!selected.responseHistory || !selected.responseHistory.some(h => h.text === selected.managementResponse)) && (
                             <div className="p-5 rounded-[1.5rem] border bg-amber-50 border-amber-200">
                               <div className="flex justify-between items-center mb-2">
                                 <span className="text-[9px] font-black uppercase text-amber-600">ÚLTIMO DESCARGO (ACTUAL)</span>
                               </div>
                               <p className="text-xs text-slate-600 whitespace-pre-wrap">{selected.managementResponse}</p>
                             </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ENLACE/DETALLES COMPLEMENTARIOS PARA AUDITOR */}
                    {currentUser?.role === 'auditor' && (
                      <div className="bg-slate-100 p-6 rounded-3xl border border-slate-200 mb-6 space-y-4">
                        <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-3.5 bg-slate-900 rounded-full"></span>
                          Ficha Completa del Reclamo (Gestión de Jefatura)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm">
                            <span className="font-extrabold text-slate-400 block uppercase text-[9px] tracking-wider mb-1">Estado de la Gestión:</span>
                            <span className={`inline-block px-3 py-1 rounded-lg text-[9px] font-black tracking-wider uppercase border ${
                              selected?.status === ComplaintStatus.RESUELTO 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : selected?.status === ComplaintStatus.PROCESO 
                                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {selected?.status}
                            </span>
                          </div>
                          
                          <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm">
                            <span className="font-extrabold text-slate-400 block uppercase text-[9px] tracking-wider mb-1">Personal Involucrado:</span>
                            <span className="font-bold text-slate-800">{selected?.involvedPersonnel || 'No especificado'}</span>
                          </div>

                          <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm">
                            <span className="font-extrabold text-slate-400 block uppercase text-[9px] tracking-wider mb-1">Medida Correctiva:</span>
                            <span className="font-bold text-slate-800">
                              {selected?.correctiveMeasure === 'otra' ? selected?.correctiveMeasureOther : selected?.correctiveMeasure || 'No especificada'}
                            </span>
                          </div>

                          <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm">
                            <span className="font-extrabold text-slate-400 block uppercase text-[9px] tracking-wider mb-1">Acción Tomada:</span>
                            <span className="font-bold text-slate-800">{selected?.actionTaken || 'No especificada'}</span>
                          </div>
                        </div>
                        
                        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm">
                          <span className="font-extrabold text-slate-400 block uppercase text-[9px] tracking-wider mb-1">Detalles de la Acción Tomada / Descargo:</span>
                          <p className="font-medium text-slate-700 italic mt-1 leading-relaxed whitespace-pre-wrap bg-slate-50 p-3 rounded-xl border border-slate-100">
                            "{selected?.managementResponse || 'Sin detalles de descargo de la jefatura'}"
                          </p>
                        </div>
                      </div>
                    )}

                    {/* INTERFAZ PARA AUDITOR - Solo mostrar si es auditor Y el caso está RESUELTO */}
                    {currentUser?.role === 'auditor' ? (
                      selected?.status === ComplaintStatus.RESUELTO ? (
                        <div className="space-y-4 pt-6 border-t border-slate-100">
                          <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl">
                             <h4 className="text-white text-md font-black uppercase mb-4 flex items-center gap-2">
                               <span className="w-2 h-4 bg-rose-500 rounded-full"></span>
                               Panel de Auditoría
                             </h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                               <div className="space-y-1">
                                 <label className="text-[10px] font-black uppercase text-white/50 ml-2 tracking-widest">Dimensión</label>
                                 <select 
                                   className="w-full bg-slate-800 text-white border border-white/15 focus:border-rose-500 rounded-xl p-3 text-xs font-bold outline-none" 
                                   value={tempDimension} 
                                   onChange={e => setTempDimension(e.target.value)}
                                 >
                                   <option value="">-- Seleccione Dimensión --</option>
                                   {uniqueDimensions.map(d => <option key={d} value={d} className="bg-slate-900 text-white font-medium">{d}</option>)}
                                   <option value="ADD_NEW_DIM" className="text-teal-400 font-bold">+ Agregar nueva...</option>
                                 </select>
                                 {tempDimension === 'ADD_NEW_DIM' && (
                                   <input 
                                     required
                                     className="w-full bg-slate-800 text-white border border-white/15 focus:border-rose-500 rounded-xl p-3 text-xs font-bold mt-1 outline-none"
                                     placeholder="Nueva Dimensión..."
                                     value={customDimension}
                                     onChange={e => setCustomDimension(e.target.value)}
                                   />
                                 )}
                               </div>
                               <div className="space-y-1">
                                 <label className="text-[10px] font-black uppercase text-white/50 ml-2 tracking-widest">Sub Dimensión</label>
                                 <select 
                                   className="w-full bg-slate-800 text-white border border-white/15 focus:border-rose-500 rounded-xl p-3 text-xs font-bold outline-none" 
                                   value={tempSubDimension} 
                                   onChange={e => setTempSubDimension(e.target.value)}
                                 >
                                   <option value="">-- Seleccione Subdimensión --</option>
                                   {availableSubDimensionsResolving.map(s => <option key={s} value={s} className="bg-slate-900 text-white font-medium">{s}</option>)}
                                   <option value="ADD_NEW_SUB_DIM" className="text-teal-400 font-bold">+ Agregar nueva...</option>
                                 </select>
                                 {tempSubDimension === 'ADD_NEW_SUB_DIM' && (
                                   <input 
                                     required
                                     className="w-full bg-slate-800 text-white border border-white/15 focus:border-rose-500 rounded-xl p-3 text-xs font-bold mt-1 outline-none"
                                     placeholder="Nueva Subdimensión..."
                                     value={customSubDimension}
                                     onChange={e => setCustomSubDimension(e.target.value)}
                                   />
                                 )}
                               </div>
                             </div>
                             <textarea 
                               className="w-full bg-white/5 border border-white/10 focus:border-rose-500 rounded-[1.5rem] p-5 text-sm text-white font-medium outline-none transition-all placeholder:text-white/20 min-h-[120px]"
                               value={tempResponse}
                               onChange={e => setTempResponse(e.target.value)}
                               placeholder="Escriba su observación o dictamen de calidad..."
                             />
                             <div className="grid grid-cols-2 gap-3 mt-6">
                                <button 
                                  onClick={() => handleQuickResolutionSave('approve')}
                                  className="py-4 bg-emerald-500 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                                >
                                  Aprobar
                                </button>
                                <button 
                                  onClick={() => handleQuickResolutionSave('observe')}
                                  className="py-4 bg-rose-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-500/20"
                                >
                                  Observar
                                </button>
                             </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-8 p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-center">
                          <p className="text-slate-400 text-xs font-black uppercase tracking-widest leading-loose">
                            El auditor solo puede revisar casos en estado <span className="text-orange-500 font-black">RESUELTO</span>.<br/> 
                            Informa a la jefatura si el tiempo de respuesta ha excedido.
                          </p>
                        </div>
                      )
                    ) : ( 
                      /* INTERFAZ PARA JEFES / ADMIN */
                      <>
                        {selected?.isObserved && (
                          <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl mb-4 flex items-center gap-3">
                             <span className="text-xl">⚠️</span>
                             <div>
                               <p className="text-[10px] font-black text-rose-600 uppercase">Incidencia Observada por Auditoría</p>
                               <p className="text-[9px] font-bold text-rose-500 uppercase tracking-wider">Debe ingresar un nuevo descargo detallado.</p>
                             </div>
                          </div>
                        )}
                        <div className="space-y-4">
                           <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Estado de Gestión</label>
                           <div className="flex gap-4">
                             {[ComplaintStatus.PENDIENTE, ComplaintStatus.PROCESO, ComplaintStatus.RESUELTO].map(s => (
                               <button 
                                 key={s} 
                                 type="button"
                                 onClick={() => setTempStatus(s)} 
                                 className={`flex-1 py-4 rounded-[1.5rem] text-[10px] font-black uppercase transition-all border-2 ${tempStatus === s ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-105' : 'bg-white border-slate-100 text-slate-300'}`}
                               >
                                 {s}
                               </button>
                             ))}
                           </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">
                                  Personal Involucrado <span className="text-rose-500">*</span>
                               </label>
                               <input 
                                 className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl p-4 text-sm font-bold outline-none transition-all"
                                 value={involvedPersonnel}
                                 onChange={e => setInvolvedPersonnel(e.target.value)}
                                 placeholder="Nombre de la persona involucrada..."
                               />
                            </div>
                            
                            <div className="space-y-2 mb-3">
                               <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">
                                  Medida Correctiva <span className="text-rose-500">*</span>
                               </label>
                               <select 
                                 className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl p-4 text-sm font-bold outline-none transition-all"
                                 value={correctiveMeasure}
                                 onChange={e => setCorrectiveMeasure(e.target.value)}
                               >
                                  <option value="">-- Seleccione Medida --</option>
                                  <option value="Llamada de Atenciòn Verbal">Llamada de Atención Verbal</option>
                                  <option value="Memorandum">Memorandum</option>
                                  <option value="Suspenciòn">Suspensión</option>
                                  <option value="otra">Otra</option>
                               </select>
                            </div>
                         </div>

                         {correctiveMeasure === 'otra' && (
                            <div className="space-y-2 mb-3">
                               <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">
                                  Especifique Medida Correctiva <span className="text-rose-500">*</span>
                               </label>
                               <input 
                                 className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl p-4 text-sm font-bold outline-none transition-all"
                                 value={correctiveMeasureOther}
                                 onChange={e => setCorrectiveMeasureOther(e.target.value)}
                                 placeholder="Describa la medida correctiva adoptada..."
                               />
                            </div>
                         )}

                         <div className="space-y-2 mb-3">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">
                               Acción Tomada por Jefatura <span className="text-rose-500">*</span>
                            </label>
                            <input 
                              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl p-4 text-sm font-bold outline-none transition-all"
                              value={actionTaken}
                              onChange={e => setActionTaken(e.target.value)}
                              placeholder="Ej: se hizo recomendación, se sancionó con memorandum, etc."
                            />
                         </div>

                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Detalles de la acción tomada / Seguimiento de control</label>
                           <textarea 
                             className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[2rem] p-6 text-sm font-bold min-h-[180px] outline-none transition-all shadow-inner" 
                             value={tempResponse} 
                             onChange={e => setTempResponse(e.target.value)} 
                             placeholder="Ingrese su nuevo descargo o rectificación..." 
                           />
                        </div>

                        <div className="space-y-3">
                           <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Sustento (Imágenes)</label>
                           <div className="flex flex-wrap gap-4 mb-4">
                             {evidenceImages.map((img, idx) => (
                               <div key={idx} className="relative group">
                                 <img src={img} alt="Sustento" className="w-20 h-20 object-cover rounded-xl border-2 border-slate-200" />
                                 <button onClick={() => setEvidenceImages(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                               </div>
                             ))}
                             <label className="w-20 h-20 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-all text-slate-300 hover:text-blue-500 hover:border-blue-500">
                               <span className="text-xl font-bold">+</span>
                               <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                             </label>
                           </div>
                        </div>

                        <button 
                          onClick={() => handleQuickResolutionSave()} 
                          className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs tracking-[0.3em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all"
                        >
                          Registrar Descargo y Actualizar
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
