import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from "firebase/firestore";
import type {
  DocumentData,
  QueryConstraint,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import type {
  Expediente,
  NuevoExpediente,
  RegistroAuditoria,
} from "../types/expediente";
import { limpiarRut } from "../utils/rut";
import { db, functions } from "./firebase";
import {
  guardarExpedientesDemo,
  leerExpedientesDemo,
} from "./almacenamientoDemo";

const TAMANO_PAGINA = 20;

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

function filtrarDemo(
  busqueda: string,
  filtro: FiltroExpedientes,
): Expediente[] {
  const termino = normalizarBusqueda(busqueda);
  const terminoRut = limpiarRut(busqueda);
  return leerExpedientesDemo().filter((expediente) => {
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

/** Consulta una página; Firebase aplica búsqueda, filtro y límite en el servidor. */
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

  const restricciones: QueryConstraint[] = [];
  if (filtro !== "todos") restricciones.push(where("colegiatura", "==", filtro));
  const termino = normalizarBusqueda(busqueda);
  if (termino) {
    const rut = limpiarRut(busqueda);
    const tokens = [...new Set([termino, rut].filter((token) => token.length >= 2))];
    if (tokens.length === 0) {
      return { expedientes: [], total: 0, siguienteCursor: null };
    }
    restricciones.push(where("busquedaTokens", "array-contains-any", tokens));
  }

  const coleccion = collection(db, "expedientes");
  const base = query(coleccion, ...restricciones);
  const [conteo, pagina] = await Promise.all([
    getCountFromServer(base),
    getDocs(
      query(
        coleccion,
        ...restricciones,
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

/** Busca por índice de RUT para resolver duplicados sin escanear la colección. */
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
  const coincidencias = await getDocs(
    query(
      collection(db, "expedientes"),
      where("rutNormalizado", "==", limpiarRut(rut)),
      limit(1),
    ),
  );
  return coincidencias.empty
    ? null
    : (coincidencias.docs[0].data() as Expediente);
}

/** Obtiene las cifras del panel con agregaciones, sin leer todos los documentos. */
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
  const expedientes = collection(db, "expedientes");
  const [total, pendientesColegiatura, pendientesActa, recientes] =
    await Promise.all([
      getCountFromServer(expedientes),
      getCountFromServer(
        query(
          expedientes,
          where("colegiatura", "in", ["no-al-dia", "sin-informar"]),
        ),
      ),
      getCountFromServer(
        query(expedientes, where("actaPendiente", "==", true)),
      ),
      getDocs(
        query(expedientes, orderBy("fechaCreacion", "desc"), limit(5)),
      ),
    ]);
  return {
    total: total.data().count,
    pendientesColegiatura: pendientesColegiatura.data().count,
    pendientesActa: pendientesActa.data().count,
    recientes: recientes.docs.map((item) => item.data() as Expediente),
  };
}

/** Lee las últimas acciones que Firebase registra de forma inmutable. */
export async function listarAuditoriaExpediente(
  id: string,
): Promise<RegistroAuditoria[]> {
  if (!db) {
    return (
      leerExpedientesDemo().find((item) => item.id === id)
        ?.historialAuditoria ?? []
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
  const existente = leerExpedientesDemo();
  if (
    existente.some((item) => limpiarRut(item.rut) === limpiarRut(nuevo.rut))
  ) {
    throw new Error("Ya existe un expediente con ese RUT.");
  }
  guardarExpedientesDemo([expediente, ...existente]);
  return expediente;
}

/** Actualiza una ficha; Firebase registra la auditoría desde una función confiable. */
export async function actualizarExpediente(
  id: string,
  cambios: Partial<Expediente>,
  usuarioEmail: string,
  observacionColegiatura?: string,
): Promise<Partial<Expediente>> {
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
  guardarExpedientesDemo(actualizados);
  return cambiosLocales;
}
