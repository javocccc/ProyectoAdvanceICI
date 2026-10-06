import { useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import { crearExpediente, listarExpedientes } from "../services/expedientes";
import type { NuevoExpediente } from "../types/expediente";
import { validarRut, limpiarRut } from "../utils/rut";

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
  nota: string;
  guia: string;
  informante1: string;
  informante2: string;
  informanteAdicional: string;
}

type Campo = keyof Campos;
type Errores = Partial<Record<Campo, string>>;

const inicial: Campos = {
  nombre: "",
  rut: "",
  anio: String(new Date().getFullYear()),
  semestre: "1",
  fechaExamen: "",
  nota: "",
  guia: "",
  informante1: "",
  informante2: "",
  informanteAdicional: "",
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
  const nota = Number(campos.nota.replace(",", "."));
  if (!campos.nota.trim()) errores.nota = "Ingrese la nota del examen.";
  else if (!Number.isFinite(nota) || nota < 1 || nota > 7) errores.nota = "La nota debe estar entre 1,0 y 7,0.";
  if (!campos.guia.trim()) errores.guia = "Ingrese el profesor guía.";
  if (!campos.informante1.trim()) errores.informante1 = "Ingrese el primer informante.";
  if (!campos.informante2.trim()) errores.informante2 = "Ingrese el segundo informante.";
  const docentes = [campos.guia, campos.informante1, campos.informante2, campos.informanteAdicional].map((valor) => valor.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()).filter(Boolean);
  if (new Set(docentes).size !== docentes.length) errores.guia = "Un docente figura dos veces en la comisión.";
  return errores;
}

export function NuevoExpedientePage({ alGuardar, alCancelar }: NuevoProps) {
  const { usuario } = useAuth();
  const [campos, setCampos] = useState<Campos>(inicial);
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [idExistente, setIdExistente] = useState<string | null>(null);

  function cambiar(campo: Campo, valor: string) {
    setCampos((actual) => ({ ...actual, [campo]: valor }));
    setErrores((actual) => ({ ...actual, [campo]: undefined }));
    setErrorGeneral("");
    setIdExistente(null);
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
    if (!usuario || guardando) return;
    const encontrados = validar(campos);
    setErrores(encontrados);
    setErrorGeneral("");
    setIdExistente(null);
    if (Object.keys(encontrados).length) {
      document.getElementById(`registro-${Object.keys(encontrados)[0]}`)?.focus();
      return;
    }
    const nuevo: NuevoExpediente = {
      nombre: campos.nombre.trim(),
      rut: campos.rut.trim(),
      anioEgreso: Number(campos.anio),
      semestreEgreso: Number(campos.semestre) as 1 | 2,
      fechaExamen: campos.fechaExamen,
      colegiatura: "sin-informar",
      notaExamen: Number(campos.nota.replace(",", ".")),
      comision: { guia: campos.guia.trim(), informante1: campos.informante1.trim(), informante2: campos.informante2.trim(), ...(campos.informanteAdicional.trim() ? { informanteAdicional: campos.informanteAdicional.trim() } : {}) },
    };
    setGuardando(true);
    try {
      const expediente = await crearExpediente(nuevo, usuario.email);
      alGuardar(expediente.id);
    } catch (problema) {
      const mensaje = problema instanceof Error ? problema.message : "No fue posible guardar el expediente.";
      setErrorGeneral(mensaje);
      if (mensaje.includes("Ya existe")) {
        try {
          const existente = (await listarExpedientes()).find((item) => limpiarRut(item.rut) === limpiarRut(campos.rut));
          setIdExistente(existente?.id ?? null);
        } catch { /* El error sigue visible. */ }
      }
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
          {campoTexto("nota", "Nota del examen *")}
        </div>
        <div className="editor-intro"><div><h2>Comisión evaluadora</h2><p>Registre a quienes evaluaron el examen.</p></div></div>
        <div className="form-grid">
          {campoTexto("guia", "Profesor guía *")}
          {campoTexto("informante1", "Primer informante *")}
          {campoTexto("informante2", "Segundo informante *")}
          {campoTexto("informanteAdicional", "Informante adicional (opcional)")}
        </div>
        {errorGeneral && <div className="form-error" role="alert">{errorGeneral}{idExistente && <button className="inline-action" type="button" onClick={() => alGuardar(idExistente)}>Abrir expediente existente</button>}</div>}
        <div className="editor-actions">
          <button className="button button-secondary" type="button" onClick={alCancelar} disabled={guardando}>Cancelar</button>
          <button className="button button-primary" type="submit" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar expediente"} <Icon name="arrow" size={18} />
          </button>
        </div>
      </form>
    </>
  );
}
