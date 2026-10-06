import type { EstadoColegiatura } from "../types/expediente";

/** Asocia cada valor interno con el texto que se muestra en pantalla. */
export const etiquetaColegiatura: Record<EstadoColegiatura, string> = {
  "al-dia": "Al día",
  "no-al-dia": "No al día",
  "sin-informar": "Sin informar",
};

/** Da formato chileno a fechas ISO; UTC evita cambiar el día por la zona horaria. */
export function formatearFecha(iso: string): string {
  if (!iso) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}
