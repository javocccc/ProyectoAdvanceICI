import type { EstadoColegiatura } from "../types/expediente";
import { etiquetaColegiatura } from "../utils/formato";

/** Presenta el estado con texto y color en panel, lista y ficha. */
export function EstadoBadge({ estado }: { estado: EstadoColegiatura }) {
  return (
    <span className={`estado estado-${estado}`}>
      <span className="estado-dot" />
      {etiquetaColegiatura[estado]}
    </span>
  );
}
