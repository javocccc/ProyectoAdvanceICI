import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";

const CLAVE_ACCESOS_DEMO = "advance-ici-accesos-demo";
const CLAVE_ESTADO_DEMO = "advance-ici-mantenimiento-demo";

export interface EstadoSistema {
  mantenimiento: boolean;
  mensaje: string;
  actualizadoEn?: string;
  actualizadoPor?: string;
}

export interface AccesoExpediente {
  id: string;
  fecha: string;
  usuario: string;
  usuarioId: string;
  expedienteId: string;
  accion: "Consulta de expediente";
}

function esEstadoSistema(valor: unknown): valor is EstadoSistema {
  return typeof valor === "object"
    && valor !== null
    && !Array.isArray(valor)
    && "mantenimiento" in valor
    && typeof valor.mantenimiento === "boolean"
    && "mensaje" in valor
    && typeof valor.mensaje === "string";
}

function esAccesoExpediente(valor: unknown): valor is AccesoExpediente {
  return typeof valor === "object"
    && valor !== null
    && "id" in valor
    && typeof valor.id === "string"
    && "fecha" in valor
    && typeof valor.fecha === "string"
    && "usuario" in valor
    && typeof valor.usuario === "string"
    && "usuarioId" in valor
    && typeof valor.usuarioId === "string"
    && "expedienteId" in valor
    && typeof valor.expedienteId === "string"
    && "accion" in valor
    && valor.accion === "Consulta de expediente";
}

function estadoDemo(): EstadoSistema {
  const guardado = localStorage.getItem(CLAVE_ESTADO_DEMO);
  if (!guardado) return { mantenimiento: false, mensaje: "" };
  let valor: unknown;
  try {
    valor = JSON.parse(guardado);
  } catch {
    throw new Error("La configuración local de mantenimiento está dañada.");
  }
  if (!esEstadoSistema(valor)) {
    throw new Error("La configuración local de mantenimiento no es válida.");
  }
  return valor;
}

function leerAccesosDemo(): AccesoExpediente[] {
  const guardado = localStorage.getItem(CLAVE_ACCESOS_DEMO);
  if (!guardado) return [];
  let valor: unknown;
  try {
    valor = JSON.parse(guardado);
  } catch {
    throw new Error("El registro local de consultas está dañado.");
  }
  if (!Array.isArray(valor) || !valor.every(esAccesoExpediente)) {
    throw new Error("El registro local de consultas no es válido.");
  }
  return valor;
}

export async function obtenerEstadoSistema(): Promise<EstadoSistema> {
  if (!db) return estadoDemo();
  const snapshot = await getDoc(doc(db, "configuracion", "sistema"));
  if (!snapshot.exists()) return { mantenimiento: false, mensaje: "" };
  const datos = snapshot.data();
  return {
    mantenimiento: datos.mantenimiento === true,
    mensaje: typeof datos.mensaje === "string" ? datos.mensaje : "",
    actualizadoEn: typeof datos.actualizadoEn === "string" ? datos.actualizadoEn : undefined,
    actualizadoPor: typeof datos.actualizadoPor === "string" ? datos.actualizadoPor : undefined,
  };
}

export async function actualizarMantenimiento(
  mantenimiento: boolean,
  mensaje: string,
  usuario: string,
): Promise<EstadoSistema> {
  const nuevoEstado: EstadoSistema = {
    mantenimiento,
    mensaje: mensaje.trim(),
    actualizadoEn: new Date().toISOString(),
    actualizadoPor: usuario,
  };
  if (!db) {
    localStorage.setItem(CLAVE_ESTADO_DEMO, JSON.stringify(nuevoEstado));
    return nuevoEstado;
  }
  await setDoc(doc(db, "configuracion", "sistema"), nuevoEstado);
  return nuevoEstado;
}

export async function registrarConsultaExpediente(
  expedienteId: string,
  usuarioId: string,
  usuarioEmail: string,
): Promise<void> {
  if (db) {
    const cuenta = auth?.currentUser;
    if (!cuenta || cuenta.uid !== usuarioId || cuenta.email !== usuarioEmail) {
      throw new Error("La identidad de la sesión no coincide con la cuenta actual.");
    }
    await addDoc(collection(db, "consultasExpedientes"), {
      fecha: serverTimestamp(),
      usuario: cuenta.email,
      usuarioId: cuenta.uid,
      expedienteId,
      accion: "Consulta de expediente",
    });
    return;
  }
  const accesos = leerAccesosDemo();
  accesos.unshift({
    id: crypto.randomUUID(),
    fecha: new Date().toISOString(),
    usuario: usuarioEmail,
    usuarioId,
    expedienteId,
    accion: "Consulta de expediente",
  });
  localStorage.setItem(CLAVE_ACCESOS_DEMO, JSON.stringify(accesos.slice(0, 100)));
}

export async function listarAccesosExpedientes(): Promise<AccesoExpediente[]> {
  if (!db) {
    return leerAccesosDemo();
  }
  if (!auth?.currentUser) throw new Error("Debe iniciar sesión para consultar la auditoría.");
  const resultado = await getDocs(query(
    collection(db, "consultasExpedientes"),
    orderBy("fecha", "desc"),
    limit(100),
  ));
  return resultado.docs.map((item) => {
    const datos = item.data();
    const fecha = datos.fecha instanceof Timestamp
      ? datos.fecha.toDate().toISOString()
      : typeof datos.fecha === "string" ? datos.fecha : "";
    return { id: item.id, ...datos, fecha } as AccesoExpediente;
  });
}
