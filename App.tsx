
import React, { useState, useEffect, useCallback } from 'react';
import { Complaint, View, User, ComplaintStatus } from './types';
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
  const [dbStatusMsg, setDbStatusMsg] = useState('Verificando...');
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [currentTheme, setCurrentTheme] = useState<string>(() => localStorage.getItem('dac_theme') || 'classic');

  const [users, setUsers] = useState<User[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>(() => JSON.parse(localStorage.getItem('dac_complaints') || '[]'));
  
  const [areas, setAreas] = useState<string[]>(() => JSON.parse(localStorage.getItem('dac_areas') || '["Urgencias", "Triaje", "Laboratorio", "Rayos X", "Consultas", "Farmacia"]'));
  const [specialties, setSpecialties] = useState<string[]>(() => JSON.parse(localStorage.getItem('dac_specialties') || '["Medicina General", "Pediatría", "Ginecología", "Cardiología"]'));

  useEffect(() => {
    document.body.className = currentTheme === 'classic' ? '' : `theme-${currentTheme}`;
    localStorage.setItem('dac_theme', currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    localStorage.setItem('dac_areas', JSON.stringify(areas));
    localStorage.setItem('dac_specialties', JSON.stringify(specialties));
  }, [areas, specialties]);

  useEffect(() => {
    const checkHealth = async () => {
      const health = await dbService.checkHealth();
      setIsOnline(health.connected);
      setDbStatusMsg(health.connected ? 'Nodo Activo' : (health.message || 'Sin Conexión'));
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const autoSync = useCallback(async () => {
    if (!isOnline) return;
    try {
      const remoteUsers = await dbService.fetchUsers();
      if (remoteUsers.length > 0) setUsers(remoteUsers);
      
      const remoteComplaints = await dbService.fetchComplaints();
      if (remoteComplaints.length > 0) setComplaints(remoteComplaints);

      const remoteAreas = await dbService.fetchAreas();
      if (remoteAreas.length > 0) setAreas(remoteAreas);

      const remoteSpecs = await dbService.fetchSpecialties();
      if (remoteSpecs.length > 0) setSpecialties(remoteSpecs);

    } catch (e) {
      console.error("Error en autoSync");
    }
  }, [isOnline]);

  useEffect(() => {
    if (isOnline) {
      autoSync();
      const syncInterval = setInterval(autoSync, 30000); // Sincronización automática cada 30 segundos
      return () => clearInterval(syncInterval);
    }
  }, [isOnline, autoSync]);

  const handleAddComplaint = async (c: Complaint) => {
    const newComplaints = [c, ...complaints];
    setComplaints(newComplaints);
    localStorage.setItem('dac_complaints', JSON.stringify(newComplaints));

    if (isOnline) {
      const success = await dbService.saveComplaint(c);
      if (success) setNotification({ msg: 'Sincronizado con Postgres', type: 'success' });
      else setNotification({ msg: 'Guardado Local (Error DB)', type: 'error' });
    } else {
      setNotification({ msg: 'Guardado Localmente', type: 'success' });
    }
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpdateComplaint = async (id: string, s: ComplaintStatus, r: string, auditor: string) => {
    const original = complaints.find(c => c.id === id);
    if (!original) return;

    const updatedObj: Complaint = {
      ...original,
      status: s,
      managementResponse: r,
      resolvedBy: auditor
    };

    const updatedList = complaints.map(c => c.id === id ? updatedObj : c);
    setComplaints(updatedList);
    localStorage.setItem('dac_complaints', JSON.stringify(updatedList));
    
    if (isOnline) {
      await dbService.saveComplaint(updatedObj);
      setNotification({ msg: 'Estado y Comentario Actualizados', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleUpdateFullComplaint = async (updatedComplaint: Complaint) => {
    const updated = complaints.map(c => c.id === updatedComplaint.id ? updatedComplaint : c);
    setComplaints(updated);
    localStorage.setItem('dac_complaints', JSON.stringify(updated));
    if (isOnline) await dbService.saveComplaint(updatedComplaint);
    setNotification({ msg: 'Incidencia Actualizada', type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteFullComplaint = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar esta incidencia permanentemente?")) return;
    const updated = complaints.filter(c => c.id !== id);
    setComplaints(updated);
    localStorage.setItem('dac_complaints', JSON.stringify(updated));
    if (isOnline) await dbService.deleteComplaint(id);
    setNotification({ msg: 'Incidencia Eliminada', type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const u = fd.get('user') as string;
    const p = fd.get('pass') as string;

    if (isOnline) {
      const userFromDb = await dbService.login(u, p);
      if (userFromDb) {
        setCurrentUser(userFromDb);
        setIsLoggedIn(true);
        return;
      }
    }

    if (u === 'admin' && p === 'admin') {
      setCurrentUser({ id: '1', name: 'Super Admin', username: 'admin', role: 'admin', permissions: ['all'] });
      setIsLoggedIn(true);
    } else {
      alert('Acceso Denegado. Verifique conexión al Nodo.');
    }
  };

  const handleAddArea = async (name: string) => {
    if (areas.includes(name)) return;
    const updated = [...areas, name];
    setAreas(updated);
    if (isOnline) await dbService.saveArea(name);
  };

  const handleRemoveArea = async (name: string) => {
    const updated = areas.filter(a => a !== name);
    setAreas(updated);
    if (isOnline) await dbService.deleteArea(name);
  };

  const handleAddSpecialty = async (name: string) => {
    if (specialties.includes(name)) return;
    const updated = [...specialties, name];
    setSpecialties(updated);
    if (isOnline) await dbService.saveSpecialty(name);
  };

  const handleRemoveSpecialty = async (name: string) => {
    const updated = specialties.filter(s => s !== name);
    setSpecialties(updated);
    if (isOnline) await dbService.deleteSpecialty(name);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row transition-all duration-500">
      {!isLoggedIn ? (
        <div className="min-h-screen w-full flex items-center justify-center p-4">
          <div className="glass-card p-12 w-full max-w-md shadow-2xl bg-white">
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-slate-900 rounded-[2.5rem] mx-auto mb-6 flex items-center justify-center text-white text-4xl font-black shadow-2xl">CD</div>
              <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900">DAC <span className="text-amber-500">v8.0</span></h1>
              <p className="text-[10px] font-black uppercase text-slate-400 mt-2 tracking-widest">Gestión de Calidad DAC</p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                <p className="text-[9px] font-black uppercase text-slate-400">{dbStatusMsg}</p>
              </div>
            </div>
            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-1">
                 <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Identificación Auditor</label>
                 <input name="user" required className="w-full p-4 rounded-2xl font-bold outline-none bg-slate-50 border border-slate-100" placeholder="Ej: admin" />
              </div>
              <div className="space-y-1">
                 <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Clave de Nodo</label>
                 <input name="pass" type="password" required className="w-full p-4 rounded-2xl font-bold outline-none bg-slate-50 border border-slate-100" placeholder="••••••••" />
              </div>
              <button className="w-full py-5 neo-warm-button rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-transform">Inicia Sesión</button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <aside className="w-full md:w-72 border-r flex flex-col p-6 no-print h-auto md:h-screen sticky top-0 z-[100] bg-white">
            <div className="mb-10 flex items-center gap-4 px-2">
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">CD</div>
              <div>
                <h2 className="text-lg font-black leading-none text-slate-900">DAC CLOUD</h2>
                <span className={`text-[8px] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-500' : 'text-rose-500'}`}>{dbStatusMsg}</span>
              </div>
            </div>
            <nav className="flex-1 space-y-2">
              {[
                { id: 'dashboard', label: 'Monitor Calidad', icon: '📈' },
                { id: 'incidences', label: 'Gestión Calidad', icon: '📑' },
                { id: 'new-incidence', label: 'Reportar', icon: '➕' },
                { id: 'reports', label: 'Estadísticas', icon: '📋' },
                ...(currentUser?.role === 'admin' ? [{ id: 'settings', label: 'Configuración', icon: '⚙️' }] : [])
              ].map((item) => (
                <button key={item.id} onClick={() => setActiveView(item.id as View)} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeView === item.id ? 'sidebar-item-active' : 'text-slate-400 hover:bg-slate-50'}`}>
                  <span className="text-xl">{item.icon}</span>{item.label}
                </button>
              ))}
            </nav>
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="px-4 py-3 bg-slate-50 rounded-2xl mb-4">
                <p className="text-[8px] font-black text-slate-400 uppercase">Sesión activa</p>
                <p className="text-[10px] font-black text-slate-900 truncate">{currentUser?.name}</p>
                <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md uppercase mt-1 inline-block">{currentUser?.role}</span>
              </div>
              <button onClick={() => setIsLoggedIn(false)} className="w-full py-3 bg-rose-50 text-rose-600 rounded-2xl font-black text-[10px] uppercase hover:bg-rose-100 transition-colors">Cerrar Sesión</button>
            </div>
          </aside>
          <main className="flex-1 p-4 md:p-10 overflow-y-auto">
            {notification && (
              <div className={`fixed top-8 right-8 z-[500] p-5 ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'} text-white rounded-[2rem] shadow-2xl font-black text-[10px] uppercase animate-in slide-in-from-right-10`}>
                {notification.msg}
              </div>
            )}
            <div className="max-w-7xl mx-auto">
              {activeView === 'dashboard' && <Dashboard complaints={complaints} />}
              {activeView === 'incidences' && (
                <IncidencesReported 
                  complaints={complaints} 
                  currentUser={currentUser} 
                  onUpdate={handleUpdateComplaint} 
                  onUpdateFull={handleUpdateFullComplaint}
                  onDelete={handleDeleteFullComplaint}
                  isOnline={isOnline}
                  areas={areas}
                  specialties={specialties}
                  onRefresh={autoSync}
                />
              )}
              {activeView === 'new-incidence' && <ComplaintForm areas={areas} specialties={specialties} onAdd={handleAddComplaint} />}
              {activeView === 'reports' && (
                <Reports 
                  complaints={complaints} 
                  areas={areas} 
                  onUpdate={handleUpdateComplaint}
                  onUpdateFull={handleUpdateFullComplaint}
                  currentUser={currentUser}
                />
              )}
              {activeView === 'settings' && currentUser?.role === 'admin' && (
                <Settings 
                  areas={areas} onAddArea={handleAddArea} onRemoveArea={handleRemoveArea}
                  specialties={specialties} onAddSpecialty={handleAddSpecialty} onRemoveSpecialty={handleRemoveSpecialty}
                  users={users} setUsers={setUsers} currentUser={currentUser}
                  isOnline={isOnline} onConnStatusChange={setIsOnline}
                  currentTheme={currentTheme} setTheme={setCurrentTheme}
                  complaints={complaints} setComplaints={setComplaints}
                />
              )}
            </div>
          </main>
        </>
      )}
    </div>
  );
};

export default App;
