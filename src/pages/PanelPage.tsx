import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "../components/Icon";
import { ExpedientesTable } from "../components/ExpedientesTable";
import {
  obtenerResumenExpedientes,
  type ResumenExpedientes,
} from "../services/expedientes";

interface PanelProps {
  alBuscar: (texto: string) => void;
  alAbrir: (id: string) => void;
  alEditar: (id: string) => void;
  alNuevo: () => void;
  alVerTodos: () => void;
}

export function PanelPage({
  alBuscar,
  alAbrir,
  alEditar,
  alNuevo,
  alVerTodos,
}: PanelProps) {
  const [texto, setTexto] = useState("");
  const [resumen, setResumen] = useState<ResumenExpedientes | null>(null);
  const [errorResumen, setErrorResumen] = useState("");

  useEffect(() => {
    let vigente = true;
    obtenerResumenExpedientes()
      .then((datos) => {
        if (vigente) {
          setResumen(datos);
          setErrorResumen("");
        }
      })
      .catch(() => {
        if (vigente) {
          setErrorResumen("No fue posible cargar el resumen de expedientes.");
        }
      });
    return () => {
      vigente = false;
    };
  }, []);

  /** Entrega el texto a App, que abre la lista con esa búsqueda inicial. */
  function buscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    alBuscar(texto);
  }
  const total = resumen?.total ?? 0;
  const pendientesPago = resumen?.pendientesColegiatura ?? 0;
  const sinActa = resumen?.pendientesActa ?? 0;

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="section-context">Proceso de titulación</p>
          <h1>Vista general</h1>
          <p>El estado de los expedientes, en un solo lugar.</p>
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={alNuevo}
        >
          <Icon name="plus" size={19} /> Nuevo expediente
        </button>
      </div>

      <section className="overview-intro" aria-label="Resumen de expedientes">
        {errorResumen && (
          <p className="data-error" role="alert">{errorResumen}</p>
        )}
        {!resumen && !errorResumen && (
          <p className="content-loading">Cargando resumen…</p>
        )}
        <div className="overview-statement">
          <span className="statement-line" />
          <p>
            Hay <strong>{pendientesPago} expedientes</strong> que
            necesitan revisar su colegiatura antes de continuar.
          </p>
          <button type="button" onClick={alVerTodos}>
            Revisar expedientes <Icon name="arrow" size={18} />
          </button>
        </div>
        <div className="overview-figures">
          <div>
            <span>Total expedientes</span>
            <strong>{String(total).padStart(2, "0")}</strong>
          </div>
          <div>
            <span>Colegiatura pendiente</span>
            <strong>{String(pendientesPago).padStart(2, "0")}</strong>
          </div>
          <div>
            <span>Actas pendientes</span>
            <strong>{String(sinActa).padStart(2, "0")}</strong>
          </div>
        </div>
      </section>

      <div className="content-columns">
        <div className="main-column">
          <section className="search-section" aria-labelledby="search-title">
            <div className="section-heading">
              <div>
                <h2 id="search-title">Encuentre un expediente</h2>
                <p>Busque por nombre o RUT.</p>
              </div>
            </div>
            <form className="search-form" onSubmit={buscar}>
              <Icon name="search" size={21} />
              <input
                aria-label="Buscar por nombre o RUT"
                placeholder="Escriba el nombre o RUT del estudiante"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
              />
              <button type="submit">
                Buscar <Icon name="arrow" size={17} />
              </button>
            </form>
          </section>

          <section className="recent-section" aria-labelledby="recent-title">
            <div className="section-heading">
              <div>
                <h2 id="recent-title">Expedientes recientes</h2>
                <p>Los últimos registros del programa.</p>
              </div>
              <button
                className="text-action"
                type="button"
                onClick={alVerTodos}
              >
                Ver todos <Icon name="arrow" size={17} />
              </button>
            </div>
            <ExpedientesTable
              expedientes={resumen?.recientes ?? []}
              alAbrir={alAbrir}
              alEditar={alEditar}
            />
          </section>
        </div>
        <aside className="side-column" aria-labelledby="attention-title">
          <div className="attention-heading">
            <span className="attention-icon">
              <Icon name="clock" size={21} />
            </span>
            <h2 id="attention-title">Requieren atención</h2>
          </div>
          <p className="attention-copy">
            Revise estos registros para mantener el proceso al día.
          </p>
          <div className="attention-list">
            <div className="attention-item">
              <span className="attention-count">
                {String(pendientesPago).padStart(2, "0")}
              </span>
              <div>
                <strong>Colegiatura por revisar</strong>
                <p>Alumnos sin confirmar o con pago pendiente.</p>
              </div>
            </div>
            <div className="attention-item">
              <span className="attention-count">
                {String(sinActa).padStart(2, "0")}
              </span>
              <div>
                <strong>Actas por adjuntar</strong>
                <p>Expedientes sin respaldo documental.</p>
              </div>
            </div>
          </div>
          <button type="button" className="attention-link" onClick={alVerTodos}>
            Ir a expedientes <Icon name="chevron" size={18} />
          </button>
        </aside>
      </div>
    </>
  );
}
