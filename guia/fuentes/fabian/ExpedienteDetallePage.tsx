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
import type { Expediente, EstadoColegiatura } from "../types/expediente";
import { formatearFecha } from "../utils/formato";
import "./ExpedienteDetallePage.css";

interface DetalleProps {
  expediente: Expediente;
  alVolver: () => void;
}

/** Guarda el archivo temporal de la demostración solo mientras esta ficha sigue abierta. */
function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
  const demoUrl = useRef<string | null>(null);

  useEffect(() => {
    setActual(expediente);
    setEstado(expediente.colegiatura);
  }, [expediente]);
  useEffect(
    () => () => {
      if (demoUrl.current) URL.revokeObjectURL(demoUrl.current);
    },
    [],
  );

  async function guardarColegiatura(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!usuario || guardandoEstado || estado === actual.colegiatura) return;
    setGuardandoEstado(true);
    setErrorEstado("");
    const fecha = new Date().toISOString();
    const historial = [
      ...actual.historialColegiatura,
      {
        estadoAnterior: actual.colegiatura,
        estadoNuevo: estado,
        fecha,
        usuario: usuario.email,
        ...(observacion.trim() ? { observacion: observacion.trim() } : {}),
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
      setErrorEstado(
        "No se pudo guardar el estado. Revise la conexión e inténtelo nuevamente.",
      );
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
    setErrorActa("");
    const error = await validarActa(archivo);
    if (error) {
      setErrorActa(error);
      return;
    }
    if (actual.acta && !confirmarReemplazo) {
      setConfirmarReemplazo(true);
      return;
    }
    setSubiendo(true);
    setProgreso(0);
    let subida: Awaited<ReturnType<typeof subirActa>> | null = null;
    try {
      subida = await subirActa(actual.id, archivo, setProgreso);
      await actualizarExpediente(actual.id, { acta: subida });
      const anterior = actual.acta;
      setActual((previo) => ({ ...previo, acta: subida! }));
      if (demoUrl.current) URL.revokeObjectURL(demoUrl.current);
      demoUrl.current = subida.ruta.startsWith("demo/")
        ? URL.createObjectURL(archivo)
        : null;
      setArchivo(null);
      setConfirmarReemplazo(false);
      setMensajeActa(
        subida.ruta.startsWith("demo/")
          ? "PDF disponible solo mientras mantenga abierta esta ficha. La demostración no respalda archivos."
          : "Acta guardada en Firebase Storage.",
      );
      // Si falla esta limpieza, el acta nueva sigue disponible.
      if (anterior) void borrarActa(anterior).catch(() => undefined);
    } catch {
      if (subida) void borrarActa(subida).catch(() => undefined);
      setErrorActa(
        "No se pudo guardar el acta. Revise la conexión e inténtelo nuevamente.",
      );
    } finally {
      setSubiendo(false);
    }
  }

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
                <Icon name="alert" size={18} /> Revisar antes de continuar el
                proceso.
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
                {[...actual.historialColegiatura]
                  .reverse()
                  .map((cambio, indice) => (
                    <li key={`${cambio.fecha}-${indice}`}>
                      <strong>
                        {cambio.estadoNuevo === "al-dia"
                          ? "Al día"
                          : cambio.estadoNuevo === "no-al-dia"
                            ? "No al día"
                            : "Sin informar"}
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
