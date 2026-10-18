import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import {
  actualizarMantenimiento,
  listarAccesosExpedientes,
  obtenerEstadoSistema,
} from "../services/sistema";
import type { AccesoExpediente, EstadoSistema } from "../services/sistema";
import { firebaseConfigurado } from "../services/firebase";
import { CuentasPage } from "./CuentasPage";

interface AdministracionPageProps {
  alCambiarEstado: (estado: EstadoSistema) => void;
}

function fechaAcceso(fecha: string): string {
  const valor = new Date(fecha);
  return Number.isNaN(valor.getTime())
    ? "Fecha no disponible"
    : new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(valor);
}

export function AdministracionPage({ alCambiarEstado }: AdministracionPageProps) {
  const { usuario } = useAuth();
  const [estado, setEstado] = useState<EstadoSistema>({ mantenimiento: false, mensaje: "" });
  const [accesos, setAccesos] = useState<AccesoExpediente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const [estadoActual, registros] = await Promise.all([
        obtenerEstadoSistema(),
        listarAccesosExpedientes(),
      ]);
      setEstado(estadoActual);
      setAccesos(registros);
    } catch {
      setError("No se pudo cargar la configuración y auditoría. Verifique permisos y conexión.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargar();
  }, []);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!usuario || guardando) return;
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      const guardado = await actualizarMantenimiento(
        estado.mantenimiento,
        estado.mensaje,
        usuario.email,
      );
      setEstado(guardado);
      alCambiarEstado(guardado);
      setMensaje(guardado.mantenimiento ? "Modo mantenimiento activado." : "Modo mantenimiento desactivado.");
    } catch {
      setError("No se pudo guardar el estado de mantenimiento. Compruebe que su cuenta tenga rol Administrador.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="admin-page">
      <div className="page-heading">
        <div>
          <p className="section-context">Administración</p>
          <h1>Control y auditoría</h1>
          <p>Gestione la disponibilidad y revise las consultas de expedientes.</p>
        </div>
        <button className="button button-secondary" type="button" onClick={() => void cargar()} disabled={cargando}>
          {cargando ? "Actualizando…" : "Actualizar"}
        </button>
      </div>

      <section className="admin-card">
        <h2>Estado del sistema</h2>
        <p>El mantenimiento bloquea el acceso de estudiantes y coordinadores; Administración conserva el acceso para desactivarlo.</p>
        {!firebaseConfigurado && <p className="admin-note">En modo de demostración este ajuste se guarda en este navegador.</p>}
        <form className="maintenance-form" onSubmit={guardar}>
          <label className="checkline">
            <input
              type="checkbox"
              checked={estado.mantenimiento}
              onChange={(evento) => setEstado((actual) => ({ ...actual, mantenimiento: evento.target.checked }))}
            />
            Activar pantalla de mantenimiento
          </label>
          <label htmlFor="maintenance-message">Mensaje para las personas usuarias</label>
          <textarea
            id="maintenance-message"
            rows={3}
            maxLength={300}
            value={estado.mensaje}
            onChange={(evento) => setEstado((actual) => ({ ...actual, mensaje: evento.target.value }))}
            placeholder="Estamos realizando mejoras. Vuelva a intentarlo más tarde."
          />
          {estado.actualizadoEn && <small>Última actualización: {fechaAcceso(estado.actualizadoEn)}{estado.actualizadoPor ? ` · ${estado.actualizadoPor}` : ""}</small>}
          <button className="button button-primary" type="submit" disabled={guardando || cargando}>
            {guardando ? "Guardando…" : "Guardar estado"}
          </button>
        </form>
      </section>

      <section className="admin-card access-log">
        <div className="section-heading">
          <div>
            <h2>Consultas de expedientes</h2>
            <p>Últimas 100 aperturas de fichas. No se copian nombres ni RUT en este registro.</p>
          </div>
        </div>
        {cargando ? <p className="content-loading">Cargando registros…</p> : accesos.length ? (
          <div className="access-table-wrap">
            <table>
              <thead>
                <tr><th>Fecha y hora</th><th>Usuario</th><th>ID de expediente</th><th>Acción</th></tr>
              </thead>
              <tbody>
                {accesos.map((acceso) => (
                  <tr key={acceso.id}>
                    <td>{fechaAcceso(acceso.fecha)}</td>
                    <td>{acceso.usuario}</td>
                    <td><code>{acceso.expedienteId}</code></td>
                    <td>{acceso.accion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p>Aún no hay consultas registradas.</p>}
      </section>

      {error && <p className="form-error" role="alert">{error}</p>}
      {mensaje && <p className="form-success" role="status">{mensaje}</p>}
      <CuentasPage />
    </section>
  );
}
