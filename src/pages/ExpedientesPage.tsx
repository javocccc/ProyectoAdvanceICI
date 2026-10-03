import { useMemo, useState } from "react";
import { ExpedientesTable } from "../components/ExpedientesTable";
import { Icon } from "../components/Icon";
import type { Expediente, EstadoColegiatura } from "../types/expediente";

type Filtro = "todos" | EstadoColegiatura;

interface ExpedientesProps {
  expedientes: Expediente[];
  busquedaInicial: string;
  alAbrir: (id: string) => void;
  alNuevo: () => void;
}

/** Quita tildes y diferencias entre mayúsculas para facilitar la búsqueda. */
function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function ExpedientesPage({
  expedientes,
  busquedaInicial,
  alAbrir,
  alNuevo,
}: ExpedientesProps) {
  const [busqueda, setBusqueda] = useState(busquedaInicial);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const visibles = useMemo(
    () =>
      expedientes.filter((item) => {
        const coincide = normalizar(`${item.nombre} ${item.rut}`).includes(
          normalizar(busqueda),
        );
        return coincide && (filtro === "todos" || item.colegiatura === filtro);
      }),
    [expedientes, busqueda, filtro],
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="section-context">Registro académico</p>
          <h1>Expedientes</h1>
          <p>Consulte el avance de cada estudiante.</p>
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={alNuevo}
        >
          <Icon name="plus" size={19} /> Nuevo expediente
        </button>
      </div>
      <section className="listing-panel" aria-label="Listado de expedientes">
        <div className="listing-toolbar">
          <label className="list-search">
            <Icon name="search" size={20} />
            <span className="sr-only">Buscar por nombre o RUT</span>
            <input
              placeholder="Buscar por nombre o RUT"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </label>
          <span className="results-count">
            {visibles.length} resultado{visibles.length === 1 ? "" : "s"}
          </span>
        </div>
        <div
          className="filter-row"
          role="group"
          aria-label="Filtrar por colegiatura"
        >
          {(
            [
              ["todos", "Todos"],
              ["al-dia", "Al día"],
              ["no-al-dia", "No al día"],
              ["sin-informar", "Sin informar"],
            ] as const
          ).map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              className={`filter-button ${filtro === valor ? "is-active" : ""}`}
              onClick={() => setFiltro(valor)}
              aria-pressed={filtro === valor}
            >
              {texto}
            </button>
          ))}
        </div>
        <ExpedientesTable expedientes={visibles} alAbrir={alAbrir} />
      </section>
    </>
  );
}
