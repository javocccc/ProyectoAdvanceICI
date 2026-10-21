import { useState } from "react";
import type { FormEvent } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { auth } from "../services/firebase";

export function CambiarContrasenaPage() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setMensaje("");
    if (nueva !== confirmacion) {
      setError("La nueva contraseña y su confirmación no coinciden.");
      return;
    }
    if (nueva.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    const usuario = auth?.currentUser;
    if (!usuario?.email) {
      setError("No se pudo verificar la sesión. Inicie sesión nuevamente.");
      return;
    }
    setGuardando(true);
    try {
      const credencial = EmailAuthProvider.credential(usuario.email, actual);
      await reauthenticateWithCredential(usuario, credencial);
      await updatePassword(usuario, nueva);
      setActual("");
      setNueva("");
      setConfirmacion("");
      setMensaje("Contraseña actualizada correctamente.");
    } catch (problema) {
      const codigo = typeof problema === "object" && problema !== null && "code" in problema
        ? String(problema.code)
        : "";
      setError(codigo.includes("wrong-password") || codigo.includes("invalid-credential")
        ? "La contraseña actual es incorrecta."
        : "No se pudo cambiar la contraseña. Revise los datos e intente nuevamente.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="admin-card account-password-card">
      <h1>Mi cuenta</h1>
      <p>Cambie su contraseña de acceso. Por seguridad, confirme primero la contraseña actual.</p>
      <form className="account-form" onSubmit={(evento) => void guardar(evento)}>
        <label>Contraseña actual<input type="password" value={actual} onChange={(evento) => setActual(evento.target.value)} required autoComplete="current-password" /></label>
        <label>Nueva contraseña<input type="password" value={nueva} onChange={(evento) => setNueva(evento.target.value)} required minLength={8} autoComplete="new-password" /></label>
        <label>Confirmar nueva contraseña<input type="password" value={confirmacion} onChange={(evento) => setConfirmacion(evento.target.value)} required minLength={8} autoComplete="new-password" /></label>
        <button className="button button-primary" type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Cambiar contraseña"}</button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      {mensaje && <p className="form-success" role="status">{mensaje}</p>}
    </section>
  );
}
