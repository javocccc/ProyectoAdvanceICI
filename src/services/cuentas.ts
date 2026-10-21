import { httpsCallable } from "firebase/functions";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, functions } from "./firebase";
import type { Rol } from "../auth/roles";

export interface CuentaApp {
  uid: string;
  email: string;
  nombre: string;
  rol: Rol | null;
  activo: boolean;
  expedienteId: string | null;
}

function callable<TData, TResult>(nombre: string) {
  if (!functions) {
    throw new Error("La administración de cuentas requiere Firebase Functions.");
  }
  return httpsCallable<TData, TResult>(functions, nombre);
}

export async function listarCuentas(): Promise<CuentaApp[]> {
  const resultado = await callable<void, { cuentas: CuentaApp[] }>("listarCuentas")();
  return resultado.data.cuentas;
}

export async function crearCuenta(datos: {
  email: string;
  nombre: string;
  rol: Rol;
  expedienteId?: string;
  password?: string;
}): Promise<CuentaApp> {
  const resultado = await callable<typeof datos, CuentaApp>("crearCuenta")(datos);
  return resultado.data;
}

export async function actualizarCuenta(datos: {
  uid: string;
  nombre: string;
  rol: Rol;
  expedienteId?: string;
}): Promise<void> {
  await callable<typeof datos, { uid: string; nombre: string; rol: Rol; expedienteId: string | null }>(
    "actualizarCuenta",
  )(datos);
}

export async function eliminarCuenta(uid: string): Promise<void> {
  await callable<{ uid: string }, { uid: string; activo: false }>("eliminarCuenta")({ uid });
}

export async function enviarInvitacion(email: string): Promise<void> {
  if (!auth) throw new Error("Firebase Authentication no está configurado.");
  await sendPasswordResetEmail(auth, email);
}
