import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { demoExpedientes } from "../data/demoExpedientes";
import type {
  Expediente,
  NuevoExpediente,
  RegistroAuditoria,
} from "../types/expediente";
import { limpiarRut } from "../utils/rut";
import { db } from "./firebase";

const CLAVE_DEMO = "advance-ici-expedientes-demo";

// Este servicio concentra el almacenamiento. Las páginas no necesitan saber
// si los datos vienen del navegador o de la colección "expedientes".
/** Lee las fichas de demostración. Sin datos guardados o con JSON inválido, usa los ejemplos iniciales. */
function leerDemo(): Expediente[] {
  try {
    const guardados = localStorage.getItem(CLAVE_DEMO);
    if (!guardados) return demoExpedientes;
    const datos: unknown = JSON.parse(guardados);
    return Array.isArray(datos) ? (datos as Expediente[]) : demoExpedientes;
  } catch {
    return demoExpedientes;
  }
}

/** Las pantallas reciben la misma lista tanto en demostración como en Firebase. */
export async function listarExpedientes(): Promise<Expediente[]> {
  if (!db) return leerDemo();
  const respuesta = await getDocs(collection(db, "expedientes"));
  return respuesta.docs.map((item) => item.data() as Expediente);
}

/** Crea una ficha y rechaza un RUT ya presente tras quitar su puntuación. */
export async function crearExpediente(
  nuevo: NuevoExpediente,
  usuario: string,
): Promise<Expediente> {
  const existente = await listarExpedientes();
  if (
    existente.some(
      (item) => limpiarRut(item.rut) === limpiarRut(nuevo.rut),
    )
  ) {
    throw new Error("Ya existe un expediente con ese RUT.");
  }

  const expediente: Expediente = {
    ...nuevo,
    id: crypto.randomUUID(),
    fechaCreacion: new Date().toISOString(),
    creadoPor: usuario,
    historialColegiatura: [],
  };
  if (db) {
    await setDoc(doc(db, "expedientes", expediente.id), expediente);
  } else {
    localStorage.setItem(
      CLAVE_DEMO,
      JSON.stringify([expediente, ...existente]),
    );
  }
  return expediente;
}

/** Actualiza una ficha, conserva sus datos no modificados y registra la auditoría. */
export async function actualizarExpediente(
  id: string,
  cambios: Partial<Expediente>,
  usuarioEmail: string,
): Promise<void> {
  const existentes = await listarExpedientes();
  const actual = existentes.find((item) => item.id === id);
  if (!actual) throw new Error("No se encontró el expediente que desea editar.");

  const rutActualizado = cambios.rut;
  if (
    rutActualizado &&
    existentes.some(
      (item) =>
        item.id !== id && limpiarRut(item.rut) === limpiarRut(rutActualizado),
    )
  ) {
    throw new Error("Ya existe otro expediente con ese RUT.");
  }

  const camposActualizados = Object.keys(cambios);
  const nuevoRegistro: RegistroAuditoria = {
    id: crypto.randomUUID(),
    fecha: new Date().toISOString(),
    usuario: usuarioEmail,
    accion: "Actualización de expediente",
    detalles: camposActualizados.length
      ? `Campos actualizados: ${camposActualizados.join(", ")}`
      : "Sin cambios detectados",
  };

  if (db) {
    await updateDoc(doc(db, "expedientes", id), {
      ...cambios,
      historialAuditoria: arrayUnion(nuevoRegistro),
    });
    return;
  }

  const actualizados = existentes.map((item) =>
    item.id === id
      ? {
          ...item,
          ...cambios,
          historialAuditoria: [
            ...(item.historialAuditoria ?? []),
            nuevoRegistro,
          ],
        }
      : item,
  );
  localStorage.setItem(CLAVE_DEMO, JSON.stringify(actualizados));
}
