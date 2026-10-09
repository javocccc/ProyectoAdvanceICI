import type { Expediente } from "../types/expediente";
import { formatearFecha } from "../utils/formato";
import { EstadoBadge } from "./EstadoBadge";
import { Icon } from "./Icon";

interface TablaProps {
  // PanelPage y ExpedientesPage entregan listas distintas a la misma tabla.
  expedientes: Expediente[];
  alAbrir: (id: string) => void;
  alEditar: (id: string) => void;
}

/** Tabla compartida por el panel y la pantalla de búsqueda. */
export function ExpedientesTable({
  expedientes,
  alAbrir,
  alEditar,
}: TablaProps) {
  // La misma tabla muestra un estado vacío si la búsqueda no encontró filas.
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
            <th aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {/* map crea una fila por expediente; key permite a React identificarla. */}
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
<<<<<<< HEAD
              <td>
                <button
                  type="button"
                  className="table-cell-link data-number"
                  onClick={() => alAbrir(item.id)}
                  aria-label={`Abrir expediente de ${item.nombre}, RUT ${item.rut}`}
                >
                  {item.rut}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  className="table-cell-link data-number"
                  onClick={() => alAbrir(item.id)}
                  aria-label={`Abrir expediente de ${item.nombre}, egreso ${item.anioEgreso}, semestre ${item.semestreEgreso}`}
                >
                  {item.anioEgreso} · {item.semestreEgreso}º
                </button>
              </td>
              <td>
                <button
                  type="button"
                  className="table-cell-link"
                  onClick={() => alAbrir(item.id)}
                  aria-label={`Abrir expediente de ${item.nombre}, colegiatura`}
                >
                  <EstadoBadge estado={item.colegiatura} />
                </button>
              </td>
              <td>
                <button
                  type="button"
                  className="table-cell-link"
                  onClick={() => alAbrir(item.id)}
                  aria-label={`Abrir expediente de ${item.nombre}, acta ${item.acta ? "disponible" : "pendiente"}`}
                >
                  {item.acta ? (
                    <span className="acta-yes">
                      <Icon name="file" size={17} /> Disponible
                    </span>
                  ) : (
                    <span className="acta-no">Pendiente</span>
                  )}
                </button>
=======
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
>>>>>>> 3fa9f830017d47936d7b6ca1c8d60e62a1506d4e
              </td>
              <td>
                <div className="row-actions">
                  <button
                    type="button"
                    className="row-edit"
                    onClick={() => alEditar(item.id)}
                    aria-label={`Editar expediente de ${item.nombre}`}
                  >
                    <Icon name="edit" size={17} />
                    <span>Editar</span>
                  </button>
                  <button
                    type="button"
                    className="row-open"
                    onClick={() => alAbrir(item.id)}
                    aria-label={`Abrir expediente de ${item.nombre}`}
                  >
                    <Icon name="chevron" size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
