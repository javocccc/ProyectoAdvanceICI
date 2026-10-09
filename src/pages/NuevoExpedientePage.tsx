import { useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import {
  actualizarExpediente,
  crearExpediente,
  listarExpedientes,
} from "../services/expedientes";
import type {
  DatosEditablesExpediente,
  Expediente,
  NuevoExpediente,
} from "../types/expediente";
import { formatearRut, limpiarRut, validarRut } from "../utils/rut";
import "./NuevoExpedientePage.css";

interface NuevoProps {
  expediente?: Expediente;
  alGuardar: (id: string) => void;
  alCancelar: () => void;
}

interface Campos {
  // Se guardan como texto mientras la persona escribe; guardar() los convierte
  // a los números y al formato de RUT que espera el modelo Expediente.
  nombre: string;
  rut: string;
  anio: string;
  semestre: "1" | "2";
  fechaExamen: string;
  nota: string;
  guia: string;
  informante1: string;
  informante2: string;
  informanteAdicional: string;
}

type Campo = keyof Campos;
type Errores = Partial<Record<Campo, string>>;

const anioActual = new Date().getFullYear();

const inicial: Campos = {
  nombre: "",
  rut: "",
  anio: String(anioActual - 1),
  semestre: "1",
  fechaExamen: "",
  nota: "",
  guia: "",
  informante1: "",
  informante2: "",
  informanteAdicional: "",
};

/** Reúne los errores por campo antes de intentar guardar. */
function validar(campos: Campos): Errores {
  const errores: Errores = {};
  if (!campos.nombre.trim()) errores.nombre = "Ingrese el nombre completo.";
  if (!campos.rut.trim()) errores.rut = "Ingrese el RUT.";
  else if (!validarRut(campos.rut))
    errores.rut = "Revise el RUT y su dígito verificador.";
  const anio = Number(campos.anio);
  if (!Number.isInteger(anio) || anio < 2000 || anio >= anioActual)
    errores.anio = `Ingrese un año entre 2000 y ${anioActual - 1}.`;
  if (!campos.fechaExamen)
    errores.fechaExamen = "Seleccione la fecha del examen.";
  const nota = Number(campos.nota.replace(",", "."));
  if (!campos.nota.trim()) errores.nota = "Ingrese la nota del examen.";
  else if (!Number.isFinite(nota) || nota < 1 || nota > 7)
    errores.nota = "La nota debe estar entre 1,0 y 7,0.";
  if (!campos.guia.trim()) errores.guia = "Ingrese el profesor guía.";
  if (!campos.informante1.trim())
    errores.informante1 = "Ingrese el primer informante.";
  if (!campos.informante2.trim())
    errores.informante2 = "Ingrese el segundo informante.";

  // La comparación ignora espacios, tildes y mayúsculas para detectar el mismo docente.
  const docentes = (
    ["guia", "informante1", "informante2", "informanteAdicional"] as const
  )
    .map((campo) => ({
      campo,
      nombre: campos[campo]
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " "),
    }))
    .filter((item) => item.nombre);
  for (const docente of docentes) {
    if (
      docentes.some(
        (otro) =>
          otro.campo !== docente.campo && otro.nombre === docente.nombre,
      )
    )
      errores[docente.campo] = "Este docente ya figura en la comisión.";
  }
  return errores;
}

