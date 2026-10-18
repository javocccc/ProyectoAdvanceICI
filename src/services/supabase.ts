import { createClient } from "@supabase/supabase-js";
import { auth } from "./firebase";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const clave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
const firebaseAuth = auth;

// Supabase valida el JWT de Firebase; las políticas RLS del bucket deciden el acceso.
export const supabase =
  firebaseAuth && url && clave
    ? createClient(url, clave, {
        accessToken: async () =>
          (await firebaseAuth.currentUser?.getIdToken(false)) ?? null,
      })
    : null;

export const bucketActas = "actas";

export function exigirSupabase() {
  if (!supabase) {
    throw new Error(
      "Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY para subir actas.",
    );
  }
  return supabase;
}

export async function tokenFirebaseParaActas(): Promise<string> {
  const usuario = auth?.currentUser;
  if (!usuario) throw new Error("La sesión venció. Vuelva a iniciar sesión.");
  const resultado = await usuario.getIdTokenResult(true);
  if (
    resultado.claims.role !== "authenticated" ||
    (resultado.claims.actas !== true && resultado.claims.direccion !== true)
  ) {
    throw new Error(
      "Esta cuenta aún no tiene permiso para gestionar actas en Supabase. Un Administrador debe sincronizar las claims de Firebase.",
    );
  }
  return resultado.token;
}

export function endpointSubida(): string {
  const url = new URL(import.meta.env.VITE_SUPABASE_URL!);
  if (url.hostname.endsWith(".supabase.co")) {
    url.hostname = url.hostname.replace(/\.supabase\.co$/, ".storage.supabase.co");
  }
  return new URL("/storage/v1/upload/resumable", url).toString();
}
