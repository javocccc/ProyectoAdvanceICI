import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  setDoc,
  startAfter,
} from "firebase/firestore";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import type {
  Expediente,
  NuevoExpediente,
  RegistroAuditoria,
} from "../types/expediente";
import { limpiarRut } from "../utils/rut";
import { db } from "./firebase";
import { prepararActualizacion } from "../utils/cambiosExpediente";
import {
  guardarExpedientesDemo,
  leerExpedientesDemo,
} from "./almacenamientoDemo";

export const TAMANO_PAGINA = 20;

export type FiltroExpedientes = "todos" | Expediente["colegiatura"];
export type CursorExpedientes =
  | QueryDocumentSnapshot<DocumentData>
  | number
  | null;

export interface PaginaExpedientes {
  expedientes: Expediente[];
  total: number;
  siguienteCursor: CursorExpedientes;
}

export interface ResumenExpedientes {
  total: number;
  pendientesColegiatura: number;
  pendientesActa: number;
  recientes: Expediente[];
}

function normalizarBusqueda(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function filtrarExpedientes(
  expedientes: Expediente[],
  busqueda: string,
  filtro: FiltroExpedientes,
): Expediente[] {
  const termino = normalizarBusqueda(busqueda);
  const terminoRut = limpiarRut(busqueda);
  return expedientes.filter((expediente) => {
    const nombre = normalizarBusqueda(expediente.nombre);
    const coincideTexto =
      !termino ||
      (termino.length >= 2 &&
        (nombre.startsWith(termino) ||
          nombre.split(" ").some((palabra) => palabra.startsWith(termino)) ||
          (terminoRut.length >= 2 &&
            limpiarRut(expediente.rut).startsWith(terminoRut))));
    return (
      coincideTexto &&
      (filtro === "todos" || expediente.colegiatura === filtro)
    );
  });
}

function filtrarDemo(busqueda: string, filtro: FiltroExpedientes): Expediente[] {
  return filtrarExpedientes(leerExpedientesDemo(), busqueda, filtro);
}

/** Consulta una página; para filtros y búsqueda incluye fichas antiguas sin índices de búsqueda. */
export async function obtenerPaginaExpedientes(
  busqueda: string,
  filtro: FiltroExpedientes,
  cursor: CursorExpedientes = null,
): Promise<PaginaExpedientes> {
  if (!db) {
    const coincidentes = filtrarDemo(busqueda, filtro);
    const inicio = typeof cursor === "number" ? cursor : 0;
    const expedientes = coincidentes.slice(inicio, inicio + TAMANO_PAGINA);
    const siguienteCursor =
      inicio + expedientes.length < coincidentes.length
        ? inicio + expedientes.length
        : null;
    return { expedientes, total: coincidentes.length, siguienteCursor };
  }

  const termino = normalizarBusqueda(busqueda);
  if (termino || filtro !== "todos") {
    // La búsqueda también debe encontrar fichas anteriores a busquedaTokens y
    // funcionar aunque los índices compuestos aún no estén publicados.
    const instantanea = await getDocs(collection(db, "expedientes"));
    const coincidentes = filtrarExpedientes(
      instantanea.docs.map((item) => item.data() as Expediente),
      busqueda,
      filtro,
    ).sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion));
    const inicio = typeof cursor === "number" ? cursor : 0;
    const expedientes = coincidentes.slice(inicio, inicio + TAMANO_PAGINA);
    return {
      expedientes,
      total: coincidentes.length,
      siguienteCursor: inicio + expedientes.length < coincidentes.length
        ? inicio + expedientes.length
        : null,
    };
  }

  const coleccion = collection(db, "expedientes");
  const [conteo, pagina] = await Promise.all([
    getCountFromServer(coleccion),
    getDocs(
      query(
        coleccion,
        orderBy("fechaCreacion", "desc"),
        ...(cursor && typeof cursor !== "number" ? [startAfter(cursor)] : []),
        limit(TAMANO_PAGINA + 1),
      ),
    ),
  ]);
  const visibles = pagina.docs.slice(0, TAMANO_PAGINA);
  const expedientes = visibles.map((item) => item.data() as Expediente);
  return {
    expedientes,
    total: conteo.data().count,
    siguienteCursor: pagina.docs.length > TAMANO_PAGINA
      ? visibles[visibles.length - 1]
      : null,
  };
}

/** Carga una ficha por ID para no depender de descargar toda la colección. */
export async function obtenerExpediente(
  id: string,
): Promise<Expediente | null> {
  if (!db)
    return leerExpedientesDemo().find((item) => item.id === id) ?? null;
  const respuesta = await getDoc(doc(db, "expedientes", id));
  return respuesta.exists() ? (respuesta.data() as Expediente) : null;
}

