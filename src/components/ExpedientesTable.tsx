import type { Expediente } from "../types/expediente";
import { formatearFecha } from "../utils/formato";
import { EstadoBadge } from "./EstadoBadge";
import { Icon } from "./Icon";

interface TablaProps {
  expedientes: Expediente[];
  alAbrir: (id: string) => void;
}

/** Tabla compartida por el panel y la pantalla de búsqueda. */
export function ExpedientesTable({ expedientes, alAbrir }: TablaProps) {
  if (expedientes.length === 0)
    return (
      <div className="empty-state">
        <Icon name="search" size={27} />
        <strong>No se encontraron expedientes</strong>
        <span>Pruebe con otro nombre o RUT.</span>
      </div>
    );
  return (
    <div className="table-scroll">
      <table className="expedientes-table">
        <thead>
          <tr>
            <th>Estudiante</th>
            <th>RUT</th>
            <th>Egreso</th>
            <th>Colegiatura</th>
            <th>Acta</th>
            <th aria-label="Abrir expediente" />
          </tr>
        </thead>
        <tbody>
          {expedientes.map((item) => (
            <tr key={item.id}>
              <td>
                <button
                  type="button"
                  className="student-link"
                  onClick={() => alAbrir(item.id)}
                >
                  <span className="student-avatar" aria-hidden="true">
                    {item.nombre
                      .split(" ")
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")}
                  </span>
                  <span>
                    <strong>{item.nombre}</strong>
                    <small>Examen {formatearFecha(item.fechaExamen)}</small>
                  </span>
                </button>
              </td>
              <td className="data-number">{item.rut}</td>
              <td className="data-number">
                {item.anioEgreso} · {item.semestreEgreso}º
              </td>
              <td>
                <EstadoBadge estado={item.colegiatura} />
              </td>
              <td>
                {item.acta ? (
                  <span className="acta-yes">
                    <Icon name="file" size={17} /> Disponible
                  </span>
                ) : (
                  <span className="acta-no">Pendiente</span>
                )}
              </td>
              <td>
                <button
                  type="button"
                  className="row-open"
                  onClick={() => alAbrir(item.id)}
                  aria-label={`Abrir expediente de ${item.nombre}`}
                >
                  <Icon name="chevron" size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
