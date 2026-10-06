import {
  deleteObject,
  getBlob,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import type { Acta } from "../types/expediente";
import { storage } from "./firebase";

const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;

// La ficha llama a estas funciones; el servicio no decide cuándo mostrar
// confirmaciones ni guarda por sí solo la ruta del acta en Firestore.
/** Comprueba extensión, tipo, tamaño y cabecera PDF antes de enviarlo. Storage repite las comprobaciones de tipo y tamaño. */
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
  if (!storage) {
    alProgresar(100);
    return {
      nombre: archivo.name,
      ruta: "demo/no-disponible",
      fechaCarga: new Date().toISOString(),
    };
  }
  const ruta = `actas/${expedienteId}/${crypto.randomUUID()}.pdf`;
  const tarea = uploadBytesResumable(ref(storage, ruta), archivo, {
    contentType: "application/pdf",
  });
  // Firebase informa bytes enviados. Convertimos ese dato a un porcentaje
  // para la barra de progreso que muestra ExpedienteDetallePage.
  await new Promise<void>((resolve, reject) => {
    tarea.on(
      "state_changed",
      (estado) => {
        alProgresar(
          Math.round((estado.bytesTransferred / estado.totalBytes) * 100),
        );
      },
      reject,
      resolve,
    );
  });
  return { nombre: archivo.name, ruta, fechaCarga: new Date().toISOString() };
}

/** Obtiene una URL de descarga de Storage para abrir el PDF en otra pestaña. */
export async function urlActa(acta: Acta): Promise<string> {
  if (!storage)
    throw new Error("El acta de demostración no está respaldada en Firebase.");
  return getDownloadURL(ref(storage, acta.ruta));
}

/** Obtiene los bytes del PDF; la ficha crea un enlace con el nombre original. */
export async function blobActa(acta: Acta): Promise<Blob> {
  if (!storage)
    throw new Error("El acta de demostración no está respaldada en Firebase.");
  return getBlob(ref(storage, acta.ruta));
}

/** Borra una copia de Storage al reemplazarla o al fallar el guardado de su ruta. */
export async function borrarActa(acta: Acta): Promise<void> {
  if (storage && acta.ruta.startsWith("actas/"))
    await deleteObject(ref(storage, acta.ruta));
}
