import { useEffect, useState } from "react";
import type { ChangeEvent, DragEvent, FormEvent } from "react";
import { EstadoBadge } from "../components/EstadoBadge";
import { Icon } from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import { subirActa, validarActa } from "../services/actas";
import { actualizarExpediente } from "../services/expedientes";
import type { Expediente, EstadoColegiatura } from "../types/expediente";
import { formatearFecha } from "../utils/formato";

interface DetalleProps {
  expediente: Expediente;
  alVolver: () => void;
}

export function ExpedienteDetallePage({ expediente, alVolver }: DetalleProps) {
  const [actual, setActual] = useState(expediente);
  const [estado, setEstado] = useState<EstadoColegiatura>(
    expediente.colegiatura,
  );
  const [observacion, setObservacion] = useState("");
  const [guardandoEstado, setGuardandoEstado] = useState(false);
  const [errorEstado, setErrorEstado] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorActa, setErrorActa] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const { usuario } = useAuth();

  useEffect(() => {
    // Al cambiar de ficha, descarta los datos temporales del formulario y del acta.
    setActual(expediente);
    setEstado(expediente.colegiatura);
    setObservacion("");
    setErrorEstado("");
    setArchivo(null);
    setErrorActa("");
  }, [expediente]);

  /** Guarda el estado de colegiatura elegido por Dirección. */
  async function guardarColegiatura(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!usuario || guardandoEstado || estado === actual.colegiatura) return;

    setGuardandoEstado(true);
    setErrorEstado("");

    const fecha = new Date().toISOString();
    const observacionLimpia = observacion.trim();
    // Cada entrada conserva el historial y registra quién, cuándo y qué estado cambió.
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

  /** Actualiza el archivo elegido desde el explorador o la zona de arrastre. */
  function elegirArchivo(nuevo: File | null) {
    setArchivo(nuevo);
    setErrorActa("");
  }

  function soltarArchivo(evento: DragEvent<HTMLLabelElement>) {
    evento.preventDefault();
    // Usa el primer archivo soltado, igual que el selector de archivos.
    elegirArchivo(evento.dataTransfer.files[0] ?? null);
  }

  /** Valida el PDF seleccionado antes de permitir su subida. */
  async function comprobarArchivo() {
    if (!archivo) return;
    setErrorActa((await validarActa(archivo)) ?? "PDF válido para subir.");
  }

  /** Sube el archivo y guarda su referencia en el expediente. */
  async function guardarArchivo() {
    if (!archivo || subiendo) return;

    const expedienteId = actual.id;
    const archivoSeleccionado = archivo;
    const error = await validarActa(archivoSeleccionado);
    if (error) {
      setErrorActa(error);
      return;
    }

    setSubiendo(true);
    setProgreso(0);
    setErrorActa("");

    try {
      const acta = await subirActa(
        expedienteId,
        archivoSeleccionado,
        setProgreso,
      );
      await actualizarExpediente(expedienteId, { acta });
      // Evita aplicar el resultado de una subida anterior a otra ficha abierta.
      setActual((previo) =>
        previo.id === expedienteId ? { ...previo, acta } : previo,
      );
      setArchivo((previo) =>
        previo === archivoSeleccionado ? null : previo,
      );
    } catch {
      setErrorActa("No se pudo guardar el acta. Revise la conexión.");
    } finally {
      setSubiendo(false);
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

            {actual.colegiatura === "no-al-dia" && (
              <p role="alert" className="form-error">
                Pago de colegiatura pendiente: verificar antes de continuar.
              </p>
            )}

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
            {/* Si no hay cambios, muestra un estado vacío en vez de una lista sin elementos. */}
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

            <label
              className="acta-dropzone"
              onDragOver={(evento) => evento.preventDefault()}
              onDrop={soltarArchivo}
            >
              <span>Seleccione o arrastre un PDF</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(evento: ChangeEvent<HTMLInputElement>) =>
                  elegirArchivo(evento.target.files?.[0] ?? null)
                }
              />
            </label>
            {archivo && <p>Seleccionado: {archivo.name}</p>}
            <p role="status">{errorActa}</p>
            <button
              type="button"
              disabled={!archivo || subiendo}
              onClick={comprobarArchivo}
            >
              Validar PDF
            </button>
            <button
              type="button"
              disabled={!archivo || subiendo}
              onClick={guardarArchivo}
            >
              {subiendo ? "Subiendo..." : "Guardar acta"}
            </button>
            <progress
              value={progreso}
              max={100}
              aria-label="Progreso de subida"
            />
          </section>
        </div>
      </div>
    </>
  );
}
