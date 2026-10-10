import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { demoExpedientes } from "../data/demoExpedientes";
import type {
  Expediente,
  NuevoExpediente,
  RegistroAuditoria,
} from "../types/expediente";
import { limpiarRut } from "../utils/rut";
import { db, functions } from "./firebase";

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

/** Lee las últimas acciones que Firebase registra de forma inmutable. */
export async function listarAuditoriaExpediente(
  id: string,
): Promise<RegistroAuditoria[]> {
  if (!db) {
    return (
      leerDemo().find((item) => item.id === id)?.historialAuditoria ?? []
    ).slice(-50).reverse();
  }
  const registros = await getDocs(
    query(
      collection(db, "expedientes", id, "auditoria"),
      orderBy("fecha", "desc"),
      limit(50),
    ),
  );
  return registros.docs.map(
    (registro) =>
      ({ id: registro.id, ...registro.data() }) as RegistroAuditoria,
  );
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
    if (!functions) throw new Error("Las funciones de Firebase no están disponibles.");
    const crear = httpsCallable<{ expediente: NuevoExpediente }, Expediente>(
      functions,
      "crearExpediente",
    );
    const respuesta = await crear({ expediente: nuevo });
    return respuesta.data;
  }
  localStorage.setItem(CLAVE_DEMO, JSON.stringify([expediente, ...existente]));
  return expediente;
}

/** Actualiza una ficha; Firebase registra la auditoría desde una función confiable. */
export async function actualizarExpediente(
  id: string,
  cambios: Partial<Expediente>,
  usuarioEmail: string,
  observacionColegiatura?: string,
): Promise<Partial<Expediente>> {
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

  if (db) {
    if (!functions) throw new Error("Las funciones de Firebase no están disponibles.");
    const actualizar = httpsCallable<
      {
        id: string;
        cambios: Partial<Expediente>;
        observacionColegiatura?: string;
      },
      Partial<Expediente>
    >(functions, "actualizarExpediente");
    const respuesta = await actualizar({
      id,
      cambios,
      ...(observacionColegiatura
        ? { observacionColegiatura }
        : {}),
    });
    return respuesta.data;
  }

  const cambiosLocales = { ...cambios };
  if (
    cambiosLocales.colegiatura &&
    cambiosLocales.colegiatura !== actual.colegiatura
  ) {
    const fecha = new Date().toISOString();
    cambiosLocales.fechaColegiatura = fecha;
    cambiosLocales.historialColegiatura = [
      ...actual.historialColegiatura,
      {
        estadoAnterior: actual.colegiatura,
        estadoNuevo: cambiosLocales.colegiatura,
        fecha,
        usuario: usuarioEmail,
        ...(observacionColegiatura?.trim()
          ? { observacion: observacionColegiatura.trim() }
          : {}),
      },
    ];
  }
  const camposActualizados = Object.keys(cambiosLocales);
  const nuevoRegistro: RegistroAuditoria = {
    id: crypto.randomUUID(),
    fecha: new Date().toISOString(),
    usuario: usuarioEmail,
    accion: "Actualización de expediente",
    detalles: camposActualizados.length
      ? `Campos actualizados: ${camposActualizados.join(", ")}`
      : "Sin cambios detectados",
  };
  const actualizados = existentes.map((item) =>
    item.id === id
      ? {
          ...item,
          ...cambiosLocales,
          historialAuditoria: [
            ...(item.historialAuditoria ?? []),
            nuevoRegistro,
          ],
        }
      : item,
  );
  localStorage.setItem(CLAVE_DEMO, JSON.stringify(actualizados));
  return cambiosLocales;
}
