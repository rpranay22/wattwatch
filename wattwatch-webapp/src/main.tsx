import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { initFirebase } from './lib/firebase';
import { initNativeShell } from './lib/nativeShell';

initFirebase();
initNativeShell();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
