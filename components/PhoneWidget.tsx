
import React, { useState, useEffect } from 'react';
import { PhoneConfig, IPCall } from '../types';

interface PhoneWidgetProps {
  config: PhoneConfig;
  activeCall: Partial<IPCall> | null;
  onAction: (action: 'answer' | 'hangup' | 'dial', number?: string) => void;
}

export const PhoneWidget: React.FC<PhoneWidgetProps> = ({ config, activeCall, onAction }) => {
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval: any;
    if (activeCall && activeCall.status === 'completed') {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      setTimer(0);
    }
    return () => clearInterval(interval);
  }, [activeCall]);

  if (config.status === 'offline') return null;

  return (
    <div className="fixed bottom-10 right-10 z-[100] animate-in slide-in-from-bottom-10 duration-500">
      <div className={`bg-slate-900 rounded-[35px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-white/10 p-6 min-w-[320px] transition-all duration-700 ${activeCall ? 'ring-4 ring-blue-500/50' : ''}`}>
        
        {!activeCall ? (
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center relative">
               <span className="text-3xl">📳</span>
               <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900"></span>
            </div>
            <div>
               <p className="text-white font-black text-sm leading-none">Grandstream Online</p>
               <p className="text-blue-500 text-[10px] font-black uppercase tracking-widest mt-1 italic">Listo para operar</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-5">
               <div className="w-16 h-16 bg-blue-600 rounded-[22px] flex items-center justify-center text-3xl animate-pulse shadow-lg shadow-blue-600/30">
                 {activeCall.direction === 'incoming' ? '📞' : '📱'}
               </div>
               <div className="flex-1">
                  <p className="text-white font-black text-xl tracking-tighter leading-none">{activeCall.number}</p>
                  <p className="text-blue-400 text-[9px] font-black uppercase tracking-[0.3em] mt-2">
                    {activeCall.status === 'completed' ? `Conversación Activa - ${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}` : 'Llamada Entrante...'}
                  </p>
               </div>
            </div>

            <div className="flex gap-4">
              {activeCall.status !== 'completed' && activeCall.direction === 'incoming' ? (
                <>
                  <button 
                    onClick={() => onAction('answer')}
                    className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-green-500/20 hover:bg-green-400 transition-all"
                  >
                    Contestar
                  </button>
                  <button 
                    onClick={() => onAction('hangup')}
                    className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-rose-500/20 hover:bg-rose-400 transition-all"
                  >
                    Rechazar
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => onAction('hangup')}
                  className="w-full py-5 bg-rose-600 text-white rounded-[20px] font-black uppercase text-xs tracking-widest shadow-2xl shadow-rose-600/30 hover:bg-rose-500 transition-all"
                >
                  Finalizar Llamada
                </button>
              )}
            </div>

            <div className="flex justify-center gap-1.5 h-6 items-end">
               {[...Array(12)].map((_, i) => (
                 <div 
                   key={i} 
                   className="w-1 bg-blue-500/40 rounded-full animate-bounce" 
                   style={{ 
                     height: `${Math.random() * 100}%`,
                     animationDelay: `${i * 0.1}s`,
                     animationDuration: '0.6s'
                   }}
                 />
               ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
