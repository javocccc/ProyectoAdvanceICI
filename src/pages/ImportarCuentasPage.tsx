import { useState } from "react";
import type { ChangeEvent } from "react";
import { crearCuenta, enviarInvitacion, listarCuentas, mensajeErrorCuenta } from "../services/cuentas";
import type { CuentaApp } from "../services/cuentas";
import type { Expediente } from "../types/expediente";
import {
  ENCABEZADO_CUENTAS,
  interpretarCuentasCsv,
  MAX_BYTES_CUENTAS,
  MAX_FILAS_CUENTAS,
} from "../utils/importarCuentas";
import type { FilaCuenta } from "../utils/importarCuentas";

interface Props {
  cuentas: CuentaApp[];
  expedientes: Expediente[];
  cargando: boolean;
  alTerminar: () => Promise<void>;
  alCambiarOcupado: (ocupado: boolean) => void;
}

interface ResultadoFila {
  linea: number;
  email: string;
  resultado: string;
  error: boolean;
  claveTemporal?: string;
}

export function ImportarCuentasPage({ cuentas, expedientes, cargando, alTerminar, alCambiarOcupado }: Props) {
  const [archivo, setArchivo] = useState("");
  const [filas, setFilas] = useState<FilaCuenta[]>([]);
  const [resultados, setResultados] = useState<ResultadoFila[]>([]);
  const [error, setError] = useState("");
  const [leyendo, setLeyendo] = useState(false);
  const [importando, setImportando] = useState(false);
  const [progreso, setProgreso] = useState(0);

  async function seleccionar(evento: ChangeEvent<HTMLInputElement>) {
    const elegido = evento.target.files?.[0];
    setArchivo("");
    setFilas([]);
    setResultados([]);
    setError("");
    setProgreso(0);
    if (!elegido) return;
    if (!elegido.name.toLowerCase().endsWith(".csv")) {
      setError("Seleccione un archivo .csv guardado como CSV UTF-8 desde Excel.");
      return;
    }
    if (elegido.size > MAX_BYTES_CUENTAS) {
      setError("El archivo supera 1 MB. Divídalo en lotes de hasta 200 cuentas.");
      return;
    }
    setLeyendo(true);
    try {
      const contenido = await elegido.text();
      setFilas(interpretarCuentasCsv(contenido, cuentas, expedientes));
      setArchivo(elegido.name);
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : "No se pudo leer el archivo.");
    } finally {
      setLeyendo(false);
      evento.target.value = "";
    }
  }

  async function importar() {
    if (importando || !filas.length || filas.some((fila) => fila.errores.length)) return;
    setImportando(true);
    alCambiarOcupado(true);
    setError("");
    setResultados([]);
    setProgreso(0);
    const hechos: ResultadoFila[] = [];
    try {
      // Se vuelve a consultar antes de crear para detectar cuentas añadidas desde la vista previa.
      const actuales = await listarCuentas();
      const existentes = new Set(actuales.map((cuenta) => cuenta.email.toLowerCase()));
      for (const fila of filas) {
        if (existentes.has(fila.email)) {
          hechos.push({ linea: fila.linea, email: fila.email, resultado: "Ya existe una cuenta con este correo.", error: true });
        } else {
          try {
            const cuenta = await crearCuenta({
              nombre: fila.nombre,
              email: fila.email,
              rol: "estudiante",
              ...(fila.expedienteId ? { expedienteId: fila.expedienteId } : {}),
            });
            existentes.add(fila.email);
            try {
              await enviarInvitacion(fila.email);
              hechos.push({ linea: fila.linea, email: fila.email, resultado: "Cuenta creada; Firebase aceptó la solicitud de correo.", error: false, claveTemporal: cuenta.claveTemporal });
            } catch {
              hechos.push({ linea: fila.linea, email: fila.email, resultado: "Cuenta creada; Firebase rechazó el correo. Use la contraseña temporal.", error: true, claveTemporal: cuenta.claveTemporal });
            }
          } catch (problema) {
            hechos.push({
              linea: fila.linea,
              email: fila.email,
              resultado: mensajeErrorCuenta(problema),
              error: true,
            });
          }
        }
        setProgreso(hechos.length);
        setResultados([...hechos]);
      }
      await alTerminar();
      setFilas([]);
    } catch (problema) {
      setError(mensajeErrorCuenta(problema));
      if (hechos.length) {
        try { await alTerminar(); } catch { /* Los resultados de cada fila permanecen visibles. */ }
      }
    } finally {
      setImportando(false);
      alCambiarOcupado(false);
    }
  }

  const invalidas = filas.filter((fila) => fila.errores.length).length;
  const creadas = resultados.filter((fila) => fila.resultado.startsWith("Cuenta creada")).length;

  return (
    <section className="admin-card bulk-import" aria-labelledby="bulk-import-title">
      <div className="section-heading">
        <div>
          <h2 id="bulk-import-title">Importar estudiantes</h2>
          <p>Genere cuentas desde un CSV UTF-8 exportado de Excel. Firebase solicitará un correo de acceso y se mostrará una contraseña temporal por si no llega.</p>
        </div>
        <a className="button button-secondary" download="plantilla-estudiantes.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(`\uFEFF${ENCABEZADO_CUENTAS}\r\n`)}`}>
          Descargar plantilla
        </a>
      </div>
      <p className="bulk-format"><strong>Columnas:</strong> <code>{ENCABEZADO_CUENTAS}</code>. <code>rut</code> puede quedar vacío; si lo informa, se vincula con una ficha existente que tenga ese RUT. Hasta {MAX_FILAS_CUENTAS} estudiantes por archivo.</p>
      <label className="bulk-file-label" htmlFor="bulk-file">Archivo CSV</label>
      <input id="bulk-file" type="file" accept=".csv,text/csv" disabled={cargando || leyendo || importando} onChange={(evento) => void seleccionar(evento)} />
      {leyendo && <p role="status">Leyendo archivo…</p>}
      {archivo && filas.length > 0 && (
        <div className="bulk-review">
          <p role="status"><strong>{archivo}</strong> · {filas.length} filas · {invalidas ? `${invalidas} con problemas` : "listas para importar"}</p>
          <div className="access-table-wrap">
            <table>
              <thead><tr><th>Línea</th><th>Nombre</th><th>Correo</th><th>RUT</th><th>Ficha vinculada</th><th>Revisión</th></tr></thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.linea}>
                    <td>{fila.linea}</td><td>{fila.nombre}</td><td>{fila.email}</td><td>{fila.rut || "—"}</td><td>{fila.expedienteNombre || "Sin vínculo"}</td>
                    <td className={fila.errores.length ? "bulk-row-error" : "bulk-row-ok"}>{fila.errores.join(" ") || "Lista"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {invalidas > 0 && <p className="form-error" role="alert">Corrija las filas indicadas en el CSV y vuelva a seleccionarlo.</p>}
          <button className="button button-primary" type="button" disabled={invalidas > 0 || importando || cargando} onClick={() => void importar()}>
            {importando ? `Importando ${progreso} de ${filas.length}…` : `Crear ${filas.length} cuentas de estudiante`}
          </button>
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {resultados.length > 0 && (
        <div className="bulk-results" role="status">
          <h3>Resultado: {creadas} creadas de {resultados.length} procesadas</h3>
          <p>Las filas se procesan una a una. Guarde las contraseñas temporales ahora: dejarán de mostrarse al salir de esta pantalla. Entréguelas por un canal privado y pida que se cambien desde “Mi cuenta”.</p>
          <div className="access-table-wrap">
            <table><thead><tr><th>Línea</th><th>Correo</th><th>Resultado</th></tr></thead>
              <tbody>{resultados.map((fila) => <tr key={fila.linea}><td>{fila.linea}</td><td>{fila.email}</td><td className={fila.error ? "bulk-row-error" : "bulk-row-ok"}>
                {fila.resultado}
                {fila.claveTemporal && <details className="temporary-password"><summary>Mostrar contraseña temporal</summary><code>{fila.claveTemporal}</code></details>}
              </td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
