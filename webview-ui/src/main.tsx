import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

console.log('🚀 main.tsx starting...');
console.log('📍 Current location:', window.location.href);
console.log('🔍 Root element exists:', !!document.getElementById('root'));

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('❌ Root element not found!');
  throw new Error('Root element not found');
}

console.log('✅ Root element found, creating React root...');

const root = ReactDOM.createRoot(rootElement);

console.log('🎯 Rendering App component...');

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

console.log('✅ App component rendered successfully'); 