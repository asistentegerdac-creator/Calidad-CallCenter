import React, { useState, useEffect } from 'react';
import { PhoneConfig, IPCall } from '../types';

interface Props {
  config: PhoneConfig;
  activeCall: IPCall | null;
  onDial: (num: string) => void;
}

export const PhoneWidget: React.FC<Props> = ({ config, activeCall, onDial }) => {
  const [timer, setTimer] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let int: any;
    if (activeCall?.status === 'active') int = setInterval(() => setTimer(t => t + 1), 1000);
    else setTimer(0);
    return () => clearInterval(int);
  }, [activeCall]);

  if (config.status === 'offline') return null;

  return (
    <div className={`fixed bottom-8 right-8 z-[100] transition-all duration-300 ${activeCall ? 'scale-105' : 'scale-100'}`}>
      <div className="bg-white rounded-[2rem] p-6 shadow-2xl min-w-[300px] border border-slate-200">
        {!activeCall ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-xl">📞</div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Estado Línea</p>
                <p className="text-xs font-black text-emerald-600 uppercase">SIP Online</p>
              </div>
            </div>
            <button onClick={() => setShow(!show)} className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-blue-700">⌨️</button>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg ${activeCall.status === 'ringing' ? 'bg-amber-100 text-amber-600 animate-bounce' : 'bg-blue-600 text-white animate-pulse'}`}>
              📞
            </div>
            <div>
              <p className="text-xl font-black text-slate-800">{activeCall.number}</p>
              <p className="text-blue-600 text-[10px] font-black tracking-widest uppercase">
                {activeCall.status === 'ringing' ? 'Llamada Entrante' : `En curso: ${Math.floor(timer/60)}:${String(timer%60).padStart(2, '0')}`}
              </p>
            </div>
            <button className="w-full py-4 bg-rose-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">Finalizar</button>
          </div>
        )}

        {show && !activeCall && (
          <div className="mt-5 pt-5 border-t border-slate-100 space-y-3">
            <input 
              id="dialer_input"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xl font-black text-center tracking-widest outline-none focus:border-blue-500" 
              placeholder="0000"
            />
            <button 
              onClick={() => { const el = document.getElementById('dialer_input') as HTMLInputElement; onDial(el.value); setShow(false); }}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px]"
            >
              Iniciar Llamada
            </button>
          </div>
        )}
      </div>
    </div>
  );
};