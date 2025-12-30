
import React, { useState, useEffect, useCallback } from 'react';
import { Complaint, View, User, ComplaintStatus, NoCallPatient } from './types';
import { Dashboard } from './components/Dashboard';
import { ComplaintForm } from './components/ComplaintForm';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { IncidencesReported } from './components/IncidencesReported';
import { NoCallList } from './components/NoCallList';
import { dbService } from './services/apiService';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isOnline, setIsOnline] = useState(false);
  const [dbStatusMsg, setDbStatusMsg] = useState('Verificando...');
  const [currentTheme, setCurrentTheme] = useState<string>(() => localStorage.getItem('dac_theme') || 'classic');

  const [users, setUsers] = useState<User[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>(() => JSON.parse(localStorage.getItem('dac_complaints') || '[]'));
  const [noCallList, setNoCallList] = useState<NoCallPatient[]>([]);
  
  const [areas, setAreas] = useState<string[]>(() => JSON.parse(localStorage.getItem('dac_areas') || '["Urgencias", "Triaje", "Laboratorio", "Rayos X", "Consultas", "Farmacia"]'));
  const [specialties, setSpecialties] = useState<string[]>(() => JSON.parse(localStorage.getItem('dac_specialties') || '["Medicina General", "Pediatría", "Ginecología", "Cardiología"]'));

  useEffect(() => {
    document.body.className = currentTheme === 'classic' ? '' : `theme-${currentTheme}`;
    localStorage.setItem('dac_theme', currentTheme);
  }, [currentTheme]);

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
      setUsers(remoteUsers);
      
      const remoteComplaints = await dbService.fetchComplaints();
      if (remoteComplaints.length > 0) setComplaints(remoteComplaints);

      const remoteNoCall = await dbService.fetchNoCallList();
      if (remoteNoCall.length > 0) setNoCallList(remoteNoCall);

      const remoteAreas = await dbService.fetchAreas();
      if (remoteAreas.length > 0) setAreas(remoteAreas);

      const remoteSpecs = await dbService.fetchSpecialties();
      if (remoteSpecs.length > 0) setSpecialties(remoteSpecs);
    } catch (e) { console.error("Error Sync:", e); }
  }, [isOnline]);

  useEffect(() => {
    if (isOnline) {
      autoSync();
      const syncInterval = setInterval(autoSync, 30000); 
      return () => clearInterval(syncInterval);
    }
  }, [isOnline, autoSync]);

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
      setCurrentUser({ id: '1', name: 'Super Admin Local', username: 'admin', role: 'admin', permissions: ['all'] });
      setIsLoggedIn(true);
    } else {
      alert('Denegado. Verifique que el usuario existe en el Nodo Postgres.');
    }
  };

  const handleAddComplaint = async (c: Complaint) => {
    const newComplaints = [c, ...complaints];
    setComplaints(newComplaints);
    localStorage.setItem('dac_complaints', JSON.stringify(newComplaints));
    if (isOnline) await dbService.saveComplaint(c);
  };

  const handleUpdateFull = async (updated: Complaint) => {
    const newComplaints = complaints.map(c => c.id === updated.id ? updated : c);
    setComplaints(newComplaints);
    localStorage.setItem('dac_complaints', JSON.stringify(newComplaints));
    if (isOnline) await dbService.saveComplaint(updated);
  };

  const handleAddArea = async (name: string) => {
    if (areas.includes(name)) return;
    const newAreas = [...areas, name];
    setAreas(newAreas);
    localStorage.setItem('dac_areas', JSON.stringify(newAreas));
    if (isOnline) await dbService.saveArea(name);
  };

  const handleRemoveArea = async (name: string) => {
    const newAreas = areas.filter(a => a !== name);
    setAreas(newAreas);
    localStorage.setItem('dac_areas', JSON.stringify(newAreas));
    if (isOnline) await dbService.deleteAreaCatalog(name);
  };

  const handleAddSpecialty = async (name: string) => {
    if (specialties.includes(name)) return;
    const newSpecs = [...specialties, name];
    setSpecialties(newSpecs);
    localStorage.setItem('dac_specialties', JSON.stringify(newSpecs));
    if (isOnline) await dbService.saveSpecialty(name);
  };

  const handleRemoveSpecialty = async (name: string) => {
    const newSpecs = specialties.filter(s => s !== name);
    setSpecialties(newSpecs);
    localStorage.setItem('dac_specialties', JSON.stringify(newSpecs));
    if (isOnline) await dbService.deleteSpecialtyCatalog(name);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row transition-all duration-500">
      {!isLoggedIn ? (
        <div className="min-h-screen w-full flex items-center justify-center p-4">
          <div className="glass-card p-12 w-full max-w-md shadow-2xl bg-white">
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-slate-900 rounded-[2.5rem] mx-auto mb-6 flex items-center justify-center text-white text-4xl font-black shadow-2xl">CD</div>
              <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900">DAC <span className="text-amber-500">v9.0</span></h1>
              <div className="flex items-center justify-center gap-2 mt-4">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                <p className="text-[9px] font-black uppercase text-slate-400">{dbStatusMsg}</p>
              </div>
            </div>
            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-1">
                 <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Usuario</label>
                 <input name="user" required className="w-full p-4 rounded-2xl font-bold outline-none bg-slate-50 border border-slate-100" />
              </div>
              <div className="space-y-1">
                 <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Clave</label>
                 <input name="pass" type="password" required className="w-full p-4 rounded-2xl font-bold outline-none bg-slate-50 border border-slate-100" />
              </div>
              <button className="w-full py-5 neo-warm-button rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl">Ingresar</button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <aside className="w-full md:w-72 border-r flex flex-col p-6 no-print h-auto md:h-screen sticky top-0 z-[100] bg-white">
            <div className="mb-6 flex items-center gap-4 px-2">
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">CD</div>
              <div><h2 className="text-lg font-black leading-none text-slate-900 uppercase">DAC Cloud</h2></div>
            </div>

            {/* SEÑAL VISUAL DE RED */}
            <div className="px-2 mb-8">
              <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${isOnline ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    {isOnline ? 'Conexión: Nube' : 'Modo: Local'}
                  </span>
                  <span className="text-[7px] font-bold opacity-70 uppercase tracking-tighter">
                    {isOnline ? 'Nodo Postgres Activo' : 'Sincronización Pendiente'}
                  </span>
                </div>
              </div>
            </div>

            <nav className="flex-1 space-y-2">
              {[
                { id: 'dashboard', label: 'Monitor', icon: '📈' },
                { id: 'incidences', label: 'Gestión', icon: '📑' },
                { id: 'new-incidence', label: 'Reportar', icon: '➕' },
                { id: 'reports', label: 'Informes', icon: '📋' },
                { id: 'no-call', label: 'Lista Negra', icon: '📵' },
                ...(currentUser?.role === 'admin' ? [{ id: 'settings', label: 'Ajustes', icon: '⚙️' }] : [])
              ].map((item) => (
                <button key={item.id} onClick={() => setActiveView(item.id as View)} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeView === item.id ? 'sidebar-item-active' : 'text-slate-400 hover:bg-slate-50'}`}>
                  <span className="text-xl">{item.icon}</span>{item.label}
                </button>
              ))}
            </nav>
            <div className="mt-8 pt-6 border-t">
              <button onClick={() => setIsLoggedIn(false)} className="w-full py-3 bg-rose-50 text-rose-600 rounded-2xl font-black text-[10px] uppercase">Salir</button>
            </div>
          </aside>
          <main className="flex-1 p-4 md:p-10 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              {activeView === 'dashboard' && <Dashboard complaints={complaints} />}
              {activeView === 'incidences' && <IncidencesReported complaints={complaints} currentUser={currentUser} onUpdateFull={handleUpdateFull} onDelete={autoSync} isOnline={isOnline} areas={areas} specialties={specialties} onRefresh={autoSync} />}
              {activeView === 'new-incidence' && <ComplaintForm areas={areas} specialties={specialties} onAdd={handleAddComplaint} noCallList={noCallList} />}
              {activeView === 'reports' && <Reports complaints={complaints} areas={areas} specialties={specialties} onUpdateFull={handleUpdateFull} currentUser={currentUser} />}
              {activeView === 'no-call' && <NoCallList noCallList={noCallList} isOnline={isOnline} onRefresh={autoSync} />}
              {activeView === 'settings' && <Settings areas={areas} onAddArea={handleAddArea} onRemoveArea={handleRemoveArea} specialties={specialties} onAddSpecialty={handleAddSpecialty} onRemoveSpecialty={handleRemoveSpecialty} users={users} setUsers={setUsers} currentUser={currentUser} isOnline={isOnline} onConnStatusChange={setIsOnline} currentTheme={currentTheme} setTheme={setCurrentTheme} complaints={complaints} setComplaints={setComplaints} />}
            </div>
          </main>
        </>
      )}
    </div>
  );
};

export default App;
