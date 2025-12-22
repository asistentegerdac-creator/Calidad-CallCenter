import React, { useState, useEffect, useRef } from 'react';
import JsSIP from 'jssip';
import { 
  Complaint, CallRecord, View, User, ComplaintStatus, 
  Priority, PhoneConfig, IPCall 
} from './types';
import { Dashboard } from './components/Dashboard';
import { ComplaintList } from './components/ComplaintList';
import { ComplaintForm } from './components/ComplaintForm';
import { CallLog } from './components/CallLog';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { PhoneWidget } from './components/PhoneWidget';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error' | 'info'} | null>(null);
  
  const [complaints, setComplaints] = useState<Complaint[]>(() => JSON.parse(localStorage.getItem('dac_complaints') || '[]'));
  const [calls, setCalls] = useState<CallRecord[]>(() => JSON.parse(localStorage.getItem('dac_calls') || '[]'));
  const [areas, setAreas] = useState<string[]>(() => JSON.parse(localStorage.getItem('dac_areas') || '["Urgencias", "Consultas", "UCI", "Laboratorio"]'));
  const [specialties, setSpecialties] = useState<string[]>(() => JSON.parse(localStorage.getItem('dac_specialties') || '["Cardiología", "Pediatría", "Medicina General"]'));

  const [phoneConfig, setPhoneConfig] = useState<PhoneConfig>(() => {
    const saved = localStorage.getItem('dac_phone_config');
    return saved ? JSON.parse(saved) : {
      socketUrl: 'ws://192.168.22.101:8088/ws',
      sipDomain: '192.168.22.101',
      sipUser: '172.28.38.250',
      sipPass: '12345AD',
      status: 'offline'
    };
  });

  const [activeIPCall, setActiveIPCall] = useState<IPCall | null>(null);
  const [callHistory, setCallHistory] = useState<IPCall[]>([]);
  const uaRef = useRef<JsSIP.UA | null>(null);

  useEffect(() => {
    localStorage.setItem('dac_complaints', JSON.stringify(complaints));
    localStorage.setItem('dac_calls', JSON.stringify(calls));
    localStorage.setItem('dac_areas', JSON.stringify(areas));
    localStorage.setItem('dac_specialties', JSON.stringify(specialties));
    localStorage.setItem('dac_phone_config', JSON.stringify(phoneConfig));
  }, [complaints, calls, areas, specialties, phoneConfig]);

  // Auto-hide notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const connectSIP = () => {
    if (!phoneConfig.socketUrl) {
      setNotification({ msg: 'Falta URL del WebSocket', type: 'error' });
      return;
    }

    setPhoneConfig(prev => ({ ...prev, status: 'connecting' }));
    setNotification({ msg: 'Intentando conectar a la central...', type: 'info' });

    try {
      if (uaRef.current) {
        uaRef.current.stop();
      }

      const socket = new JsSIP.WebSocketInterface(phoneConfig.socketUrl);
      const configuration = {
        sockets: [socket],
        uri: `sip:${phoneConfig.sipUser}@${phoneConfig.sipDomain}`,
        password: phoneConfig.sipPass,
        register: true
      };

      const ua = new JsSIP.UA(configuration);
      uaRef.current = ua;

      ua.on('connected', () => {
        console.log('SIP Socket Conectado');
      });

      ua.on('disconnected', () => {
        setPhoneConfig(p => ({ ...p, status: 'offline' }));
      });

      ua.on('registered', () => {
        setPhoneConfig(p => ({ ...p, status: 'online' }));
        setNotification({ msg: 'Central Conectada Exitosamente ✓', type: 'success' });
      });

      ua.on('registrationFailed', (e: any) => {
        setPhoneConfig(p => ({ ...p, status: 'offline' }));
        setNotification({ msg: `Fallo de registro: ${e.cause || 'Error desconocido'}`, type: 'error' });
      });

      ua.on('newRTCSession', (data: any) => {
        const session = data.session;
        const number = session.remote_identity.uri.user;
        const newCall: IPCall = {
          id: Math.random().toString(),
          number,
          status: 'ringing',
          timestamp: new Date().toLocaleTimeString(),
          duration: 0,
          direction: session.direction === 'incoming' ? 'incoming' : 'outgoing'
        };
        setActiveIPCall(newCall);
        session.on('accepted', () => setActiveIPCall(prev => prev ? { ...prev, status: 'active' } : null));
        session.on('ended', () => {
          setActiveIPCall(null);
          setCallHistory(prev => [{ ...newCall, status: 'ended' as const }, ...prev].slice(0, 50));
        });
        session.on('failed', () => setActiveIPCall(null));
      });

      ua.start();
    } catch (e: any) {
      setPhoneConfig(p => ({ ...p, status: 'offline' }));
      setNotification({ msg: `Error de configuración: ${e.message}`, type: 'error' });
    }
  };

  const handleDial = (number: string) => {
    if (uaRef.current && phoneConfig.status === 'online') {
      const options = { mediaConstraints: { audio: true, video: false } };
      uaRef.current.call(`sip:${number}@${phoneConfig.sipDomain}`, options);
    } else {
      setNotification({ msg: 'La central no está conectada', type: 'error' });
    }
  };

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    setUser({ id: '1', username, name: username, role: 'admin' });
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[2rem] w-full max-w-md shadow-2xl border border-slate-200">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto mb-6 flex items-center justify-center text-white text-4xl">🏥</div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Intelligence DAC</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Gestión Médica de Calidad</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Usuario del Sistema</label>
              <input name="username" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 outline-none focus:border-blue-500 font-bold" placeholder="Nombre de usuario" />
            </div>
            <button className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-500/20 transition-all">Ingresar al Centro</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 relative">
      {/* Global Notifications */}
      {notification && (
        <div className={`fixed top-6 right-6 z-[300] p-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          notification.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="text-xl">
            {notification.type === 'success' ? '✓' : notification.type === 'error' ? '✕' : 'ℹ'}
          </div>
          <div className="text-sm font-bold">{notification.msg}</div>
        </div>
      )}

      <aside className="w-20 lg:w-64 bg-white border-r border-slate-200 flex flex-col no-print">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black">D</div>
          <span className="hidden lg:block text-xl font-black tracking-tighter">DAC PRO</span>
        </div>
        
        <nav className="flex-1 p-3 space-y-1 mt-4">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'complaints', label: 'Atención', icon: '🩺' },
            { id: 'crm', label: 'CRM Llamadas', icon: '📞' },
            { id: 'reports', label: 'Reportes', icon: '📋' },
            { id: 'settings', label: 'Ajustes', icon: '⚙️' }
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveView(item.id as View)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeView === item.id ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <span className="text-lg">{item.icon}</span> 
              <span className="hidden lg:block">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button onClick={() => setIsLoggedIn(false)} className="w-full py-3 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-xl font-bold text-xs uppercase tracking-widest transition-all">Salir</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
        <header className="mb-10 no-print flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black tracking-tight capitalize text-slate-900">{activeView}</h2>
            <p className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.2em]">Panel de Control de Calidad Hospitalaria</p>
          </div>
          <div className="text-right">
             <p className="text-xs font-bold text-slate-500">Sesión iniciada como:</p>
             <p className="text-sm font-black text-blue-600">{user?.name}</p>
          </div>
        </header>

        {activeView === 'dashboard' && <Dashboard complaints={complaints} calls={calls} areas={areas} />}
        {activeView === 'complaints' && (
          <div className="space-y-8">
            <ComplaintForm areas={areas} specialties={specialties} onAdd={c => setComplaints([c, ...complaints])} />
            <ComplaintList complaints={complaints} onDial={handleDial} onUpdate={(id, s, r) => setComplaints(prev => prev.map(c => c.id === id ? {...c, status: s, managementResponse: r} : c))} />
          </div>
        )}
        {activeView === 'crm' && <CallLog calls={calls} onAdd={c => setCalls([c, ...calls])} />}
        {activeView === 'reports' && <Reports complaints={complaints} calls={calls} />}
        {activeView === 'settings' && (
          <Settings 
            areas={areas} setAreas={setAreas} 
            specialties={specialties} setSpecialties={setSpecialties}
            phoneConfig={phoneConfig} setPhoneConfig={setPhoneConfig}
            onConnect={connectSIP}
            callHistory={callHistory}
          />
        )}

        <PhoneWidget config={phoneConfig} activeCall={activeIPCall} onDial={handleDial} />
      </main>
    </div>
  );
};

export default App;
