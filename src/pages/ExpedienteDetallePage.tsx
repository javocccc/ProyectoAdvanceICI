import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, FormEvent } from "react";
import { EstadoBadge } from "../components/EstadoBadge";
import { Icon } from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import {
  borrarActa,
  blobActa,
  subirActa,
  urlActa,
  validarActa,
} from "../services/actas";
import { actualizarExpediente } from "../services/expedientes";
import type {
  Acta,
  Expediente,
  EstadoColegiatura,
} from "../types/expediente";
import { formatearFecha } from "../utils/formato";
import "./ExpedienteDetallePage.css";

interface DetalleProps {
  expediente: Expediente;
  alVolver: () => void;
}

/** Descarga un Blob con el nombre que tenía el PDF al subirlo. */
function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function nombreEstadoColegiatura(estado: EstadoColegiatura): string {
  switch (estado) {
    case "al-dia":
      return "Al día";
    case "no-al-dia":
      return "No al día";
    case "sin-informar":
      return "Sin informar";
  }
}

export function ExpedienteDetallePage({ expediente, alVolver }: DetalleProps) {
  const { usuario } = useAuth();
  const [actual, setActual] = useState(expediente);
  const [estado, setEstado] = useState<EstadoColegiatura>(
    expediente.colegiatura,
  );
  const [observacion, setObservacion] = useState("");
  const [guardandoEstado, setGuardandoEstado] = useState(false);
  const [errorEstado, setErrorEstado] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [confirmarReemplazo, setConfirmarReemplazo] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [errorActa, setErrorActa] = useState("");
  const [mensajeActa, setMensajeActa] = useState("");
  // URL temporal del PDF en demostración: desaparece al cerrar la ficha.
  const demoUrl = useRef<string | null>(null);
  const expedienteVisibleId = useRef(expediente.id);
  expedienteVisibleId.current = expediente.id;

  useEffect(() => {
    setActual(expediente);
    setEstado(expediente.colegiatura);
    setObservacion("");
    setErrorEstado("");
    setArchivo(null);
    setConfirmarReemplazo(false);
    setErrorActa("");
    setMensajeActa("");
    setProgreso(0);

    // Libera la URL temporal asociada a la ficha anterior al navegar o desmontar.
    return () => {
      if (demoUrl.current) URL.revokeObjectURL(demoUrl.current);
      demoUrl.current = null;
    };
  }, [expediente]);

  /** Guarda el estado y agrega al historial quién lo cambió, cuándo y por qué. */
  async function guardarColegiatura(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!usuario || guardandoEstado || estado === actual.colegiatura) return;

    const expedienteId = actual.id;
    setGuardandoEstado(true);
    setErrorEstado("");
    const fecha = new Date().toISOString();
    const observacionLimpia = observacion.trim();
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
      if (expedienteVisibleId.current === expedienteId) {
        setActual((previo) =>
          previo.id === expedienteId
            ? {
                ...previo,
                colegiatura: estado,
                fechaColegiatura: fecha,
                historialColegiatura: historial,
              }
            : previo,
        );
        setObservacion("");
      }
    } catch {
      if (expedienteVisibleId.current === expedienteId) {
        setErrorEstado(
          "No se pudo guardar el estado. Revise la conexión e inténtelo nuevamente.",
        );
      }
    } finally {
      setGuardandoEstado(false);
    }
  }

  function elegirArchivo(nuevo: File | null) {
    setArchivo(nuevo);
    setConfirmarReemplazo(false);
    setErrorActa("");
    setMensajeActa("");
  }

  function soltarArchivo(evento: DragEvent<HTMLLabelElement>) {
    evento.preventDefault();
    elegirArchivo(evento.dataTransfer.files[0] ?? null);
  }

  async function guardarArchivo() {
    if (!archivo || subiendo) return;
    const expedienteId = actual.id;
    const archivoSeleccionado = archivo;
    setErrorActa("");
    const error = await validarActa(archivoSeleccionado);
    if (error) {
      if (expedienteVisibleId.current === expedienteId) setErrorActa(error);
      return;
    }
    // La ficha pudo cambiar durante la validación asíncrona del PDF.
    if (expedienteVisibleId.current !== expedienteId) return;
    if (actual.acta && !confirmarReemplazo) {
      setConfirmarReemplazo(true);
      return;
    }
    setSubiendo(true);
    setProgreso(0);
    let actaSubida: Acta | null = null;
    try {
      const nuevaActa = await subirActa(
        expedienteId,
        archivoSeleccionado,
        (porcentaje) => {
          if (expedienteVisibleId.current === expedienteId) {
            setProgreso(porcentaje);
          }
        },
      );
      actaSubida = nuevaActa;
      await actualizarExpediente(expedienteId, { acta: nuevaActa });
      const anterior = actual.acta;
      if (expedienteVisibleId.current === expedienteId) {
        setActual((previo) =>
          previo.id === expedienteId ? { ...previo, acta: nuevaActa } : previo,
        );
        if (demoUrl.current) URL.revokeObjectURL(demoUrl.current);
        demoUrl.current = nuevaActa.ruta.startsWith("demo/")
          ? URL.createObjectURL(archivoSeleccionado)
          : null;
        setArchivo((previo) =>
          previo === archivoSeleccionado ? null : previo,
        );
        setConfirmarReemplazo(false);
        setMensajeActa(
          nuevaActa.ruta.startsWith("demo/")
            ? "PDF disponible solo mientras mantenga abierta esta ficha. La demostración no respalda archivos."
            : "Acta guardada en Firebase Storage.",
        );
      }
      // La nueva referencia ya está guardada; un fallo al borrar la anterior no la invalida.
      if (anterior) {
        try {
          await borrarActa(anterior);
        } catch {
          if (expedienteVisibleId.current === expedienteId) {
            setErrorActa(
              "El acta nueva se guardó, pero no se pudo eliminar el archivo anterior.",
            );
          }
        }
      }
    } catch {
      let errorLimpieza = false;
      if (actaSubida) {
        try {
          await borrarActa(actaSubida);
        } catch {
          errorLimpieza = true;
        }
      }
      if (expedienteVisibleId.current === expedienteId) {
        setErrorActa(
          errorLimpieza
            ? "No se pudo guardar el acta y tampoco se pudo limpiar el archivo subido."
            : "No se pudo guardar el acta. Revise la conexión e inténtelo nuevamente.",
        );
      }
    } finally {
      setSubiendo(false);
    }
  }

  /** Abre una ventana primero para que el navegador no bloquee la operación asíncrona. */
  async function abrirArchivo() {
    if (!actual.acta) return;
    setErrorActa("");
    const ventana = window.open("", "_blank");
    if (ventana) ventana.opener = null;
    try {
      const url = demoUrl.current ?? (await urlActa(actual.acta));
      if (ventana) ventana.location.href = url;
      else
        setErrorActa(
          "El navegador bloqueó la ventana del PDF. Permita ventanas emergentes para este sitio.",
        );
    } catch {
      ventana?.close();
      setErrorActa(
        "Esta acta de demostración no tiene un archivo disponible. Vuelva a seleccionarla.",
      );
    }
  }

  async function descargarArchivo() {
    if (!actual.acta) return;
    setErrorActa("");
    try {
      const blob = demoUrl.current
        ? await (await fetch(demoUrl.current)).blob()
        : await blobActa(actual.acta);
      descargarBlob(blob, actual.acta.nombre);
    } catch {
      setErrorActa(
        "No se pudo descargar el PDF. En demostración debe volver a seleccionarlo.",
      );
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
      <div className="detail-grid ficha-grid">
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
              <p className="detail-warning">
                <Icon name="alert" size={18} /> Pago pendiente: confirmar la
                situación antes de cerrar el expediente.
              </p>
            )}
            <form className="ficha-form" onSubmit={guardarColegiatura}>
              <label htmlFor="estado-colegiatura">
                Cambiar estado
                <select
                  id="estado-colegiatura"
                  value={estado}
                  onChange={(e) =>
                    setEstado(e.target.value as EstadoColegiatura)
                  }
                >
                  <option value="sin-informar">Sin informar</option>
                  <option value="al-dia">Al día</option>
                  <option value="no-al-dia">No al día</option>
                </select>
              </label>
              <label htmlFor="observacion-colegiatura">
                Observación (opcional)
                <textarea
                  id="observacion-colegiatura"
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  rows={3}
                  placeholder="Motivo o antecedente del cambio"
                />
              </label>
              {errorEstado && (
                <p className="form-error" role="alert">
                  {errorEstado}
                </p>
              )}
              <button
                className="button button-primary"
                type="submit"
                disabled={guardandoEstado || estado === actual.colegiatura}
              >
                {guardandoEstado ? "Guardando…" : "Guardar estado"}
              </button>
            </form>
            <h3>Historial de cambios</h3>
            {actual.historialColegiatura.length ? (
              <ol className="historial-lista">
                {/* Copia antes de invertir para mostrar los cambios recientes primero. */}
                {[...actual.historialColegiatura]
                  .reverse()
                  .map((cambio, indice) => (
                    <li key={`${cambio.fecha}-${indice}`}>
                      <strong>
                        {nombreEstadoColegiatura(cambio.estadoNuevo)}
                      </strong>
                      <span>
                        {formatearFecha(cambio.fecha)} · {cambio.usuario}
                      </span>
                      {cambio.observacion && <p>{cambio.observacion}</p>}
                    </li>
                  ))}
              </ol>
            ) : (
              <p>Aún no hay cambios registrados.</p>
            )}
          </section>
          <section className="detail-section">
            <h2>Acta de examen</h2>
            <div className="document-status">
              <Icon name="file" size={21} />
              <span>{actual.acta?.nombre ?? "Aún no se adjunta un acta"}</span>
            </div>
            {actual.acta && (
              <div className="acta-actions">
                <button
                  className="inline-action"
                  type="button"
                  onClick={() => void abrirArchivo()}
                >
                  Abrir
                </button>
                <button
                  className="inline-action"
                  type="button"
                  onClick={() => void descargarArchivo()}
                >
                  Descargar
                </button>
              </div>
            )}
            <label
              className="acta-dropzone"
              htmlFor="archivo-acta"
              onDragOver={(e) => e.preventDefault()}
              onDrop={soltarArchivo}
            >
              <Icon name="file" size={23} />
              <strong>
                {archivo ? archivo.name : "Elegir o arrastrar un PDF"}
              </strong>
              <span>PDF de menos de 10 MB</span>
              <input
                id="archivo-acta"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  elegirArchivo(e.target.files?.[0] ?? null)
                }
              />
            </label>
            {archivo && !confirmarReemplazo && (
              <button
                className="button button-primary acta-submit"
                type="button"
                onClick={() => void guardarArchivo()}
                disabled={subiendo}
              >
                {actual.acta ? "Reemplazar acta" : "Subir acta"}
              </button>
            )}
            {confirmarReemplazo && (
              <div
                className="confirmar-acta"
                role="group"
                aria-label="Confirmar reemplazo"
              >
                <p>
                  ¿Reemplazar el acta actual? Esta acción no se puede deshacer
                  desde la ficha.
                </p>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => setConfirmarReemplazo(false)}
                >
                  Cancelar
                </button>
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => void guardarArchivo()}
                  disabled={subiendo}
                >
                  Sí, reemplazar
                </button>
              </div>
            )}
            {subiendo && (
              <div className="acta-progress">
                <label htmlFor="progreso-acta">
                  Subiendo acta: {progreso}%
                </label>
                <progress id="progreso-acta" value={progreso} max="100" />
              </div>
            )}
            {errorActa && (
              <p className="form-error" role="alert">
                {errorActa}
              </p>
            )}
            {mensajeActa && (
              <p className="acta-message" role="status">
                {mensajeActa}
              </p>
            )}
            {!actual.acta || actual.acta.ruta.startsWith("demo/") ? (
              <p className="acta-demo-note">
                En demostración el archivo no queda respaldado. Se puede abrir
                solo mientras esta ficha permanezca abierta.
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </>
  );
}
