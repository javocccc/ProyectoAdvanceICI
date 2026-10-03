import { useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import { firebaseConfigurado } from "../services/firebase";

export function LoginPage() {
  const { ingresar } = useAuth();
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [recordar, setRecordar] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function manejarIngreso(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await ingresar(email.trim(), clave, recordar);
    } catch (problema) {
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

  return (
    <main className="login-layout">
      <section className="login-story" aria-label="Presentación del sistema">
        <div className="login-brand">
          <span className="brand-mark">
            A<span>.</span>
          </span>
          <span>
            ADVANCE <strong>ICI</strong>
          </span>
        </div>
        <div className="login-story-copy">
          <span className="story-rule" />
          <h1>Un lugar para seguir cada expediente hasta el final.</h1>
          <p>
            Gestión de titulación para la Dirección de Ingeniería Civil
            Industrial.
          </p>
        </div>
        <div className="story-footer">
          <span>UNIVERSIDAD CENTRAL DE CHILE</span>
          <span>PROYECTO ACADÉMICO · 2026</span>
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
            <span className="brand-mark">
              A<span>.</span>
            </span>{" "}
            ADVANCE ICI
          </div>
          <div className="login-panel-heading">
            <span className="small-rule" />
            <h2 id="login-title">Bienvenido de vuelta</h2>
            <p>Ingrese para continuar con los expedientes de titulación.</p>
          </div>

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
          </form>
          <p className="login-help">
            Acceso reservado para Dirección ICI. Si necesita ayuda, contacte al
            equipo del proyecto.
          </p>
        </div>
      </section>
    </main>
  );
}
