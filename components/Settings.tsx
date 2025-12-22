
import React from 'react';
import { PhoneConfig, IPCall } from '../types';

interface SettingsProps {
  phoneConfig: PhoneConfig;
  onUpdatePhoneConfig: (config: PhoneConfig) => void;
  ipCallHistory: IPCall[];
}

export const Settings: React.FC<SettingsProps> = ({ phoneConfig, onUpdatePhoneConfig, ipCallHistory }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onUpdatePhoneConfig({ ...phoneConfig, [name]: value });
  };

  const connectPhone = () => {
    if (phoneConfig.ipAddress) {
      onUpdatePhoneConfig({ ...phoneConfig, status: 'online' });
    }
  };

  const disconnectPhone = () => {
    onUpdatePhoneConfig({ ...phoneConfig, status: 'offline' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pb-20">
      <div className="bg-white p-12 rounded-[50px] shadow-2xl border border-slate-100">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-16 h-16 bg-slate-900 rounded-[20px] flex items-center justify-center text-3xl">🎛️</div>
          <div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Grandstream CTI</h3>
            <p className="text-blue-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-1">Configuración de Telefonía IP</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dirección IP del Terminal</label>
            <input 
              name="ipAddress" type="text" placeholder="Ej: 192.168.1.100"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 focus:border-blue-500 outline-none font-bold text-slate-800"
              value={phoneConfig.ipAddress}
              onChange={handleChange}
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario SIP</label>
              <input 
                name="sipUser" type="text" placeholder="EXT-101"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 focus:border-blue-500 outline-none font-bold text-slate-800"
                value={phoneConfig.sipUser}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password SIP</label>
              <input 
                name="sipPass" type="password" placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 focus:border-blue-500 outline-none font-bold text-slate-800"
                value={phoneConfig.sipPass}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="pt-8 flex gap-4">
            {phoneConfig.status === 'offline' ? (
              <button 
                onClick={connectPhone}
                className="flex-1 bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all uppercase tracking-widest text-xs"
              >
                Vincular Dispositivo
              </button>
            ) : (
              <button 
                onClick={disconnectPhone}
                className="flex-1 bg-rose-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-rose-500/20 hover:bg-rose-400 transition-all uppercase tracking-widest text-xs"
              >
                Desconectar Terminal
              </button>
            )}
          </div>
        </div>
        
        <div className="mt-10 p-6 bg-slate-50 rounded-3xl border border-slate-100">
           <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
             <span className="text-blue-600 font-black">CTI BRIDGE:</span> Al vincular su Grandstream, DAC podrá interceptar llamadas entrantes para mostrar la ficha del paciente automáticamente y registrar la duración de cada interacción para el reporte de contactabilidad.
           </p>
        </div>
      </div>

      <div className="bg-slate-900 p-12 rounded-[50px] shadow-2xl border border-slate-800 text-white">
        <div className="flex items-center justify-between mb-10">
          <h3 className="text-2xl font-black tracking-tighter">Historial de Red DAC</h3>
          <span className="px-4 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-400/30 rounded-full text-[10px] font-black uppercase tracking-widest">Live Logs</span>
        </div>

        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {ipCallHistory.length === 0 ? (
            <div className="py-20 text-center opacity-30">
               <p className="text-xs font-black uppercase tracking-widest">No hay tráfico telefónico registrado</p>
            </div>
          ) : (
            ipCallHistory.map(call => (
              <div key={call.id} className="bg-white/5 border border-white/10 p-5 rounded-3xl flex items-center justify-between group hover:bg-white/10 transition-all">
                <div className="flex items-center gap-4">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${call.direction === 'incoming' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                     {call.direction === 'incoming' ? '↙️' : '↗️'}
                   </div>
                   <div>
                      <p className="font-black text-sm">{call.number}</p>
                      <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest">{call.timestamp}</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="font-black text-sm text-blue-400">{Math.floor(call.duration / 60)}:{String(call.duration % 60).padStart(2, '0')}</p>
                   <p className="text-[9px] text-white/30 uppercase font-bold tracking-widest">Duración</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
