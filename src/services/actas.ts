/* COMMIT 6 (borrar después: quitar este bloque antes de git add)
 * Fabián: validar el PDF.
 * Copia los archivos de esta carpeta a las rutas src/... indicadas aquí.
 * Archivos: src/pages/ExpedienteDetallePage.tsx src/services/actas.ts.
 * Después de copiar y borrar este bloque: npm run build.
 * Confirma con tu propia cuenta: git add src/pages/ExpedienteDetallePage.tsx src/services/actas.ts && git commit -m "feat: validar formato y tamano del acta"
 */

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

