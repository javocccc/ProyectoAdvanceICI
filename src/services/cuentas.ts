import { deleteApp, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  inMemoryPersistence,
  sendPasswordResetEmail,
  setPersistence,
  updateProfile,
} from "firebase/auth";
import { collection, deleteField, doc, getDocs, runTransaction } from "firebase/firestore";
import type { Rol } from "../auth/roles";
import { auth, db, firebaseConfig } from "./firebase";

export interface CuentaApp {
  uid: string;
  email: string;
  nombre: string;
  rol: Rol | null;
  activo: boolean;
  expedienteId: string | null;
}

export interface CuentaCreada extends CuentaApp {
  /** Se muestra una sola vez; no se guarda en Firestore ni en el archivo CSV. */
  claveTemporal: string;
}

export function mensajeErrorCuenta(error: unknown): string {
  const codigo = typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "";
  if (codigo === "auth/email-already-in-use") return "Ya existe una cuenta de Authentication con ese correo.";
  if (codigo === "auth/invalid-email") return "El correo no es válido para Firebase Authentication.";
  if (codigo === "auth/weak-password" || codigo === "auth/password-does-not-meet-requirements") {
    return "Firebase rechazó la contraseña inicial. Revise la política de contraseñas del proyecto.";
  }
  if (codigo.includes("permission-denied")) {
    return "Firestore rechazó la operación. Verifique que su perfil sea Administrador activo y que las reglas de Firestore estén publicadas.";
  }
  if (codigo.includes("already-exists")) return "La cuenta o el vínculo con el expediente ya existe.";
  return error instanceof Error ? error.message : "No se pudo completar la operación.";
}

function exigirFirebase() {
  if (!auth || !db) throw new Error("La gestión de cuentas requiere Firebase Authentication y Firestore configurados.");
  return { auth, db };
}

function generarClaveTemporal(): string {
  return `A${crypto.randomUUID().replace(/-/g, "")}z7!`;
}

export async function listarCuentas(): Promise<CuentaApp[]> {
  const { db: firestore } = exigirFirebase();
  const resultado = await getDocs(collection(firestore, "usuarios"));
  return resultado.docs.map((perfil) => {
    const datos = perfil.data();
    const valorRol = datos.rol === "direccion" ? "administrador"
      : datos.rol === "secretaria" ? "coordinador"
        : datos.rol === "consulta" ? "estudiante" : datos.rol;
    return {
      uid: perfil.id,
      email: typeof datos.email === "string" ? datos.email : "",
      nombre: typeof datos.nombre === "string" ? datos.nombre : "",
      rol: valorRol === "administrador" || valorRol === "coordinador" || valorRol === "estudiante" ? valorRol : null,
      activo: datos.activo !== false,
      expedienteId: typeof datos.expedienteId === "string" ? datos.expedienteId : null,
    };
  });
}

export async function crearCuenta(datos: {
  email: string;
  nombre: string;
  rol: Rol;
  expedienteId?: string;
  password?: string;
}): Promise<CuentaCreada> {
  const { db: firestore } = exigirFirebase();
  const email = datos.email.trim().toLowerCase();
  const nombre = datos.nombre.trim();
  if (datos.password && (datos.rol !== "estudiante" || datos.password.length < 8 || datos.password.length > 128)) {
    throw new Error("La contraseña inicial del estudiante debe tener entre 8 y 128 caracteres.");
  }
  const appSecundaria = initializeApp(firebaseConfig, `cuenta-${crypto.randomUUID()}`);
  const authSecundario = getAuth(appSecundaria);
  const claveTemporal = datos.password || generarClaveTemporal();
  try {
    await setPersistence(authSecundario, inMemoryPersistence);
    const credencial = await createUserWithEmailAndPassword(authSecundario, email, claveTemporal);
    try {
      await updateProfile(credencial.user, { displayName: nombre });
      const perfilRef = doc(firestore, "usuarios", credencial.user.uid);
      await runTransaction(firestore, async (transaccion) => {
        const perfil = await transaccion.get(perfilRef);
        if (perfil.exists()) throw new Error("Ya existe un perfil para esta cuenta.");
        const expedienteRef = datos.rol === "estudiante" && datos.expedienteId
          ? doc(firestore, "expedientes", datos.expedienteId)
          : null;
        const expediente = expedienteRef ? await transaccion.get(expedienteRef) : null;
        if (expedienteRef && !expediente?.exists()) throw new Error("No existe el expediente seleccionado.");
        if (expediente?.data()?.estudianteUid) throw new Error("Ese expediente ya está vinculado a otro estudiante.");
        transaccion.set(perfilRef, {
          email,
          nombre,
          rol: datos.rol,
          activo: true,
          ...(expedienteRef ? { expedienteId: datos.expedienteId } : {}),
        });
        if (expedienteRef) transaccion.update(expedienteRef, { estudianteUid: credencial.user.uid });
      });
      return {
        uid: credencial.user.uid,
        email,
        nombre,
        rol: datos.rol,
        activo: true,
        expedienteId: datos.rol === "estudiante" ? datos.expedienteId || null : null,
        claveTemporal,
      };
    } catch (error) {
      try { await deleteUser(credencial.user); }
      catch { throw new Error("No se creó el perfil y tampoco se pudo limpiar la cuenta de Authentication. Revise esa cuenta en Firebase."); }
      throw error;
    }
  } finally {
    await deleteApp(appSecundaria);
  }
}

