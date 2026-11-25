import { Upload } from "tus-js-client";
import { deleteObject, getBlob, ref } from "firebase/storage";
import type { Acta } from "../types/expediente";
import { auth, storage } from "./firebase";
import {
  bucketActas,
  endpointSubida,
  exigirSupabase,
  tokenFirebaseParaActas,
} from "./supabase";

const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const PREFIJO_SUPABASE = "supabase/";

// La ficha llama a estas funciones; el servicio no decide cuándo mostrar
// confirmaciones ni guarda por sí solo la ruta del acta en Firestore.
/** Acepta cualquier formato; conserva límites de nombre y tamaño. */
export async function validarActa(archivo: File): Promise<string | null> {
  if (!archivo.name.trim() || [".", ".."].includes(archivo.name) || archivo.name.length > 200 || /[\/\\\x00-\x1f\x7f]/.test(archivo.name))
    return "El nombre del archivo debe tener entre 1 y 200 caracteres y no incluir carpetas ni caracteres de control.";
  if (archivo.size === 0) return "El archivo está vacío.";
  if (archivo.size >= MAX_BYTES) return `El archivo debe pesar menos de ${MAX_MB} MB.`;
  return null;
}

/** Sube una copia con nombre único y comunica el avance. La ficha guarda después esta referencia en el expediente. */
export async function subirActa(
  expedienteId: string,
  archivo: File,
  alProgresar: (porcentaje: number) => void,
): Promise<Acta> {
  const error = await validarActa(archivo);
  if (error) throw new Error(error);
  if (!expedienteId || /[\/\\\x00-\x1f]/.test(expedienteId)) throw new Error("El expediente no es válido.");
  // En demostración solo se guarda el nombre; el archivo no va a un servidor.
  if (!auth) {
    alProgresar(100);
    return {
      nombre: archivo.name,
      ruta: "demo/no-disponible",
      fechaCarga: new Date().toISOString(),
    };
  }
  exigirSupabase();
  const token = await tokenFirebaseParaActas();
  const punto = archivo.name.lastIndexOf(".");
  const extension = punto > 0 ? archivo.name.slice(punto) : "";
  const objeto = `${expedienteId}/${crypto.randomUUID()}${extension}`;
  await new Promise<void>((resolve, reject) => {
    const subida = new Upload(archivo, {
      endpoint: endpointSubida(),
      retryDelays: [0, 3000, 5000, 10000],
      headers: { authorization: `Bearer ${token}` },
      metadata: {
        bucketName: bucketActas,
        objectName: objeto,
        contentType: archivo.type || "application/octet-stream",
      },
      chunkSize: 6 * 1024 * 1024,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      onProgress: (enviados, total) => {
        if (total > 0) alProgresar(Math.min(99, Math.round((enviados / total) * 100)));
      },
      onSuccess: () => {
        alProgresar(100);
        resolve();
      },
      onError: reject,
    });
    subida.start();
  });
  return {
    nombre: archivo.name,
    ruta: `${PREFIJO_SUPABASE}${objeto}`,
    fechaCarga: new Date().toISOString(),
  };
}

function rutaSupabase(acta: Acta): string {
  return acta.ruta.slice(PREFIJO_SUPABASE.length);
}

/** Obtiene los bytes del archivo; la ficha crea un enlace con el nombre original. */
export async function blobActa(acta: Acta): Promise<Blob> {
  if (acta.ruta.startsWith(PREFIJO_SUPABASE)) {
    const { data, error } = await exigirSupabase()
      .storage.from(bucketActas)
      .download(rutaSupabase(acta));
    if (error) throw error;
    return data;
  }
  if (storage && acta.ruta.startsWith("actas/"))
    return getBlob(ref(storage, acta.ruta));
  throw new Error("El acta de demostración no tiene un archivo persistente.");
}

/** Borra una copia de Storage al reemplazarla o al fallar el guardado de su ruta. */
export async function borrarActa(acta: Acta): Promise<void> {
  if (acta.ruta.startsWith(PREFIJO_SUPABASE)) {
    const { error } = await exigirSupabase()
      .storage.from(bucketActas)
      .remove([rutaSupabase(acta)]);
    if (error) throw error;
  } else if (storage && acta.ruta.startsWith("actas/")) {
    await deleteObject(ref(storage, acta.ruta));
  }
}
