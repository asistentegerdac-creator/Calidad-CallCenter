
import React, { useState, useMemo, useEffect } from 'react';
import { Complaint, ComplaintStatus, User, NoCallPatient, Priority, DimensionCatalogEntry, AreaMapping } from '../types';
import { dbService } from '../services/apiService';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getCurrentTimeInTimezone } from '../src/utils/timeUtils';

interface Props { 
  complaints: Complaint[]; 
  areas: string[]; 
  specialties: string[];
  onUpdateFull: (c: Complaint) => void;
  onDelete: (id: string) => void;
  currentUser: User | null;
  timezone: string;
  onPreviewImage?: (img: string) => void;
  users?: User[];
  dimensions: DimensionCatalogEntry[];
  onAddDimension: (dimension: string, subDimension: string) => void;
  areaMappings?: AreaMapping[];
}

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const getMonthNameYear = (ymStr: string) => {
  if (!ymStr || !ymStr.includes('-')) return ymStr;
  const parts = ymStr.split('-');
  const y = parts[0];
  const mIndex = parseInt(parts[1], 10) - 1;
  if (mIndex >= 0 && mIndex < 12) {
    return `${MONTH_NAMES_ES[mIndex]} ${y}`;
  }
  return ymStr;
};

const getPastYMs = (ymRef: string, count: number): string[] => {
  if (!ymRef || !ymRef.includes('-')) return [];
  const parts = ymRef.split('-');
  let y = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10);
  const list: string[] = [];
  for (let i = 0; i < count; i++) {
    const ym = `${y}-${m < 10 ? '0' + m : m}`;
    list.push(ym);
    m--;
    if (m < 1) {
      m = 12;
      y--;
    }
  }
  return list;
};

const getComplaintYM = (c: Complaint): string | null => {
  if (!c || !c.date) return null;
  const clean = c.date.trim().substring(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    const m = parseInt(parts[1], 10);
    return `${parts[0]}-${m < 10 ? '0' + m : m}`;
  }
  return null;
};

const getComplaintDay = (c: Complaint): number => {
  if (!c || !c.date) return 0;
  const clean = c.date.trim().substring(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    return parseInt(parts[2], 10) || 0;
  }
  return 0;
};

const getWeekForDay = (day: number) => {
  if (day >= 1 && day <= 7) return { id: 1, name: 'Semana 1', range: 'Días 01 a 07' };
  if (day >= 8 && day <= 14) return { id: 2, name: 'Semana 2', range: 'Días 08 a 14' };
  if (day >= 15 && day <= 21) return { id: 3, name: 'Semana 3', range: 'Días 15 a 21' };
  if (day >= 22 && day <= 28) return { id: 4, name: 'Semana 4', range: 'Días 22 a 28' };
  return { id: 5, name: 'Semana 5', range: 'Días 29 a Fin de mes' };
};

