import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import {
  describirCambioAuditable,
  esRutDuplicado,
  generarTokensBusqueda,
  normalizarRut,
  validarRut,
} from "./domain";

initializeApp();
setGlobalOptions({ region: "us-central1" });

const db = getFirestore();
const ESTADOS_COLEGIATURA = ["al-dia", "no-al-dia", "sin-informar"] as const;

interface Acta {
  nombre: string;
  ruta: string;
  fechaCarga: string;
}

interface RegistroAuditoria {
  fecha: string;
  usuario: string;
  usuarioId: string;
  accion: string;
  detalles: string;
  valores?: Record<string, { anterior: unknown; nuevo: unknown }>;
}

interface ExpedienteData {
  [campo: string]: unknown;
  id: string;
  fechaCreacion: string;
  creadoPor: string;
  historialColegiatura: Record<string, unknown>[];
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function exigirTexto(
  valor: unknown,
  campo: string,
  maximo = 200,
): string {
  if (
    typeof valor !== "string" ||
    !valor.trim() ||
    valor.trim().length > maximo
  ) {
    throw new HttpsError("invalid-argument", `El campo ${campo} no es válido.`);
  }
  return valor.trim();
}

function validarComision(valor: unknown): Record<string, unknown> {
  if (!esObjeto(valor)) {
    throw new HttpsError("invalid-argument", "La comisión no es válida.");
  }
  const comision: Record<string, unknown> = {
    guia: exigirTexto(valor.guia, "guía"),
    informante1: exigirTexto(valor.informante1, "primer informante"),
    informante2: exigirTexto(valor.informante2, "segundo informante"),
  };
  if (valor.informanteAdicional !== undefined) {
    comision.informanteAdicional = exigirTexto(
      valor.informanteAdicional,
      "informante adicional",
    );
  }
  return comision;
}

function validarActa(valor: unknown, expedienteId: string): Acta {
  if (!esObjeto(valor)) {
    throw new HttpsError("invalid-argument", "La referencia del acta no es válida.");
  }
  const acta: Acta = {
    nombre: exigirTexto(valor.nombre, "nombre del acta"),
    ruta: exigirTexto(valor.ruta, "ruta del acta", 500),
    fechaCarga: exigirTexto(valor.fechaCarga, "fecha de carga", 50),
  };
  if (!acta.ruta.startsWith(`actas/${expedienteId}/`)) {
    throw new HttpsError("invalid-argument", "La ruta del acta no corresponde al expediente.");
  }
  return acta;
}

async function exigirDireccion(uid: string): Promise<void> {
  const usuario = await db.collection("usuarios").doc(uid).get();
  if (usuario.data()?.rol !== "direccion") {
    throw new HttpsError("permission-denied", "Se requiere el rol de Dirección.");
  }
}

function actor(request: { auth?: { uid: string; token: Record<string, unknown> } }) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debe iniciar sesión.");
  }
  return {
    uid: request.auth.uid,
    email:
      typeof request.auth.token.email === "string"
        ? request.auth.token.email
        : request.auth.uid,
  };
}

function crearRegistroAuditoria(
  usuario: { uid: string; email: string },
  accion: string,
  detalles: string,
): RegistroAuditoria {
  return {
    fecha: new Date().toISOString(),
    usuario: usuario.email,
    usuarioId: usuario.uid,
    accion,
    detalles,
  };
}