export async function actualizarCuenta(datos: {
  uid: string;
  nombre: string;
  rol: Rol;
  expedienteId?: string;
}): Promise<void> {
  const { auth: autenticacion, db: firestore } = exigirFirebase();
  if (datos.uid === autenticacion.currentUser?.uid && datos.rol !== "administrador") {
    throw new Error("No puede quitarse su propio rol de Administrador.");
  }
  const perfilRef = doc(firestore, "usuarios", datos.uid);
  await runTransaction(firestore, async (transaccion) => {
    const perfil = await transaccion.get(perfilRef);
    if (!perfil.exists() || perfil.data().activo === false) throw new Error("La cuenta no existe o está desactivada.");
    const expedienteAnteriorId = typeof perfil.data().expedienteId === "string" ? perfil.data().expedienteId : "";
    const expedienteAnteriorRef = expedienteAnteriorId ? doc(firestore, "expedientes", expedienteAnteriorId) : null;
    const expedienteNuevoRef = datos.rol === "estudiante" && datos.expedienteId
      ? doc(firestore, "expedientes", datos.expedienteId)
      : null;
    const [expedienteAnterior, expedienteNuevo] = await Promise.all([
      expedienteAnteriorRef ? transaccion.get(expedienteAnteriorRef) : Promise.resolve(null),
      expedienteNuevoRef ? transaccion.get(expedienteNuevoRef) : Promise.resolve(null),
    ]);
    if (expedienteNuevoRef && !expedienteNuevo?.exists()) throw new Error("No existe el expediente seleccionado.");
    if (expedienteNuevo?.data()?.estudianteUid && expedienteNuevo.data()?.estudianteUid !== datos.uid) {
      throw new Error("Ese expediente ya está vinculado a otro estudiante.");
    }
    transaccion.update(perfilRef, {
      nombre: datos.nombre.trim(),
      rol: datos.rol,
      expedienteId: expedienteNuevoRef ? datos.expedienteId : deleteField(),
    });
    if (expedienteAnteriorRef && expedienteAnteriorId !== datos.expedienteId && expedienteAnterior?.exists() && expedienteAnterior.data().estudianteUid === datos.uid) {
      transaccion.update(expedienteAnteriorRef, { estudianteUid: deleteField() });
    }
    if (expedienteNuevoRef) transaccion.update(expedienteNuevoRef, { estudianteUid: datos.uid });
  });
}

export async function eliminarCuenta(uid: string): Promise<void> {
  const { auth: autenticacion } = exigirFirebase();
  if (uid === autenticacion.currentUser?.uid) throw new Error("No puede eliminar su propia cuenta de Administrador.");
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const clave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !clave) throw new Error("Configure la URL y la clave publicable de Supabase para eliminar cuentas.");
  const token = await autenticacion.currentUser?.getIdToken(true);
  if (!token) throw new Error("La sesión venció. Inicie sesión nuevamente.");
  const respuesta = await fetch(new URL("/functions/v1/eliminar-cuenta", url), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: clave,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uid }),
  });
  if (!respuesta.ok) {
    const datos = await respuesta.json().catch(() => ({})) as { error?: string };
    throw new Error(datos.error || (respuesta.status === 404
      ? "La función eliminar-cuenta aún no está desplegada en Supabase."
      : `Supabase rechazó la eliminación (${respuesta.status}).`));
  }
}

export async function enviarInvitacion(email: string): Promise<void> {
  const { auth: autenticacion } = exigirFirebase();
  await sendPasswordResetEmail(autenticacion, email);
}
