
import React, { useMemo, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar
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
    return Object.entries(counts).map(([subject, A]) => ({ subject, A, fullMark: Math.max(...Object.values(counts), 5) }));
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

      // Section: Tables
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
      worksheet.addRow(['II. GRÁFICOS DE GESTIÓN']).font = { bold: true, size: 14, color: { argb: 'FF1E40AF' } };

      // Helper to add image to excel
      const addChartToExcel = async (ref: React.RefObject<HTMLDivElement>, col: number, row: number) => {
        if (ref.current) {
          const dataUrl = await toPng(ref.current, { backgroundColor: '#ffffff' });
          const imageId = workbook.addImage({
            base64: dataUrl,
            extension: 'png',
          });
          worksheet.addImage(imageId, {
            tl: { col, row },
            ext: { width: 450, height: 300 }
          });
        }
      };

      // Add charts as images (approximated positions)
      await addChartToExcel(chartRef1, 0, worksheet.rowCount + 1);
      await addChartToExcel(chartRef2, 6, worksheet.rowCount + 1);
      
      // Move cursor down for images
      for(let i=0; i<18; i++) worksheet.addRow([]);

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
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      className="space-y-10 pb-10"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">Reportes Gerenciales</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-3 bg-slate-100 inline-block px-4 py-1 rounded-full">Análisis Predictivo y de Desempeño</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={exportExcel}
          className="w-full md:w-auto px-10 py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-[11px] tracking-widest shadow-[0_20px_40px_-10px_rgba(79,70,229,0.4)] hover:bg-slate-900 transition-all flex items-center justify-center gap-3"
        >
          <span className="text-xl">📊</span> Generar Reporte Excel Gerencial
        </motion.button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ÁREAS */}
        <motion.div variants={itemVariants} ref={chartRef1} className="glass-card p-10 bg-white border border-slate-100 shadow-sm min-h-[450px] flex flex-col">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10 border-l-4 border-indigo-500 pl-4">Incidencias por Área Operativa</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={areaStats.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 9, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="value" name="Incidencias" fill="#6366f1" radius={[0, 10, 10, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* JEFATURAS (Stacked Bar) */}
        <motion.div variants={itemVariants} ref={chartRef2} className="glass-card p-10 bg-white border border-slate-100 shadow-sm min-h-[450px] flex flex-col">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10 border-l-4 border-amber-500 pl-4">Estado de Gestión por Jefatura</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={managerStats.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{fontSize: 8, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 9, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                <Bar dataKey="Pendiente" stackId="a" fill="#f59e0b" />
                <Bar dataKey="En Proceso" stackId="a" fill="#6366f1" />
                <Bar dataKey="Observado" stackId="a" fill="#f43f5e" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* SERVICIOS (Pie) */}
        <motion.div variants={itemVariants} ref={chartRef3} className="glass-card p-10 bg-white border border-slate-100 shadow-sm min-h-[450px] flex flex-col">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10 border-l-4 border-emerald-500 pl-4">Distribución por Especialidad / Servicio</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={specialtyStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {specialtyStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '20px', border: 'none'}} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '9px', fontWeight: 'black', textTransform: 'uppercase'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* DIMENSIONES (Radar) */}
        <motion.div variants={itemVariants} ref={chartRef4} className="glass-card p-10 bg-white border border-slate-100 shadow-sm min-h-[450px] flex flex-col">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10 border-l-4 border-indigo-600 pl-4">Dimensiones de Calidad Afectadas</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={dimensionStats}>
                <PolarGrid stroke="#f1f5f9" />
                <PolarAngleAxis dataKey="subject" tick={{fontSize: 8, fontWeight: 'bold', fill: '#94a3b8'}} />
                <Radar
                  name="Incidencias"
                  dataKey="A"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.4}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div variants={itemVariants} className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 transition-all group-hover:scale-150"></div>
             <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4">Área más Crítica</p>
             <h4 className="text-3xl font-black text-white uppercase truncate tracking-tighter">{areaStats[0]?.name || 'N/A'}</h4>
             <div className="mt-6 flex items-center gap-2">
                <span className="text-xs font-black text-white/40">{areaStats[0]?.value || 0} Incidentes registrados</span>
             </div>
          </motion.div>
          <motion.div variants={itemVariants} className="bg-indigo-600 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 transition-all group-hover:scale-150"></div>
             <p className="text-[10px] font-black text-white uppercase tracking-widest mb-4">Jefe con más Pendientes</p>
             <h4 className="text-3xl font-black text-white uppercase truncate tracking-tighter">{managerStats[0]?.name || 'N/A'}</h4>
             <div className="mt-6 flex items-center gap-2">
                <span className="text-xs font-black text-white/60">{managerStats[0]?.Pendiente || 0} Casos por resolver</span>
             </div>
          </motion.div>
          <motion.div variants={itemVariants} className="bg-white border border-slate-100 p-10 rounded-[3rem] shadow-xl relative overflow-hidden group">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Dimensión Prevalente</p>
             <h4 className="text-3xl font-black text-slate-900 uppercase truncate tracking-tighter">
               {[...dimensionStats].sort((a,b) => b.A - a.A)[0]?.subject || 'N/A'}
             </h4>
             <div className="mt-6 flex items-center gap-2">
                <span className="text-xs font-black text-slate-400 lowercase italic">Principal foco de mejora</span>
             </div>
          </motion.div>
      </div>
    </motion.div>
  );
};
