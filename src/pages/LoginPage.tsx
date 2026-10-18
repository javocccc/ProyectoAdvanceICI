import { useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "../components/Icon";
import logoUcen from "../../logoucen.jpg";
import { useAuth } from "../context/AuthContext";
import { firebaseConfigurado } from "../services/firebase";
import { urlApp } from "../utils/rutas";
import { versionAplicacion } from "../utils/version";

interface LoginPageProps {
  statusWarning?: string;
}

/** Muestra el formulario de acceso; la verificación real vive en AuthContext. */
export function LoginPage({ statusWarning }: LoginPageProps) {
  // useAuth obtiene ingresar() del proveedor que envuelve la aplicación.
  const { ingresar, recuperarClave } = useAuth();
  // Cada cambio en los campos actualiza el estado y React vuelve a dibujarlos.
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [recordar, setRecordar] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [recuperando, setRecuperando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  /** Evita el envío normal del navegador y espera el resultado del ingreso. */
  async function manejarIngreso(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await ingresar(email.trim(), clave, recordar);
    } catch (problema) {
      // Los errores internos de Firebase se resumen en un mensaje comprensible.
      const codigo = (problema as { code?: string }).code;
      setError(
        codigo?.startsWith("auth/")
          ? "No se pudo ingresar. Revise su correo y contraseña."
          : problema instanceof Error
            ? problema.message
            : "Ocurrió un error al ingresar.",
      );
    } finally {
      setEnviando(false);
    }
  }

  async function manejarRecuperacion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setMensaje("");
    setEnviando(true);
    try {
      await recuperarClave(email.trim());
      setMensaje("Si existe una cuenta asociada a ese correo, recibirá instrucciones para restablecer su contraseña.");
    } catch (problema) {
      const codigo = (problema as { code?: string }).code;
      setError(
        codigo === "auth/invalid-email"
          ? "Ingrese un correo electrónico válido."
          : "No se pudo enviar el correo de recuperación. Intente nuevamente o contacte a soporte.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="login-layout">
      <section className="login-story" aria-label="Presentación del sistema">
        <div className="login-brand">
          <img className="brand-logo" src={logoUcen} alt="Universidad Central de Chile" />
          <span>
            ADVANCE <strong>ICI</strong>
          </span>
        </div>
        <div className="login-story-copy">
          <span className="story-rule" />
          <h1>Gestión de titulación Ingeniería Civil Industrial.</h1>
          <p>
            Sistema de apoyo a la gestión de expedientes de titulación para la carrera de Ingeniería Civil Industrial de la Universidad Central de Chile.
          </p>
        </div>
        <div className="story-footer">
          <span>UNIVERSIDAD CENTRAL DE CHILE</span>
        </div>
        <div className="story-lines" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-form-wrap">
          <div className="login-mobile-brand">
            <img className="brand-logo" src={logoUcen} alt="Universidad Central de Chile" />{" "}
            ADVANCE ICI
          </div>
          <div className="login-panel-heading">
            <span className="small-rule" />
            <h2 id="login-title">{recuperando ? "Restablecer contraseña" : "Bienvenido de vuelta"}</h2>
            <p>{recuperando ? "Le enviaremos un enlace al correo asociado a su cuenta." : "Ingrese para continuar con los expedientes de titulación."}</p>
          </div>

          {statusWarning && <p className="status-warning" role="status">{statusWarning}</p>}

          {!firebaseConfigurado && (
            <div className="demo-note">
              <strong>Modo de demostración</strong>
              <span>
                Correo: demo@advanceici.cl
                <br />
                Contraseña: Demo2026!
              </span>
            </div>
          )}

          {recuperando ? (
            <form onSubmit={manejarRecuperacion} className="login-form">
              <label htmlFor="recovery-email">Correo electrónico</label>
              <input
                id="recovery-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@universidad.cl"
              />
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              {mensaje && (
                <p className="form-success" role="status">
                  {mensaje}
                </p>
              )}
              <button
                className="button button-primary login-submit"
                type="submit"
                disabled={enviando}
              >
                {enviando ? "Enviando…" : "Enviar instrucciones"}
              </button>
              <button
                className="inline-action"
                type="button"
                onClick={() => {
                  setRecuperando(false);
                  setError("");
                  setMensaje("");
                }}
              >
                Volver al inicio de sesión
              </button>
            </form>
          ) : (
            <form onSubmit={manejarIngreso} className="login-form">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@universidad.cl"
              />
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                placeholder="Ingrese su contraseña"
              />
              {firebaseConfigurado && (
                <label className="checkline">
                  <input
                    type="checkbox"
                    checked={recordar}
                    onChange={(e) => setRecordar(e.target.checked)}
                  />{" "}
                  Mantener sesión iniciada
                </label>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="button button-primary login-submit"
                type="submit"
                disabled={enviando}
              >
                {enviando ? "Ingresando…" : "Ingresar al sistema"}{" "}
                <Icon name="arrow" size={19} />
              </button>
              {firebaseConfigurado && (
                <button
                  className="inline-action recovery-link"
                  type="button"
                  onClick={() => {
                    setRecuperando(true);
                    setError("");
                  }}
                >
                  ¿Olvidó su contraseña?
                </button>
              )}
            </form>
          )}
          <p className="login-help">
            Acceso para usuarios autorizados de Advance ICI.{" "}
            <a href={urlApp("ayuda")}>Ayuda y soporte</a>
            <span aria-hidden="true"> · </span>
            <a href={urlApp("privacidad")}>Privacidad</a>
            <span aria-hidden="true"> · </span>
            <a href={urlApp("terminos")}>Términos</a>
            <span aria-hidden="true"> · </span>
            <a href={urlApp("estado")}>Estado</a>
            <br />
            Universidad Central de Chile · Versión {versionAplicacion} · Contacto institucional: pendiente de confirmar
          </p>
        </div>
      </section>
    </main>
  );
}
