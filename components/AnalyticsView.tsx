
import React, { useMemo, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend
} from 'recharts';
import { Complaint, ComplaintStatus, DIMENSIONS } from '../types';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toPng } from 'html-to-image';
import { motion } from 'motion/react';

interface Props {
  complaints: Complaint[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

export const AnalyticsView: React.FC<Props> = ({ complaints }) => {
  const chartRef1 = useRef<HTMLDivElement>(null);
  const chartRef2 = useRef<HTMLDivElement>(null);
  const chartRef3 = useRef<HTMLDivElement>(null);
  const chartRef4 = useRef<HTMLDivElement>(null);

  const areaStats = useMemo(() => {
    const counts: Record<string, number> = {};
    complaints.forEach(c => {
      counts[c.area] = (counts[c.area] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [complaints]);

  const managerStats = useMemo(() => {
    const managers: Record<string, { name: string; Pendiente: number; 'En Proceso': number; Observado: number }> = {};
    complaints.forEach(c => {
      if (!c.managerName) return;
      if (!managers[c.managerName]) {
        managers[c.managerName] = { name: c.managerName, Pendiente: 0, 'En Proceso': 0, Observado: 0 };
      }
      if (c.status === ComplaintStatus.PENDIENTE) managers[c.managerName].Pendiente++;
      if (c.status === ComplaintStatus.PROCESO) managers[c.managerName]['En Proceso']++;
      if (c.isObserved) managers[c.managerName].Observado++;
    });
    return Object.values(managers).sort((a, b) => (b.Pendiente + b['En Proceso'] + b.Observado) - (a.Pendiente + a['En Proceso'] + a.Observado));
  }, [complaints]);

  const specialtyStats = useMemo(() => {
    const counts: Record<string, number> = {};
    complaints.forEach(c => {
      counts[c.specialty] = (counts[c.specialty] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 8);
  }, [complaints]);

  const dimensionStats = useMemo(() => {
    const counts: Record<string, number> = {};
    DIMENSIONS.forEach(d => counts[d] = 0);
    complaints.forEach(c => {
      if (c.dimension) counts[c.dimension] = (counts[c.dimension] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [complaints]);

  const priorityStats = useMemo(() => {
    const counts: Record<string, number> = { 'Baja': 0, 'Media': 0, 'Alta': 0, 'Crítica': 0 };
    complaints.forEach(c => {
      if (c.priority) counts[c.priority] = (counts[c.priority] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [complaints]);

  const exportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Reporte Gerencial');

      // Title
      worksheet.mergeCells('A1:L3');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'DAC CLOUD - QUADRO DE CONTROL GERENCIAL';
      titleCell.font = { size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      worksheet.addRow([]);
      worksheet.addRow([]);

      // Section I: Resumen Jefaturas
      worksheet.addRow(['I. RESUMEN EJECUTIVO POR JEFATURA']).font = { bold: true, size: 14, color: { argb: 'FF1E40AF' } };
      const tableStartRow = worksheet.addRow(['JEFATURA', 'PENDIENTES', 'EN PROCESO', 'OBSERVADOS', 'TOTAL']);
      tableStartRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      });
      managerStats.forEach(m => {
        worksheet.addRow([m.name, m.Pendiente, m['En Proceso'], m.Observado, m.Pendiente + m['En Proceso'] + m.Observado]);
      });

      worksheet.addRow([]);

      // Section II: Áreas y Prioridad
      worksheet.addRow(['II. ESTADÍSTICAS POR ÁREA Y PRIORIDAD']).font = { bold: true, size: 14, color: { argb: 'FF1E40AF' } };
      const areaHeadline = worksheet.addRow(['ÁREA', 'INCIDENCIAS', '', 'PRIORIDAD', 'TOTAL']);
      areaHeadline.eachCell(cell => { 
        cell.font = { bold: true }; 
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; 
      });
      
      const maxAreaPrio = Math.max(areaStats.length, priorityStats.length);
      for(let i=0; i<maxAreaPrio; i++) {
        worksheet.addRow([
          areaStats[i]?.name || '', areaStats[i]?.value || '', '',
          priorityStats[i]?.name || '', priorityStats[i]?.value || ''
        ]);
      }

      worksheet.addRow([]);

      // Section III: Gráficos
      worksheet.addRow(['III. GRÁFICOS DE GESTIÓN (CAPTURA VISUAL)']).font = { bold: true, size: 14, color: { argb: 'FF1E40AF' } };
      
      const addChartToExcel = async (ref: React.RefObject<HTMLDivElement>, col: number, row: number) => {
        if (ref.current) {
          const dataUrl = await toPng(ref.current, { 
            backgroundColor: '#ffffff',
            skipFonts: true,
            style: { fontFamily: 'sans-serif' }
          });
          const imageId = workbook.addImage({ base64: dataUrl, extension: 'png' });
          worksheet.addImage(imageId, { tl: { col, row }, ext: { width: 500, height: 350 } });
        }
      };

      await addChartToExcel(chartRef1, 0, worksheet.rowCount + 1);
      await addChartToExcel(chartRef2, 6, worksheet.rowCount + 1);
      
      // Reserve space for images
      for(let i=0; i<20; i++) worksheet.addRow([]);
      
      await addChartToExcel(chartRef3, 0, worksheet.rowCount + 1);
      await addChartToExcel(chartRef4, 6, worksheet.rowCount + 1);

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Dashboard_Gerencial_DAC_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error("Export error", error);
      alert("Error al generar el reporte. Verifique que los gráficos estén cargados.");
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  const totalSatisfaction = useMemo(() => {
    if (complaints.length === 0) return 0;
    return complaints.reduce((acc, curr) => acc + (curr.satisfaction || 0), 0) / complaints.length;
  }, [complaints]);

  return (
    <motion.div 
      className="space-y-12 pb-20"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
        <div>
          <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">Cuadro de Mando</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] bg-slate-100 inline-block px-4 py-1.5 rounded-full">Reporte Ejecutivo Gerencial</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={exportExcel}
          className="w-full md:w-auto px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3"
        >
          <span className="text-xl">📊</span> Descargar Reporte Gerencial
        </motion.button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* ÁREAS */}
        <motion.div variants={itemVariants} ref={chartRef1} className="glass-card p-12 bg-white border border-slate-100 shadow-xl rounded-[3rem] min-h-[500px] flex flex-col">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-12 border-l-8 border-indigo-500 pl-6">Incidencias por Área Operativa</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={areaStats.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 11, fontWeight: '900', fill: '#1e293b'}} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)'}} />
                <Bar dataKey="value" name="Incidencias" fill="#4f46e5" radius={[0, 15, 15, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* JEFATURAS (Stacked Bar) */}
        <motion.div variants={itemVariants} ref={chartRef2} className="glass-card p-12 bg-white border border-slate-100 shadow-xl rounded-[3rem] min-h-[500px] flex flex-col">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-12 border-l-8 border-amber-500 pl-6">Estado de Gestión por Jefatura</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={managerStats.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: '900', fill: '#1e293b'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 10, fontWeight: '900', fill: '#1e293b'}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)'}} />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '30px'}} iconSize={10} />
                <Bar dataKey="Pendiente" stackId="a" fill="#f59e0b" barSize={40} />
                <Bar dataKey="En Proceso" stackId="a" fill="#4f46e5" />
                <Bar dataKey="Observado" stackId="a" fill="#f43f5e" radius={[15, 15, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* ESPECIALIDADES (Bar) */}
        <motion.div variants={itemVariants} ref={chartRef3} className="glass-card p-12 bg-white border border-slate-100 shadow-xl rounded-[3rem] min-h-[500px] flex flex-col">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-12 border-l-8 border-emerald-500 pl-6">Incidencias por Especialidad / Servicio</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={specialtyStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 11, fontWeight: '900', fill: '#1e293b'}} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)'}} />
                <Bar dataKey="value" name="Total" fill="#10b981" radius={[0, 15, 15, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* DIMENSIONES (Bar) */}
        <motion.div variants={itemVariants} ref={chartRef4} className="glass-card p-12 bg-white border border-slate-100 shadow-xl rounded-[3rem] min-h-[500px] flex flex-col">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-12 border-l-8 border-rose-500 pl-6">Dimensiones de Calidad Críticas</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={dimensionStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{fontSize: 9, fontWeight: '900', fill: '#1e293b'}} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{fontSize: 10, fontWeight: '900', fill: '#1e293b'}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)'}} />
                <Bar dataKey="value" name="Frecuencia" fill="#f43f5e" radius={[15, 15, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
      
      {/* GRILLA DE DATOS - TABLA TIPO EXCEL */}
      <motion.div variants={itemVariants} className="glass-card p-10 bg-white border border-slate-100 shadow-2xl rounded-[3rem] overflow-hidden">
        <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6 px-4">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Detalle Analítico de Gestión</h3>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Consolidado de KPIs por Responsable</p>
          </div>
          <div className="flex gap-2 text-right">
            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[8px] font-black rounded-lg uppercase">Pendientes: {managerStats.reduce((a,b) => a + b.Pendiente, 0)}</span>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-[8px] font-black rounded-lg uppercase">En Proceso: {managerStats.reduce((a,b) => a + b['En Proceso'], 0)}</span>
            <span className="px-3 py-1 bg-rose-100 text-rose-700 text-[8px] font-black rounded-lg uppercase">Observados: {managerStats.reduce((a,b) => a + b.Observado, 0)}</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Nombre Jefatura</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono text-center">Pendientes</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono text-center">En Proceso</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono text-center">Observados</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono text-center">Total Casos</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono text-center">Eficiencia %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {managerStats.map((m, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5 font-black text-slate-700 uppercase text-xs">{m.name}</td>
                  <td className="px-6 py-5 text-center">
                    <span className="bg-amber-50 text-amber-600 font-mono text-[11px] font-black px-3 py-1 rounded-full">{m.Pendiente}</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="bg-indigo-50 text-indigo-600 font-mono text-[11px] font-black px-3 py-1 rounded-full">{m['En Proceso']}</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="bg-rose-50 text-rose-600 font-mono text-[11px] font-black px-3 py-1 rounded-full">{m.Observado}</span>
                  </td>
                  <td className="px-6 py-5 text-center font-black text-slate-900 text-sm">
                    {m.Pendiente + m['En Proceso'] + m.Observado}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="w-24 h-2 bg-slate-100 rounded-full mx-auto overflow-hidden">
                       <div 
                         className="h-full bg-emerald-500 rounded-full" 
                         style={{ width: `${Math.min(100, Math.max(0, 100 - ((m.Pendiente + m.Observado) / (m.Pendiente + m['En Proceso'] + m.Observado) * 100)))}%` }} 
                       />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <motion.div variants={itemVariants} className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 transition-all group-hover:scale-150"></div>
             <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4">Área Crítica</p>
             <h4 className="text-3xl font-black text-white uppercase truncate tracking-tighter">{areaStats[0]?.name || 'N/A'}</h4>
             <div className="mt-6 flex items-center gap-2">
                <span className="text-xs font-black text-white/40">{areaStats[0]?.value || 0} Incidentes</span>
             </div>
          </motion.div>
          <motion.div variants={itemVariants} className="bg-indigo-600 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 transition-all group-hover:scale-150"></div>
             <p className="text-[10px] font-black text-white uppercase tracking-widest mb-4">Jefe con más Casos</p>
             <h4 className="text-3xl font-black text-white uppercase truncate tracking-tighter">{managerStats[0]?.name || 'N/A'}</h4>
             <div className="mt-6 flex items-center gap-2">
                <span className="text-xs font-black text-white/60">{managerStats[0]?.Pendiente || 0} Pendientes</span>
             </div>
          </motion.div>
          <motion.div variants={itemVariants} className="bg-emerald-500 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
             <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-4">Satisfacción Media</p>
             <h4 className="text-5xl font-black text-white uppercase tracking-tighter">
               {totalSatisfaction.toFixed(1)} <span className="text-sm">/ 5</span>
             </h4>
             <div className="mt-6 flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(s => <span key={s} className={`w-1 h-3 rounded-full ${s <= Math.round(totalSatisfaction) ? 'bg-white' : 'bg-white/20'}`}></span>)}
                </div>
             </div>
          </motion.div>
          <motion.div variants={itemVariants} className="bg-white border border-slate-100 p-10 rounded-[3rem] shadow-xl relative overflow-hidden group">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Prioridad Crítica</p>
             <h4 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">
               {priorityStats.find(p => p.name === 'Crítica')?.value || 0} <span className="text-xs text-rose-500 font-black">CASOS</span>
             </h4>
             <p className="text-[9px] font-black text-slate-300 uppercase mt-4">Acción inmediata requerida</p>
          </motion.div>
      </div>
    </motion.div>
  );
};
