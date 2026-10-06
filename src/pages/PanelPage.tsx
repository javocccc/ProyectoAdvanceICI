import { useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "../components/Icon";
import { ExpedientesTable } from "../components/ExpedientesTable";
import type { Expediente } from "../types/expediente";

interface PanelProps {
  // App entrega la lista y las acciones; el panel solo presenta un resumen.
  expedientes: Expediente[];
  alBuscar: (texto: string) => void;
  alAbrir: (id: string) => void;
  alNuevo: () => void;
  alVerTodos: () => void;
}

export function PanelPage({
  expedientes,
  alBuscar,
  alAbrir,
  alNuevo,
  alVerTodos,
}: PanelProps) {
  const [texto, setTexto] = useState("");
  // Estas cifras se calculan de la lista recibida, no se guardan por separado.
  // "Sin informar" también cuenta como pendiente de revisión.
  const pendientesPago = expedientes.filter(
    (item) =>
      item.colegiatura === "no-al-dia" || item.colegiatura === "sin-informar",
  );
  const sinActa = expedientes.filter((item) => !item.acta);
  // La copia evita alterar el orden de la lista que App comparte con otras páginas.
  const recientes = [...expedientes]
    .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion))
    .slice(0, 5);

  /** Entrega el texto a App, que abre la lista con esa búsqueda inicial. */
  function buscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    alBuscar(texto);
  }

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
        <div className="overview-statement">
          <span className="statement-line" />
          <p>
            Hay <strong>{pendientesPago.length} expedientes</strong> que
            necesitan revisar su colegiatura antes de continuar.
          </p>
          <button type="button" onClick={alVerTodos}>
            Revisar expedientes <Icon name="arrow" size={18} />
          </button>
        </div>
        <div className="overview-figures">
          <div>
            <span>Total expedientes</span>
            <strong>{String(expedientes.length).padStart(2, "0")}</strong>
          </div>
          <div>
            <span>Colegiatura pendiente</span>
            <strong>{String(pendientesPago.length).padStart(2, "0")}</strong>
          </div>
          <div>
            <span>Actas pendientes</span>
            <strong>{String(sinActa.length).padStart(2, "0")}</strong>
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
            <ExpedientesTable expedientes={recientes} alAbrir={alAbrir} />
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
                {String(pendientesPago.length).padStart(2, "0")}
              </span>
              <div>
                <strong>Colegiatura por revisar</strong>
                <p>Alumnos sin confirmar o con pago pendiente.</p>
              </div>
            </div>
            <div className="attention-item">
              <span className="attention-count">
                {String(sinActa.length).padStart(2, "0")}
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
