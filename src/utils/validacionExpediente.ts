import { validarRut } from "./rut";

export interface CamposRegistro {
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

export type CampoRegistro = keyof CamposRegistro;
export type ErroresRegistro = Partial<Record<CampoRegistro, string>>;

/** Valida los datos ingresados antes de crear o actualizar un expediente. */
export function validarCamposRegistro(
  campos: CamposRegistro,
  _anioActual = new Date().getFullYear(),
): ErroresRegistro {
  const errores: ErroresRegistro = {};
  if (!campos.nombre.trim()) errores.nombre = "Ingrese el nombre completo.";
  if (!campos.rut.trim()) errores.rut = "Ingrese el RUT.";
  else if (!validarRut(campos.rut))
    errores.rut = "Revise el RUT y su dígito verificador.";
  const anio = Number(campos.anio);
  if (!Number.isInteger(anio) || anio < 2020 || anio > 2050)
    errores.anio = "Seleccione un año entre 2020 y 2050.";
  if (!campos.fechaExamen)
    errores.fechaExamen = "Seleccione la fecha del examen.";
  const nota = Number(campos.nota.replace(",", "."));
  if (!campos.nota.trim()) errores.nota = "Ingrese la nota del examen.";
  else if (!/^[1-7](?:,[0-9])?$/.test(campos.nota.trim()) || !Number.isFinite(nota) || nota < 1 || nota > 7)
    errores.nota = "Use una nota entre 1,0 y 7,0 con coma decimal.";
  if (!campos.guia.trim()) errores.guia = "Ingrese el profesor guía.";
  if (!campos.informante1.trim())
    errores.informante1 = "Ingrese el primer informante.";
  if (!campos.informante2.trim())
    errores.informante2 = "Ingrese el segundo informante.";

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
