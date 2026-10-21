import {
  createUserWithEmailAndPassword,
  deleteUser,
  inMemoryPersistence,
  sendPasswordResetEmail,
  setPersistence,
  updateProfile,
} from "firebase/auth";
import { deleteApp, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  collection,
  deleteField,
  doc,
  getDocs,
  runTransaction,
} from "firebase/firestore";
import { auth, db, firebaseConfig } from "./firebase";
import type { Rol } from "../auth/roles";

export interface CuentaApp {
  uid: string;
  email: string;
  nombre: string;
  rol: Rol | null;
  activo: boolean;
  expedienteId: string | null;
}

function exigirFirebase() {
  if (!auth || !db) throw new Error("La gestión de cuentas requiere Firebase Authentication y Firestore configurados.");
  return { auth, db };
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

function generarClaveTemporal(): string {
  return `A${crypto.randomUUID()}z7!`;
}

export async function crearCuenta(datos: {
  email: string;
  nombre: string;
  rol: Rol;
  expedienteId?: string;
  password?: string;
}): Promise<CuentaApp> {
  const { db: firestore } = exigirFirebase();
  const email = datos.email.trim().toLowerCase();
  const clave = datos.password || generarClaveTemporal();
  const appSecundaria = initializeApp(firebaseConfig, `cuenta-${crypto.randomUUID()}`);
  const authSecundario = getAuth(appSecundaria);
  try {
    await setPersistence(authSecundario, inMemoryPersistence);
    const credencial = await createUserWithEmailAndPassword(authSecundario, email, clave);
    try {
      await updateProfile(credencial.user, { displayName: datos.nombre.trim() });
      const perfilRef = doc(firestore, "usuarios", credencial.user.uid);
      await runTransaction(firestore, async (transaccion) => {
        const perfilActual = await transaccion.get(perfilRef);
        if (perfilActual.exists()) throw new Error("Ya existe un perfil registrado para esta cuenta.");
        const expedienteRef = datos.rol === "estudiante" && datos.expedienteId
          ? doc(firestore, "expedientes", datos.expedienteId)
          : null;
        const expediente = expedienteRef ? await transaccion.get(expedienteRef) : null;
        if (expedienteRef && !expediente?.exists()) throw new Error("No se encontró el expediente seleccionado.");
        if (expediente?.data()?.estudianteUid) throw new Error("Ese expediente ya está vinculado a otro estudiante.");
        transaccion.set(perfilRef, {
          email,
          nombre: datos.nombre.trim(),
          rol: datos.rol,
          activo: true,
          ...(datos.rol === "estudiante" && datos.expedienteId ? { expedienteId: datos.expedienteId } : {}),
        });
        if (expedienteRef) transaccion.update(expedienteRef, { estudianteUid: credencial.user.uid });
      });
      return {
        uid: credencial.user.uid,
        email,
        nombre: datos.nombre.trim(),
        rol: datos.rol,
        activo: true,
        expedienteId: datos.rol === "estudiante" ? datos.expedienteId || null : null,
      };
    } catch (error) {
      try { await deleteUser(credencial.user); } catch { /* La cuenta Auth puede requerir limpieza manual si el borrado también falla. */ }
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
  const { db: firestore } = exigirFirebase();
  const lista = await listarCuentas();
  const cuentaActual = lista.find((cuenta) => cuenta.uid === datos.uid);
  const administradoresActivos = lista.filter((cuenta) => cuenta.activo && cuenta.rol === "administrador").length;
  if (cuentaActual?.rol === "administrador" && datos.rol !== "administrador" && administradoresActivos <= 1) {
    throw new Error("Debe existir al menos un Administrador activo.");
  }
  const perfilRef = doc(firestore, "usuarios", datos.uid);
  const nuevoExpedienteRef = datos.rol === "estudiante" && datos.expedienteId
    ? doc(firestore, "expedientes", datos.expedienteId)
    : null;
  await runTransaction(firestore, async (transaccion) => {
    const perfil = await transaccion.get(perfilRef);
    if (!perfil.exists() || perfil.data().activo === false) throw new Error("La cuenta no existe o está desactivada.");
    const expedienteAnteriorId = typeof perfil.data().expedienteId === "string" ? perfil.data().expedienteId : null;
    const expedienteAnteriorRef = expedienteAnteriorId ? doc(firestore, "expedientes", expedienteAnteriorId) : null;
    const [expedienteAnterior, expedienteNuevo] = await Promise.all([
      expedienteAnteriorRef ? transaccion.get(expedienteAnteriorRef) : Promise.resolve(null),
      nuevoExpedienteRef ? transaccion.get(nuevoExpedienteRef) : Promise.resolve(null),
    ]);
    if (nuevoExpedienteRef && !expedienteNuevo?.exists()) throw new Error("No se encontró el expediente seleccionado.");
    if (expedienteNuevo?.data()?.estudianteUid && expedienteNuevo.data()?.estudianteUid !== datos.uid) {
      throw new Error("Ese expediente ya está vinculado a otro estudiante.");
    }
    transaccion.update(perfilRef, {
      nombre: datos.nombre.trim(),
      rol: datos.rol,
      expedienteId: nuevoExpedienteRef ? datos.expedienteId : null,
    });
    if (expedienteAnteriorRef && expedienteAnteriorId !== datos.expedienteId && expedienteAnterior?.exists() && expedienteAnterior.data().estudianteUid === datos.uid) {
      transaccion.update(expedienteAnteriorRef, { estudianteUid: deleteField() });
    }
    if (nuevoExpedienteRef) transaccion.update(nuevoExpedienteRef, { estudianteUid: datos.uid });
  });
}

export async function eliminarCuenta(uid: string): Promise<void> {
  const { db: firestore } = exigirFirebase();
  const lista = await listarCuentas();
  const cuentaActual = lista.find((cuenta) => cuenta.uid === uid);
  const administradoresActivos = lista.filter((cuenta) => cuenta.activo && cuenta.rol === "administrador").length;
  if (cuentaActual?.rol === "administrador" && administradoresActivos <= 1) {
    throw new Error("No se puede desactivar al último Administrador activo.");
  }
  const perfilRef = doc(firestore, "usuarios", uid);
  await runTransaction(firestore, async (transaccion) => {
    const perfil = await transaccion.get(perfilRef);
    if (!perfil.exists()) throw new Error("No se encontró la cuenta.");
    const expedienteId = typeof perfil.data().expedienteId === "string" ? perfil.data().expedienteId : null;
    const expedienteRef = expedienteId ? doc(firestore, "expedientes", expedienteId) : null;
    const expediente = expedienteRef ? await transaccion.get(expedienteRef) : null;
    transaccion.update(perfilRef, { activo: false, expedienteId: null });
    if (expedienteRef && expediente?.exists() && expediente.data().estudianteUid === uid) {
      transaccion.update(expedienteRef, { estudianteUid: deleteField() });
    }
  });
}

export async function enviarInvitacion(email: string): Promise<void> {
  const { auth: autenticacion } = exigirFirebase();
  await sendPasswordResetEmail(autenticacion, email);
}
