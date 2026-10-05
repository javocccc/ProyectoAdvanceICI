import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { EstadoBadge } from "../components/EstadoBadge";
import { Icon } from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import { actualizarExpediente } from "../services/expedientes";
import type { Expediente, EstadoColegiatura } from "../types/expediente";
import { formatearFecha } from "../utils/formato";

interface DetalleProps {
  expediente: Expediente;
  alVolver: () => void;
}

export function ExpedienteDetallePage({ expediente, alVolver }: DetalleProps) {
  const [actual, setActual] = useState(expediente);
  const [estado, setEstado] = useState<EstadoColegiatura>(expediente.colegiatura);
  const [observacion, setObservacion] = useState("");
  const [guardandoEstado, setGuardandoEstado] = useState(false);
  const [errorEstado, setErrorEstado] = useState("");
  const { usuario } = useAuth();

  useEffect(() => {
    setActual(expediente);
    setEstado(expediente.colegiatura);
    setObservacion("");
    setErrorEstado("");
  }, [expediente]);

  /** Guarda el estado de colegiatura elegido por Dirección. */
  async function guardarColegiatura(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!usuario || guardandoEstado || estado === actual.colegiatura) return;

    setGuardandoEstado(true);
    setErrorEstado("");

    const fecha = new Date().toISOString();
    const observacionLimpia = observacion.trim();
    // Conserva los cambios previos y agrega la observación solo si tiene contenido.
    const historial = [
      ...actual.historialColegiatura,
      {
        estadoAnterior: actual.colegiatura,
        estadoNuevo: estado,
        fecha,
        usuario: usuario.email,
        ...(observacionLimpia ? { observacion: observacionLimpia } : {}),
      },
    ];

    try {
      await actualizarExpediente(actual.id, {
        colegiatura: estado,
        fechaColegiatura: fecha,
        historialColegiatura: historial,
      });

      setActual((previo) => ({
        ...previo,
        colegiatura: estado,
        fechaColegiatura: fecha,
        historialColegiatura: historial,
      }));
      setObservacion("");
    } catch {
      setErrorEstado("No se pudo guardar la colegiatura. Inténtelo nuevamente.");
    } finally {
      setGuardandoEstado(false);
    }
  }

  return (
    <>
      <button className="back-link" type="button" onClick={alVolver}>
        <Icon name="arrow" size={17} /> Volver a expedientes
      </button>

      <div className="page-heading detail-heading">
        <div>
          <p className="section-context">Expediente de titulación</p>
          <h1>{actual.nombre}</h1>
          <p>
            RUT {actual.rut} · Egreso {actual.anioEgreso}
          </p>
        </div>
        <EstadoBadge estado={actual.colegiatura} />
      </div>

      <div className="detail-grid">
        <section className="detail-section">
          <h2>Datos académicos</h2>
          <dl>
            <div>
              <dt>Año y semestre de egreso</dt>
              <dd>
                {actual.anioEgreso} · {actual.semestreEgreso}º semestre
              </dd>
            </div>
            <div>
              <dt>Fecha del examen</dt>
              <dd>{formatearFecha(actual.fechaExamen)}</dd>
            </div>
            <div>
              <dt>Nota del examen</dt>
              <dd>{actual.notaExamen?.toFixed(1) ?? "Sin registrar"}</dd>
            </div>
            <div>
              <dt>Profesor guía</dt>
              <dd>{actual.comision?.guia ?? "Sin registrar"}</dd>
            </div>
            <div>
              <dt>Primer informante</dt>
              <dd>{actual.comision?.informante1 ?? "Sin registrar"}</dd>
            </div>
            <div>
              <dt>Segundo informante</dt>
              <dd>{actual.comision?.informante2 ?? "Sin registrar"}</dd>
            </div>
            {actual.comision?.informanteAdicional && (
              <div>
                <dt>Informante adicional</dt>
                <dd>{actual.comision.informanteAdicional}</dd>
              </div>
            )}
          </dl>
        </section>

        <div className="detail-side">
          <section className="detail-section">
            <h2>Colegiatura</h2>
            <EstadoBadge estado={actual.colegiatura} />
            <p>
              Última actualización:{" "}
              {actual.fechaColegiatura
                ? formatearFecha(actual.fechaColegiatura)
                : "Sin informar"}
            </p>

            <form onSubmit={guardarColegiatura}>
              <label htmlFor="detalle-estado">Estado de colegiatura</label>
              <select
                id="detalle-estado"
                value={estado}
                onChange={(evento) =>
                  setEstado(evento.target.value as EstadoColegiatura)
                }
              >
                <option value="sin-informar">Sin informar</option>
                <option value="al-dia">Al día</option>
                <option value="no-al-dia">No al día</option>
              </select>

              <label htmlFor="detalle-observacion">Observación</label>
              <textarea
                id="detalle-observacion"
                value={observacion}
                onChange={(evento) => setObservacion(evento.target.value)}
              />

              {errorEstado && (
                <p role="alert" className="form-error">
                  {errorEstado}
                </p>
              )}
              <button
                type="submit"
                disabled={guardandoEstado || estado === actual.colegiatura}
              >
                {guardandoEstado ? "Guardando..." : "Guardar estado"}
              </button>
            </form>

            <h3>Historial de colegiatura</h3>
            {/* Muestra un estado vacío cuando aún no hay cambios; si existen, presenta cada uno. */}
            {actual.historialColegiatura.length === 0 ? (
              <p>Sin cambios registrados.</p>
            ) : (
              <ul>
                {actual.historialColegiatura.map((cambio, indice) => (
                  <li key={indice}>
                    {cambio.estadoAnterior} → {cambio.estadoNuevo} ·{" "}
                    {formatearFecha(cambio.fecha)} · {cambio.usuario}
                    {cambio.observacion && <span> · {cambio.observacion}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="detail-section">
            <h2>Acta de examen</h2>
            <div className="document-status">
              <Icon name="file" size={21} />
              <span>
                {actual.acta?.nombre ?? "Aún no se adjunta un acta"}
              </span>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