// Componente de Fila Memoizado para mejor rendimiento
const ReportRow = React.memo(({ 
  c, 
  currentUser, 
  isNoCall, 
  onSelect, 
  onEdit, 
  onDerive, 
  onPreviewImage 
}: { 
  c: Complaint, 
  currentUser: User | null, 
  isNoCall: boolean, 
  onSelect: (c: Complaint) => void, 
  onEdit: (c: Complaint) => void,
  onDerive: (c: Complaint) => void,
  onPreviewImage?: (img: string) => void 
}) => {
  return (
    <tr 
      onClick={() => onSelect({...c})} 
      className={`hover:bg-slate-50 transition-colors group cursor-pointer ${c.isObserved ? 'bg-rose-50/50' : ''}`}
    >
      <td className="px-4 py-6">
        <p className="font-black text-slate-900 text-[11px] whitespace-nowrap">{c.date}</p>
        <p className="text-[8px] text-slate-400 font-bold">{c.id}</p>
      </td>
      <td className="px-4 py-6">
        <p className="font-black text-slate-900 text-[11px]">{c.dimension || 'General'}</p>
      </td>
      <td className="px-4 py-6">
        <p className="font-black text-slate-900 uppercase text-[11px] truncate max-w-[150px]">{c.patientName}</p>
        {isNoCall && <span className="text-rose-600 text-[7px] font-black block mt-1">📵 RESTRINGIDO</span>}
      </td>
      <td className="px-4 py-6">
        <div className="flex flex-col gap-2">
          <p className="text-[10px] text-slate-500 line-clamp-2 italic">"{c.description}"</p>
          {c.evidenceImages && c.evidenceImages.length > 0 && (
            <div className="flex gap-1 overflow-x-auto">
               {c.evidenceImages.slice(0, 3).map((img, idx) => (
                 <img 
                   key={idx} 
                   src={img} 
                   className="w-6 h-6 object-cover rounded border border-slate-200 cursor-zoom-in" 
                   alt="Sustento" 
                   onClick={(e) => { e.stopPropagation(); onPreviewImage?.(img); }}
                 />
               ))}
               {c.evidenceImages.length > 3 && <span className="text-[7px] text-slate-400 font-black">+{c.evidenceImages.length - 3}</span>}
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-6">
        <div className="flex flex-col gap-1">
          <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase inline-block whitespace-nowrap text-center ${
            c.status === ComplaintStatus.RESUELTO ? 'bg-emerald-100 text-emerald-700' : 
            c.status === ComplaintStatus.CERRADO ? 'bg-slate-900 text-white' :
            c.status === ComplaintStatus.PROCESO ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
          } ${c.isObserved ? 'border-2 border-rose-600 bg-rose-50 text-rose-700 animate-pulse' : ''}`}>
            {c.status}
          </span>
          {c.isObserved && (
            <span className="bg-rose-600 text-white text-[7px] font-black px-2 py-0.5 rounded text-center uppercase tracking-tighter">
              ⚠️ Observado
            </span>
          )}
          {c.evidenceImages && c.evidenceImages.length > 0 && (
            <span className="bg-blue-600 text-white text-[7px] font-black px-2 py-0.5 rounded text-center uppercase tracking-tighter">
              🖼️ Con Sustento
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-6 text-right">
         {(currentUser?.role === 'admin' || currentUser?.role === 'auditor') && (
           <div className="flex gap-2 justify-end">
              <button 
                onClick={(e) => { e.stopPropagation(); onDerive(c); }} 
                className="bg-amber-500 text-slate-900 px-3 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-amber-600 transition-all shadow-md"
                title="Derivar a otro jefe"
              >
                Derivar
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit({...c}); }} 
                className="bg-slate-900 text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-amber-600 transition-all shadow-md"
              >
                Editar
              </button>
           </div>
         )}
      </td>
    </tr>
  );
});

export const Reports: React.FC<Props> = ({ complaints, areas, specialties, onUpdateFull, onDelete, currentUser, timezone, onPreviewImage, users = [], dimensions = [], onAddDimension, areaMappings = [] }) => {
  const [filterManager, setFilterManager] = useState('Todos');
  const [filterArea, setFilterArea] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterDimension, setFilterDimension] = useState('Todas');
  const [filterType, setFilterType] = useState('Todos');
  const [dateFrom, setDateFrom] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'pending' | 'resolved' | 'all'>('pending');
  const [exportDateFrom, setExportDateFrom] = useState(dateFrom);
  const [exportDateTo, setExportDateTo] = useState(dateTo);

  const [noCallList, setNoCallList] = useState<NoCallPatient[]>([]);
  const [editing, setEditing] = useState<Complaint | null>(null);
  const [resolving, setResolving] = useState<Complaint | null>(null);
  const [deriving, setDeriving] = useState<Complaint | null>(null);
  const [isVistaTotal, setIsVistaTotal] = useState(false);
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

  // Estados para Análisis Comparativo y Semanal
  const [activeReportMode, setActiveReportMode] = useState<'list' | 'comparative'>('list');
  const [comparativeRange, setComparativeRange] = useState<'1month' | '3months' | '6months'>('1month');
  const [comparativeRefMonth, setComparativeRefMonth] = useState<string>('');
  const [comparativeArea, setComparativeArea] = useState<string>('Todas');
  const [weeklyMonth, setWeeklyMonth] = useState<string>('');

  const compAnalysis = useMemo(() => {
    const availableMonthsSet = new Set<string>();
    const now = new Date();
    const currentActualYM = `${now.getFullYear()}-${(now.getMonth() + 1 < 10 ? '0' : '') + (now.getMonth() + 1)}`;
    availableMonthsSet.add(currentActualYM);
    
    complaints.forEach(c => {
      const ym = getComplaintYM(c);
      if (ym) availableMonthsSet.add(ym);
    });

    const availableMonths = Array.from(availableMonthsSet).sort().reverse();
    const refYM = comparativeRefMonth || availableMonths[0] || currentActualYM;

    let currentYMs: string[] = [];
    let previousYMs: string[] = [];
    let labelCurrent = '';
    let labelPrevious = '';

    if (comparativeRange === '1month') {
      currentYMs = [refYM];
      const past2 = getPastYMs(refYM, 2);
      previousYMs = [past2[1] || refYM];
      labelCurrent = getMonthNameYear(refYM);
      labelPrevious = getMonthNameYear(previousYMs[0]);
    } else if (comparativeRange === '3months') {
      currentYMs = getPastYMs(refYM, 3);
      const past4 = getPastYMs(refYM, 4);
      const prevRef = past4[3] || refYM;
      previousYMs = getPastYMs(prevRef, 3);
      labelCurrent = `Últimos 3 Meses (${getMonthNameYear(currentYMs[currentYMs.length - 1])} - ${getMonthNameYear(currentYMs[0])})`;
      labelPrevious = `3 Meses Anteriores (${getMonthNameYear(previousYMs[previousYMs.length - 1])} - ${getMonthNameYear(previousYMs[0])})`;
    } else {
      currentYMs = getPastYMs(refYM, 6);
      const past7 = getPastYMs(refYM, 7);
      const prevRef = past7[6] || refYM;
      previousYMs = getPastYMs(prevRef, 6);
      labelCurrent = `Últimos 6 Meses (${getMonthNameYear(currentYMs[currentYMs.length - 1])} - ${getMonthNameYear(currentYMs[0])})`;
      labelPrevious = `6 Meses Anteriores (${getMonthNameYear(previousYMs[previousYMs.length - 1])} - ${getMonthNameYear(previousYMs[0])})`;
    }

    const incidencesOnly = complaints.filter(c => {
      const type = (c.complaintType || '').toLowerCase();
      const dim = (c.dimension || '').toLowerCase();
      const isFelicitacion = type.includes('felicitaci') || dim.includes('felicitaci');
      if (isFelicitacion) return false;
      if (comparativeArea !== 'Todas' && c.area !== comparativeArea) return false;
      if (currentUser?.role === 'agent' && c.managerName !== currentUser.name) return false;
      return true;
    });

    const filteredComplaintsCurrent = incidencesOnly.filter(c => {
      const ym = getComplaintYM(c);
      return ym && currentYMs.includes(ym);
    });

    const filteredComplaintsPrevious = incidencesOnly.filter(c => {
      const ym = getComplaintYM(c);
      return ym && previousYMs.includes(ym);
    });

    const totalCurrent = filteredComplaintsCurrent.length;
    const totalPrevious = filteredComplaintsPrevious.length;
    const totalDiff = totalCurrent - totalPrevious;
    let totalPctChange = 0;
    if (totalPrevious > 0) {
      totalPctChange = parseFloat(((totalDiff / totalPrevious) * 100).toFixed(1));
    } else if (totalCurrent > 0) {
      totalPctChange = 100;
    }

    const allAreaNamesSet = new Set<string>(areas);
    incidencesOnly.forEach(c => { if (c.area) allAreaNamesSet.add(c.area); });
    let areaList = Array.from(allAreaNamesSet);
    if (comparativeArea !== 'Todas') {
      areaList = areaList.filter(a => a === comparativeArea);
    }

    const ranking = areaList.map(areaName => {
      const curAreaItems = filteredComplaintsCurrent.filter(c => c.area === areaName);
      const prevAreaItems = filteredComplaintsPrevious.filter(c => c.area === areaName);

      const currentCount = curAreaItems.length;
      const previousCount = prevAreaItems.length;
      const diff = currentCount - previousCount;

      let pctChange = 0;
      if (previousCount > 0) {
        pctChange = parseFloat(((diff / previousCount) * 100).toFixed(1));
      } else if (currentCount > 0) {
        pctChange = 100;
      }

      let trend: 'AUMENTÓ' | 'DISMINUYÓ' | 'SIN CAMBIO' = 'SIN CAMBIO';
      if (diff > 0) trend = 'AUMENTÓ';
      else if (diff < 0) trend = 'DISMINUYÓ';

      const pending = curAreaItems.filter(c => c.status === ComplaintStatus.PENDIENTE || c.isObserved).length;
      const inProgress = curAreaItems.filter(c => c.status === ComplaintStatus.PROCESO).length;
      const resolved = curAreaItems.filter(c => c.status === ComplaintStatus.RESUELTO || c.status === ComplaintStatus.CERRADO).length;

      return {
        areaName,
        currentCount,
        previousCount,
        diff,
        pctChange,
        trend,
        pending,
        inProgress,
        resolved
      };
    });

    ranking.sort((a, b) => b.currentCount - a.currentCount || b.diff - a.diff);
    const topProblematicArea = ranking[0] || null;

    return {
      availableMonths,
      refYM,
      currentYMs,
      previousYMs,
      labelCurrent,
      labelPrevious,
      totalCurrent,
      totalPrevious,
      totalDiff,
      totalPctChange,
      ranking,
      topProblematicArea,
      filteredComplaintsCurrent,
      filteredComplaintsPrevious
    };
  }, [complaints, comparativeRange, comparativeRefMonth, comparativeArea, areas, currentUser]);

  const weeklyAnalysis = useMemo(() => {
    const targetMonth = weeklyMonth || compAnalysis.refYM;

    const monthComplaints = complaints.filter(c => {
      const type = (c.complaintType || '').toLowerCase();
      const dim = (c.dimension || '').toLowerCase();
      const isFelicitacion = type.includes('felicitaci') || dim.includes('felicitaci');
      if (isFelicitacion) return false;
      if (comparativeArea !== 'Todas' && c.area !== comparativeArea) return false;
      if (currentUser?.role === 'agent' && c.managerName !== currentUser.name) return false;

      const ym = getComplaintYM(c);
      return ym === targetMonth;
    });

    const totalMonthComplaints = monthComplaints.length;

    const weekBuckets = [
      { id: 1, name: 'Semana 1', range: 'Días 01 a 07', count: 0, items: [] as Complaint[] },
      { id: 2, name: 'Semana 2', range: 'Días 08 a 14', count: 0, items: [] as Complaint[] },
      { id: 3, name: 'Semana 3', range: 'Días 15 a 21', count: 0, items: [] as Complaint[] },
      { id: 4, name: 'Semana 4', range: 'Días 22 a 28', count: 0, items: [] as Complaint[] },
      { id: 5, name: 'Semana 5', range: 'Días 29 a Fin de mes', count: 0, items: [] as Complaint[] },
    ];

    monthComplaints.forEach(c => {
      const day = getComplaintDay(c);
      const week = getWeekForDay(day);
      const bucket = weekBuckets.find(b => b.id === week.id);
      if (bucket) {
        bucket.count++;
        bucket.items.push(c);
      }
    });

    const weeks = weekBuckets.map(w => {
      const pct = totalMonthComplaints > 0 ? (w.count / totalMonthComplaints) * 100 : 0;
      const areaCounts: Record<string, number> = {};
      w.items.forEach(i => {
        if (i.area) areaCounts[i.area] = (areaCounts[i.area] || 0) + 1;
      });

      let topArea = '';
      let maxAreaCount = 0;
      Object.entries(areaCounts).forEach(([aName, cnt]) => {
        if (cnt > maxAreaCount) {
          maxAreaCount = cnt;
          topArea = `${aName} (${cnt})`;
        }
      });

      return { ...w, pct, topArea };
    });

    let peakWeek = weeks[0];
    weeks.forEach(w => {
      if (w.count > peakWeek.count) {
        peakWeek = w;
      }
    });

    if (peakWeek && peakWeek.count === 0) peakWeek = null as any;

    const allAreasSet = new Set<string>(areas);
    monthComplaints.forEach(c => { if (c.area) allAreasSet.add(c.area); });
    let matrixAreaList = Array.from(allAreasSet);
    if (comparativeArea !== 'Todas') {
      matrixAreaList = matrixAreaList.filter(a => a === comparativeArea);
    }

    const areaMatrix = matrixAreaList.map(areaName => {
      const areaItems = monthComplaints.filter(c => c.area === areaName);
      let w1 = 0, w2 = 0, w3 = 0, w4 = 0, w5 = 0;
      areaItems.forEach(c => {
        const d = getComplaintDay(c);
        if (d >= 1 && d <= 7) w1++;
        else if (d >= 8 && d <= 14) w2++;
        else if (d >= 15 && d <= 21) w3++;
        else if (d >= 22 && d <= 28) w4++;
        else if (d >= 29) w5++;
      });
      return {
        areaName,
        w1, w2, w3, w4, w5,
        total: w1 + w2 + w3 + w4 + w5
      };
    }).sort((a, b) => b.total - a.total);

    return {
      targetMonth,
      totalMonthComplaints,
      weeks,
      peakWeek,
      areaMatrix
    };
  }, [complaints, weeklyMonth, compAnalysis.refYM, comparativeArea, areas, currentUser]);

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
    if (resolving || editing) {
      setEvidenceImages([]); // Initialize as empty for new uploads
      // Si es auditor o está observado, empezamos con campo vacío para nueva respuesta/observación
      const current = resolving || editing;
      if (current) {
        setTempDimension(current.dimension || 'General');
        setTempSubDimension(current.subDimension || '');
        const shouldClear = currentUser?.role === 'auditor' || current.isObserved;
        setTempResponse(shouldClear ? '' : (current.managementResponse || ''));
        setInvolvedPersonnel(current.involvedPersonnel || '');
        setActionTaken(current.actionTaken || '');
        setCorrectiveMeasure(current.correctiveMeasure || '');
        setCorrectiveMeasureOther(current.correctiveMeasureOther || '');
      }
    }
  }, [resolving, editing, currentUser]);

  const isNoCall = (phone: string, name: string) => {
    return noCallList.some(p => p.patientPhone === phone || (p.patientName && p.patientName.toLowerCase() === name.toLowerCase()));
  };

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

  const managers = useMemo(() => {
    const assignedManagerNames = new Set(
      (areaMappings || [])
        .filter(m => m.areaName && m.areaName.trim())
        .map(m => (m.managerName || '').trim())
        .filter(Boolean)
    );

    let list = (users || [])
      .filter(u => u.role !== 'auditor' && u.active !== false)
      .filter(u => {
        const uNameLower = u.name.trim().toLowerCase();
        return Array.from(assignedManagerNames).some(mName => mName.toLowerCase() === uNameLower);
      })
      .map(u => u.name.trim());

    // Fallback únicamente si el organigrama no tiene ninguna jefatura asignada aún
    if (list.length === 0 && (!areaMappings || areaMappings.length === 0) && users && users.length > 0) {
      list = users
        .filter(u => u.role !== 'auditor' && u.active !== false)
        .map(u => u.name.trim());
    }

    return Array.from(new Set(list)).sort();
  }, [users, areaMappings]);

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
        
        const type = (c.complaintType || '').toLowerCase();
        const dim = (c.dimension || '').toLowerCase();
        const isFelicitacion = type.includes('felicitaci') || dim.includes('felicitaci');
        const isSugerencia = type.includes('sugerencia') || dim.includes('sugerencia');
        const isIncidencia = !isFelicitacion && !isSugerencia;

        let matchType = true;
        if (filterType === 'Felicitación') {
          matchType = isFelicitacion;
        } else if (filterType === 'Sugerencia') {
          matchType = isSugerencia;
        } else if (filterType === 'Incidencia') {
          matchType = isIncidencia;
        }

        const matchDate = c.date >= dateFrom && c.date <= dateTo;
        return matchManager && matchArea && matchStatus && matchDimension && matchType && matchDate;
      })
      .sort((a, b) => (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0));
  }, [complaints, filterManager, filterArea, filterStatus, filterDimension, filterType, dateFrom, dateTo, currentUser]);

  const managerAnalyticalStats = useMemo(() => {
    const map: Record<string, { incidenciasPendientes: number; felicitacionesSinLeer: number; sugerenciasPendientes: number }> = {};

    filtered.forEach(c => {
      const mgr = c.managerName || 'SIN JEFE ASIGNADO';
      if (!map[mgr]) {
        map[mgr] = { incidenciasPendientes: 0, felicitacionesSinLeer: 0, sugerenciasPendientes: 0 };
      }

      const type = (c.complaintType || '').toLowerCase();
      const dim = (c.dimension || '').toLowerCase();
      const isFelicitacion = type.includes('felicitaci') || dim.includes('felicitaci');
      const isSugerencia = type.includes('sugerencia') || dim.includes('sugerencia');
      const isIncidencia = !isFelicitacion && !isSugerencia;

      if (isFelicitacion) {
        if (c.status === ComplaintStatus.PENDIENTE || c.status !== ComplaintStatus.LEIDO) {
          map[mgr].felicitacionesSinLeer++;
        }
      } else if (isSugerencia) {
        if (c.status === ComplaintStatus.PENDIENTE || c.status === ComplaintStatus.PROCESO || c.status !== ComplaintStatus.RESUELTO) {
          map[mgr].sugerenciasPendientes++;
        }
      } else if (isIncidencia) {
        if (c.status === ComplaintStatus.PENDIENTE || c.status === ComplaintStatus.PROCESO || c.isObserved) {
          map[mgr].incidenciasPendientes++;
        }
      }
    });

    return Object.entries(map).map(([name, counts]) => ({
      name,
      ...counts,
      totalPendientes: counts.incidenciasPendientes + counts.felicitacionesSinLeer + counts.sugerenciasPendientes,
    })).sort((a, b) => b.totalPendientes - a.totalPendientes);
  }, [filtered]);

  const groupedByManager = useMemo(() => {
    const groups: Record<string, Complaint[]> = {};
    filtered.forEach(c => {
      const boss = c.managerName || 'SIN JEFE ASIGNADO';
      if (!groups[boss]) groups[boss] = [];
      groups[boss].push(c);
    });
    return groups;
  }, [filtered]);

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
      setResolving(null);
      setCustomDimension('');
      setCustomSubDimension('');
    }
  };

  const handleResolutionSave = async (auditAction?: 'observe' | 'close' | 'approve') => {
    if (resolving) {
      if (resolving.status === ComplaintStatus.CERRADO && currentUser?.role !== 'admin') {
        return alert("Este caso ya está cerrado.");
      }

      const history = resolving.responseHistory || [];
      const newHistory = [...history];
      
      // Si el usuario es auditor
      if (currentUser?.role === 'auditor') {
        // Para aprobar no es obligatorio el descargo
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
          ...resolving,
          status: (isApproving) ? ComplaintStatus.CERRADO : (isMarkingObserved ? ComplaintStatus.PENDIENTE : ComplaintStatus.CERRADO),
          isObserved: isMarkingObserved,
          responseHistory: newHistory,
          evidenceImages: [...(resolving.evidenceImages || []), ...evidenceImages], // Include new images
          resolvedBy: isMarkingObserved ? undefined : (resolving.resolvedBy || currentUser.name),
          managementResponse: isMarkingObserved ? '' : resolving.managementResponse,
          dimension: finalDim,
          subDimension: finalSub || 'General'
        };

        onUpdateFull(updatedData);
        setCustomDimension('');
        setCustomSubDimension('');
        setEditing(null);
        setResolving(null);
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
        user: currentUser?.name || 'Admin',
        timestamp: getCurrentTimeInTimezone(timezone),
        type: 'manager'
      });

      const updatedData: Complaint = { 
        ...resolving, 
        managementResponse: tempResponse,
        responseHistory: newHistory,
        isObserved: false,
        evidenceImages: [...(resolving.evidenceImages || []), ...evidenceImages], // Support cumulative images
        resolvedBy: currentUser?.name || 'Admin',
        involvedPersonnel: involvedPersonnel.trim(),
        actionTaken: actionTaken.trim(),
        correctiveMeasure: correctiveMeasure,
        correctiveMeasureOther: correctiveMeasure === 'otra' ? correctiveMeasureOther.trim() : '',
      };
      
      if (updatedData.status === ComplaintStatus.RESUELTO && !updatedData.resolvedAt) {
        updatedData.resolvedAt = getCurrentTimeInTimezone(timezone);
      }
      onUpdateFull(updatedData);
      setEditing(null);
      setResolving(null);
      setTempResponse('');
    }
  };

  const handleExportExcel = async (from: string, to: string) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte de Incidencias');

    // Estilos base
    const headerFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E1B4B' } // Indigo 950
    };

    const summaryFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' } // Slate 100
    };

    const fontWhite: Partial<ExcelJS.Font> = {
      color: { argb: 'FFFFFFFF' },
      bold: true,
      name: 'Plus Jakarta Sans',
      size: 11
    };

    const fontStandard: Partial<ExcelJS.Font> = {
      name: 'Plus Jakarta Sans',
      size: 10
    };

    const borderStyle: any = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };

    // 1. Resumen de Jefaturas
    worksheet.addRow(['RESUMEN DE GESTIÓN POR JEFATURA']).font = { bold: true, size: 14, color: { argb: 'FF1E1B4B' } };
    const summaryHeader = worksheet.addRow(['JEFATURA', 'INCIDENCIAS PENDIENTES', 'FELICITACIONES SIN LEER', 'SUGERENCIAS PENDIENTES', 'TOTAL PENDIENTES']);
    summaryHeader.eachCell(c => { 
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; 
      c.fill = headerFill;
      c.border = borderStyle;
    });

    const pendingItems = complaints.filter(c => {
      const cDate = c.date.trim().substring(0, 10);
      const fromDate = from.trim().substring(0, 10);
      const toDate = to.trim().substring(0, 10);
      return cDate >= fromDate && cDate <= toDate;
    });

    const grouped: Record<string, { incidencias: number; felicitaciones: number; sugerencias: number }> = {};
    pendingItems.forEach(c => {
      const mgr = c.managerName || 'SIN JEFE ASIGNADO';
      if (!grouped[mgr]) grouped[mgr] = { incidencias: 0, felicitaciones: 0, sugerencias: 0 };

      const type = (c.complaintType || '').toLowerCase();
      const dim = (c.dimension || '').toLowerCase();
      const isFelicitacion = type.includes('felicitaci') || dim.includes('felicitaci');
      const isSugerencia = type.includes('sugerencia') || dim.includes('sugerencia');
      const isIncidencia = !isFelicitacion && !isSugerencia;

      if (isFelicitacion && (c.status === ComplaintStatus.PENDIENTE || c.status !== ComplaintStatus.LEIDO)) {
        grouped[mgr].felicitaciones++;
      } else if (isSugerencia && (c.status === ComplaintStatus.PENDIENTE || c.status === ComplaintStatus.PROCESO || c.status !== ComplaintStatus.RESUELTO)) {
        grouped[mgr].sugerencias++;
      } else if (isIncidencia && (c.status === ComplaintStatus.PENDIENTE || c.status === ComplaintStatus.PROCESO || c.isObserved)) {
        grouped[mgr].incidencias++;
      }
    });

    Object.entries(grouped).forEach(([mgr, counts]) => {
      const total = counts.incidencias + counts.felicitaciones + counts.sugerencias;
      if (total > 0) {
        const row = worksheet.addRow([mgr, counts.incidencias, counts.felicitaciones, counts.sugerencias, total]);
        row.eachCell(c => {
          c.border = borderStyle;
          c.font = fontStandard;
        });
      }
    });

    worksheet.addRow([]);
    worksheet.addRow([]);

    // 2. Tabla Principal de Datos (Columnas solicitadas)
    worksheet.columns = [
      { header: 'FECHA ATENCIÓN', key: 'date', width: 22 },
      { header: 'PACIENTE', key: 'patientName', width: 40 },
      { header: 'ÁREA', key: 'area', width: 25 },
      { header: 'ESPECIALIDAD', key: 'specialty', width: 25 },
      { header: 'MÉDICO', key: 'doctorName', width: 30 },
      { header: 'ESTADO', key: 'status', width: 18 },
      { header: 'JEFATURA', key: 'managerName', width: 30 },
      { header: 'DIMENSIÓN', key: 'dimension', width: 35 },
      { header: 'DESCRIPCIÓN', key: 'description', width: 70 },
      { header: 'FECHA RESPUESTA', key: 'resolvedAt', width: 22 },
      { header: 'RESPUESTA JEFATURA', key: 'mgmtRes', width: 70 },
      { header: 'AUDITORIA', key: 'auditRes', width: 70 },
      { header: 'RESPUESTA JEFATURA (OBS)', key: 'mgmtResObs', width: 70 },
      { header: 'PERSONAL INVOLUCRADO', key: 'involvedPersonnel', width: 30 },
      { header: 'ACCIÓN TOMADA', key: 'actionTaken', width: 35 },
      { header: 'MEDIDA CORRECTIVA', key: 'correctiveMeasure', width: 30 },
      { header: 'DETALLE OTRA MEDIDA', key: 'correctiveMeasureOther', width: 35 },
      { header: 'TIPO', key: 'complaintType', width: 20 },
      { header: 'APLICABLE (SUG)', key: 'isApplicable', width: 20 },
      { header: 'MOTIVO NO APLICABLE', key: 'notApplicableReason', width: 35 },
      { header: 'DETALLE IMPLEMENTACIÓN', key: 'implementationDetail', width: 35 },
      { header: 'ÁREA DERIVADA', key: 'referredArea', width: 25 },
    ];

    // Aplicar estilos a la cabecera de la tabla de datos
    const headerRowNumber = worksheet.rowCount; // La fila donde empiezan los headers
    const headerRow = worksheet.getRow(headerRowNumber);
    headerRow.height = 35;
    headerRow.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = fontWhite;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = borderStyle;
    });

    // Agregar datos
    pendingItems.forEach(item => {
      const managerResponses = (item.responseHistory || []).filter(h => h.type === 'manager');
      const auditorResponses = (item.responseHistory || []).filter(h => h.type === 'auditor');

      const mgmtRes = managerResponses.length > 0 ? managerResponses[0].text : (item.managementResponse || '');
      const auditRes = auditorResponses.length > 0 ? auditorResponses.map(a => `[${a.timestamp}] ${a.text}`).join('\n') : '';
      const mgmtResObs = managerResponses.length > 1 ? managerResponses[managerResponses.length - 1].text : (item.isObserved ? (item.managementResponse || '') : '');

      const row = worksheet.addRow({
        date: item.date,
        patientName: item.patientName.toUpperCase(),
        area: item.area,
        specialty: item.specialty,
        doctorName: item.doctorName || 'N/A',
        status: item.status.toUpperCase(),
        managerName: item.managerName?.toUpperCase() || 'SIN ASIGNAR',
        dimension: item.dimension,
        description: item.description,
        resolvedAt: item.resolvedAt || (managerResponses.length > 0 ? managerResponses[managerResponses.length - 1].timestamp : 'N/A'),
        mgmtRes: mgmtRes,
        auditRes: auditRes,
        mgmtResObs: mgmtResObs,
        involvedPersonnel: item.involvedPersonnel || 'N/A',
        actionTaken: item.actionTaken || 'N/A',
        correctiveMeasure: item.correctiveMeasure || 'N/A',
        correctiveMeasureOther: item.correctiveMeasureOther || '',
        complaintType: item.complaintType || (item.dimension?.toLowerCase().includes('felicitaci') ? 'Felicitación' : (item.dimension?.toLowerCase().includes('sugerencia') ? 'Sugerencia' : 'Incidencia')),
        isApplicable: item.isApplicable === true ? 'SÍ' : (item.isApplicable === false ? 'NO' : 'N/A'),
        notApplicableReason: item.notApplicableReason || '',
        implementationDetail: item.implementationDetail || '',
        referredArea: item.referredArea || ''
      });

      // Estilo de celdas de datos
      row.eachCell((cell) => {
        cell.font = fontStandard;
        cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        cell.border = borderStyle;
        
        // Colorear estado (Columna F)
        if (cell.address.startsWith('F')) {
           cell.font = { ...fontStandard, bold: true };
           if (String(item.status) === String(ComplaintStatus.PENDIENTE)) cell.font.color = { argb: 'FFEA580C' };
           if (String(item.status) === String(ComplaintStatus.PROCESO)) cell.font.color = { argb: 'FF2563EB' };
        }
      });

      // Auto-ajustar altura (pobre aproximación ya que ExcelJS no lo hace nativo para wrapText)
      const maxChars = Math.max(
        item.description.length / 70, 
        mgmtRes.length / 70, 
        auditRes.length / 70,
        mgmtResObs.length / 70
      );
      row.height = Math.max(25, Math.ceil(maxChars) * 15);
    });

    // Filtrado automático en la cabecera
    worksheet.autoFilter = {
      from: { row: headerRowNumber, column: 1 },
      to: { row: headerRowNumber, column: 17 }
    };

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Lista_Incidencias_Pendientes_${from}_al_${to}.xlsx`);
  };

  const handleExportExcelResolved = async (from: string, to: string) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte Resueltos');

    // Estilos base
    const headerFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E1B4B' } 
    };

    const summaryFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFECFDF5' } // Emerald 50
    };

    const fontWhite: Partial<ExcelJS.Font> = {
      color: { argb: 'FFFFFFFF' },
      bold: true,
      name: 'Plus Jakarta Sans',
      size: 11
    };

    const fontStandard: Partial<ExcelJS.Font> = {
      name: 'Plus Jakarta Sans',
      size: 10
    };

    const borderStyle: any = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };

    const resolvedItems = complaints.filter(c => {
      const cDate = c.date.trim().substring(0, 10);
      const fromDate = from.trim().substring(0, 10);
      const toDate = to.trim().substring(0, 10);
      return c.status === ComplaintStatus.RESUELTO && cDate >= fromDate && cDate <= toDate;
    });

    // 1. Resumen
    worksheet.addRow(['RESUMEN DE GESTIÓN (RESUELTOS)']).font = { bold: true, size: 14, color: { argb: 'FF1E1B4B' } };
    const summaryHeader = worksheet.addRow(['JEFATURA', 'CANTIDAD RESUELTOS']);
    summaryHeader.eachCell(c => { 
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; 
      c.fill = headerFill;
      c.border = borderStyle;
    });

    const grouped: Record<string, number> = {};
    resolvedItems.forEach(c => {
      const mgr = c.managerName || 'SIN JEFE ASIGNADO';
      grouped[mgr] = (grouped[mgr] || 0) + 1;
    });

    Object.entries(grouped).forEach(([mgr, count]) => {
      const row = worksheet.addRow([mgr, count]);
      row.eachCell(c => {
        c.border = borderStyle;
        c.font = fontStandard;
      });
    });

    worksheet.addRow([]);
    worksheet.addRow([]);

    // 2. Columnas
    worksheet.columns = [
      { header: 'FECHA ATENCIÓN', key: 'date', width: 22 },
      { header: 'PACIENTE', key: 'patientName', width: 40 },
      { header: 'ÁREA', key: 'area', width: 25 },
      { header: 'ESPECIALIDAD', key: 'specialty', width: 25 },
      { header: 'MÉDICO', key: 'doctorName', width: 30 },
      { header: 'ESTADO', key: 'status', width: 18 },
      { header: 'JEFATURA', key: 'managerName', width: 30 },
      { header: 'DIMENSIÓN', key: 'dimension', width: 35 },
      { header: 'DESCRIPCIÓN', key: 'description', width: 70 },
      { header: 'FECHA RESPUESTA', key: 'resolvedAt', width: 22 },
      { header: 'RESPUESTA JEFATURA', key: 'mgmtRes', width: 70 },
      { header: 'AUDITORIA', key: 'auditRes', width: 70 },
      { header: 'RESPUESTA JEFATURA (OBS)', key: 'mgmtResObs', width: 70 },
      { header: 'PERSONAL INVOLUCRADO', key: 'involvedPersonnel', width: 30 },
      { header: 'ACCIÓN TOMADA', key: 'actionTaken', width: 35 },
      { header: 'MEDIDA CORRECTIVA', key: 'correctiveMeasure', width: 30 },
      { header: 'DETALLE OTRA MEDIDA', key: 'correctiveMeasureOther', width: 35 },
    ];

    const headerRowNumber = worksheet.rowCount;
    const headerRow = worksheet.getRow(headerRowNumber);
    headerRow.height = 35;
    headerRow.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = fontWhite;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = borderStyle;
    });

    resolvedItems.forEach(item => {
      const managerResponses = (item.responseHistory || []).filter(h => h.type === 'manager');
      const auditorResponses = (item.responseHistory || []).filter(h => h.type === 'auditor');

      const mgmtRes = managerResponses.length > 0 ? managerResponses[0].text : (item.managementResponse || '');
      const auditRes = auditorResponses.length > 0 ? auditorResponses.map(a => `[${a.timestamp}] ${a.text}`).join('\n') : '';
      const mgmtResObs = managerResponses.length > 1 ? managerResponses[managerResponses.length - 1].text : (item.isObserved ? (item.managementResponse || '') : '');

      const row = worksheet.addRow({
        date: item.date,
        patientName: item.patientName.toUpperCase(),
        area: item.area,
        specialty: item.specialty,
        doctorName: item.doctorName || 'N/A',
        status: item.status.toUpperCase(),
        managerName: item.managerName?.toUpperCase() || 'SIN ASIGNAR',
        dimension: item.dimension,
        description: item.description,
        resolvedAt: item.resolvedAt || (managerResponses.length > 0 ? managerResponses[managerResponses.length - 1].timestamp : 'N/A'),
        mgmtRes: mgmtRes,
        auditRes: auditRes,
        mgmtResObs: mgmtResObs,
        involvedPersonnel: item.involvedPersonnel || 'N/A',
        actionTaken: item.actionTaken || 'N/A',
        correctiveMeasure: item.correctiveMeasure || 'N/A',
        correctiveMeasureOther: item.correctiveMeasureOther || ''
      });

      row.eachCell((cell) => {
        cell.font = fontStandard;
        cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        cell.border = borderStyle;
        if (cell.address.startsWith('F')) {
           cell.font = { ...fontStandard, bold: true, color: { argb: 'FF10B981' } }; // Green for resolved
        }
      });

      const maxChars = Math.max(
        item.description.length / 70, 
        mgmtRes.length / 70, 
        auditRes.length / 70,
        mgmtResObs.length / 70
      );
      row.height = Math.max(25, Math.ceil(maxChars) * 15);
    });

    worksheet.autoFilter = {
      from: { row: headerRowNumber, column: 1 },
      to: { row: headerRowNumber, column: 17 }
    };

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Lista_Incidencias_Resueltas_${from}_al_${to}.xlsx`);
  };

  const handleExportExcelAll = async (from: string, to: string) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte Todos');

    // Estilos base
    const headerFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E1B4B' } 
    };

    const fontWhite: Partial<ExcelJS.Font> = {
      color: { argb: 'FFFFFFFF' },
      bold: true,
      name: 'Plus Jakarta Sans',
      size: 11
    };

    const fontStandard: Partial<ExcelJS.Font> = {
      name: 'Plus Jakarta Sans',
      size: 10
    };

    const borderStyle: any = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };

    const allItems = complaints.filter(c => {
      const cDate = c.date.trim().substring(0, 10);
      const fromDate = from.trim().substring(0, 10);
      const toDate = to.trim().substring(0, 10);
      return cDate >= fromDate && cDate <= toDate;
    });

    // 1. Resumen
    worksheet.addRow(['RESUMEN DE GESTIÓN (TODOS)']).font = { bold: true, size: 14, color: { argb: 'FF1E1B4B' } };
    const summaryHeader = worksheet.addRow(['JEFATURA', 'INCIDENCIAS PENDIENTES', 'FELICITACIONES SIN LEER', 'SUGERENCIAS PENDIENTES', 'TOTAL PENDIENTES', 'TOTAL GENERAL']);
    summaryHeader.eachCell(c => { 
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; 
      c.fill = headerFill;
      c.border = borderStyle;
    });

    const grouped: Record<string, { total: number; incidenciasPen: number; felicitacionesUnread: number; sugerenciasPen: number }> = {};
    allItems.forEach(c => {
      const mgr = c.managerName || 'SIN JEFE ASIGNADO';
      if (!grouped[mgr]) grouped[mgr] = { total: 0, incidenciasPen: 0, felicitacionesUnread: 0, sugerenciasPen: 0 };
      grouped[mgr].total++;

      const type = (c.complaintType || '').toLowerCase();
      const dim = (c.dimension || '').toLowerCase();
      const isFelicitacion = type.includes('felicitaci') || dim.includes('felicitaci');
      const isSugerencia = type.includes('sugerencia') || dim.includes('sugerencia');
      const isIncidencia = !isFelicitacion && !isSugerencia;

      if (isFelicitacion && (c.status === ComplaintStatus.PENDIENTE || c.status !== ComplaintStatus.LEIDO)) {
        grouped[mgr].felicitacionesUnread++;
      } else if (isSugerencia && (c.status === ComplaintStatus.PENDIENTE || c.status === ComplaintStatus.PROCESO || c.status !== ComplaintStatus.RESUELTO)) {
        grouped[mgr].sugerenciasPen++;
      } else if (isIncidencia && (c.status === ComplaintStatus.PENDIENTE || c.status === ComplaintStatus.PROCESO || c.isObserved)) {
        grouped[mgr].incidenciasPen++;
      }
    });

    Object.entries(grouped).forEach(([mgr, data]) => {
      const pendingTotal = data.incidenciasPen + data.felicitacionesUnread + data.sugerenciasPen;
      const row = worksheet.addRow([mgr, data.incidenciasPen, data.felicitacionesUnread, data.sugerenciasPen, pendingTotal, data.total]);
      row.eachCell(c => {
        c.border = borderStyle;
        c.font = fontStandard;
      });
    });

    worksheet.addRow([]);
    worksheet.addRow([]);

    // 2. Columnas
    worksheet.columns = [
      { header: 'FECHA ATENCIÓN', key: 'date', width: 22 },
      { header: 'PACIENTE', key: 'patientName', width: 40 },
      { header: 'ÁREA', key: 'area', width: 25 },
      { header: 'ESPECIALIDAD', key: 'specialty', width: 25 },
      { header: 'MÉDICO', key: 'doctorName', width: 30 },
      { header: 'ESTADO', key: 'status', width: 18 },
      { header: 'JEFATURA', key: 'managerName', width: 30 },
      { header: 'DIMENSIÓN', key: 'dimension', width: 35 },
      { header: 'DESCRIPCIÓN', key: 'description', width: 70 },
      { header: 'FECHA RESPUESTA', key: 'resolvedAt', width: 22 },
      { header: 'RESPUESTA JEFATURA', key: 'mgmtRes', width: 70 },
      { header: 'AUDITORIA', key: 'auditRes', width: 70 },
      { header: 'RESPUESTA JEFATURA (OBS)', key: 'mgmtResObs', width: 70 },
      { header: 'PERSONAL INVOLUCRADO', key: 'involvedPersonnel', width: 30 },
      { header: 'ACCIÓN TOMADA', key: 'actionTaken', width: 35 },
      { header: 'MEDIDA CORRECTIVA', key: 'correctiveMeasure', width: 30 },
      { header: 'DETALLE OTRA MEDIDA', key: 'correctiveMeasureOther', width: 35 },
    ];

    const headerRowNumber = worksheet.rowCount;
    const headerRow = worksheet.getRow(headerRowNumber);
    headerRow.height = 35;
    headerRow.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = fontWhite;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = borderStyle;
    });

    allItems.forEach(item => {
      const managerResponses = (item.responseHistory || []).filter(h => h.type === 'manager');
      const auditorResponses = (item.responseHistory || []).filter(h => h.type === 'auditor');

      const mgmtRes = managerResponses.length > 0 ? managerResponses[0].text : (item.managementResponse || '');
      const auditRes = auditorResponses.length > 0 ? auditorResponses.map(a => `[${a.timestamp}] ${a.text}`).join('\n') : '';
      const mgmtResObs = managerResponses.length > 1 ? managerResponses[managerResponses.length - 1].text : (item.isObserved ? (item.managementResponse || '') : '');

      const row = worksheet.addRow({
        date: item.date,
        patientName: item.patientName.toUpperCase(),
        area: item.area,
        specialty: item.specialty,
        doctorName: item.doctorName || 'N/A',
        status: item.status.toUpperCase(),
        managerName: item.managerName?.toUpperCase() || 'SIN ASIGNAR',
        dimension: item.dimension,
        description: item.description,
        resolvedAt: item.resolvedAt || (managerResponses.length > 0 ? managerResponses[managerResponses.length - 1].timestamp : 'N/A'),
        mgmtRes: mgmtRes,
        auditRes: auditRes,
        mgmtResObs: mgmtResObs,
        involvedPersonnel: item.involvedPersonnel || 'N/A',
        actionTaken: item.actionTaken || 'N/A',
        correctiveMeasure: item.correctiveMeasure || 'N/A',
        correctiveMeasureOther: item.correctiveMeasureOther || ''
      });

      row.eachCell((cell) => {
        cell.font = fontStandard;
        cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        cell.border = borderStyle;
        
        // Colorear estado (Columna F)
        if (cell.address.startsWith('F')) {
           cell.font = { ...fontStandard, bold: true };
           if (String(item.status) === String(ComplaintStatus.PENDIENTE)) {
             cell.font.color = { argb: 'FFEA580C' };
           } else if (String(item.status) === String(ComplaintStatus.PROCESO)) {
             cell.font.color = { argb: 'FF2563EB' };
           } else if (String(item.status) === String(ComplaintStatus.RESUELTO)) {
             cell.font.color = { argb: 'FF10B981' };
           } else {
             cell.font.color = { argb: 'FF64748B' }; // Slate for Cerrado/others
           }
        }
      });

      const maxChars = Math.max(
        item.description.length / 70, 
        mgmtRes.length / 70, 
        auditRes.length / 70,
        mgmtResObs.length / 70
      );
      row.height = Math.max(25, Math.ceil(maxChars) * 15);
    });

    worksheet.autoFilter = {
      from: { row: headerRowNumber, column: 1 },
      to: { row: headerRowNumber, column: 17 }
    };

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Lista_Incidencias_Todas_${from}_al_${to}.xlsx`);
  };

  const handleExportComparativeExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema Calidad DAC';
    workbook.lastModifiedBy = 'Sistema Calidad DAC';
    workbook.created = new Date();

    const indigoDarkFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1B4B' } };
    const indigoSubHeaderFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF312E81' } };
    const slateLightFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    const redLightFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
    const greenLightFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };

    const fontWhiteBold: Partial<ExcelJS.Font> = { color: { argb: 'FFFFFFFF' }, bold: true, name: 'Plus Jakarta Sans', size: 10 };
    const fontTitleWhite: Partial<ExcelJS.Font> = { color: { argb: 'FFFFFFFF' }, bold: true, name: 'Plus Jakarta Sans', size: 14 };
    const fontStandard: Partial<ExcelJS.Font> = { name: 'Plus Jakarta Sans', size: 10 };
    const fontBold: Partial<ExcelJS.Font> = { name: 'Plus Jakarta Sans', size: 10, bold: true };

    const borderStyle: any = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };

    // HOJA 1: RESUMEN COMPARATIVO POR ÁREAS
    const wsComparative = workbook.addWorksheet('Resumen Comparativo');

    wsComparative.mergeCells('A1:J1');
    const titleCell = wsComparative.getCell('A1');
    titleCell.value = 'CLÍNICA DAC - REPORTE DE ESTADÍSTICAS COMPARATIVAS DE INCIDENCIAS';
    titleCell.font = fontTitleWhite;
    titleCell.fill = indigoDarkFill;
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    wsComparative.getRow(1).height = 40;

    wsComparative.mergeCells('A2:J2');
    const metaCell = wsComparative.getCell('A2');
    metaCell.value = `Modo: ${
      comparativeRange === '1month' ? 'Mes Actual vs. Mes Anterior' :
      comparativeRange === '3months' ? 'Últimos 3 Meses vs. 3 Meses Anteriores' :
      'Últimos 6 Meses vs. 6 Meses Anteriores'
    } | Área: ${comparativeArea} | Ref: ${compAnalysis.labelCurrent} vs ${compAnalysis.labelPrevious} | Generado: ${new Date().toLocaleDateString('es-ES')}`;
    metaCell.font = { name: 'Plus Jakarta Sans', size: 9, italic: true, color: { argb: 'FF64748B' } };
    metaCell.alignment = { vertical: 'middle', horizontal: 'center' };
    wsComparative.getRow(2).height = 20;

    wsComparative.addRow([]);

    const kpiHeader = wsComparative.addRow(['INDICADOR CLAVE', 'PERIODO ACTUAL', 'PERIODO ANTERIOR', 'VARIACIÓN ABSOLUTA', '% VARIACIÓN', 'TENDENCIA']);
    kpiHeader.eachCell(c => { c.fill = indigoSubHeaderFill; c.font = fontWhiteBold; c.border = borderStyle; c.alignment = { horizontal: 'center', vertical: 'middle' }; });
    
    const kpiRow = wsComparative.addRow([
      `TOTAL INCIDENCIAS (${compAnalysis.labelCurrent})`,
      compAnalysis.totalCurrent,
      compAnalysis.totalPrevious,
      (compAnalysis.totalDiff > 0 ? `+${compAnalysis.totalDiff}` : compAnalysis.totalDiff),
      `${compAnalysis.totalPctChange > 0 ? '+' : ''}${compAnalysis.totalPctChange}%`,
      compAnalysis.totalDiff > 0 ? 'AUMENTÓ 🔴' : compAnalysis.totalDiff < 0 ? 'DISMINUYÓ 🟩' : 'SIN CAMBIO ⚪'
    ]);
    kpiRow.eachCell(c => { c.border = borderStyle; c.font = fontBold; c.alignment = { horizontal: 'center', vertical: 'middle' }; });
    kpiRow.height = 25;

    wsComparative.addRow([]);
    wsComparative.addRow([]);

    const sectionTitle = wsComparative.addRow(['CUADRO COMPARATIVO COMPLETO POR ÁREAS (ORDENADO DE MAYOR A MENOR DENSIDAD DE INCIDENCIAS)']);
    sectionTitle.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF1E1B4B' }, name: 'Plus Jakarta Sans' };

    const tableHeader = wsComparative.addRow([
      'POS', 'ÁREA HOSPITALARIA', `INCIDENCIAS (${compAnalysis.labelCurrent})`, `INCIDENCIAS (${compAnalysis.labelPrevious})`, 'DIFERENCIA (VAR)', '% VARIACIÓN', 'TENDENCIA', 'PENDIENTES', 'EN PROCESO', 'RESUELTOS / CERRADOS'
    ]);
    tableHeader.eachCell(c => {
      c.fill = indigoDarkFill;
      c.font = fontWhiteBold;
      c.border = borderStyle;
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
    tableHeader.height = 32;

    compAnalysis.ranking.forEach((item, index) => {
      const row = wsComparative.addRow([
        index + 1,
        item.areaName,
        item.currentCount,
        item.previousCount,
        (item.diff > 0 ? `+${item.diff}` : item.diff),
        `${item.pctChange > 0 ? '+' : ''}${item.pctChange}%`,
        item.trend === 'AUMENTÓ' ? 'AUMENTÓ 🔴' : item.trend === 'DISMINUYÓ' ? 'DISMINUYÓ 🟩' : 'SIN CAMBIO ⚪',
        item.pending,
        item.inProgress,
        item.resolved
      ]);

      row.eachCell((cell, colNumber) => {
        cell.border = borderStyle;
        cell.font = fontStandard;
        cell.alignment = { vertical: 'middle', horizontal: colNumber === 2 ? 'left' : 'center' };

        if (colNumber === 5 || colNumber === 6) {
          cell.font = fontBold;
          if (item.diff > 0) cell.fill = redLightFill;
          else if (item.diff < 0) cell.fill = greenLightFill;
        }
        if (colNumber === 1 || colNumber === 3) cell.font = fontBold;
      });
      row.height = 22;
    });

    wsComparative.columns = [
      { width: 8 },
      { width: 32 },
      { width: 22 },
      { width: 22 },
      { width: 18 },
      { width: 16 },
      { width: 18 },
      { width: 15 },
      { width: 15 },
      { width: 20 }
    ];

    // HOJA 2: ANÁLISIS SEMANAL
    const wsWeekly = workbook.addWorksheet('Análisis Semanal');

    wsWeekly.mergeCells('A1:G1');
    const wTitleCell = wsWeekly.getCell('A1');
    wTitleCell.value = `CLÍNICA DAC - ANÁLISIS SEMANAL DE INCIDENCIAS (${getMonthNameYear(weeklyAnalysis.targetMonth)})`;
    wTitleCell.font = fontTitleWhite;
    wTitleCell.fill = indigoDarkFill;
    wTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    wsWeekly.getRow(1).height = 40;

    wsWeekly.mergeCells('A2:G2');
    const wMetaCell = wsWeekly.getCell('A2');
    wMetaCell.value = `Mes Analizado: ${getMonthNameYear(weeklyAnalysis.targetMonth)} | Área: ${comparativeArea} | Total Incidencias del Mes: ${weeklyAnalysis.totalMonthComplaints}`;
    wMetaCell.font = { name: 'Plus Jakarta Sans', size: 9, italic: true, color: { argb: 'FF64748B' } };
    wMetaCell.alignment = { vertical: 'middle', horizontal: 'center' };
    wsWeekly.getRow(2).height = 20;

    wsWeekly.addRow([]);

    if (weeklyAnalysis.peakWeek) {
      wsWeekly.mergeCells('A4:G4');
      const peakCell = wsWeekly.getCell('A4');
      peakCell.value = `🔥 SEMANA CON MÁS INCIDENCIAS EN EL MES: ${weeklyAnalysis.peakWeek.name.toUpperCase()} (${weeklyAnalysis.peakWeek.range}) con ${weeklyAnalysis.peakWeek.count} incidencias (${weeklyAnalysis.peakWeek.pct.toFixed(1)}% del total del mes)`;
      peakCell.font = { bold: true, color: { argb: 'FFB91C1C' }, name: 'Plus Jakarta Sans', size: 10 };
      peakCell.fill = redLightFill;
      peakCell.border = borderStyle;
      peakCell.alignment = { vertical: 'middle', horizontal: 'center' };
      wsWeekly.getRow(4).height = 28;
    }

    wsWeekly.addRow([]);

    const wHeader1 = wsWeekly.addRow(['SEMANA', 'RANGO DE DÍAS', 'CANTIDAD INCIDENCIAS', '% DEL TOTAL DEL MES', 'ÁREA CON MÁS INCIDENCIAS']);
    wHeader1.eachCell(c => { c.fill = indigoSubHeaderFill; c.font = fontWhiteBold; c.border = borderStyle; c.alignment = { horizontal: 'center', vertical: 'middle' }; });
    wHeader1.height = 28;

    weeklyAnalysis.weeks.forEach(w => {
      const row = wsWeekly.addRow([
        w.name,
        w.range,
        w.count,
        `${w.pct.toFixed(1)}%`,
        w.topArea || 'N/A'
      ]);
      row.eachCell(c => {
        c.border = borderStyle;
        c.font = fontStandard;
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      if (weeklyAnalysis.peakWeek && w.id === weeklyAnalysis.peakWeek.id) {
        row.eachCell(c => { c.fill = redLightFill; c.font = fontBold; });
      }
      row.height = 22;
    });

    wsWeekly.addRow([]);
    wsWeekly.addRow([]);

    wsWeekly.addRow(['DESGLOSE DE INCIDENCIAS POR ÁREA Y POR SEMANAS']).getCell(1).font = { bold: true, size: 11, color: { argb: 'FF1E1B4B' }, name: 'Plus Jakarta Sans' };
    
    const matrixHeader = wsWeekly.addRow(['ÁREA HOSPITALARIA', 'SEMANA 1 (1-7)', 'SEMANA 2 (8-14)', 'SEMANA 3 (15-21)', 'SEMANA 4 (22-28)', 'SEMANA 5 (29+)', 'TOTAL MES']);
    matrixHeader.eachCell(c => { c.fill = indigoDarkFill; c.font = fontWhiteBold; c.border = borderStyle; c.alignment = { horizontal: 'center', vertical: 'middle' }; });
    matrixHeader.height = 28;

    weeklyAnalysis.areaMatrix.forEach(rowItem => {
      const row = wsWeekly.addRow([
        rowItem.areaName,
        rowItem.w1,
        rowItem.w2,
        rowItem.w3,
        rowItem.w4,
        rowItem.w5,
        rowItem.total
      ]);
      row.eachCell((c, colIdx) => {
        c.border = borderStyle;
        c.font = colIdx === 1 || colIdx === 7 ? fontBold : fontStandard;
        c.alignment = { horizontal: colIdx === 1 ? 'left' : 'center', vertical: 'middle' };
      });
      row.height = 20;
    });

    wsWeekly.columns = [
      { width: 32 },
      { width: 22 },
      { width: 22 },
      { width: 22 },
      { width: 22 },
      { width: 22 },
      { width: 18 }
    ];

    // HOJA 3: DETALLE DE FICHAS
    const wsDetail = workbook.addWorksheet('Detalle de Fichas');
    wsDetail.columns = [
      { header: 'FECHA ATENCIÓN', key: 'date', width: 20 },
      { header: 'PACIENTE', key: 'patientName', width: 35 },
      { header: 'ÁREA', key: 'area', width: 25 },
      { header: 'ESPECIALIDAD', key: 'specialty', width: 25 },
      { header: 'MÉDICO', key: 'doctorName', width: 30 },
      { header: 'ESTADO', key: 'status', width: 18 },
      { header: 'JEFATURA', key: 'managerName', width: 30 },
      { header: 'DIMENSIÓN', key: 'dimension', width: 30 },
      { header: 'DESCRIPCIÓN', key: 'description', width: 60 }
    ];

    const dHeaderRow = wsDetail.getRow(1);
    dHeaderRow.height = 30;
    dHeaderRow.eachCell(c => {
      c.fill = indigoDarkFill;
      c.font = fontWhiteBold;
      c.border = borderStyle;
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    compAnalysis.filteredComplaintsCurrent.forEach(item => {
      const row = wsDetail.addRow({
        date: item.date,
        patientName: item.patientName.toUpperCase(),
        area: item.area,
        specialty: item.specialty,
        doctorName: item.doctorName || 'N/A',
        status: item.status.toUpperCase(),
        managerName: item.managerName || 'SIN ASIGNAR',
        dimension: item.dimension || 'General',
        description: item.description
      });
      row.eachCell(c => {
        c.border = borderStyle;
        c.font = fontStandard;
        c.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Informe_Estadistico_Comparativo_DAC_${weeklyAnalysis.targetMonth}.xlsx`);
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    setEditing(null);
    setResolving(null);
  };

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-500">
      {/* HEADER DE MÓDULO */}
      <div className="glass-card p-6 md:p-10 bg-white shadow-xl no-print border border-slate-100">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase text-slate-900 tracking-tight flex items-center gap-3">
                 <span className="w-10 h-10 bg-indigo-900 rounded-2xl flex items-center justify-center text-white text-lg">📊</span>
                 Informes y Auditoría
              </h3>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Visualice el historial, estadisticas comparativas y gestione resoluciones</p>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
               {currentUser?.role === 'auditor' && (
                 <button 
                   onClick={() => setIsVistaTotal(!isVistaTotal)}
                   className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-xl ${
                     isVistaTotal 
                      ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-500/20' 
                      : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100'
                   }`}
                 >
                   <span className="text-base">{isVistaTotal ? '👁️' : '🕶️'}</span>
                   {isVistaTotal ? 'Vista Total (Admin)' : 'Vista Auditor'}
                 </button>
               )}
               <button onClick={() => window.print()} className="px-6 py-4 bg-indigo-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-black hover:scale-105 transition-all">📄 PDF</button>
               <button onClick={() => { setActiveReportMode('comparative'); }} className={`px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl transition-all ${activeReportMode === 'comparative' ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-500/20' : 'bg-amber-600 text-white hover:bg-amber-700'}`}>📈 COMPARATIVA</button>
               <button onClick={handleExportComparativeExcel} className="px-6 py-4 bg-emerald-700 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-emerald-800 hover:scale-105 transition-all">📊 EXCEL COMPARATIVO</button>
               <button onClick={() => { setExportType('pending'); setExportDateFrom(dateFrom); setExportDateTo(dateTo); setShowExportModal(true); }} className="px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-emerald-700 hover:scale-105 transition-all">📊 PENDIENTES</button>
               <button onClick={() => { setExportType('resolved'); setExportDateFrom(dateFrom); setExportDateTo(dateTo); setShowExportModal(true); }} className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-blue-700 hover:scale-105 transition-all">📊 RESUELTOS</button>
               <button onClick={() => { setExportType('all'); setExportDateFrom(dateFrom); setExportDateTo(dateTo); setShowExportModal(true); }} className="px-6 py-4 bg-violet-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-violet-700 hover:scale-105 transition-all">📊 TODOS</button>
            </div>
        </div>

        {/* BARRA DE NAVEGACIÓN ENTRE MODOS */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-100 p-2 rounded-2xl border border-slate-200 shadow-inner">
          <button
            onClick={() => setActiveReportMode('list')}
            className={`flex-1 min-w-[220px] py-3.5 px-6 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeReportMode === 'list'
                ? 'bg-indigo-900 text-white shadow-xl scale-[1.01]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span className="text-base">📋</span> Listado y Gestión de Fichas
          </button>
          <button
            onClick={() => setActiveReportMode('comparative')}
            className={`flex-1 min-w-[220px] py-3.5 px-6 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeReportMode === 'comparative'
                ? 'bg-indigo-900 text-white shadow-xl scale-[1.01]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span className="text-base">📈</span> Estadísticas Comparativas y Semanales
          </button>
        </div>

        {activeReportMode === 'list' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 p-6 md:p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 mt-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Desde</label>
              <input type="date" className="w-full bg-white border-2 border-slate-100 rounded-xl p-4 text-sm font-bold shadow-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Hasta</label>
              <input type="date" className="w-full bg-white border-2 border-slate-100 rounded-xl p-4 text-sm font-bold shadow-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Área</label>
              <select className="w-full bg-white border-2 border-slate-100 rounded-xl p-4 text-sm font-bold shadow-sm" value={filterArea} onChange={e => setFilterArea(e.target.value)}>
                <option value="Todas">Todas</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Jefe</label>
              <select className="w-full bg-white border-2 border-slate-100 rounded-xl p-4 text-sm font-bold shadow-sm" value={filterManager} onChange={e => setFilterManager(e.target.value)}>
                <option value="Todos">Todos</option>
                {managers.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Estado</label>
              <select className="w-full bg-white border-2 border-slate-100 rounded-xl p-4 text-sm font-bold shadow-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="Todos">Todos</option>
                <option value="Observados">SÓLO OBSERVADOS</option>
                {Object.values(ComplaintStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Dimensión</label>
              <select className="w-full bg-white border-2 border-slate-100 rounded-xl p-4 text-sm font-bold shadow-sm" value={filterDimension} onChange={e => setFilterDimension(e.target.value)}>
                <option value="Todas">Todas</option>
                {uniqueDimensions.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Tipo</label>
              <select className="w-full bg-white border-2 border-slate-100 rounded-xl p-4 text-sm font-bold shadow-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="Todos">Todos</option>
                <option value="Incidencia">Incidencias</option>
                <option value="Felicitación">Felicitaciones</option>
                <option value="Sugerencia">Sugerencias</option>
              </select>
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Total</label>
               <div className="p-4 bg-indigo-900 text-white rounded-xl font-black text-center text-sm">{filtered.length}</div>
            </div>
          </div>
        )}
      </div>

      {activeReportMode === 'comparative' ? (
        <div className="space-y-10 no-print animate-in fade-in duration-300">
          {/* PANEL DE CONTROL DE COMPARATIVA */}
          <div className="glass-card bg-white p-6 md:p-8 border border-slate-100 shadow-xl rounded-[2.5rem]">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 border-b border-slate-100 pb-6">
              <div>
                <h4 className="font-black text-indigo-900 text-lg uppercase tracking-tight flex items-center gap-2">
                  <span className="w-2 h-6 bg-indigo-600 rounded-full"></span>
                  Configuración del Análisis Comparativo
                </h4>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  Compare periodos históricos y analice la evolución por semanas
                </p>
              </div>
              <button
                onClick={handleExportComparativeExcel}
                className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-700 hover:scale-105 transition-all flex items-center gap-3"
              >
                <span className="text-base">📊</span> EXPORTAR INFORME EXCEL COMPLETO
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Rango de Comparación */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Periodo Comparativo</label>
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                  <button
                    onClick={() => setComparativeRange('1month')}
                    className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                      comparativeRange === '1month' ? 'bg-indigo-900 text-white shadow' : 'text-slate-600 hover:bg-white'
                    }`}
                  >
                    Mes Actual vs. Anterior
                  </button>
                  <button
                    onClick={() => setComparativeRange('3months')}
                    className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                      comparativeRange === '3months' ? 'bg-indigo-900 text-white shadow' : 'text-slate-600 hover:bg-white'
                    }`}
                  >
                    Últimos 3 Meses
                  </button>
                  <button
                    onClick={() => setComparativeRange('6months')}
                    className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                      comparativeRange === '6months' ? 'bg-indigo-900 text-white shadow' : 'text-slate-600 hover:bg-white'
                    }`}
                  >
                    Últimos 6 Meses
                  </button>
                </div>
              </div>

              {/* Mes de Referencia */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Mes Base de Análisis</label>
                <select
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-indigo-600 rounded-2xl p-4 text-xs font-bold shadow-sm outline-none transition-all"
                  value={compAnalysis.refYM}
                  onChange={(e) => {
                    setComparativeRefMonth(e.target.value);
                    if (!weeklyMonth) setWeeklyMonth(e.target.value);
                  }}
                >
                  {compAnalysis.availableMonths.map((ym) => (
                    <option key={ym} value={ym}>
                      {getMonthNameYear(ym)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Área */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Filtrar por Área</label>
                <select
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-indigo-600 rounded-2xl p-4 text-xs font-bold shadow-sm outline-none transition-all"
                  value={comparativeArea}
                  onChange={(e) => setComparativeArea(e.target.value)}
                >
                  <option value="Todas">Todas las Áreas (General)</option>
                  {areas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* RESUMEN EJECUTIVO / KPIS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl space-y-2 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PERIODO ACTUAL</span>
                <span className="w-8 h-8 bg-indigo-50 text-indigo-900 rounded-xl flex items-center justify-center font-black text-xs">📅</span>
              </div>
              <p className="text-3xl font-black text-slate-900">{compAnalysis.totalCurrent}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase truncate">{compAnalysis.labelCurrent}</p>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl space-y-2 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PERIODO ANTERIOR</span>
                <span className="w-8 h-8 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center font-black text-xs">⏮️</span>
              </div>
              <p className="text-3xl font-black text-slate-700">{compAnalysis.totalPrevious}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase truncate">{compAnalysis.labelPrevious}</p>
            </div>

            <div className={`p-6 rounded-[2rem] border shadow-xl space-y-2 relative overflow-hidden ${
              compAnalysis.totalDiff > 0 ? 'bg-rose-50 border-rose-100 text-rose-900' : compAnalysis.totalDiff < 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-slate-50 border-slate-100 text-slate-900'
            }`}>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-75">VARIACIÓN ABSOLUTA</span>
                <span className="text-xl">{compAnalysis.totalDiff > 0 ? '🔺' : compAnalysis.totalDiff < 0 ? '🟩' : '⚪'}</span>
              </div>
              <p className="text-3xl font-black">
                {compAnalysis.totalDiff > 0 ? `+${compAnalysis.totalDiff}` : compAnalysis.totalDiff}
              </p>
              <p className="text-[10px] font-black uppercase">
                {compAnalysis.totalPctChange > 0 ? `+${compAnalysis.totalPctChange}%` : `${compAnalysis.totalPctChange}%`} vs. Periodo Anterior
              </p>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl space-y-2 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ÁREA MÁS PROBLEMÁTICA</span>
                <span className="w-8 h-8 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center font-black text-xs">⚠️</span>
              </div>
              <p className="text-lg font-black text-slate-900 truncate">
                {compAnalysis.topProblematicArea ? compAnalysis.topProblematicArea.areaName : 'N/A'}
              </p>
              <p className="text-[10px] font-black text-amber-600 uppercase">
                {compAnalysis.topProblematicArea ? `${compAnalysis.topProblematicArea.currentCount} Incidencias (${compAnalysis.topProblematicArea.diff > 0 ? '+' : ''}${compAnalysis.topProblematicArea.diff} var)` : 'Sin incidencias'}
              </p>
            </div>
          </div>

          {/* CUADRO COMPARATIVO COMPLETO POR ÁREAS */}
          <div className="glass-card bg-white p-6 md:p-8 border border-slate-100 shadow-xl rounded-[2.5rem] overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h4 className="font-black text-indigo-900 text-base uppercase tracking-tight flex items-center gap-2">
                  <span className="w-2 h-5 bg-indigo-600 rounded-full"></span>
                  CUADRO COMPARATIVO COMPLETO POR ÁREA (ORDENADO POR ÁREA MÁS PROBLEMÁTICA)
                </h4>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  Ordenado de mayor a menor según la cantidad de incidencias registradas en el periodo actual
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono border-b border-slate-100">
                    <th className="px-4 py-4 text-center">POS</th>
                    <th className="px-6 py-4">ÁREA HOSPITALARIA</th>
                    <th className="px-6 py-4 text-center">{compAnalysis.labelCurrent.toUpperCase()}</th>
                    <th className="px-6 py-4 text-center text-slate-400">{compAnalysis.labelPrevious.toUpperCase()}</th>
                    <th className="px-6 py-4 text-center">DIFERENCIA (VAR)</th>
                    <th className="px-6 py-4 text-center">% VARIACIÓN</th>
                    <th className="px-6 py-4 text-center">TENDENCIA</th>
                    <th className="px-4 py-4 text-center text-orange-600">PENDIENTES</th>
                    <th className="px-4 py-4 text-center text-blue-600">EN PROCESO</th>
                    <th className="px-4 py-4 text-center text-emerald-600">RESUELTOS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold">
                  {compAnalysis.ranking.map((row, idx) => (
                    <tr key={row.areaName} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-4 text-center font-black">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] ${
                          idx === 0 ? 'bg-amber-500 text-slate-950 font-black ring-4 ring-amber-500/20' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-black text-slate-900 uppercase">{row.areaName}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-indigo-900 text-white font-mono text-xs px-3.5 py-1.5 rounded-full font-black">
                          {row.currentCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-slate-500 font-mono">
                        {row.previousCount}
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-black">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] ${
                          row.diff > 0 ? 'bg-rose-100 text-rose-700' : row.diff < 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {row.diff > 0 ? `+${row.diff}` : row.diff}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-black">
                        <span className={`${
                          row.diff > 0 ? 'text-rose-600' : row.diff < 0 ? 'text-emerald-600' : 'text-slate-400'
                        }`}>
                          {row.pctChange > 0 ? `+${row.pctChange}%` : `${row.pctChange}%`}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                          row.trend === 'AUMENTÓ' ? 'bg-rose-50 text-rose-700 border border-rose-200' : row.trend === 'DISMINUYÓ' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500'
                        }`}>
                          {row.trend === 'AUMENTÓ' ? '🔴 Aumentó' : row.trend === 'DISMINUYÓ' ? '🟢 Disminuyó' : '⚪ Sin cambio'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center font-mono text-orange-600">{row.pending}</td>
                      <td className="px-4 py-4 text-center font-mono text-blue-600">{row.inProgress}</td>
                      <td className="px-4 py-4 text-center font-mono text-emerald-600">{row.resolved}</td>
                    </tr>
                  ))}
                  {compAnalysis.ranking.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-slate-400 font-black uppercase text-xs">
                        No hay datos registrados para las áreas en el periodo seleccionado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ANÁLISIS POR SEMANAS DEL MES */}
          <div className="glass-card bg-white p-6 md:p-8 border border-slate-100 shadow-xl rounded-[2.5rem] space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6">
              <div>
                <h4 className="font-black text-indigo-900 text-base uppercase tracking-tight flex items-center gap-2">
                  <span className="w-2 h-5 bg-amber-500 rounded-full"></span>
                  ANÁLISIS COMPARATIVO POR SEMANAS DEL MES
                </h4>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  Identifique la semana pico con mayor incidencia dentro del mes
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-[10px] font-black text-slate-400 uppercase">Seleccionar Mes:</label>
                <select
                  className="bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2 text-xs font-bold shadow-sm outline-none"
                  value={weeklyAnalysis.targetMonth}
                  onChange={(e) => setWeeklyMonth(e.target.value)}
                >
                  {compAnalysis.availableMonths.map((ym) => (
                    <option key={ym} value={ym}>
                      {getMonthNameYear(ym)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Peak Week Alert Banner */}
            {weeklyAnalysis.peakWeek && (
              <div className="bg-amber-500/10 border-2 border-amber-500/30 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500 text-slate-950 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg">
                    🔥
                  </div>
                  <div>
                    <p className="text-xs font-black text-amber-900 uppercase tracking-wider">SEMANA CRÍTICA / MAYOR DENSIDAD DE INCIDENCIAS</p>
                    <p className="text-lg font-black text-slate-900">
                      {weeklyAnalysis.peakWeek.name} ({weeklyAnalysis.peakWeek.range})
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-amber-900 font-mono">{weeklyAnalysis.peakWeek.count} Incidencias</p>
                  <p className="text-[10px] font-bold text-amber-700 uppercase">
                    Representa el {weeklyAnalysis.peakWeek.pct.toFixed(1)}% del total de {weeklyAnalysis.totalMonthComplaints} incidencias del mes
                  </p>
                </div>
              </div>
            )}

            {/* Weekly Cards Bar Visualizer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {weeklyAnalysis.weeks.map((w) => {
                const isPeak = weeklyAnalysis.peakWeek && w.id === weeklyAnalysis.peakWeek.id;
                return (
                  <div
                    key={w.id}
                    className={`p-5 rounded-2xl border transition-all space-y-3 ${
                      isPeak
                        ? 'bg-amber-500/10 border-amber-500/40 shadow-lg ring-2 ring-amber-500/30'
                        : 'bg-slate-50 border-slate-100 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-900 uppercase">{w.name}</span>
                      {isPeak && (
                        <span className="bg-amber-500 text-slate-950 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">
                          PICO 🔥
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{w.range}</p>
                    <div className="flex justify-between items-baseline">
                      <span className="text-2xl font-black font-mono text-slate-900">{w.count}</span>
                      <span className="text-xs font-black font-mono text-indigo-700">{w.pct.toFixed(1)}%</span>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isPeak ? 'bg-amber-500' : 'bg-indigo-600'}`}
                        style={{ width: `${Math.max(w.pct, 4)}%` }}
                      ></div>
                    </div>

                    {w.topArea && (
                      <p className="text-[9px] font-bold text-slate-500 uppercase truncate">
                        Top: <span className="text-slate-800">{w.topArea}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Area x Week Matrix Table */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h5 className="font-black text-slate-900 text-xs uppercase tracking-wider">
                DESGLOSE DE INCIDENCIAS POR ÁREA Y POR SEMANAS ({getMonthNameYear(weeklyAnalysis.targetMonth)})
              </h5>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono border-b border-slate-100">
                      <th className="px-6 py-4">ÁREA HOSPITALARIA</th>
                      <th className="px-4 py-4 text-center">SEM 1 (1-7)</th>
                      <th className="px-4 py-4 text-center">SEM 2 (8-14)</th>
                      <th className="px-4 py-4 text-center">SEM 3 (15-21)</th>
                      <th className="px-4 py-4 text-center">SEM 4 (22-28)</th>
                      <th className="px-4 py-4 text-center">SEM 5 (29+)</th>
                      <th className="px-6 py-4 text-center text-slate-900">TOTAL MES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold">
                    {weeklyAnalysis.areaMatrix.map((row) => (
                      <tr key={row.areaName} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3.5 font-black text-slate-800 uppercase">{row.areaName}</td>
                        <td className="px-4 py-3.5 text-center font-mono">{row.w1 || '-'}</td>
                        <td className="px-4 py-3.5 text-center font-mono">{row.w2 || '-'}</td>
                        <td className="px-4 py-3.5 text-center font-mono">{row.w3 || '-'}</td>
                        <td className="px-4 py-3.5 text-center font-mono">{row.w4 || '-'}</td>
                        <td className="px-4 py-3.5 text-center font-mono">{row.w5 || '-'}</td>
                        <td className="px-6 py-3.5 text-center font-mono font-black text-indigo-900">
                          <span className="bg-indigo-50 text-indigo-900 px-3 py-1 rounded-full text-xs">
                            {row.total}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {weeklyAnalysis.areaMatrix.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-slate-400 font-black uppercase text-[10px]">
                          Sin incidencias registradas en este mes
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-10 no-print">
        {/* DETALLE ANALÍTICO DE GESTIÓN POR JEFATURA */}
        <div className="glass-card bg-white p-6 md:p-8 border border-slate-100 shadow-xl rounded-[2.5rem] overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h4 className="font-black text-indigo-900 text-sm md:text-base uppercase tracking-tight flex items-center gap-2">
                <span className="w-2 h-5 bg-indigo-600 rounded-full"></span>
                DETALLE ANALÍTICO DE GESTIÓN POR JEFATURA
              </h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                Resumen de Incidencias, Felicitaciones sin leer y Sugerencias pendientes
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono border-b border-slate-100">
                  <th className="px-6 py-4">JEFATURA</th>
                  <th className="px-6 py-4 text-center">INCIDENCIAS PENDIENTES</th>
                  <th className="px-6 py-4 text-center text-amber-600">FELICITACIONES SIN LEER</th>
                  <th className="px-6 py-4 text-center text-blue-600">SUGERENCIAS PENDIENTES</th>
                  <th className="px-6 py-4 text-center font-black text-slate-900">TOTAL PENDIENTES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold">
                {managerAnalyticalStats.map((stat) => (
                  <tr key={stat.name} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-black text-slate-800 uppercase">{stat.name}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-orange-50 text-orange-600 font-mono text-[11px] px-3 py-1 rounded-full font-black">
                        {stat.incidenciasPendientes}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-amber-50 text-amber-600 font-mono text-[11px] px-3 py-1 rounded-full font-black">
                        {stat.felicitacionesSinLeer}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-blue-50 text-blue-600 font-mono text-[11px] px-3 py-1 rounded-full font-black">
                        {stat.sugerenciasPendientes}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-black text-slate-900">
                      <span className="bg-indigo-900 text-white px-3.5 py-1 rounded-full text-xs">
                        {stat.totalPendientes}
                      </span>
                    </td>
                  </tr>
                ))}
                {managerAnalyticalStats.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400 font-black uppercase text-[10px]">
                      Sin datos analíticos para los filtros seleccionados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {(Object.entries(groupedByManager) as [string, Complaint[]][]).map(([manager, items]) => (
          <div key={manager} className="glass-card bg-white p-6 md:p-8 border border-slate-100 shadow-md overflow-hidden">
            <h4 className="font-black text-indigo-900 text-sm uppercase mb-6 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-amber-500 rounded-full"></span>
              JEFATURA: <span className="text-amber-600 ml-2">{manager}</span>
            </h4>
            <div className="overflow-x-auto -mx-6 md:mx-0">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="text-[9px] font-black text-slate-400 uppercase border-b pb-4">
                    <th className="px-4 pb-4" style={{ width: '120px' }}>FECHA / ID</th>
                    <th className="px-4 pb-4">DIMENSIÓN</th>
                    <th className="px-4 pb-4">PACIENTE</th>
                    <th className="px-4 pb-4">DESCRIPCIÓN</th>
                    <th className="px-4 pb-4" style={{ width: '120px' }}>ESTADO</th>
                    <th className="px-4 pb-4 text-right" style={{ width: '120px' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map(c => (
                    <ReportRow 
                      key={c.id}
                      c={c}
                      currentUser={currentUser}
                      isNoCall={isNoCall(c.patientPhone, c.patientName)}
                      onSelect={setResolving}
                      onEdit={setEditing}
                      onDerive={setDeriving}
                      onPreviewImage={onPreviewImage}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* MODAL DE DERIVACIÓN */}
      {deriving && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[700] no-print">
          <div className="bg-white w-full max-w-md p-10 rounded-[3rem] shadow-2xl relative border border-white/20">
            <button onClick={() => setDeriving(null)} className="absolute top-8 right-8 text-3xl text-slate-300 font-light hover:text-rose-500 transition-colors">✕</button>
            <div className="mb-8 text-center">
               <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🔄</div>
               <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Derivar Reclamo</h3>
               <p className="text-[10px] font-black text-slate-400 mt-2 uppercase">Seleccione el nuevo jefe responsable</p>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Nuevo Responsable</label>
                <select 
                  className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-amber-500 rounded-2xl text-sm font-bold outline-none transition-all shadow-inner"
                  value={deriving.managerName || ''}
                  onChange={(e) => setDeriving({ ...deriving, managerName: e.target.value })}
                >
                  <option value="">Seleccionar Jefe...</option>
                  {users.filter(u => u.active !== false && u.role !== 'auditor').map(u => (
                    <option key={u.id} value={u.name}>{u.name} ({u.role === 'admin' ? 'Admin' : 'Jefe'})</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={() => {
                  if (deriving.managerName) {
                    onUpdateFull(deriving);
                    setDeriving(null);
                  } else {
                    alert("Seleccione un jefe para derivar");
                  }
                }} 
                className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl hover:bg-amber-600 transition-all transform hover:-translate-y-1"
              >
                CONFIRMAR DERIVACIÓN
              </button>
            </div>
          </div>
        </div>
      )}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[600] no-print">
          <div className="bg-white w-full max-w-md p-10 rounded-[3rem] shadow-2xl relative border border-white/20">
            <button onClick={() => setShowExportModal(false)} className="absolute top-8 right-8 text-3xl text-slate-300 font-light hover:text-rose-500 transition-colors">✕</button>
            <div className="mb-8">
               <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Exportar a Excel</h3>
               <p className="text-[10px] font-black text-indigo-500 tracking-[0.2em] mt-2 uppercase">
                 {exportType === 'pending' ? 'Casos Pendientes y en Proceso' : exportType === 'resolved' ? 'Casos Resueltos' : 'Todos los Casos'}
               </p>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Desde (Fecha Incidencia)</label>
                <input 
                  type="date" 
                  className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold outline-none transition-all shadow-inner" 
                  value={exportDateFrom} 
                  onChange={e => setExportDateFrom(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Hasta (Fecha Incidencia)</label>
                <input 
                  type="date" 
                  className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold outline-none transition-all shadow-inner" 
                  value={exportDateTo} 
                  onChange={e => setExportDateTo(e.target.value)} 
                />
              </div>

              <button 
                onClick={() => {
                  if (exportType === 'pending') {
                    handleExportExcel(exportDateFrom, exportDateTo);
                  } else if (exportType === 'resolved') {
                    handleExportExcelResolved(exportDateFrom, exportDateTo);
                  } else {
                    handleExportExcelAll(exportDateFrom, exportDateTo);
                  }
                  setShowExportModal(false);
                }} 
                className="w-full py-6 bg-indigo-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl hover:bg-black transition-all transform hover:-translate-y-1"
              >
                GENERAR EXCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDICIÓN TOTAL (BOTÓN EDITAR) */}
      {editing && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[500] no-print overflow-y-auto">
          <div className="bg-white w-full max-w-2xl p-6 md:p-12 rounded-[2.5rem] shadow-2xl relative my-auto border border-white/20">
            <button onClick={() => setEditing(null)} className="absolute top-8 right-8 text-3xl text-slate-300 font-light hover:text-rose-500 transition-colors">✕</button>
            <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-10 flex items-center gap-4">
              <span className="w-1.5 h-10 bg-orange-500 rounded-full"></span>
              Maestro de Registro
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Fecha</label>
                <input type="date" className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-2xl text-sm font-bold outline-none transition-all" value={editing.date} onChange={e => setEditing({...editing, date: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Paciente</label>
                <input className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-2xl text-sm font-bold outline-none transition-all" value={editing.patientName} onChange={e => setEditing({...editing, patientName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Área</label>
                <select className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-2xl text-sm font-bold outline-none transition-all" value={editing.area} onChange={e => setEditing({...editing, area: e.target.value})}>
                  {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Especialidad</label>
                <select className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-2xl text-sm font-bold outline-none transition-all" value={editing.specialty} onChange={e => setEditing({...editing, specialty: e.target.value})}>
                  {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Dimensión</label>
                <select 
                  className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-2xl text-sm font-bold outline-none transition-all" 
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
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Sub Dimensión</label>
                <select 
                  className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-2xl text-sm font-bold outline-none transition-all" 
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
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Descripción Original</label>
                <textarea className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-[1.5rem] text-sm font-bold h-32 outline-none transition-all" value={editing.description} onChange={e => setEditing({...editing, description: e.target.value})} />
              </div>
              {editing.evidenceImages && editing.evidenceImages.length > 0 && (
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Imágenes de Sustento Existentes</label>
                  <div className="flex flex-wrap gap-2">
                    {editing.evidenceImages.map((img, idx) => (
                      <div key={idx} className="relative group cursor-zoom-in" onClick={() => onPreviewImage?.(img)}>
                        <img src={img} alt="Sustento" className="w-20 h-20 object-cover rounded-xl border border-slate-200" />
                        <button onClick={(e) => { e.stopPropagation(); setEditing({...editing, evidenceImages: editing.evidenceImages?.filter((_, i) => i !== idx)}); }} className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-100">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="md:col-span-2 flex flex-col md:flex-row gap-4">
                <button onClick={() => handleFullEditSave()} className="flex-1 py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl hover:bg-black transition-all">
                  Guardar Cambios Maestros
                </button>
                <button onClick={() => handleDelete(editing.id)} className="py-6 px-10 bg-rose-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-rose-700 transition-all">
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RESOLUCIÓN (CLIC EN FILA) */}
      {resolving && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[500] no-print">
          <div className="bg-white w-full max-w-lg p-10 rounded-[3.5rem] shadow-2xl relative border border-white/20">
            <button onClick={() => setResolving(null)} className="absolute top-8 right-8 text-3xl text-slate-300 font-light hover:text-orange-500 transition-colors">✕</button>
            <div className="mb-8">
               <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Gestión de Expediente</h3>
               <p className="text-[10px] font-black text-orange-500 tracking-[0.2em] mt-2 uppercase">{resolving.id} | {resolving.patientName}</p>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-3xl mb-4 border border-slate-100 shadow-inner max-h-40 overflow-y-auto">
               <div className="mb-3 flex gap-4">
                 <div>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dimensión:</p>
                   <p className="text-[11px] font-black text-slate-900">{resolving.dimension}</p>
                 </div>
                 {resolving.subDimension && (
                   <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sub Dimensión:</p>
                     <p className="text-[11px] font-black text-slate-900">{resolving.subDimension}</p>
                   </div>
                 )}
               </div>
               <p className="text-xs text-slate-600 font-bold italic leading-relaxed">"{resolving.description}"</p>
            </div>

            {/* IMÁGENES DE SUSTENTO */}
            {resolving.evidenceImages && resolving.evidenceImages.length > 0 && (
              <div className="mb-6 space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-widest">Sustento (Imágenes)</label>
                <div className="flex flex-wrap gap-2">
                  {resolving.evidenceImages.map((img, idx) => (
                    <img 
                      key={idx} 
                      src={img} 
                      alt="Evidencia" 
                      className="w-16 h-16 object-cover rounded-xl border border-slate-200 cursor-zoom-in hover:scale-105 transition-all" 
                      onClick={() => onPreviewImage?.(img)} 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ENLACE/DETALLES COMPLEMENTARIOS PARA AUDITOR */}
            {currentUser?.role === 'auditor' && (
              <div className="bg-slate-100 p-5 rounded-3xl border border-slate-200 mb-6 space-y-4">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-slate-900 rounded-full"></span>
                  Ficha Completa del Reclamo (Gestión de Jefatura)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-150 shadow-sm">
                    <span className="font-extrabold text-slate-400 block uppercase text-[8px] tracking-wider mb-0.5">Estado de la Gestión:</span>
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[8px] font-black tracking-wider uppercase border ${
                      resolving?.status === ComplaintStatus.RESUELTO 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : resolving?.status === ComplaintStatus.PROCESO 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {resolving?.status}
                    </span>
                  </div>
                  
                  <div className="bg-white p-3 rounded-xl border border-slate-150 shadow-sm">
                    <span className="font-extrabold text-slate-400 block uppercase text-[8px] tracking-wider mb-0.5">Personal Involucrado:</span>
                    <span className="font-bold text-slate-800 text-[10px]">{resolving?.involvedPersonnel || 'No especificado'}</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-150 shadow-sm">
                    <span className="font-extrabold text-slate-400 block uppercase text-[8px] tracking-wider mb-0.5">Medida Correctiva:</span>
                    <span className="font-bold text-slate-800 text-[10px]">
                      {resolving?.correctiveMeasure === 'otra' ? resolving?.correctiveMeasureOther : resolving?.correctiveMeasure || 'No especificada'}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-150 shadow-sm">
                    <span className="font-extrabold text-slate-400 block uppercase text-[8px] tracking-wider mb-0.5">Acción Tomada:</span>
                    <span className="font-bold text-slate-800 text-[10px]">{resolving?.actionTaken || 'No especificada'}</span>
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded-xl border border-slate-150 shadow-sm">
                  <span className="font-extrabold text-slate-400 block uppercase text-[8px] tracking-wider mb-0.5">Detalles de la Acción Tomada / Descargo:</span>
                  <p className="font-medium text-slate-700 italic mt-1 leading-relaxed whitespace-pre-wrap bg-slate-50 p-2 text-[10px] rounded border border-slate-100">
                    "{resolving?.managementResponse || 'Sin detalles de descargo de la jefatura'}"
                  </p>
                </div>
              </div>
            )}

            {/* HISTORIAL - Mostrar solo si hay historial y NO es auditor viendo caso no resuelto */}
            {((resolving.responseHistory && resolving.responseHistory.length > 0) || resolving.managementResponse) && (
              <div className="space-y-3 mb-6">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-widest">Respuesta de Jefatura / Seguimiento</label>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                  {resolving.responseHistory && resolving.responseHistory.map((h, i) => (
                    <div key={i} className={`p-4 rounded-2xl text-[10px] border ${h.type === 'auditor' ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-100'}`}>
                      <div className="flex justify-between mb-1">
                        <span className="font-black uppercase">{h.type === 'auditor' ? 'AUDIT' : 'JEFE'}</span>
                        <span className="text-slate-400">{h.timestamp}</span>
                      </div>
                      <p className="font-bold">{h.user}: <span className="font-medium text-slate-600">{h.text}</span></p>
                    </div>
                  ))}

                  {/* Compatibilidad: mostrar managementResponse si no está en historial */}
                  {resolving.managementResponse && (!resolving.responseHistory || !resolving.responseHistory.some(h => h.text === resolving.managementResponse)) && (
                    <div className="p-4 rounded-2xl text-[10px] border bg-amber-50 border-amber-100">
                      <div className="flex justify-between mb-1">
                        <span className="font-black uppercase text-amber-600">ÚLTIMO DESCARGO (ACTUAL)</span>
                      </div>
                      <p className="text-slate-600 font-medium italic">"{resolving.managementResponse}"</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-6">
              {currentUser?.role === 'auditor' ? (
                resolving.status === ComplaintStatus.RESUELTO ? (
                    <div className="space-y-4 bg-slate-900 p-6 rounded-[2rem]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <label className="text-[10px] font-black uppercase text-white/50 ml-2 tracking-widest block">Observación de Auditoría</label>
                      <textarea 
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white text-xs font-bold h-24 outline-none"
                        value={tempResponse}
                        onChange={e => setTempResponse(e.target.value)}
                        placeholder="Ingrese su observación aquí..."
                      />
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => handleResolutionSave('approve')} className="py-4 bg-emerald-500 text-white rounded-xl font-black uppercase text-[9px]">Aprobar</button>
                      <button onClick={() => handleResolutionSave('observe')} className="py-4 bg-rose-600 text-white rounded-xl font-black uppercase text-[9px]">Observar</button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-center">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-loose">
                      Auditoría disponible solo para casos <br/><span className="text-orange-500">RESUELTOS</span>
                    </p>
                  </div>
                )
              ) : (
                <>
                  {resolving?.isObserved && (
                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl mb-4 flex items-center gap-3">
                       <span className="text-xl">⚠️</span>
                       <div>
                         <p className="text-[10px] font-black text-rose-600 uppercase">Incidencia Observada por Auditoría</p>
                         <p className="text-[9px] font-bold text-rose-500 uppercase tracking-wider">Debe ingresar un nuevo descargo detallado.</p>
                       </div>
                    </div>
                  )}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Actualizar Estado</label>
                    <div className="flex gap-3">
                      {[ComplaintStatus.PENDIENTE, ComplaintStatus.PROCESO, ComplaintStatus.RESUELTO].map(s => (
                        <button 
                          key={s} 
                          onClick={() => setResolving({...resolving, status: s})} 
                          className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-all shadow-sm ${resolving.status === s ? 'bg-slate-900 text-white scale-105' : 'bg-slate-50 text-slate-300'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
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
                       
                       <div className="space-y-2">
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

                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Detalles de la acción tomada / Seguimiento de control</label>
                    <textarea 
                      className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[2rem] text-sm font-bold h-32 outline-none transition-all shadow-inner" 
                      value={tempResponse} 
                      onChange={e => setTempResponse(e.target.value)} 
                      placeholder="Ingrese un nuevo descargo..." 
                    />
                  </div>

                  <div className="space-y-3">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Sustento (Imágenes)</label>
                     <div className="flex flex-wrap gap-3 mb-4">
                        {evidenceImages.map((img, idx) => (
                         <div key={idx} className="relative group cursor-zoom-in" onClick={() => onPreviewImage?.(img)}>
                           <img src={img} alt="Sustento" className="w-16 h-16 object-cover rounded-xl border-2 border-slate-200" />
                           <button onClick={(e) => { e.stopPropagation(); setEvidenceImages(prev => prev.filter((_, i) => i !== idx)); }} className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                         </div>
                       ))}
                       <label className="w-16 h-16 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-all text-slate-300 hover:text-blue-500 hover:border-blue-500">
                         <span className="text-lg font-bold">+</span>
                         <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                       </label>
                     </div>
                  </div>

                  <button 
                    onClick={() => handleResolutionSave()} 
                    className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl hover:scale-[1.02] transition-all"
                  >
                    Actualizar Descargo
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
