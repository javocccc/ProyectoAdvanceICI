import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { demoExpedientes } from "../data/demoExpedientes";
import type { Expediente, NuevoExpediente } from "../types/expediente";
import { db } from "./firebase";

const CLAVE_DEMO = "advance-ici-expedientes-demo";

/** Lee JSON del navegador. Si está corrupto, vuelve a los datos ficticios iniciales. */
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

/** El panel y la búsqueda llaman a esta función sin saber dónde viven los datos. */
export async function listarExpedientes(): Promise<Expediente[]> {
  if (!db) return leerDemo();
  const respuesta = await getDocs(collection(db, "expedientes"));
  return respuesta.docs.map((item) => item.data() as Expediente);
}

/** Contrato para el formulario de Matias: guarda una ficha nueva. */
export async function crearExpediente(
  nuevo: NuevoExpediente,
  usuario: string,
): Promise<Expediente> {
  const existente = await listarExpedientes();
  if (
    existente.some(
      (item) => item.rut.replace(/\W/g, "") === nuevo.rut.replace(/\W/g, ""),
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

/** Contrato para la ficha de Fabian: actualiza solo las propiedades indicadas. */
export async function actualizarExpediente(
  id: string,
  cambios: Partial<Expediente>,
): Promise<void> {
  if (db) {
    await updateDoc(doc(db, "expedientes", id), cambios);
    return;
  }
  const actualizados = leerDemo().map((item) =>
    item.id === id ? { ...item, ...cambios } : item,
  );
  localStorage.setItem(CLAVE_DEMO, JSON.stringify(actualizados));
}
