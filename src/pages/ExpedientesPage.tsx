import { useEffect, useState } from "react";
import { ExpedientesTable } from "../components/ExpedientesTable";
import { Icon } from "../components/Icon";
import {
  obtenerPaginaExpedientes,
  type CursorExpedientes,
  type FiltroExpedientes,
} from "../services/expedientes";
import type { Expediente } from "../types/expediente";

interface ExpedientesProps {
  busquedaInicial: string;
  alAbrir: (id: string) => void;
  alEditar: (id: string) => void;
  alNuevo: () => void;
}

export function ExpedientesPage({
  busquedaInicial,
  alAbrir,
  alEditar,
  alNuevo,
}: ExpedientesProps) {
  const [busqueda, setBusqueda] = useState(busquedaInicial);
  const [filtro, setFiltro] = useState<FiltroExpedientes>("todos");
  const [cursores, setCursores] = useState<CursorExpedientes[]>([null]);
  const [indiceCursor, setIndiceCursor] = useState(0);
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [total, setTotal] = useState(0);
  const [siguienteCursor, setSiguienteCursor] =
    useState<CursorExpedientes>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setCursores([null]);
    setIndiceCursor(0);
  }, [busqueda, filtro]);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError("");
    const espera = window.setTimeout(() => {
      void obtenerPaginaExpedientes(
        busqueda,
        filtro,
        cursores[indiceCursor] ?? null,
      )
        .then((pagina) => {
          if (!vigente) return;
          setExpedientes(pagina.expedientes);
          setTotal(pagina.total);
          setSiguienteCursor(pagina.siguienteCursor);
        })
        .catch(() => {
          if (vigente) setError("No fue posible cargar los expedientes.");
        })
        .finally(() => {
          if (vigente) setCargando(false);
        });
    }, busqueda ? 250 : 0);
    return () => {
      vigente = false;
      window.clearTimeout(espera);
    };
  }, [busqueda, filtro, cursores, indiceCursor]);

  function avanzarPagina() {
    if (!siguienteCursor) return;
    setCursores((actuales) => [...actuales.slice(0, indiceCursor + 1), siguienteCursor]);
    setIndiceCursor((actual) => actual + 1);
  }

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
            <span className="sr-only">Buscar por inicio del nombre o RUT</span>
            <input
              placeholder="Inicio del nombre o RUT (mín. 2 caracteres)"
              value={busqueda}
              maxLength={30}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </label>
          <span className="results-count" aria-live="polite">
            {total} resultado{total === 1 ? "" : "s"}
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
        {error ? (
          <p className="data-error" role="alert">{error}</p>
        ) : cargando ? (
          <div className="content-loading">Cargando expedientes…</div>
        ) : (
          <>
            <ExpedientesTable
              expedientes={expedientes}
              alAbrir={alAbrir}
              alEditar={alEditar}
            />
            <nav className="pagination" aria-label="Páginas de expedientes">
              <button
                className="button button-secondary"
                type="button"
                disabled={indiceCursor === 0 || cargando}
                onClick={() => setIndiceCursor((actual) => actual - 1)}
              >
                Anterior
              </button>
              <span>Página {indiceCursor + 1}</span>
              <button
                className="button button-secondary"
                type="button"
                disabled={!siguienteCursor || cargando}
                onClick={avanzarPagina}
              >
                Siguiente
              </button>
            </nav>
          </>
        )}
      </section>
    </>
  );
}
