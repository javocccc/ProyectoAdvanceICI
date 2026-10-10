import { demoExpedientes } from "../data/demoExpedientes";
import type { Expediente } from "../types/expediente";

const CLAVE_DEMO = "advance-ici-expedientes-demo";

const MENSAJE_LECTURA =
  "No se pudieron leer los datos guardados de demostración. No se cargarán los ejemplos para evitar confundirlos con sus datos. Revise el almacenamiento del navegador o borre los datos locales de Advance ICI para empezar de nuevo.";
const MENSAJE_ESCRITURA =
  "No se pudieron guardar los datos de demostración en este navegador. Revise el espacio disponible y los permisos de almacenamiento.";

export class ErrorAlmacenamientoDemo extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ErrorAlmacenamientoDemo";
  }
}

function esExpedienteDemo(valor: unknown): valor is Expediente {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor))
    return false;
  const expediente = valor as Record<string, unknown>;
  return (
    typeof expediente.id === "string" &&
    typeof expediente.nombre === "string" &&
    typeof expediente.rut === "string" &&
    typeof expediente.anioEgreso === "number" &&
    typeof expediente.fechaExamen === "string" &&
    typeof expediente.fechaCreacion === "string" &&
    Array.isArray(expediente.historialColegiatura) &&
    ["al-dia", "no-al-dia", "sin-informar"].includes(
      String(expediente.colegiatura),
    ) &&
    (expediente.semestreEgreso === 1 || expediente.semestreEgreso === 2)
  );
}

/** JSON ausente usa ejemplos iniciales; JSON dañado nunca se reemplaza silenciosamente. */
export function interpretarDatosDemo(
  guardados: string | null,
): Expediente[] {
  if (guardados === null) return demoExpedientes;
  try {
    const datos: unknown = JSON.parse(guardados);
    if (!Array.isArray(datos) || !datos.every(esExpedienteDemo)) {
      throw new Error("La estructura de los expedientes guardados no es válida.");
    }
    return datos;
  } catch (error) {
    throw new ErrorAlmacenamientoDemo(MENSAJE_LECTURA, { cause: error });
  }
}

export function leerExpedientesDemo(): Expediente[] {
  try {
    return interpretarDatosDemo(window.localStorage.getItem(CLAVE_DEMO));
  } catch (error) {
    if (error instanceof ErrorAlmacenamientoDemo) throw error;
    throw new ErrorAlmacenamientoDemo(MENSAJE_LECTURA, { cause: error });
  }
}

export function guardarExpedientesDemo(expedientes: Expediente[]): void {
  try {
    window.localStorage.setItem(CLAVE_DEMO, JSON.stringify(expedientes));
  } catch (error) {
    throw new ErrorAlmacenamientoDemo(MENSAJE_ESCRITURA, { cause: error });
  }
}

/** Devuelve un aviso seguro y específico sin exponer mensajes internos del SDK. */
export function mensajeErrorAlmacenamientoDemo(
  error: unknown,
): string | null {
  return error instanceof ErrorAlmacenamientoDemo ? error.message : null;
}
