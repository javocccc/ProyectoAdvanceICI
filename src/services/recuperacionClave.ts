import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "./firebase";

/** Firebase envía el enlace y gestiona su vencimiento y el cambio de contraseña. */
export async function recuperarClave(email: string): Promise<void> {
  const correo = email.trim();
  if (correo.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    throw Object.assign(new Error("Ingrese un correo electrónico válido."), { code: "auth/invalid-email" });
  }
  if (!auth) throw new Error("La recuperación de contraseña requiere que Firebase esté configurado.");
  auth.languageCode = "es";
  try {
    await sendPasswordResetEmail(auth, correo);
  } catch (error) {
    // La respuesta pública no revela si el correo pertenece a una cuenta.
    if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
  }
}
