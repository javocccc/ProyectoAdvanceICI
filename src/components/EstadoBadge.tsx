import type { EstadoColegiatura } from '../types/expediente';
import { etiquetaColegiatura } from '../utils/formato';

export function EstadoBadge({ estado }: { estado: EstadoColegiatura }) {
  return <span className={`estado estado-${estado}`}><span className="estado-dot" />{etiquetaColegiatura[estado]}</span>;
}
