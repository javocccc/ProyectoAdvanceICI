import { Upload } from "tus-js-client";
import { deleteObject, getBlob, getDownloadURL, ref } from "firebase/storage";
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
/** Comprueba extensión, tipo, tamaño y cabecera PDF antes de enviarlo. */
export async function validarActa(archivo: File): Promise<string | null> {
  if (!/\.pdf$/i.test(archivo.name) || archivo.type !== "application/pdf")
    return "Seleccione un archivo PDF.";
  if (archivo.size === 0) return "El PDF está vacío.";
  if (archivo.size >= MAX_BYTES)
    return `El PDF debe pesar menos de ${MAX_MB} MB.`;
  if ((await archivo.slice(0, 5).text()) !== "%PDF-")
    return "El archivo no tiene un formato PDF válido.";
  return null;
}

/** Sube una copia con nombre único y comunica el avance. La ficha guarda después esta referencia en el expediente. */
export async function subirActa(
  expedienteId: string,
  archivo: File,
  alProgresar: (porcentaje: number) => void,
): Promise<Acta> {
  // En demostración solo se guarda el nombre; el PDF no va a un servidor.
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
  const objeto = `${expedienteId}/${crypto.randomUUID()}.pdf`;
  await new Promise<void>((resolve, reject) => {
    const subida = new Upload(archivo, {
      endpoint: endpointSubida(),
      retryDelays: [0, 3000, 5000, 10000],
      headers: { authorization: `Bearer ${token}` },
      metadata: {
        bucketName: bucketActas,
        objectName: objeto,
        contentType: "application/pdf",
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

/** Obtiene una URL temporal de Supabase o de un acta antigua de Firebase. */
export async function urlActa(acta: Acta): Promise<string> {
  if (acta.ruta.startsWith(PREFIJO_SUPABASE)) {
    const { data, error } = await exigirSupabase()
      .storage.from(bucketActas)
      .createSignedUrl(rutaSupabase(acta), 60);
    if (error) throw error;
    return data.signedUrl;
  }
  if (storage && acta.ruta.startsWith("actas/"))
    return getDownloadURL(ref(storage, acta.ruta));
  throw new Error("El acta de demostración no tiene un archivo persistente.");
}

/** Obtiene los bytes del PDF; la ficha crea un enlace con el nombre original. */
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