/** Formulario completo de registro. Conserva los datos si falla la validación o el guardado. */
export function NuevoExpedientePage({
  expediente,
  alGuardar,
  alCancelar,
}: NuevoProps) {
  const { usuario } = useAuth();
  // Los inputs son controlados: muestran "campos" y cambiar() actualiza ese estado.
  // Se conservan los valores si la validación o la escritura en Firebase falla.
  const [campos, setCampos] = useState<Campos>(() =>
    expediente
      ? {
          nombre: expediente.nombre,
          rut: expediente.rut,
          anio: String(expediente.anioEgreso),
          semestre: String(expediente.semestreEgreso) as "1" | "2",
          fechaExamen: expediente.fechaExamen,
          nota: expediente.notaExamen?.toString().replace(".", ",") ?? "",
          guia: expediente.comision?.guia ?? "",
          informante1: expediente.comision?.informante1 ?? "",
          informante2: expediente.comision?.informante2 ?? "",
          informanteAdicional: expediente.comision?.informanteAdicional ?? "",
        }
      : inicial,
  );
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [idExistente, setIdExistente] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function cambiar(campo: Campo, valor: string) {
    // Solo se limpia el error del campo corregido. Si había un RUT duplicado,
    // se oculta el enlace anterior hasta comprobar de nuevo el formulario.
    setCampos((actual) => ({ ...actual, [campo]: valor }));
    setErrores((actual) => ({ ...actual, [campo]: undefined }));
    setErrorGeneral("");
    setIdExistente(null);
  }

  function campoTexto(
    campo: Campo,
    titulo: string,
    opciones: {
      placeholder?: string;
      type?: string;
      inputMode?: "decimal" | "numeric";
      min?: string;
      max?: string;
    } = {},
  ) {
    // Un mismo componente de campo mantiene consistentes etiqueta, valor y
    // mensaje de error para los datos académicos y de la comisión.
    return (
      <label key={campo} htmlFor={`registro-${campo}`}>
        {titulo}
        <input
          id={`registro-${campo}`}
          name={campo}
          type={opciones.type ?? "text"}
          inputMode={opciones.inputMode}
          min={opciones.min}
          max={opciones.max}
          placeholder={opciones.placeholder}
          value={campos[campo]}
          onChange={(evento) => cambiar(campo, evento.target.value)}
          aria-invalid={Boolean(errores[campo])}
          aria-describedby={errores[campo] ? `error-${campo}` : undefined}
        />
        {errores[campo] && (
          <span className="field-error" id={`error-${campo}`}>
            {errores[campo]}
          </span>
        )}
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
      // Lleva el teclado al primer dato pendiente de corrección.
      const primero = Object.keys(encontrados)[0];
      document.getElementById(`registro-${primero}`)?.focus();
      return;
    }

    // El campo adicional se omite por completo cuando queda vacío.
    const comision = {
      guia: campos.guia.trim(),
      informante1: campos.informante1.trim(),
      informante2: campos.informante2.trim(),
      ...(campos.informanteAdicional.trim()
        ? { informanteAdicional: campos.informanteAdicional.trim() }
        : {}),
    };
    const datosEditables: DatosEditablesExpediente = {
      nombre: campos.nombre.trim(),
      rut: formatearRut(campos.rut),
      anioEgreso: Number(campos.anio),
      semestreEgreso: Number(campos.semestre) as 1 | 2,
      fechaExamen: campos.fechaExamen,
      notaExamen: Number(campos.nota.replace(",", ".")),
      comision,
    };
    const nuevo: NuevoExpediente = {
      ...datosEditables,
      colegiatura: "sin-informar",
    };
    setGuardando(true);
    try {
      if (expediente) {
        await actualizarExpediente(expediente.id, datosEditables, usuario.email);
        alGuardar(expediente.id);
      } else {
        const creado = await crearExpediente(nuevo, usuario.email);
        alGuardar(creado.id);
      }
    } catch (problema) {
      const mensaje =
        problema instanceof Error
          ? problema.message
          : "No fue posible guardar el expediente.";
      setErrorGeneral(mensaje);
      if (mensaje.includes("Ya existe")) {
        try {
          // Ofrece abrir la ficha existente sin perder el aviso de duplicado.
          const existente = (await listarExpedientes()).find(
            (item) => limpiarRut(item.rut) === limpiarRut(campos.rut),
          );
          setIdExistente(existente?.id ?? null);
        } catch {
          /* El aviso de duplicado sigue siendo visible. */
        }
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
          <h1>{expediente ? "Editar expediente" : "Nuevo expediente"}</h1>
          <p>
            Complete los datos del examen y la comisión en un solo formulario.
          </p>
        </div>
      </div>
      <form
        className="editor-panel registro-panel"
        onSubmit={guardar}
        noValidate
      >
        <div className="editor-intro">
          <div>
            <h2>Datos del estudiante</h2>
            <p>Los campos marcados con * son obligatorios.</p>
          </div>
        </div>
        <div className="form-grid">
          {campoTexto("nombre", "Nombre completo *", {
            placeholder: "Nombre y apellidos",
          })}
          {campoTexto("rut", "RUT *", { placeholder: "12.345.678-5" })}
          {campoTexto("anio", "Año de egreso *", {
            type: "number",
            inputMode: "numeric",
            min: "2000",
            max: String(anioActual - 1),
          })}
          <label htmlFor="registro-semestre">
            Semestre de egreso *
            <select
              id="registro-semestre"
              value={campos.semestre}
              onChange={(e) => cambiar("semestre", e.target.value)}
            >
              <option value="1">Primer semestre</option>
              <option value="2">Segundo semestre</option>
            </select>
          </label>
          {campoTexto("fechaExamen", "Fecha del examen de título *", {
            type: "date",
          })}
          {campoTexto("nota", "Nota del examen *", {
            placeholder: "Ejemplo: 6,2",
            inputMode: "decimal",
          })}
        </div>
        <div className="editor-intro">
          <div>
            <h2>Comisión evaluadora</h2>
            <p>Registre personas diferentes en cada función.</p>
          </div>
        </div>
        <div className="form-grid">
          {campoTexto("guia", "Profesor guía *")}
          {campoTexto("informante1", "Primer informante *")}
          {campoTexto("informante2", "Segundo informante *")}
          {campoTexto("informanteAdicional", "Informante adicional (opcional)")}
        </div>
        {errorGeneral && (
          <div className="form-error" role="alert">
            {errorGeneral}
            {idExistente && (
              <button
                className="inline-action"
                type="button"
                onClick={() => alGuardar(idExistente)}
              >
                Abrir expediente existente
              </button>
            )}
          </div>
        )}
        <div className="editor-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={alCancelar}
            disabled={guardando}
          >
            Cancelar
          </button>
          <button
            className="button button-primary"
            type="submit"
            disabled={guardando}
          >
            {guardando
              ? "Guardando…"
              : expediente
                ? "Guardar cambios"
                : "Guardar expediente"}{" "}
            <Icon name="arrow" size={18} />
          </button>
        </div>
      </form>
    </>
  );
}
