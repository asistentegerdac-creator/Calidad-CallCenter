import React, { useState } from 'react';
import { PhoneConfig, IPCall } from '../types';

interface Props {
  areas: string[];
  setAreas: (a: string[]) => void;
  specialties: string[];
  setSpecialties: (s: string[]) => void;
  phoneConfig: PhoneConfig;
  setPhoneConfig: (p: PhoneConfig) => void;
  onConnect: () => void;
  callHistory: IPCall[];
}

export const Settings: React.FC<Props> = ({ areas, setAreas, specialties, setSpecialties, phoneConfig, setPhoneConfig, onConnect, callHistory }) => {
  const [newArea, setNewArea] = useState('');
  const [newSpec, setNewSpec] = useState('');

  const getStatusButtonConfig = () => {
    switch (phoneConfig.status) {
      case 'online':
        return { text: 'Línea Activa ✓', class: 'bg-emerald-600 text-white', disabled: false };
      case 'connecting':
        return { text: 'Conectando...', class: 'bg-blue-400 text-white cursor-wait animate-pulse', disabled: true };
      default:
        return { text: 'Conectar Central', class: 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20', disabled: false };
    }
  };

  const btnConfig = getStatusButtonConfig();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white p-8 rounded-[2rem] border border-slate-200">
        <h3 className="text-lg font-black mb-6 flex items-center gap-3">
          <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center">📞</span>
          Configuración Telefonía SIP
        </h3>
        <div className="space-y-4">
          <div className="space-y-1">
             <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">WebSocket URL</label>
             <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:border-blue-500" placeholder="ws://ip:puerto/ws" value={phoneConfig.socketUrl} onChange={e => setPhoneConfig({...phoneConfig, socketUrl: e.target.value})} />
          </div>
          <div className="space-y-1">
             <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">Dominio / IP PBX</label>
             <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:border-blue-500" placeholder="192.168.1.1" value={phoneConfig.sipDomain} onChange={e => setPhoneConfig({...phoneConfig, sipDomain: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">Usuario/Ext</label>
               <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:border-blue-500" value={phoneConfig.sipUser} onChange={e => setPhoneConfig({...phoneConfig, sipUser: e.target.value})} />
            </div>
            <div className="space-y-1">
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">Password</label>
               <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:border-blue-500" type="password" value={phoneConfig.sipPass} onChange={e => setPhoneConfig({...phoneConfig, sipPass: e.target.value})} />
            </div>
          </div>
          
          <div className="pt-2">
            <button 
              onClick={onConnect}
              disabled={btnConfig.disabled}
              className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${btnConfig.class}`}
            >
              {btnConfig.text}
            </button>
          </div>

          <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-wider">
            {phoneConfig.status === 'online' ? 'Conexión estable con servidor Asterisk/FreePBX' : 'Asegúrese de que el servidor SIP permita WebSockets'}
          </p>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-6">
           <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Historial Reciente IP</h4>
           <div className="space-y-2">
              {callHistory.slice(0, 5).map(h => (
                <div key={h.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg text-xs">
                  <span className="font-bold">{h.number}</span>
                  <span className="text-slate-400 uppercase font-black text-[9px]">{h.direction}</span>
                  <span className="text-slate-400">{h.timestamp}</span>
                </div>
              ))}
              {callHistory.length === 0 && <p className="text-[10px] text-slate-400 italic">Sin llamadas registradas.</p>}
           </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2rem] border border-slate-200 space-y-8">
        <div>
          <h3 className="text-lg font-black mb-4 flex items-center gap-2">
            <span className="text-blue-600">🏢</span> Áreas Clínicas
          </h3>
          <div className="flex gap-2 mb-4">
            <input className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500" value={newArea} onChange={e => setNewArea(e.target.value)} placeholder="Ej: Rayos X" />
            <button onClick={() => { if(newArea) setAreas([...areas, newArea]); setNewArea(''); }} className="px-4 bg-emerald-600 text-white rounded-lg font-black transition-colors hover:bg-emerald-700 shadow-md shadow-emerald-500/10">+</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {areas.map(a => (
              <span key={a} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-md text-[11px] font-bold flex items-center gap-2 border border-blue-100">
                {a} <button onClick={() => setAreas(areas.filter(x => x !== a))} className="text-blue-300 hover:text-rose-500 transition-colors">×</button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-black mb-4 flex items-center gap-2">
            <span className="text-blue-600">🎓</span> Especialidades
          </h3>
          <div className="flex gap-2 mb-4">
            <input className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500" value={newSpec} onChange={e => setNewSpec(e.target.value)} placeholder="Ej: Urología" />
            <button onClick={() => { if(newSpec) setSpecialties([...specialties, newSpec]); setNewSpec(''); }} className="px-4 bg-emerald-600 text-white rounded-lg font-black transition-colors hover:bg-emerald-700 shadow-md shadow-emerald-500/10">+</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {specialties.map(s => (
              <span key={s} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-md text-[11px] font-bold flex items-center gap-2 border border-slate-200">
                {s} <button onClick={() => setSpecialties(specialties.filter(x => x !== s))} className="text-slate-400 hover:text-rose-500 transition-colors">×</button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};