function validarDatosNuevo(valor: unknown): Record<string, unknown> {
  if (!esObjeto(valor)) {
    throw new HttpsError("invalid-argument", "Los datos del expediente no son válidos.");
  }
  const rut = exigirTexto(valor.rut, "RUT", 20);
  const anio = valor.anioEgreso;
  const semestre = valor.semestreEgreso;
  const nota = valor.notaExamen;
  const fechaExamen = exigirTexto(valor.fechaExamen, "fecha de examen", 10);
  if (!validarRut(rut)) {
    throw new HttpsError("invalid-argument", "El RUT no tiene un formato válido.");
  }
  if (
    !Number.isInteger(anio) ||
    (anio as number) < 2000 ||
    (anio as number) >= new Date().getFullYear()
  ) {
    throw new HttpsError("invalid-argument", "El año de egreso no es válido.");
  }
  if (semestre !== 1 && semestre !== 2) {
    throw new HttpsError("invalid-argument", "El semestre no es válido.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaExamen)) {
    throw new HttpsError("invalid-argument", "La fecha de examen no es válida.");
  }
  if (
    nota !== undefined &&
    (typeof nota !== "number" || !Number.isFinite(nota) || nota < 1 || nota > 7)
  ) {
    throw new HttpsError("invalid-argument", "La nota de examen no es válida.");
  }
  const colegiatura = valor.colegiatura ?? "sin-informar";
  if (!ESTADOS_COLEGIATURA.includes(colegiatura as (typeof ESTADOS_COLEGIATURA)[number])) {
    throw new HttpsError("invalid-argument", "El estado de colegiatura no es válido.");
  }
  return {
    nombre: exigirTexto(valor.nombre, "nombre"),
    rut,
    anioEgreso: anio,
    semestreEgreso: semestre,
    fechaExamen,
    ...(nota === undefined ? {} : { notaExamen: nota }),
    comision: validarComision(valor.comision),
    colegiatura,
  };
}

const CAMPOS_EDITABLES = new Set([
  "nombre",
  "rut",
  "anioEgreso",
  "semestreEgreso",
  "fechaExamen",
  "notaExamen",
  "comision",
  "colegiatura",
  "acta",
]);

function validarCambios(
  valor: unknown,
  expedienteId: string,
): Record<string, unknown> {
  if (!esObjeto(valor)) {
    throw new HttpsError("invalid-argument", "Los cambios no son válidos.");
  }
  const cambios: Record<string, unknown> = {};
  for (const [campo, dato] of Object.entries(valor)) {
    if (!CAMPOS_EDITABLES.has(campo)) {
      throw new HttpsError("invalid-argument", `No se permite modificar ${campo}.`);
    }
    switch (campo) {
      case "nombre":
        cambios.nombre = exigirTexto(dato, campo);
        break;
      case "rut": {
        const rut = exigirTexto(dato, campo, 20);
        if (!validarRut(rut)) {
          throw new HttpsError("invalid-argument", "El RUT no tiene un formato válido.");
        }
        cambios.rut = rut;
        break;
      }
      case "anioEgreso":
        if (
          !Number.isInteger(dato) ||
          (dato as number) < 2000 ||
          (dato as number) >= new Date().getFullYear()
        ) {
          throw new HttpsError("invalid-argument", "El año de egreso no es válido.");
        }
        cambios.anioEgreso = dato;
        break;
      case "semestreEgreso":
        if (dato !== 1 && dato !== 2) {
          throw new HttpsError("invalid-argument", "El semestre no es válido.");
        }
        cambios.semestreEgreso = dato;
        break;
      case "fechaExamen":
        cambios.fechaExamen = exigirTexto(dato, campo, 10);
        break;
      case "notaExamen":
        if (
          typeof dato !== "number" ||
          !Number.isFinite(dato) ||
          dato < 1 ||
          dato > 7
        ) {
          throw new HttpsError("invalid-argument", "La nota de examen no es válida.");
        }
        cambios.notaExamen = dato;
        break;
      case "comision":
        cambios.comision = validarComision(dato);
        break;
      case "colegiatura":
        if (!ESTADOS_COLEGIATURA.includes(dato as (typeof ESTADOS_COLEGIATURA)[number])) {
          throw new HttpsError("invalid-argument", "El estado de colegiatura no es válido.");
        }
        cambios.colegiatura = dato;
        break;
      case "acta":
        cambios.acta = validarActa(dato, expedienteId);
        break;
    }
  }
  if (Object.keys(cambios).length === 0) {
    throw new HttpsError("invalid-argument", "No se recibieron cambios.");
  }
  return cambios;
}

export const crearExpediente = onCall(async (request) => {
  const usuario = actor(request);
  await exigirDireccion(usuario.uid);
  const datos = validarDatosNuevo(request.data?.expediente);
  const rutNormalizado = normalizarRut(exigirTexto(datos.rut, "RUT", 20));
  const expedienteRef = db.collection("expedientes").doc();
  const auditoriaRef = expedienteRef.collection("auditoria").doc();
  const rutRef = db.collection("rutIndex").doc(rutNormalizado);

  const expediente: ExpedienteData = {
    ...datos,
    id: expedienteRef.id,
    fechaCreacion: new Date().toISOString(),
    creadoPor: usuario.email,
    historialColegiatura: [],
    rutNormalizado,
    busquedaTokens: generarTokensBusqueda(
      datos.nombre as string,
      datos.rut as string,
    ),
    actaPendiente: true,
  };
  await db.runTransaction(async (transaccion) => {
    const indice = await transaccion.get(rutRef);
    if (
      esRutDuplicado(
        rutNormalizado,
        [],
        indice.data()?.expedienteId,
      )
    ) {
      throw new HttpsError(
        "already-exists",
        "Ya existe un expediente con ese RUT.",
      );
    }
    transaccion.create(rutRef, { expedienteId: expedienteRef.id });
    transaccion.create(expedienteRef, expediente);
    transaccion.create(
      auditoriaRef,
      crearRegistroAuditoria(usuario, "Creación de expediente", "Expediente creado."),
    );
  });
  return expediente;
});

export const actualizarExpediente = onCall(async (request) => {
  const usuario = actor(request);
  await exigirDireccion(usuario.uid);
  const id = exigirTexto(request.data?.id, "identificador", 100);
  const cambios = validarCambios(request.data?.cambios, id);
  const observacion = request.data?.observacionColegiatura;
  if (observacion !== undefined && typeof observacion !== "string") {
    throw new HttpsError("invalid-argument", "La observación no es válida.");
  }
  if (typeof observacion === "string" && observacion.trim().length > 2000) {
    throw new HttpsError("invalid-argument", "La observación supera el límite permitido.");
  }

  const expedienteRef = db.collection("expedientes").doc(id);
  const auditoriaRef = expedienteRef.collection("auditoria").doc();
  const fecha = new Date().toISOString();
  const registrado = await db.runTransaction(async (transaccion) => {
    const instantanea = await transaccion.get(expedienteRef);
    if (!instantanea.exists) {
      throw new HttpsError("not-found", "No se encontró el expediente.");
    }
    const actual = instantanea.data() ?? {};
    const nuevosCambios = { ...cambios };
    if (typeof nuevosCambios.rut === "string") {
      const rutNuevo = normalizarRut(nuevosCambios.rut);
      const rutAnterior =
        typeof actual.rutNormalizado === "string"
          ? actual.rutNormalizado
          : typeof actual.rut === "string"
            ? normalizarRut(actual.rut)
            : "";
      nuevosCambios.rutNormalizado = rutNuevo;
      if (rutNuevo !== rutAnterior) {
        const nuevoIndiceRef = db.collection("rutIndex").doc(rutNuevo);
        const indiceAnteriorRef = rutAnterior
          ? db.collection("rutIndex").doc(rutAnterior)
          : null;
        const [nuevoIndice, indiceAnterior] = await Promise.all([
          transaccion.get(nuevoIndiceRef),
          indiceAnteriorRef
            ? transaccion.get(indiceAnteriorRef)
            : Promise.resolve(null),
        ]);
        const propietarioNuevo = nuevoIndice.data()?.expedienteId;
        if (
          esRutDuplicado(rutNuevo, [], propietarioNuevo, id)
        ) {
          throw new HttpsError(
            "already-exists",
            "Ya existe otro expediente con ese RUT.",
          );
        }
        if (!nuevoIndice.exists) {
          transaccion.create(nuevoIndiceRef, { expedienteId: id });
        }
        if (
          indiceAnteriorRef &&
          indiceAnterior?.data()?.expedienteId === id
        ) {
          transaccion.delete(indiceAnteriorRef);
        }
      }
      if (typeof nuevosCambios.nombre === "string") {
        const rutActual =
          typeof nuevosCambios.rut === "string"
            ? nuevosCambios.rut
            : typeof actual.rut === "string"
              ? actual.rut
              : "";
        nuevosCambios.busquedaTokens = generarTokensBusqueda(
          nuevosCambios.nombre,
          rutActual,
        );
      }
      if (typeof nuevosCambios.rut === "string") {
        const nombreActual =
          typeof nuevosCambios.nombre === "string"
            ? nuevosCambios.nombre
            : typeof actual.nombre === "string"
              ? actual.nombre
              : "";
        nuevosCambios.busquedaTokens = generarTokensBusqueda(
          nombreActual,
          nuevosCambios.rut,
        );
      }
      if (nuevosCambios.acta !== undefined) {
        nuevosCambios.actaPendiente = false;
      }
    }

    let historialColegiatura = Array.isArray(actual.historialColegiatura)
      ? [...actual.historialColegiatura]
      : [];
    if (
      typeof nuevosCambios.colegiatura === "string" &&
      nuevosCambios.colegiatura !== actual.colegiatura
    ) {
      nuevosCambios.fechaColegiatura = fecha;
      historialColegiatura.push({
        estadoAnterior: actual.colegiatura ?? "sin-informar",
        estadoNuevo: nuevosCambios.colegiatura,
        fecha,
        usuario: usuario.email,
        ...(typeof observacion === "string" && observacion.trim()
          ? { observacion: observacion.trim() }
          : {}),
      });
      nuevosCambios.historialColegiatura = historialColegiatura;
    } else if (nuevosCambios.colegiatura !== undefined) {
      delete nuevosCambios.colegiatura;
    }

    const campos = Object.keys(nuevosCambios);
    if (campos.length === 0) {
      throw new HttpsError("invalid-argument", "No hay cambios para guardar.");
    }
    const auditoriaCambio = describirCambioAuditable(actual, nuevosCambios);
    transaccion.update(expedienteRef, nuevosCambios);
    transaccion.create(
      auditoriaRef,
      {
        ...crearRegistroAuditoria(
          usuario,
          auditoriaCambio.accion,
          auditoriaCambio.detalles,
        ),
        valores: auditoriaCambio.valores,
      },
    );
    return nuevosCambios;
  });
  return registrado;
});
