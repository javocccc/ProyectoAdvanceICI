import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { demoExpedientes } from "../data/demoExpedientes";
import type { Expediente, NuevoExpediente } from "../types/expediente";
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
  // Cada documento guarda su propio id dentro de los datos del expediente.
  const respuesta = await getDocs(collection(db, "expedientes"));
  return respuesta.docs.map((item) => item.data() as Expediente);
}

/** Crea una ficha y rechaza un RUT ya presente tras quitar su puntuación. */
export async function crearExpediente(
  nuevo: NuevoExpediente,
  usuario: string,
): Promise<Expediente> {
  const existente = await listarExpedientes();
  // La limpieza permite detectar el mismo RUT aunque tenga puntos, guion o
  // una K minúscula. La validación del dígito ocurre en el formulario.
  if (
    existente.some(
      (item) => limpiarRut(item.rut) === limpiarRut(nuevo.rut),
    )
  ) {
    throw new Error("Ya existe un expediente con ese RUT.");
  }
  // El formulario no envía estos campos: se asignan justo antes de guardar.
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
    // Guardamos también los ejemplos iniciales para que las siguientes lecturas
    // muestren juntos los registros originales y los creados en este navegador.
    localStorage.setItem(
      CLAVE_DEMO,
      JSON.stringify([expediente, ...existente]),
    );
  }
  return expediente;
}

/** Actualiza solo los campos recibidos; la ficha no reemplaza todo el documento. */
export async function actualizarExpediente(
  id: string,
  cambios: Partial<Expediente>,
): Promise<void> {
  if (db) {
    await updateDoc(doc(db, "expedientes", id), cambios);
    return;
  }
  // En demo se reescribe la lista completa porque localStorage guarda texto.
  const actualizados = leerDemo().map((item) =>
    item.id === id ? { ...item, ...cambios } : item,
  );
  localStorage.setItem(CLAVE_DEMO, JSON.stringify(actualizados));
}
