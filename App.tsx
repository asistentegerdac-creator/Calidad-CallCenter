import React, { useState, useEffect } from 'react';
import { Complaint, View, User, ComplaintStatus, Priority } from './types';
import { Dashboard } from './components/Dashboard';
import { ComplaintList } from './components/ComplaintList';
import { ComplaintForm } from './components/ComplaintForm';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const [users, setUsers] = useState<User[]>(() => {
    try { return JSON.parse(localStorage.getItem('dac_users') || '[]'); } catch { return []; }
  });
  const [complaints, setComplaints] = useState<Complaint[]>(() => {
    try { return JSON.parse(localStorage.getItem('dac_complaints') || '[]'); } catch { return []; }
  });
  const [areas, setAreas] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('dac_areas') || '["Urgencias", "UCI", "Consultas Externas", "Laboratorio", "Hospitalización", "Fisioterapia"]'); } catch { return ["Urgencias", "UCI", "Consultas Externas"]; }
  });
  const [specialties, setSpecialties] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('dac_specialties') || '["Medicina General", "Pediatría", "Cardiología", "Ginecología", "Traumatología", "Neurología"]'); } catch { return ["Medicina General", "Pediatría"]; }
  });

  useEffect(() => {
    localStorage.setItem('dac_users', JSON.stringify(users));
    localStorage.setItem('dac_complaints', JSON.stringify(complaints));
    localStorage.setItem('dac_areas', JSON.stringify(areas));
    localStorage.setItem('dac_specialties', JSON.stringify(specialties));
  }, [users, complaints, areas, specialties]);

  useEffect(() => { if (users.length === 0) setIsRegisterMode(true); }, [users.length]);

  const handleAuth = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const u = (fd.get('username') as string || '').trim();
    const p = (fd.get('password') as string || '').trim();
    const n = (fd.get('name') as string || '').trim();

    if (!u || !p) return setNotification({ msg: 'Campos requeridos', type: 'error' });

    if (isRegisterMode) {
      if (users.find(x => x.username.toLowerCase() === u.toLowerCase())) {
        return setNotification({ msg: 'El usuario ya existe', type: 'error' });
      }
      const newUser: User = { id: Date.now().toString(), username: u, password: p, name: n || u, role: 'admin' };
      setUsers([...users, newUser]);
      setCurrentUser(newUser);
      setIsLoggedIn(true);
      setNotification({ msg: 'Cuenta creada con éxito', type: 'success' });
    } else {
      const found = users.find(x => x.username === u && x.password === p);
      if (found) { 
        setCurrentUser(found); 
        setIsLoggedIn(true); 
      } else { 
        setNotification({ msg: 'Credenciales inválidas', type: 'error' });
      }
    }
  };

  const handleUpdateComplaint = (id: string, s: ComplaintStatus, r: string, auditor: string) => {
    setComplaints(prev => prev.map(c => c.id === id ? {...c, status: s, managementResponse: r, resolvedBy: auditor} : c));
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#fffcf9] flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[4rem] w-full max-w-md shadow-2xl border border-orange-100 animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-amber-500 rounded-[2rem] mx-auto mb-6 flex items-center justify-center text-white text-4xl font-black shadow-lg">CD</div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">CALIDAD DAC</h1>
            <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.3em] mt-2">Audit Control Platform</p>
          </div>

          <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-8">
            <button onClick={() => setIsRegisterMode(false)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${!isRegisterMode ? 'bg-white shadow-sm text-amber-600' : 'text-slate-400'}`} disabled={users.length === 0}>Ingreso</button>
            <button onClick={() => setIsRegisterMode(true)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${isRegisterMode ? 'bg-white shadow-sm text-amber-600' : 'text-slate-400'}`}>Registro</button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegisterMode && (
              <input name="name" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:border-amber-400 text-slate-900" placeholder="Nombre Completo" />
            )}
            <input name="username" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:border-amber-400 text-slate-900" placeholder="Usuario de Acceso" />
            <input name="password" type="password" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:border-amber-400 text-slate-900" placeholder="Contraseña" />
            <button className="w-full py-5 neo-warm-button rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] mt-6">
              {isRegisterMode ? 'CONFIGURAR ADMINISTRADOR' : 'ENTRAR AL PANEL'}
            </button>
          </form>
          {notification && <p className={`text-center mt-6 text-[10px] font-black uppercase ${notification.type === 'error' ? 'text-rose-500' : 'text-emerald-500'}`}>{notification.msg}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#fffcf9]">
      <aside className="w-80 bg-white border-r border-orange-50 flex flex-col p-8 no-print sticky top-0 h-screen">
        <div className="mb-14 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md">CD</div>
          <div>
            <h2 className="text-xl font-black tracking-tighter text-slate-900 leading-none">CALIDAD DAC</h2>
            <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest">Medical Audit v2.5</span>
          </div>
        </div>
        
        <nav className="flex-1 space-y-3">
          {[
            { id: 'dashboard', label: 'Dashboard Real-Time', icon: '📊' },
            { id: 'complaints', label: 'Incidencias & Auditoría', icon: '🩺' },
            { id: 'reports', label: 'Reportes Oficiales', icon: '📋' },
            { id: 'settings', label: 'Configuración de Sistema', icon: '⚙️' }
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveView(item.id as View)} className={`w-full flex items-center gap-5 px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${activeView === item.id ? 'sidebar-item-active' : 'text-slate-400 hover:bg-orange-50 hover:text-amber-600'}`}>
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="pt-8 border-t border-orange-50 mt-auto">
          <div className="flex items-center gap-3 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center text-[11px] font-black">AD</div>
            <div className="truncate">
              <p className="text-[10px] font-black text-slate-900 truncate">{currentUser?.name}</p>
              <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Administrador Jefe</p>
            </div>
          </div>
          <button onClick={() => { setIsLoggedIn(false); setCurrentUser(null); }} className="w-full py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-colors shadow-sm">Cerrar Sesión</button>
        </div>
      </aside>

      <main className="flex-1 p-10 lg:p-16 overflow-y-auto">
        <header className="mb-14 no-print flex justify-between items-end border-b border-orange-50 pb-10">
          <div>
            <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.4em] mb-2">GESTIÓN INTEGRAL HOSPITALARIA</p>
            <h1 className="text-5xl font-black tracking-tighter text-slate-900 capitalize">
              {activeView === 'dashboard' ? 'Métricas de Calidad' : activeView === 'complaints' ? 'Control de Incidencias' : activeView}
            </h1>
          </div>
          <div className="text-right">
             <div className="bg-white px-6 py-3 rounded-2xl border border-orange-50 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
             </div>
          </div>
        </header>

        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          {activeView === 'dashboard' && <Dashboard complaints={complaints} areas={areas} />}
          {activeView === 'complaints' && (
            <div className="space-y-16">
              <ComplaintForm areas={areas} specialties={specialties} onAdd={c => setComplaints([c, ...complaints])} />
              <div className="pt-4">
                <div className="flex justify-between items-center mb-10">
                   <h3 className="text-3xl font-black tracking-tight text-slate-900">Histórico de Auditoría</h3>
                   <span className="bg-amber-100 text-amber-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">{complaints.length} REGISTROS</span>
                </div>
                <ComplaintList complaints={complaints} currentUser={currentUser} onUpdate={handleUpdateComplaint} />
              </div>
            </div>
          )}
          {activeView === 'reports' && <Reports complaints={complaints} />}
          {activeView === 'settings' && (
            <Settings 
              areas={areas} 
              setAreas={setAreas} 
              specialties={specialties} 
              setSpecialties={setSpecialties} 
              adminPassword={currentUser?.password || ''} 
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;