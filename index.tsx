import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log("DAC index.tsx starting...");
const container = document.getElementById('root');
console.log("Root container found:", !!container);
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}