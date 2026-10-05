/* COMMIT 7 (borrar después: quitar este bloque antes de git add)
 * Fabián: subir el acta con progreso.
 * Copia los archivos de esta carpeta a las rutas src/... indicadas aquí.
 * Archivos: src/pages/ExpedienteDetallePage.tsx src/services/actas.ts.
 * Después de copiar y borrar este bloque: npm run build.
 * Confirma con tu propia cuenta: git add src/pages/ExpedienteDetallePage.tsx src/services/actas.ts && git commit -m "feat: subir acta con progreso"
 */

import { ref, uploadBytesResumable } from "firebase/storage";
import type { Acta } from "../types/expediente";
import { storage } from "./firebase";

const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;

/** Comprueba extensión, tipo, tamaño y firma antes de enviar el archivo. */
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

/** Sube una copia con nombre único y comunica el avance a la interfaz. */
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

