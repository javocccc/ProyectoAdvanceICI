import { useEffect, useState } from "react";
import { Icon } from "./components/Icon";
import { nombreRol, normalizarRol, tienePermiso } from "./auth/roles";
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
import { AdministracionPage } from "./pages/AdministracionPage";
import { PublicPage } from "./pages/PublicPage";
import type { PublicPageKind } from "./pages/PublicPage";
import logoUcen from "../logoucen.jpg";
import { obtenerEstadoSistema, registrarConsultaExpediente } from "./services/sistema";
import type { EstadoSistema } from "./services/sistema";
import { urlApp } from "./utils/rutas";
import { versionAplicacion } from "./utils/version";

// La navegación es local a esta pestaña: cambiar de vista no cambia la URL.
type Vista = "panel" | "expedientes" | "nuevo" | "editar" | "detalle" | "administracion";

const paginasPublicas: Record<string, PublicPageKind> = {
  "/privacidad": "privacidad",
  "/terminos": "terminos",
  "/ayuda": "ayuda",
  "/estado": "estado",
  "/403": "403",
  "/404": "404",
  "/sesion-expirada": "sesion-expirada",
};

export default function App() {
  // useAuth lee el valor que AuthProvider publicó desde main.tsx.
  const { usuario, cargando, errorPermiso, salir } = useAuth();
  const puedeEditar = tienePermiso(usuario?.rol ?? null, "editarExpedientes");
  const puedeAdministrar = tienePermiso(usuario?.rol ?? null, "administrarCuentas");
  const esEstudiante = normalizarRol(usuario?.rol) === "estudiante";
  const baseUrl = import.meta.env.BASE_URL;
  const baseSinBarra = baseUrl.replace(/\/+$/, "");
  const rutaNavegador = typeof window === "undefined" ? baseUrl : window.location.pathname;
  const rutaDirecta = rutaNavegador === baseSinBarra
    ? "/"
    : rutaNavegador.startsWith(`${baseSinBarra}/`)
      ? rutaNavegador.slice(baseSinBarra.length)
      : rutaNavegador;
  const paginaSolicitada = typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search).get("page");
  const ruta = paginaSolicitada ? `/${paginaSolicitada}` : rutaDirecta.replace(/\/+$/, "") || "/";
  const enInicio = rutaDirecta.replace(/\/+$/, "") === "" || rutaDirecta === "/";
  const paginaPublica = paginasPublicas[ruta];
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
  const [estadoSistema, setEstadoSistema] = useState<EstadoSistema | null>(null);
  const [errorEstado, setErrorEstado] = useState("");
  const vistaSegura = esEstudiante
    ? "detalle"
    : (!puedeEditar && (vista === "nuevo" || vista === "editar"))
      || (!puedeAdministrar && vista === "administracion")
      ? "panel"
      : vista;
  const expedienteSeleccionado = usuario?.rol === "estudiante"
    ? usuario.expedienteId ?? null
    : seleccionado;

  useEffect(() => {
    obtenerEstadoSistema()
      .then(setEstadoSistema)
      .catch(() => setErrorEstado("No se pudo verificar si el sistema está en mantenimiento."));
  }, []);

  // Las fichas se cargan individualmente al abrir o editar, nunca descargando
  // la colección completa desde App.
  useEffect(() => {
    if (!usuario?.rol || !expedienteSeleccionado || (vistaSegura !== "detalle" && vistaSegura !== "editar"))
      return;
    let vigente = true;
    setErrorDatos("");
    setCargandoExpediente(true);
    obtenerExpediente(expedienteSeleccionado)
      .then((expediente) => {
        if (vigente) {
          setExpedienteActual(expediente);
          setErrorDatos(
            expediente ? "" : "No se encontró el expediente solicitado.",
          );
          if (expediente && vistaSegura === "detalle" && usuario) {
            registrarConsultaExpediente(expediente.id, usuario.id, usuario.email)
              .catch(() => {
                if (vigente) setErrorDatos("El expediente se abrió, pero no se pudo registrar la consulta en la auditoría.");
              });
          }
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
  }, [usuario, vistaSegura, expedienteSeleccionado]);

  /** Cambia la pantalla visible y cierra el menú móvil. */
  function navegar(destino: Vista) {
    if (!puedeEditar && (destino === "nuevo" || destino === "editar")) return;
    if (!puedeAdministrar && destino === "administracion") return;
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
    if (!puedeEditar) return;
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
  if (paginaPublica) return <PublicPage kind={paginaPublica} />;
  if (!enInicio && !paginaPublica) return <PublicPage kind="404" />;
  if (paginaSolicitada && !paginaPublica) return <PublicPage kind="404" />;
  // Primero se resuelve la sesión; después se decide entre login y aplicación.
  if (cargando)
    return <div className="startup-loading">Cargando Advance ICI…</div>;
  if (usuario && estadoSistema?.mantenimiento && !puedeAdministrar) {
    return <PublicPage kind="estado" />;
  }
  if (!usuario) return (
    <LoginPage
      statusWarning={
        errorEstado
          ? "No se pudo verificar el estado del sistema. El acceso al inicio de sesión continúa disponible; si Firestore falla, las funciones de datos podrían no estar disponibles."
          : estadoSistema?.mantenimiento
            ? "El sistema está en mantenimiento. Solo Administración puede iniciar sesión para gestionar el estado."
            : undefined
      }
    />
  );
  if (!usuario.rol) return (
    <main className="startup-loading" role="alert">
      <div>
        <h1>Acceso pendiente</h1>
        <p>{errorPermiso}</p>
        <button className="button button-secondary" type="button" onClick={() => void salir()}>
          Cerrar sesión
        </button>
        <a className="button button-secondary" href={urlApp("ayuda")}>Ayuda y soporte</a>
      </div>
    </main>
  );

  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${menuAbierto ? "sidebar-open" : ""}`}
        aria-label="Navegación principal"
      >
        <div className="sidebar-brand">
          <img className="brand-logo" src={logoUcen} alt="Universidad Central de Chile" />
          <span>
            ADVANCE <strong>ICI</strong>
            <small>Gestión de titulación</small>
          </span>
        </div>
        <div className="sidebar-group-title">ESPACIO DE TRABAJO</div>
        <nav className="side-nav">
          {!esEstudiante && <button
            type="button"
            className={vistaSegura === "panel" ? "active" : ""}
            onClick={() => navegar("panel")}
          >
            <Icon name="grid" /> Panel principal
          </button>}
          {!esEstudiante && <button
            type="button"
            className={
              vistaSegura === "expedientes" || vistaSegura === "detalle" ? "active" : ""
            }
            onClick={() => {
              setBusqueda("");
              navegar("expedientes");
            }}
          >
            <Icon name="folder" /> Expedientes
          </button>}
          {!esEstudiante && puedeEditar && <button
            type="button"
            className={vistaSegura === "nuevo" ? "active" : ""}
            onClick={() => navegar("nuevo")}
          >
            <Icon name="plus" /> Nuevo expediente
          </button>}
          {puedeAdministrar && <button
            type="button"
            className={vistaSegura === "administracion" ? "active" : ""}
            onClick={() => navegar("administracion")}
          >
            <Icon name="settings" /> Administración
          </button>}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-identity">
            <span className="identity-icon">
              <Icon name="user" size={21} />
            </span>
            <span>
              <strong>{nombreRol[normalizarRol(usuario.rol) ?? "estudiante"]}</strong>
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
        {errorEstado && (
          <p className="status-warning" role="status">
            No se pudo verificar el estado de mantenimiento. Puede continuar, pero algunas funciones podrían no estar disponibles.
          </p>
        )}
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
              {vistaSegura === "panel"
                ? "Panel principal"
                : vistaSegura === "nuevo"
                  ? "Nuevo expediente"
                  : vistaSegura === "editar"
                    ? "Editar expediente"
                    : vistaSegura === "administracion"
                      ? "Administración"
                      : "Expedientes"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="demo-label">
              {firebaseConfigurado ? "Datos Firebase" : "Datos de demostración"}
            </span>
            <span className="topbar-avatar">{usuario.nombre.slice(0, 2).toUpperCase()}</span>
          </div>
        </header>
        <main className="main-content">
          {errorDatos && (
            <p className="data-error" role="alert">
              {errorDatos}
            </p>
          )}
          {cargandoExpediente &&
          (vistaSegura === "detalle" || vistaSegura === "editar") ? (
            <div className="content-loading">Cargando expedientes…</div>
          ) : (
            <>
              {esEstudiante && !usuario.expedienteId ? (
                <section className="admin-card">
                  <h1>Expediente pendiente de vinculación</h1>
                  <p>Su cuenta todavía no está asociada a un expediente. Solicite al Administrador que complete la vinculación.</p>
                </section>
              ) : vistaSegura === "panel" && !esEstudiante ? (
                <PanelPage
                  alBuscar={buscar}
                  alAbrir={abrir}
                  alEditar={editar}
                  alNuevo={() => navegar("nuevo")}
                  alVerTodos={() => navegar("expedientes")}
                  puedeEditar={puedeEditar}
                />
              ) : null}
              {vistaSegura === "expedientes" && !esEstudiante && (
                <ExpedientesPage
                  key={busqueda}
                  busquedaInicial={busqueda}
                  alAbrir={abrir}
                  alEditar={editar}
                  alNuevo={() => navegar("nuevo")}
                  puedeEditar={puedeEditar}
                />
              )}
              {vistaSegura === "nuevo" && !esEstudiante && puedeEditar && (
                <NuevoExpedientePage
                  alCancelar={volver}
                  alGuardar={abrir}
                />
              )}
              {vistaSegura === "editar" && !esEstudiante && puedeEditar && expedienteActual && (
                <NuevoExpedientePage
                  key={expedienteActual.id}
                  expediente={expedienteActual}
                  alCancelar={volver}
                  alGuardar={despuesDeEditar}
                />
              )}
              {vistaSegura === "detalle" && expedienteActual && (
                <ExpedienteDetallePage
                  expediente={expedienteActual}
                  alVolver={volver}
                  alEditar={() => editar(expedienteActual.id)}
                />
              )}
              {vistaSegura === "administracion" && puedeAdministrar && (
                <AdministracionPage alCambiarEstado={setEstadoSistema} />
              )}
            </>
          )}
        </main>
        <footer className="app-footer">
          <span>Advance ICI · Universidad Central de Chile · Versión {versionAplicacion} · Contacto: pendiente de confirmar</span>
          <nav aria-label="Información del sistema">
            <a href={urlApp("privacidad")}>Privacidad</a>
            <a href={urlApp("terminos")}>Términos</a>
            <a href={urlApp("ayuda")}>Ayuda</a>
            <a href={urlApp("estado")}>Estado</a>
          </nav>
        </footer>
      </div>
    </div>
  );
}
