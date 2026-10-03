import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './styles.css';

// AuthProvider envuelve toda la app: cualquier pantalla puede llamar useAuth().
createRoot(document.getElementById('root')!).render(<StrictMode><AuthProvider><App/></AuthProvider></StrictMode>);
