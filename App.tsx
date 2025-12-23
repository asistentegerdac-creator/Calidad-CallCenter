
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

  const [users, setUsers] = useState<User[]>(() => JSON.parse(localStorage.getItem('dac_users') || '[]'));
  const [complaints, setComplaints] = useState<Complaint[]>(() => JSON.parse(localStorage.getItem('dac_complaints') || '[]'));
  const [areas, setAreas] = useState<string[]>(() => JSON.parse(localStorage.getItem('dac_areas') || '["Urgencias", "Triaje", "Laboratorio", "Rayos X", "Consultas", "Farmacia"]'));
  const [specialties, setSpecialties] = useState<string[]>(() => JSON.parse(localStorage.getItem('dac_specialties') || '["Medicina General", "Pediatría", "Ginecología", "Cardiología"]'));

  useEffect(() => {
    document.body.className = currentTheme === 'classic' ? '' : `theme-${currentTheme}`;
    localStorage.setItem('dac_theme', currentTheme);
  }, [currentTheme]);

  // Monitoreo constante de salud del Nodo
  useEffect(() => {
    const checkHealth = async () => {
      const health = await dbService.checkHealth();
      setIsOnline(health.connected);
      setDbStatusMsg(health.connected ? 'Nodo Activo' : (health.message || 'Sin Conexión'));
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000); // Cada 10 seg
    return () => clearInterval(interval);
  }, []);

  const autoSync = useCallback(async () => {
    if (!isOnline) return;
    try {
      const remoteUsers = await dbService.fetchUsers();
      if (remoteUsers.length > 0) setUsers(remoteUsers);
      const remoteComplaints = await dbService.fetchComplaints();
      if (remoteComplaints.length > 0) setComplaints(remoteComplaints);
    } catch (e) {
      console.error("Error en autoSync");
    }
  }, [isOnline]);

  useEffect(() => {
    if (isOnline) autoSync();
  }, [isOnline, autoSync]);

  const handleAddComplaint = async (c: Complaint) => {
    setComplaints(prev => [c, ...prev]);
    if (isOnline) {
      const success = await dbService.saveComplaint(c);
      if (success) setNotification({ msg: 'Incidencia Sincronizada', type: 'success' });
      else setNotification({ msg: 'Fallo al sincronizar con Postgres', type: 'error' });
    } else {
      const local = JSON.parse(localStorage.getItem('dac_complaints') || '[]');
      localStorage.setItem('dac_complaints', JSON.stringify([c, ...local]));
      setNotification({ msg: 'Guardado Local (Pendiente)', type: 'success' });
    }
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpdateComplaint = async (id: string, s: ComplaintStatus, r: string, auditor: string) => {
    const updated = complaints.map(c => c.id === id ? {...c, status: s, managementResponse: r, resolvedBy: auditor} : c);
    setComplaints(updated);
    if (isOnline) await dbService.updateComplaint(id, s, r, auditor);
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

    // Fallback local solo si es admin
    if (u === 'admin' && p === 'admin') {
      setCurrentUser({ id: '1', name: 'Master Admin', username: 'admin', role: 'admin', permissions: ['dashboard', 'incidences', 'new-incidence', 'reports', 'settings'] });
      setIsLoggedIn(true);
    } else {
      alert('Error de acceso. Verifique su conexión al Nodo Central.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row transition-all duration-500">
      {!isLoggedIn ? (
        <div className="min-h-screen w-full flex items-center justify-center p-4">
          <div className="glass-card p-10 w-full max-w-md shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-slate-900 rounded-3xl mx-auto mb-4 flex items-center justify-center text-white text-3xl font-black">CD</div>
              <h1 className="text-2xl font-black tracking-tighter uppercase">CALIDAD DAC <span className="text-amber-500">v6.0</span></h1>
              <div className="flex items-center justify-center gap-2 mt-2">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                <p className="text-[10px] font-black uppercase text-slate-400">{dbStatusMsg}</p>
              </div>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              <input name="user" required className="w-full p-4 rounded-2xl font-bold outline-none" placeholder="Auditor" />
              <input name="pass" type="password" required className="w-full p-4 rounded-2xl font-bold outline-none" placeholder="Password" />
              <button className="w-full py-4 neo-warm-button rounded-2xl font-black text-[10px] uppercase tracking-widest">Acceder al Nodo</button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <aside className="w-full md:w-72 border-r flex flex-col p-6 no-print h-auto md:h-screen sticky top-0 z-[100]">
            <div className="mb-10 flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg">CD</div>
              <div>
                <h2 className="text-lg font-black leading-none">DAC PRO</h2>
                <span className={`text-[7px] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-500' : 'text-rose-500'}`}>{dbStatusMsg}</span>
              </div>
            </div>
            <nav className="flex-1 space-y-2">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: '📈' },
                { id: 'incidences', label: 'Auditoría', icon: '📑' },
                { id: 'new-incidence', label: 'Reportar', icon: '➕' },
                { id: 'reports', label: 'Datos', icon: '📋' },
                { id: 'settings', label: 'Nodo', icon: '⚙️' }
              ].map((item) => (
                <button key={item.id} onClick={() => setActiveView(item.id as View)} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest ${activeView === item.id ? 'sidebar-item-active' : 'text-slate-400'}`}>
                  <span className="text-lg">{item.icon}</span>{item.label}
                </button>
              ))}
            </nav>
            <div className="mt-8 pt-6 border-t">
              <p className="text-[9px] font-black text-center uppercase">{currentUser?.name}</p>
              <button onClick={() => setIsLoggedIn(false)} className="w-full mt-4 py-3 bg-rose-50/50 text-rose-600 rounded-2xl font-black text-[10px] uppercase">Salir</button>
            </div>
          </aside>
          <main className="flex-1 p-4 md:p-12 overflow-y-auto">
            {notification && (
              <div className={`fixed top-4 right-4 z-[500] p-4 ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'} text-white rounded-2xl shadow-2xl font-black text-[10px] uppercase animate-bounce`}>
                {notification.msg}
              </div>
            )}
            {activeView === 'dashboard' && <Dashboard complaints={complaints} />}
            {activeView === 'incidences' && <IncidencesReported complaints={complaints} currentUser={currentUser} onUpdate={handleUpdateComplaint} isOnline={isOnline} />}
            {activeView === 'new-incidence' && <ComplaintForm areas={areas} specialties={specialties} onAdd={handleAddComplaint} />}
            {activeView === 'reports' && <Reports complaints={complaints} areas={areas} />}
            {activeView === 'settings' && (
              <Settings 
                areas={areas} setAreas={setAreas} specialties={specialties} setSpecialties={setSpecialties}
                users={users} setUsers={setUsers} currentUser={currentUser}
                isOnline={isOnline} onConnStatusChange={setIsOnline}
                currentTheme={currentTheme} setTheme={setCurrentTheme}
              />
            )}
          </main>
        </>
      )}
    </div>
  );
};

export default App;
