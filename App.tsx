
import React, { useState, useEffect } from 'react';
import { Complaint, CallRecord, View, User, ComplaintStatus, Priority, PhoneConfig, IPCall } from './types';
import { INITIAL_COMPLAINTS, INITIAL_CALLS, AREAS, SPECIALTIES } from './constants';
import { Dashboard } from './components/Dashboard';
import { ComplaintList } from './components/ComplaintList';
import { ComplaintForm } from './components/ComplaintForm';
import { CallLog } from './components/CallLog';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { PhoneWidget } from './components/PhoneWidget';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<View>('new-complaint');
  
  const [complaints, setComplaints] = useState<Complaint[]>(INITIAL_COMPLAINTS);
  const [calls, setCalls] = useState<CallRecord[]>(INITIAL_CALLS);
  
  // Phone Integration State
  const [phoneConfig, setPhoneConfig] = useState<PhoneConfig>({
    ipAddress: '',
    sipUser: '',
    sipPass: '',
    status: 'offline'
  });
  const [ipCallHistory, setIpCallHistory] = useState<IPCall[]>([]);
  const [activeCall, setActiveCall] = useState<Partial<IPCall> | null>(null);

  const [dynamicAreas, setDynamicAreas] = useState<string[]>(AREAS);
  const [dynamicSpecialties, setDynamicSpecialties] = useState<string[]>(SPECIALTIES);

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const user = formData.get('user') as string;
    const pass = formData.get('pass') as string;
    if(user && pass) {
      setCurrentUser({ id: '1', username: user, name: user, role: 'admin' });
      setIsLoggedIn(true);
    }
  };

  const handleRegister = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const user = formData.get('user') as string;
    const pass = formData.get('pass') as string;
    if(name && user && pass) {
      setCurrentUser({ id: Date.now().toString(), username: user, name, role: 'staff' });
      setIsLoggedIn(true);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setIsRegistering(false);
  };

  const addComplaint = (newC: Omit<Complaint, 'id'>) => {
    const complaint: Complaint = { ...newC, id: Date.now().toString() };
    setComplaints([complaint, ...complaints]);
    setActiveView('complaints');
  };

  const updateComplaint = (id: string, status: ComplaintStatus, response?: string) => {
    setComplaints(complaints.map(c => 
      c.id === id ? { ...c, status, managementResponse: response } : c
    ));
  };

  const addCallRecord = (newR: Omit<CallRecord, 'id'>) => {
    const record: CallRecord = { ...newR, id: Date.now().toString() };
    setCalls([...calls, record]);
  };

  const handleUpdateLists = (type: 'specialties' | 'areas', newList: string[]) => {
    if(type === 'specialties') setDynamicSpecialties(newList);
    else setDynamicAreas(newList);
  };

  const handlePhoneAction = (action: 'answer' | 'hangup' | 'dial', number?: string) => {
    if (action === 'answer' && activeCall) {
      setActiveCall({ ...activeCall, status: 'completed' });
      setPhoneConfig({ ...phoneConfig, status: 'calling' });
    } else if (action === 'hangup') {
      if (activeCall) {
        const finishedCall: IPCall = {
          id: Date.now().toString(),
          number: activeCall.number || 'Desconocido',
          direction: activeCall.direction || 'outgoing',
          duration: Math.floor(Math.random() * 300), // Simulated duration
          timestamp: new Date().toLocaleString(),
          status: 'completed'
        };
        setIpCallHistory([finishedCall, ...ipCallHistory]);
      }
      setActiveCall(null);
      setPhoneConfig({ ...phoneConfig, status: phoneConfig.ipAddress ? 'online' : 'offline' });
    } else if (action === 'dial' && number) {
      setActiveCall({ number, direction: 'outgoing', timestamp: new Date().toLocaleString() });
      setPhoneConfig({ ...phoneConfig, status: 'calling' });
    }
  };

  // Simulate incoming call randomly if configured
  useEffect(() => {
    if (phoneConfig.status === 'online' && !activeCall) {
      const timer = setTimeout(() => {
        if (Math.random() > 0.8) {
          setActiveCall({
            number: `+504 ${Math.floor(Math.random() * 90000000) + 10000000}`,
            direction: 'incoming',
            timestamp: new Date().toLocaleString()
          });
          setPhoneConfig(prev => ({ ...prev, status: 'calling' }));
        }
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [phoneConfig.status, activeCall]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#05070a] flex items-center justify-center p-6 font-['Inter'] relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 blur-[120px] rounded-full"></div>
        <div className="w-full max-w-xl z-10">
          <div className="bg-[#0d1117]/80 backdrop-blur-xl rounded-[60px] shadow-[0_0_80px_rgba(37,99,235,0.15)] overflow-hidden border border-slate-800 p-2">
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 rounded-[54px] p-16 text-center text-white relative overflow-hidden">
              <div className="w-24 h-24 bg-white/10 backdrop-blur-2xl rounded-[35px] flex items-center justify-center mx-auto mb-6 text-5xl border border-white/20">🛰️</div>
              <h1 className="text-5xl font-black tracking-tighter mb-2">Calidad DAC</h1>
              <p className="text-blue-100 font-bold uppercase tracking-[0.4em] text-[10px] opacity-80">INTELLIGENCE CENTER</p>
            </div>
            <div className="p-12">
              {isRegistering ? (
                <form onSubmit={handleRegister} className="space-y-6">
                  <div className="text-center mb-4">
                    <h2 className="text-2xl font-black text-white">Nuevo Operador</h2>
                  </div>
                  <div className="space-y-4">
                    <input name="name" type="text" required placeholder="Nombre Completo" className="w-full bg-slate-900/40 border border-slate-700 rounded-2xl px-6 py-4 focus:border-blue-500 outline-none transition-all text-white" />
                    <input name="user" type="text" required placeholder="Usuario" className="w-full bg-slate-900/40 border border-slate-700 rounded-2xl px-6 py-4 focus:border-blue-500 outline-none transition-all text-white" />
                    <input name="pass" type="password" required placeholder="Clave" className="w-full bg-slate-900/40 border border-slate-700 rounded-2xl px-6 py-4 focus:border-blue-500 outline-none transition-all text-white" />
                  </div>
                  <button type="submit" className="w-full bg-blue-600 text-white font-black py-5 rounded-[25px] shadow-2xl hover:bg-blue-500 transition-all text-lg uppercase mt-4">Registrar</button>
                  <p className="text-center text-slate-500 text-sm mt-4">¿Ya tienes cuenta? <button type="button" onClick={() => setIsRegistering(false)} className="text-blue-400 font-bold">Entrar</button></p>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="text-center mb-4">
                    <h2 className="text-2xl font-black text-white">Acceso DAC</h2>
                  </div>
                  <div className="space-y-4">
                    <input name="user" type="text" required placeholder="Usuario" className="w-full bg-slate-900/40 border border-slate-700 rounded-2xl px-6 py-4 focus:border-blue-500 outline-none transition-all text-white" />
                    <input name="pass" type="password" required placeholder="Clave" className="w-full bg-slate-900/40 border border-slate-700 rounded-2xl px-6 py-4 focus:border-blue-500 outline-none transition-all text-white" />
                  </div>
                  <button type="submit" className="w-full bg-blue-600 text-white font-black py-5 rounded-[25px] shadow-2xl hover:bg-blue-500 transition-all text-lg uppercase mt-4">Ingresar</button>
                  <p className="text-center text-slate-500 text-sm mt-4">¿Nuevo? <button type="button" onClick={() => setIsRegistering(true)} className="text-blue-400 font-bold">Registrarse</button></p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (activeView) {
      case 'new-complaint': return <ComplaintForm onAdd={addComplaint} onCancel={() => setActiveView('dashboard')} existingComplaints={complaints} specialties={dynamicSpecialties} areas={dynamicAreas} onUpdateLists={handleUpdateLists} />;
      case 'dashboard': return <Dashboard complaints={complaints} calls={calls} />;
      case 'complaints': return <ComplaintList complaints={complaints} onUpdateStatus={updateComplaint} />;
      case 'calls': return <CallLog calls={calls} onAddCallRecord={addCallRecord} />;
      case 'reports': return <Reports complaints={complaints} calls={calls} />;
      case 'settings': return <Settings phoneConfig={phoneConfig} onUpdatePhoneConfig={setPhoneConfig} ipCallHistory={ipCallHistory} />;
      default: return <Dashboard complaints={complaints} calls={calls} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f8fafc] font-['Inter']">
      <aside className="hidden lg:flex w-72 bg-white border-r border-slate-200 flex-col fixed inset-y-0 shadow-xl z-30">
        <div className="p-10 mb-4">
           <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">D</div>
             <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tighter">Calidad DAC</h1>
                <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest mt-1">OPERACIONES</p>
             </div>
           </div>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <NavButton active={activeView === 'new-complaint'} onClick={() => setActiveView('new-complaint')} icon="⚡" label="Nueva Queja" />
          <NavButton active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} icon="📊" label="Dashboard" />
          <NavButton active={activeView === 'complaints'} onClick={() => setActiveView('complaints')} icon="📑" label="Historial" />
          <NavButton active={activeView === 'calls'} onClick={() => setActiveView('calls')} icon="📞" label="Contacto" />
          <NavButton active={activeView === 'reports'} onClick={() => setActiveView('reports')} icon="🖨️" label="Reportes" />
          <NavButton active={activeView === 'settings'} onClick={() => setActiveView('settings')} icon="⚙️" label="Configuración" />
        </nav>
        <div className="p-6">
           <div className="bg-slate-900 rounded-[30px] p-6 text-white shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg">{currentUser?.name.charAt(0).toUpperCase()}</div>
                <div className="overflow-hidden">
                  <p className="text-xs font-black truncate">{currentUser?.name}</p>
                  <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest">Master Op</p>
                </div>
              </div>
              <button onClick={handleLogout} className="w-full py-3 bg-white/5 border border-white/10 text-white rounded-xl font-black text-[10px] hover:bg-white hover:text-slate-900 transition-all uppercase tracking-widest">Cerrar Sesión</button>
           </div>
        </div>
      </aside>

      <main className="flex-1 lg:ml-72 p-6 md:p-10 lg:p-12 pb-32 min-h-screen">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
          <div>
            <p className="text-blue-600 font-black uppercase text-[10px] tracking-[0.3em] mb-2">Central DAC v4.0</p>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter capitalize">{activeView.replace('-', ' ')}</h2>
          </div>
          <div className="flex items-center gap-6 bg-white px-6 py-3 rounded-full border border-slate-100 shadow-lg">
             <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grandstream IP</p>
                <p className={`text-xs font-bold flex items-center gap-1 justify-end ${phoneConfig.status === 'offline' ? 'text-slate-400' : 'text-green-500'}`}>
                  <span className={`w-2 h-2 rounded-full ${phoneConfig.status === 'offline' ? 'bg-slate-300' : 'bg-green-500 animate-pulse'}`}></span>
                  {phoneConfig.status.toUpperCase()}
                </p>
             </div>
             <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 relative">
                <span className="text-xl">📡</span>
                {phoneConfig.status !== 'offline' && <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>}
             </div>
          </div>
        </header>

        <div className="animate-in fade-in duration-700">
          {renderView()}
        </div>
      </main>

      {/* Floating Phone Widget */}
      <PhoneWidget 
        config={phoneConfig} 
        activeCall={activeCall} 
        onAction={handlePhoneAction} 
      />

      <nav className="lg:hidden fixed bottom-6 inset-x-6 bg-white/90 backdrop-blur-xl border border-slate-200 rounded-[30px] flex justify-around p-3 z-40 shadow-2xl">
        <MobileNavButton active={activeView === 'new-complaint'} onClick={() => setActiveView('new-complaint')} icon="⚡" />
        <MobileNavButton active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} icon="📊" />
        <MobileNavButton active={activeView === 'complaints'} onClick={() => setActiveView('complaints')} icon="📑" />
        <MobileNavButton active={activeView === 'calls'} onClick={() => setActiveView('calls')} icon="📞" />
        <MobileNavButton active={activeView === 'settings'} onClick={() => setActiveView('settings')} icon="⚙️" />
      </nav>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: string, label: string }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black transition-all ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-50 hover:text-blue-600'}`}>
    <span className="text-xl">{icon}</span>
    <span className="tracking-tight text-xs uppercase font-black">{label}</span>
  </button>
);

const MobileNavButton = ({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: string }) => (
  <button onClick={onClick} className={`w-12 h-12 rounded-2xl transition-all flex items-center justify-center ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400'}`}>
    <span className="text-xl">{icon}</span>
  </button>
);

export default App;
