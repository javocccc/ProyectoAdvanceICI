import { useEffect, useState } from 'react';
import { Icon } from './components/Icon';
import { useAuth } from './context/AuthContext';
import { listarExpedientes } from './services/expedientes';
import { firebaseConfigurado } from './services/firebase';
import type { Expediente } from './types/expediente';
import { ExpedienteDetallePage } from './pages/ExpedienteDetallePage';
import { ExpedientesPage } from './pages/ExpedientesPage';
import { LoginPage } from './pages/LoginPage';
import { NuevoExpedientePage } from './pages/NuevoExpedientePage';
import { PanelPage } from './pages/PanelPage';

type Vista = 'panel' | 'expedientes' | 'nuevo' | 'detalle';

export default function App() {
  const { usuario, cargando, salir } = useAuth();
  const [vista, setVista] = useState<Vista>('panel');
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [errorDatos, setErrorDatos] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);

  // useEffect consulta Firebase o localStorage al iniciar sesión y al cambiar de pantalla.
  useEffect(() => {
    if (!usuario) return;
    let vigente = true;
    setCargandoDatos(true);
    listarExpedientes().then((datos) => { if (vigente) { setExpedientes(datos); setErrorDatos(''); } })
      .catch(() => { if (vigente) setErrorDatos('No fue posible cargar los expedientes. Recargue la página.'); })
      .finally(() => { if (vigente) setCargandoDatos(false); });
    return () => { vigente = false; };
  }, [usuario, vista]);

  function navegar(destino: Vista) { setVista(destino); setMenuAbierto(false); }
  function abrir(id: string) { setSeleccionado(id); navegar('detalle'); }
  function buscar(texto: string) { setBusqueda(texto); navegar('expedientes'); }
  const expedienteActual = expedientes.find((item) => item.id === seleccionado);

  if (cargando) return <div className="startup-loading">Cargando Advance ICI…</div>;
  if (!usuario) return <LoginPage/>;

  return <div className="app-shell">
    <aside className={`sidebar ${menuAbierto ? 'sidebar-open' : ''}`} aria-label="Navegación principal">
      <div className="sidebar-brand"><span className="brand-mark">A<span>.</span></span><span>ADVANCE <strong>ICI</strong><small>Gestión de titulación</small></span></div>
      <div className="sidebar-group-title">ESPACIO DE TRABAJO</div>
      <nav className="side-nav"><button type="button" className={vista === 'panel' ? 'active' : ''} onClick={() => navegar('panel')}><Icon name="grid"/> Panel principal</button><button type="button" className={vista === 'expedientes' || vista === 'detalle' ? 'active' : ''} onClick={() => { setBusqueda(''); navegar('expedientes'); }}><Icon name="folder"/> Expedientes</button><button type="button" className={vista === 'nuevo' ? 'active' : ''} onClick={() => navegar('nuevo')}><Icon name="plus"/> Nuevo expediente</button></nav>
      <div className="sidebar-bottom"><div className="sidebar-identity"><span className="identity-icon"><Icon name="user" size={21}/></span><span><strong>Dirección ICI</strong><small>{usuario.email}</small></span></div><button className="signout" type="button" onClick={() => void salir()}><Icon name="logout" size={18}/> Cerrar sesión</button></div>
    </aside>
    {menuAbierto && <button className="menu-backdrop" type="button" aria-label="Cerrar menú" onClick={() => setMenuAbierto(false)}/>}
    <div className="workspace"><header className="topbar"><button type="button" className="mobile-menu" aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setMenuAbierto(!menuAbierto)}><Icon name={menuAbierto ? 'close' : 'menu'}/></button><div className="breadcrumb">Advance ICI <Icon name="chevron" size={14}/> <strong>{vista === 'panel' ? 'Panel principal' : vista === 'nuevo' ? 'Nuevo expediente' : 'Expedientes'}</strong></div><div className="topbar-right"><span className="demo-label">{firebaseConfigurado ? 'Datos Firebase' : 'Datos de demostración'}</span><span className="topbar-avatar">DI</span></div></header>
      <main className="main-content">{errorDatos && <p className="data-error" role="alert">{errorDatos}</p>}{cargandoDatos && expedientes.length === 0 ? <div className="content-loading">Cargando expedientes…</div> : <>
        {vista === 'panel' && <PanelPage expedientes={expedientes} alBuscar={buscar} alAbrir={abrir} alNuevo={() => navegar('nuevo')} alVerTodos={() => navegar('expedientes')}/>}
        {vista === 'expedientes' && <ExpedientesPage key={busqueda} expedientes={expedientes} busquedaInicial={busqueda} alAbrir={abrir} alNuevo={() => navegar('nuevo')}/>}
        {vista === 'nuevo' && <NuevoExpedientePage alCancelar={() => navegar('expedientes')} alGuardar={abrir}/>}
        {vista === 'detalle' && expedienteActual && <ExpedienteDetallePage expediente={expedienteActual} alVolver={() => navegar('expedientes')}/>}
      </>}</main><footer className="app-footer"><span>Advance ICI · Proyecto académico</span><span>Universidad Central de Chile</span></footer>
    </div>
  </div>;
}