/** Busca por RUT en fichas nuevas y antiguas sin depender de índices. */
export async function buscarExpedientePorRut(
  rut: string,
): Promise<Expediente | null> {
  if (!db) {
    return (
      leerExpedientesDemo().find(
        (item) => limpiarRut(item.rut) === limpiarRut(rut),
      ) ??
      null
    );
  }
  const existentes = await getDocs(collection(db, "expedientes"));
  return existentes.docs
    .map((item) => item.data() as Expediente)
    .find((item) => limpiarRut(item.rut) === limpiarRut(rut)) ?? null;
}

/** Obtiene cifras correctas incluso para fichas antiguas sin actaPendiente. */
export async function obtenerResumenExpedientes(): Promise<ResumenExpedientes> {
  if (!db) {
    const expedientes = leerExpedientesDemo();
    return {
      total: expedientes.length,
      pendientesColegiatura: expedientes.filter(
        (item) =>
          item.colegiatura === "no-al-dia" ||
          item.colegiatura === "sin-informar",
      ).length,
      pendientesActa: expedientes.filter((item) => !item.acta).length,
      recientes: [...expedientes]
        .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion))
        .slice(0, 5),
    };
  }
  const respuesta = await getDocs(collection(db, "expedientes"));
  const expedientes = respuesta.docs.map((item) => item.data() as Expediente);
  return {
    total: expedientes.length,
    pendientesColegiatura: expedientes.filter((item) =>
      item.colegiatura === "no-al-dia" || item.colegiatura === "sin-informar"
    ).length,
    pendientesActa: expedientes.filter((item) => !item.acta).length,
    recientes: expedientes
      .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion))
      .slice(0, 5),
  };
}

/** Lee el historial guardado en el mismo expediente. */
export async function listarAuditoriaExpediente(
  id: string,
): Promise<RegistroAuditoria[]> {
  if (!db) {
    return (
      leerExpedientesDemo().find((item) => item.id === id)
        ?.historialAuditoria ?? []
    ).slice(-50).reverse();
  }
  const expediente = await getDoc(doc(db, "expedientes", id));
  return ((expediente.data() as Expediente | undefined)?.historialAuditoria ?? [])
    .slice(-50)
    .reverse();
}

/** Crea una ficha y rechaza un RUT ya presente tras quitar su puntuación. */
export async function crearExpediente(
  nuevo: NuevoExpediente,
  usuario: string,
): Promise<Expediente> {
  const expediente: Expediente = {
    ...nuevo,
    id: crypto.randomUUID(),
    fechaCreacion: new Date().toISOString(),
    creadoPor: usuario,
    historialColegiatura: [],
    historialAuditoria: [{
      id: crypto.randomUUID(),
      fecha: new Date().toISOString(),
      usuario,
      accion: "Creación de expediente",
      detalles: "Expediente creado.",
    }],
  };
  if (db) {
    const existentes = await getDocs(collection(db, "expedientes"));
    if (existentes.docs.some((item) =>
      limpiarRut((item.data() as Expediente).rut) === limpiarRut(nuevo.rut)
    )) throw new Error("Ya existe un expediente con ese RUT.");
    await setDoc(doc(db, "expedientes", expediente.id), expediente);
    return expediente;
  }
  const existente = leerExpedientesDemo();
  if (
    existente.some((item) => limpiarRut(item.rut) === limpiarRut(nuevo.rut))
  ) {
    throw new Error("Ya existe un expediente con ese RUT.");
  }
  guardarExpedientesDemo([expediente, ...existente]);
  return expediente;
}

/** Actualiza una ficha y su historial en una transacción de Firestore. */
export async function actualizarExpediente(
  id: string,
  cambios: Partial<Expediente>,
  usuarioEmail: string,
  observacionColegiatura?: string,
): Promise<Partial<Expediente>> {
  if (db) {
    if (cambios.rut) {
      const existentes = await getDocs(collection(db, "expedientes"));
      if (existentes.docs.some((item) =>
        item.id !== id &&
        limpiarRut((item.data() as Expediente).rut) === limpiarRut(cambios.rut!)
      )) throw new Error("Ya existe otro expediente con ese RUT.");
    }
    const referencia = doc(db, "expedientes", id);
    return runTransaction(db, async (transaccion) => {
      const instantanea = await transaccion.get(referencia);
      if (!instantanea.exists()) throw new Error("No se encontró el expediente que desea editar.");
      const actual = instantanea.data() as Expediente;
      const preparados = prepararActualizacion(actual, cambios, usuarioEmail, observacionColegiatura);
      transaccion.update(referencia, preparados);
      return preparados;
    });
  }

  const existentes = leerExpedientesDemo();
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
  const cambiosLocales = prepararActualizacion(actual, cambios, usuarioEmail, observacionColegiatura);
  const actualizados = existentes.map((item) =>
    item.id === id
      ? {
          ...item,
          ...cambiosLocales,
        }
      : item,
  );
  guardarExpedientesDemo(actualizados);
  return cambiosLocales;
}
