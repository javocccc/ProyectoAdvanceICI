import type { EstadoColegiatura } from '../types/expediente';

/** Centralizamos textos y fechas para que todas las pantallas hablen igual. */
export const etiquetaColegiatura: Record<EstadoColegiatura, string> = {
  'al-dia': 'Al día',
  'no-al-dia': 'No al día',
  'sin-informar': 'Sin informar'
};

export function formatearFecha(iso: string): string {
  if (!iso) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso));
}
