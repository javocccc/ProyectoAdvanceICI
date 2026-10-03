import { useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import { crearExpediente } from "../services/expedientes";

interface NuevoProps {
  alGuardar: (id: string) => void;
  alCancelar: () => void;
}

/** Primer formulario funcional; Matias ampliará nota, comisión y validaciones. */
export function NuevoExpedientePage({ alGuardar, alCancelar }: NuevoProps) {
  const { usuario } = useAuth();
  const [nombre, setNombre] = useState("");
  const [rut, setRut] = useState("");
  const [anio, setAnio] = useState("2026");
  const [semestre, setSemestre] = useState<"1" | "2">("1");
  const [fechaExamen, setFechaExamen] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    if (!usuario) return;
    setGuardando(true);
    try {
      const nuevo = await crearExpediente(
        {
          nombre: nombre.trim(),
          rut: rut.trim(),
          anioEgreso: Number(anio),
          semestreEgreso: Number(semestre) as 1 | 2,
          fechaExamen,
          colegiatura: "sin-informar",
        },
        usuario.email,
      );
      alGuardar(nuevo.id);
    } catch (problema) {
      setError(
        problema instanceof Error
          ? problema.message
          : "No fue posible guardar el expediente.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="section-context">Registro académico</p>
          <h1>Nuevo expediente</h1>
          <p>Comience con los datos principales del estudiante.</p>
        </div>
      </div>
      <form className="editor-panel" onSubmit={guardar}>
        <div className="editor-intro">
          <span className="editor-index">01</span>
          <div>
            <h2>Datos del estudiante</h2>
            <p>Los campos marcados con * son obligatorios.</p>
          </div>
        </div>
        <div className="form-grid">
          <label>
            Nombre completo *
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre y apellidos"
            />
          </label>
          <label>
            RUT *
            <input
              required
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              placeholder="12.345.678-9"
            />
          </label>
          <label>
            Año de egreso *
            <input
              required
              type="number"
              min="2000"
              max="2100"
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
            />
          </label>
          <label>
            Semestre de egreso *
            <select
              value={semestre}
              onChange={(e) => setSemestre(e.target.value as "1" | "2")}
            >
              <option value="1">Primer semestre</option>
              <option value="2">Segundo semestre</option>
            </select>
          </label>
          <label>
            Fecha de examen de título *
            <input
              required
              type="date"
              value={fechaExamen}
              onChange={(e) => setFechaExamen(e.target.value)}
            />
          </label>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="editor-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={alCancelar}
          >
            Cancelar
          </button>
          <button
            className="button button-primary"
            type="submit"
            disabled={guardando}
          >
            {guardando ? "Guardando…" : "Guardar expediente"}{" "}
            <Icon name="arrow" size={18} />
          </button>
        </div>
      </form>
    </>
  );
}
