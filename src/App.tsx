import { useEffect, useState } from "react";
import { Icon } from "./components/Icon";
import { useAuth } from "./context/AuthContext";
import { obtenerExpediente } from "./services/expedientes";
import { mensajeErrorAlmacenamientoDemo } from "./services/almacenamientoDemo";
import { firebaseConfigurado } from "./services/firebase";
import type { Expediente } from "./types/expediente";
import { ExpedienteDetallePage } from "./pages/ExpedienteDetallePage";
import { ExpedientesPage } from "./pages/ExpedientesPage";
import { LoginPage } from "./pages/LoginPage";
import { NuevoExpedientePage } from "./pages/NuevoExpedientePage";
import { PanelPage } from "./pages/PanelPage";

// La navegación es local a esta pestaña: cambiar de vista no cambia la URL.
type Vista = "panel" | "expedientes" | "nuevo" | "editar" | "detalle";

export default function App() {
  // useAuth lee el valor que AuthProvider publicó desde main.tsx.
  const { usuario, cargando, salir } = useAuth();
  // App conserva la navegación y la ficha seleccionada; los listados consultan
  // sus páginas directamente al servicio de datos.
  const [vista, setVista] = useState<Vista>("panel");
  const [historial, setHistorial] = useState<Vista[]>([]);
  const [expedienteActual, setExpedienteActual] =
    useState<Expediente | null>(null);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [cargandoExpediente, setCargandoExpediente] = useState(false);
  const [errorDatos, setErrorDatos] = useState("");
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Las fichas se cargan individualmente al abrir o editar, nunca descargando
  // la colección completa desde App.
  useEffect(() => {
    if (!usuario || !seleccionado || (vista !== "detalle" && vista !== "editar"))
      return;
    let vigente = true;
    setErrorDatos("");
    setCargandoExpediente(true);
    obtenerExpediente(seleccionado)
      .then((expediente) => {
        if (vigente) {
          setExpedienteActual(expediente);
          setErrorDatos(
            expediente ? "" : "No se encontró el expediente solicitado.",
          );
        }
      })
      .catch((problema: unknown) => {
        if (vigente) {
          setErrorDatos(
            mensajeErrorAlmacenamientoDemo(problema) ??
              "No fue posible cargar los expedientes.",
          );
        }
      })
      .finally(() => {
        if (vigente) setCargandoExpediente(false);
      });
    return () => {
      vigente = false;
    };
  }, [usuario, vista, seleccionado]);

  /** Cambia la pantalla visible y cierra el menú móvil. */
  function navegar(destino: Vista) {
    if (destino !== vista)
      setHistorial((anterior) => [...anterior, vista]);
    setVista(destino);
    setMenuAbierto(false);
  }
  /** Regresa a la última pantalla visitada sin volver a agregarla al historial. */
  function volver() {
    const anterior = historial[historial.length - 1];
    if (!anterior) return;
    setHistorial((actual) => actual.slice(0, -1));
    setVista(anterior);
    setMenuAbierto(false);
  }
  /** La tabla entrega un id; la ficha busca ese expediente en la lista. */
  function abrir(id: string) {
    setSeleccionado(id);
    navegar("detalle");
  }
  /** Abre el formulario de edición para la ficha elegida. */
  function editar(id: string) {
    setSeleccionado(id);
    navegar("editar");
  }
  /** Guarda la selección y vuelve al contexto desde el que se inició la edición. */
  function despuesDeEditar(id: string) {
    setSeleccionado(id);
    volver();
  }
  /** Envía la búsqueda del panel a la pantalla de expedientes. */
  function buscar(texto: string) {
    setBusqueda(texto);
    navegar("expedientes");
  }
  // Primero se resuelve la sesión; después se decide entre login y aplicación.
  if (cargando)
    return <div className="startup-loading">Cargando Advance ICI…</div>;
  if (!usuario) return <LoginPage />;

  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${menuAbierto ? "sidebar-open" : ""}`}
        aria-label="Navegación principal"
      >
        <div className="sidebar-brand">
          <span className="brand-mark">
            A<span>.</span>
          </span>
          <span>
            ADVANCE <strong>ICI</strong>
            <small>Gestión de titulación</small>
          </span>
        </div>
        <div className="sidebar-group-title">ESPACIO DE TRABAJO</div>
        <nav className="side-nav">
          <button
            type="button"
            className={vista === "panel" ? "active" : ""}
            onClick={() => navegar("panel")}
          >
            <Icon name="grid" /> Panel principal
          </button>
          <button
            type="button"
            className={
              vista === "expedientes" || vista === "detalle" ? "active" : ""
            }
            onClick={() => {
              setBusqueda("");
              navegar("expedientes");
            }}
          >
            <Icon name="folder" /> Expedientes
          </button>
          <button
            type="button"
            className={vista === "nuevo" ? "active" : ""}
            onClick={() => navegar("nuevo")}
          >
            <Icon name="plus" /> Nuevo expediente
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-identity">
            <span className="identity-icon">
              <Icon name="user" size={21} />
            </span>
            <span>
              <strong>Dirección ICI</strong>
              <small>{usuario.email}</small>
            </span>
          </div>
          <button
            className="signout"
            type="button"
            onClick={() => void salir()}
          >
            <Icon name="logout" size={18} /> Cerrar sesión
          </button>
        </div>
      </aside>
      {menuAbierto && (
        <button
          className="menu-backdrop"
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMenuAbierto(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <button
            className="topbar-back"
            type="button"
            onClick={volver}
            disabled={historial.length === 0}
            aria-label="Volver a la página anterior"
            title="Volver a la página anterior"
          >
            <Icon name="arrow" size={18} />
            <span>Volver</span>
          </button>
          <button
            type="button"
            className="mobile-menu"
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMenuAbierto(!menuAbierto)}
          >
            <Icon name={menuAbierto ? "close" : "menu"} />
          </button>
          <div className="breadcrumb">
            Advance ICI <Icon name="chevron" size={14} />{" "}
            <strong>
              {vista === "panel"
                ? "Panel principal"
                : vista === "nuevo"
                  ? "Nuevo expediente"
                  : vista === "editar"
                    ? "Editar expediente"
                  : "Expedientes"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="demo-label">
              {firebaseConfigurado ? "Datos Firebase" : "Datos de demostración"}
            </span>
            <span className="topbar-avatar">DI</span>
          </div>
        </header>
        <main className="main-content">
          {errorDatos && (
            <p className="data-error" role="alert">
              {errorDatos}
            </p>
          )}
          {cargandoExpediente &&
          (vista === "detalle" || vista === "editar") ? (
            <div className="content-loading">Cargando expedientes…</div>
          ) : (
            <>
              {vista === "panel" && (
                <PanelPage
                  alBuscar={buscar}
                  alAbrir={abrir}
                  alEditar={editar}
                  alNuevo={() => navegar("nuevo")}
                  alVerTodos={() => navegar("expedientes")}
                />
              )}
              {vista === "expedientes" && (
                <ExpedientesPage
                  key={busqueda}
                  busquedaInicial={busqueda}
                  alAbrir={abrir}
                  alEditar={editar}
                  alNuevo={() => navegar("nuevo")}
                />
              )}
              {vista === "nuevo" && (
                <NuevoExpedientePage
                  alCancelar={volver}
                  alGuardar={abrir}
                />
              )}
              {vista === "editar" && expedienteActual && (
                <NuevoExpedientePage
                  key={expedienteActual.id}
                  expediente={expedienteActual}
                  alCancelar={volver}
                  alGuardar={despuesDeEditar}
                />
              )}
              {vista === "detalle" && expedienteActual && (
                <ExpedienteDetallePage
                  expediente={expedienteActual}
                  alVolver={volver}
                  alEditar={() => editar(expedienteActual.id)}
                />
              )}
            </>
          )}
        </main>
        <footer className="app-footer">
          <span>Advance ICI · Proyecto académico</span>
          <span>Universidad Central de Chile</span>
        </footer>
      </div>
    </div>
  );
}
