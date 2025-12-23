import React, { useState, useEffect } from 'react';
import { Complaint, View, User, ComplaintStatus, DailyStat } from './types';
import { Dashboard } from './components/Dashboard';
import { ComplaintForm } from './components/ComplaintForm';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { IncidencesReported } from './components/IncidencesReported';
import { dbService } from './services/apiService';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isOnline, setIsOnline] = useState(false);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const [users] = useState<User[]>(() => JSON.parse(localStorage.getItem('dac_users') || '[]'));
  const [complaints, setComplaints] = useState<Complaint[]>(() => JSON.parse(localStorage.getItem('dac_complaints') || '[]'));
  const [areas, setAreas] = useState<string[]>(() => JSON.parse(localStorage.getItem('dac_areas') || '["Urgencias", "Triaje", "Laboratorio", "Rayos X", "Consultas", "Farmacia"]'));
  const [specialties, setSpecialties] = useState<string[]>(() => JSON.parse(localStorage.getItem('dac_specialties') || '["Medicina General", "Pediatría", "Ginecología", "Cardiología"]'));

  useEffect(() => {
    localStorage.setItem('dac_areas', JSON.stringify(areas));
    localStorage.setItem('dac_specialties', JSON.stringify(specialties));
  }, [areas, specialties]);

  useEffect(() => {
    const init = async () => {
      const connected = await dbService.testConnection({});
      setIsOnline(connected);
      if (connected) {
        const data = await dbService.fetchComplaints();
        if (data.length > 0) setComplaints(data);
      }
    };
    init();
  }, []);

  const handleAddComplaint = async (c: Complaint) => {
    setComplaints(prev => [c, ...prev]);
    if (isOnline) await dbService.saveComplaint(c);
    setNotification({ msg: 'Incidencia Registrada', type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpdateComplaint = async (id: string, s: ComplaintStatus, r: string, auditor: string) => {
    setComplaints(prev => prev.map(c => c.id === id ? {...c, status: s, managementResponse: r, resolvedBy: auditor} : c));
    if (isOnline) await dbService.updateComplaint(id, s, r, auditor);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#fffcf9] flex items-center justify-center p-4">
        <div className="glass-card p-10 w-full max-w-md shadow-2xl border-orange-200">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-slate-900 rounded-3xl mx-auto mb-4 flex items-center justify-center text-white text-3xl font-black">CD</div>
            <h1 className="text-2xl font-black text-slate-900">CALIDAD DAC 4.0</h1>
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-2">Plataforma de Control Operativo</p>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const u = fd.get('user') as string;
            const p = fd.get('pass') as string;
            if (u === 'admin' && p === 'admin') {
              setCurrentUser({ id: '1', name: 'Admin DAC', username: 'admin', role: 'admin' });
              setIsLoggedIn(true);
            } else alert('Credenciales de prueba: admin / admin');
          }} className="space-y-4">
            <input name="user" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold" placeholder="Usuario" />
            <input name="pass" type="password" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold" placeholder="Contraseña" />
            <button className="w-full py-4 neo-warm-button rounded-2xl font-black text-xs uppercase tracking-widest">Ingresar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#fffcf9]">
      {/* Sidebar responsivo */}
      <aside className="w-full md:w-72 bg-white border-r border-orange-50 flex flex-col p-6 no-print h-auto md:h-screen sticky top-0 z-[100]">
        <div className="mb-10 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-white font-black text-lg">CD</div>
          <h2 className="text-lg font-black text-slate-900">DAC <span className="text-amber-500">PRO</span></h2>
        </div>
        
        <nav className="flex-1 space-y-2">
          {[
            { id: 'dashboard', label: 'Monitor Calidad', icon: '📈' },
            { id: 'incidences', label: 'Incidencias Reportadas', icon: '📑' },
            { id: 'new-incidence', label: 'Nueva Incidencia', icon: '➕' },
            { id: 'reports', label: 'Centro de Reportes', icon: '📋' },
            { id: 'settings', label: 'Ajustes Nodo', icon: '⚙️' }
          ].map((item) => (
            <button 
              key={item.id} 
              onClick={() => setActiveView(item.id as View)} 
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeView === item.id ? 'sidebar-item-active' : 'text-slate-400 hover:bg-orange-50'}`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        
        <div className="mt-8 pt-6 border-t border-orange-50">
          <button onClick={() => setIsLoggedIn(false)} className="w-full py-3 bg-rose-50 text-rose-600 rounded-2xl font-black text-[10px] uppercase">Cerrar Sesión</button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-12 overflow-y-auto w-full">
        {notification && (
          <div className="fixed top-4 right-4 z-[500] p-4 bg-emerald-500 text-white rounded-2xl shadow-2xl font-black text-[10px] uppercase tracking-widest animate-bounce">
            {notification.msg}
          </div>
        )}

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeView === 'dashboard' && <Dashboard complaints={complaints} />}
          {activeView === 'incidences' && <IncidencesReported complaints={complaints} currentUser={currentUser} onUpdate={handleUpdateComplaint} isOnline={isOnline} />}
          {activeView === 'new-incidence' && <ComplaintForm areas={areas} specialties={specialties} onAdd={handleAddComplaint} />}
          {activeView === 'reports' && <Reports complaints={complaints} areas={areas} />}
          {activeView === 'settings' && <Settings areas={areas} setAreas={setAreas} specialties={specialties} setSpecialties={setSpecialties} onConnStatusChange={setIsOnline} />}
        </div>
      </main>
    </div>
  );
};

export default App;