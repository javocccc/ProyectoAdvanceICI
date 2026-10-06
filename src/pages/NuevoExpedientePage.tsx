import { useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import { crearExpediente } from "../services/expedientes";
import type { NuevoExpediente } from "../types/expediente";
import { validarRut } from "../utils/rut";

interface NuevoProps {
  alGuardar: (id: string) => void;
  alCancelar: () => void;
}

interface Campos {
  nombre: string;
  rut: string;
  anio: string;
  semestre: string;
  fechaExamen: string;

}

type Campo = keyof Campos;
type Errores = Partial<Record<Campo, string>>;

const inicial: Campos = {
  nombre: "",
  rut: "",
  anio: String(new Date().getFullYear()),
  semestre: "1",
  fechaExamen: "",

};

/** Devuelve un mensaje por cada dato que se debe corregir. */
function validar(campos: Campos): Errores {
  const errores: Errores = {};
  if (!campos.nombre.trim()) errores.nombre = "Ingrese el nombre completo.";
  if (!validarRut(campos.rut)) errores.rut = "Revise el RUT y su dígito verificador.";
  const anio = Number(campos.anio);
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100)
    errores.anio = "Ingrese un año entre 2000 y 2100.";
  if (!campos.fechaExamen) errores.fechaExamen = "Seleccione la fecha del examen.";

  return errores;
}

export function NuevoExpedientePage({ alGuardar, alCancelar }: NuevoProps) {
  const { usuario } = useAuth();
  const [campos, setCampos] = useState<Campos>(inicial);
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);


  function cambiar(campo: Campo, valor: string) {
    setCampos((actual) => ({ ...actual, [campo]: valor }));
    setErrores((actual) => ({ ...actual, [campo]: undefined }));
    setErrorGeneral("");

  }

  /** Conecta cada input con su etiqueta y con su mensaje de error. */
  function campoTexto(campo: Campo, titulo: string, tipo = "text") {
    return (
      <label key={campo} htmlFor={`registro-${campo}`}>
        {titulo}
        <input
          id={`registro-${campo}`}
          type={tipo}
          value={campos[campo]}
          onChange={(evento) => cambiar(campo, evento.target.value)}
          aria-invalid={Boolean(errores[campo])}
          aria-describedby={errores[campo] ? `error-${campo}` : undefined}
        />
        {errores[campo] && <span id={`error-${campo}`} className="field-error">{errores[campo]}</span>}
      </label>
    );
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!usuario) return;
    const encontrados = validar(campos);
    setErrores(encontrados);
    setErrorGeneral("");

    if (Object.keys(encontrados).length) {

      return;
    }
    const nuevo: NuevoExpediente = {
      nombre: campos.nombre.trim(),
      rut: campos.rut.trim(),
      anioEgreso: Number(campos.anio),
      semestreEgreso: Number(campos.semestre) as 1 | 2,
      fechaExamen: campos.fechaExamen,
      colegiatura: "sin-informar",

    };
    setGuardando(true);
    try {
      const expediente = await crearExpediente(nuevo, usuario.email);
      alGuardar(expediente.id);
    } catch (problema) {
      const mensaje = problema instanceof Error ? problema.message : "No fue posible guardar el expediente.";
      setErrorGeneral(mensaje);

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
          <p>Complete los datos del estudiante y su examen.</p>
        </div>
      </div>
      <form className="editor-panel" onSubmit={guardar} noValidate>
        <div className="editor-intro"><div><h2>Datos del estudiante</h2><p>Los campos marcados con * son obligatorios.</p></div></div>
        <div className="form-grid">
          {campoTexto("nombre", "Nombre completo *")}
          {campoTexto("rut", "RUT *")}
          {campoTexto("anio", "Año de egreso *", "number")}
          <label htmlFor="registro-semestre">
            Semestre de egreso *
            <select id="registro-semestre" value={campos.semestre} onChange={(e) => cambiar("semestre", e.target.value)}>
              <option value="1">Primer semestre</option>
              <option value="2">Segundo semestre</option>
            </select>
          </label>
          {campoTexto("fechaExamen", "Fecha del examen de título *", "date")}

        </div>

        {errorGeneral && <div className="form-error" role="alert">{errorGeneral}</div>}
        <div className="editor-actions">
          <button className="button button-secondary" type="button" onClick={alCancelar}>Cancelar</button>
          <button className="button button-primary" type="submit">
            {guardando ? "Guardando…" : "Guardar expediente"} <Icon name="arrow" size={18} />
          </button>
        </div>
      </form>
    </>
  );
}
