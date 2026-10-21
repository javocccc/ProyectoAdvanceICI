import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Rol } from "../auth/roles";
import {
  actualizarCuenta,
  crearCuenta,
  eliminarCuenta,
  enviarInvitacion,
  listarCuentas,
} from "../services/cuentas";
import type { CuentaApp } from "../services/cuentas";
import { obtenerPaginaExpedientes } from "../services/expedientes";
import type { CursorExpedientes } from "../services/expedientes";
import { firebaseConfigurado } from "../services/firebase";
import type { Expediente } from "../types/expediente";

interface CuentaBorrador {
  nombre: string;
  rol: Rol;
  expedienteId: string;
}

function mensajeErrorCuenta(error: unknown): string {
  const codigo = typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "";
  if (codigo.includes("permission-denied")) return "Solo un Administrador activo puede gestionar cuentas.";
  if (codigo.includes("already-exists")) return "Ya existe esa cuenta o el expediente ya está vinculado a otro estudiante.";
  if (codigo.includes("failed-precondition")) return error instanceof Error ? error.message : "No se puede realizar este cambio.";
  if (codigo.includes("not-found")) return "No se encontró la cuenta o el expediente seleccionado.";
  return error instanceof Error ? error.message : "No se pudo completar la operación.";
}

export function CuentasPage() {
  const [cuentas, setCuentas] = useState<CuentaApp[]>([]);
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [borradores, setBorradores] = useState<Record<string, CuentaBorrador>>({});
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rolNuevo, setRolNuevo] = useState<Rol>("coordinador");
  const [expedienteNuevo, setExpedienteNuevo] = useState("");
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const listaCuentas = await listarCuentas();
      let cursor: CursorExpedientes = null;
      let pagina;
      const listaExpedientes: Expediente[] = [];
      do {
        pagina = await obtenerPaginaExpedientes("", "todos", cursor);
        listaExpedientes.push(...pagina.expedientes);
        cursor = pagina.siguienteCursor;
      } while (cursor && typeof cursor !== "number");
      setCuentas(listaCuentas);
      setExpedientes(listaExpedientes);
    } catch (problema) {
      setError(mensajeErrorCuenta(problema));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (firebaseConfigurado) void cargar();
    else setCargando(false);
  }, []);

  function cambiarBorrador(uid: string, actual: CuentaBorrador, cambios: Partial<CuentaBorrador>) {
    setBorradores((previos) => ({
      ...previos,
      [uid]: { ...actual, ...cambios },
    }));
  }

  async function invitar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setOcupado("crear");
    setError("");
    setAviso("");
    try {
      const cuenta = await crearCuenta({
        nombre: nombre.trim(),
        email: email.trim(),
        rol: rolNuevo,
        ...(rolNuevo === "estudiante" ? { password } : {}),
        ...(rolNuevo === "estudiante" ? { expedienteId: expedienteNuevo } : {}),
      });
      setNombre("");
      setEmail("");
      setPassword("");
      setExpedienteNuevo("");
      if (rolNuevo === "estudiante") {
        setAviso(`Cuenta de estudiante creada para ${cuenta.email}. Puede iniciar sesión y cambiar la contraseña desde “Mi cuenta”.`);
      } else try {
        await enviarInvitacion(cuenta.email);
        setAviso(`Cuenta creada. Enviamos las instrucciones de acceso a ${cuenta.email}.`);
      } catch {
        setAviso(`La cuenta de ${cuenta.email} se creó, pero no se pudo enviar el correo. Use “Reenviar invitación” en la lista.`);
      }
      await cargar();
    } catch (problema) {
      setError(mensajeErrorCuenta(problema));
    } finally {
      setOcupado(null);
    }
  }

  async function guardar(cuenta: CuentaApp) {
    const borrador = borradores[cuenta.uid] ?? {
      nombre: cuenta.nombre,
      rol: cuenta.rol ?? "estudiante",
      expedienteId: cuenta.expedienteId ?? "",
    };
    setOcupado(cuenta.uid);
    setError("");
    setAviso("");
    try {
      await actualizarCuenta({
        uid: cuenta.uid,
        nombre: borrador.nombre.trim(),
        rol: borrador.rol,
        ...(borrador.rol === "estudiante" ? { expedienteId: borrador.expedienteId } : {}),
      });
      setAviso(`Cuenta de ${cuenta.email} actualizada.`);
      setBorradores((previos) => {
        const siguientes = { ...previos };
        delete siguientes[cuenta.uid];
        return siguientes;
      });
      await cargar();
    } catch (problema) {
      setError(mensajeErrorCuenta(problema));
    } finally {
      setOcupado(null);
    }
  }

  async function desactivar(cuenta: CuentaApp) {
    if (!window.confirm(`¿Desactivar y eliminar el acceso de ${cuenta.email}? El historial del expediente se conservará.`)) return;
    setOcupado(cuenta.uid);
    setError("");
    setAviso("");
    try {
      await eliminarCuenta(cuenta.uid);
      setAviso(`Se desactivó la cuenta de ${cuenta.email}.`);
      await cargar();
    } catch (problema) {
      setError(mensajeErrorCuenta(problema));
    } finally {
      setOcupado(null);
    }
  }

  async function reenviarInvitacion(cuenta: CuentaApp) {
    setOcupado(cuenta.uid);
    setError("");
    setAviso("");
    try {
      await enviarInvitacion(cuenta.email);
      setAviso(`Enviamos las instrucciones de acceso a ${cuenta.email}.`);
    } catch (problema) {
      setError(mensajeErrorCuenta(problema));
    } finally {
      setOcupado(null);
    }
  }

  const expedientesDisponibles = (uid?: string) => expedientes.filter((expediente) =>
    !expediente.estudianteUid || expediente.estudianteUid === uid,
  );

  return (
    <section className="accounts-admin">
      <section className="admin-card">
        <h2>Crear una cuenta</h2>
        <p>Crea una cuenta Firebase. Para estudiantes, define una contraseña inicial que podrán cambiar al iniciar sesión. El expediente puede vincularse ahora o después.</p>
        {!firebaseConfigurado && <p className="admin-note">La gestión de cuentas no está disponible en modo de demostración.</p>}
        <form className="account-form" onSubmit={(evento) => void invitar(evento)}>
          <label>
            Nombre
            <input value={nombre} onChange={(evento) => setNombre(evento.target.value)} required maxLength={120} />
          </label>
          <label>
            Correo institucional
            <input type="email" value={email} onChange={(evento) => setEmail(evento.target.value)} required maxLength={254} />
          </label>
          <label>
            Rol
            <select value={rolNuevo} onChange={(evento) => {
              const rol = evento.target.value as Rol;
              setRolNuevo(rol);
              if (rol !== "estudiante") setExpedienteNuevo("");
            }}>
              <option value="administrador">Administrador</option>
              <option value="coordinador">Coordinador</option>
              <option value="estudiante">Estudiante</option>
            </select>
          </label>
          {rolNuevo === "estudiante" && (
            <label>
              Contraseña inicial
              <input type="password" value={password} onChange={(evento) => setPassword(evento.target.value)} required minLength={8} maxLength={128} autoComplete="new-password" />
              <small>Debe tener al menos 8 caracteres. Comuníquela al estudiante por un medio seguro.</small>
            </label>
          )}
          {rolNuevo === "estudiante" && (
            <label>
              Expediente del estudiante (opcional al crear)
              <select value={expedienteNuevo} onChange={(evento) => setExpedienteNuevo(evento.target.value)}>
                <option value="">Sin expediente por el momento</option>
                {expedientesDisponibles().map((expediente) => (
                  <option key={expediente.id} value={expediente.id}>
                    {expediente.nombre} · {expediente.rut}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button className="button button-primary" type="submit" disabled={!firebaseConfigurado || ocupado !== null || cargando}>
            {ocupado === "crear" ? "Creando cuenta…" : rolNuevo === "estudiante" ? "Crear cuenta de estudiante" : "Crear cuenta y enviar invitación"}
          </button>
        </form>
      </section>

      <section className="admin-card">
        <div className="section-heading">
          <div>
            <h2>Cuentas y roles</h2>
            <p>El cambio de rol se aplica en las reglas de acceso. No se permite desactivar al último Administrador.</p>
          </div>
          <button className="button button-secondary" type="button" onClick={() => void cargar()} disabled={cargando || !firebaseConfigurado}>
            {cargando ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
        {cargando ? <p role="status">Cargando cuentas…</p> : !cuentas.length ? <p>No hay cuentas registradas.</p> : (
          <div className="access-table-wrap">
            <table className="accounts-table">
              <thead>
                <tr><th>Nombre y correo</th><th>Rol</th><th>Expediente vinculado</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {cuentas.map((cuenta) => {
                  const borrador = borradores[cuenta.uid] ?? {
                    nombre: cuenta.nombre,
                    rol: cuenta.rol ?? "estudiante",
                    expedienteId: cuenta.expedienteId ?? "",
                  };
                  const expedienteVinculado = expedientes.find((item) => item.id === borrador.expedienteId);
                  return (
                    <tr key={cuenta.uid}>
                      <td>
                        <label className="sr-only" htmlFor={`nombre-${cuenta.uid}`}>Nombre</label>
                        <input id={`nombre-${cuenta.uid}`} value={borrador.nombre} disabled={!cuenta.activo || ocupado !== null} onChange={(evento) => cambiarBorrador(cuenta.uid, borrador, { nombre: evento.target.value })} />
                        <small>{cuenta.email}</small>
                      </td>
                      <td>
                        <select value={borrador.rol} disabled={!cuenta.activo || ocupado !== null || cuenta.uid === "administrador-demo"} onChange={(evento) => cambiarBorrador(cuenta.uid, borrador, { rol: evento.target.value as Rol, expedienteId: evento.target.value === "estudiante" ? borrador.expedienteId : "" })}>
                          <option value="administrador">Administrador</option>
                          <option value="coordinador">Coordinador</option>
                          <option value="estudiante">Estudiante</option>
                        </select>
                      </td>
                      <td>
                        {borrador.rol === "estudiante" && cuenta.activo ? (
                          <select value={borrador.expedienteId} disabled={ocupado !== null} onChange={(evento) => cambiarBorrador(cuenta.uid, borrador, { expedienteId: evento.target.value })}>
                            <option value="">Seleccione un expediente</option>
                            {expedientesDisponibles(cuenta.uid).map((expediente) => (
                              <option key={expediente.id} value={expediente.id}>
                                {expediente.nombre} · {expediente.rut}
                              </option>
                            ))}
                          </select>
                        ) : expedienteVinculado ? `${expedienteVinculado.nombre} · ${expedienteVinculado.rut}` : "—"}
                      </td>
                      <td>{cuenta.activo ? "Activo" : "Desactivado"}</td>
                      <td className="account-actions">
                        {cuenta.activo ? (
                          <>
                            <button className="inline-action" type="button" onClick={() => void guardar(cuenta)} disabled={ocupado !== null || !borrador.nombre.trim() || (borrador.rol === "estudiante" && !borrador.expedienteId)}>
                              {ocupado === cuenta.uid ? "Guardando…" : "Guardar"}
                            </button>
                            <button className="inline-action" type="button" onClick={() => void reenviarInvitacion(cuenta)} disabled={ocupado !== null}>Reenviar invitación</button>
                            <button className="inline-action account-delete" type="button" onClick={() => void desactivar(cuenta)} disabled={ocupado !== null || cuenta.uid === "administrador-demo"}>Desactivar</button>
                          </>
                        ) : "Acceso eliminado"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {error && <p className="form-error" role="alert">{error}</p>}
      {aviso && <p className="form-success" role="status">{aviso}</p>}
    </section>
  );
}
