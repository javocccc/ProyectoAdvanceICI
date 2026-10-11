/** Quita la puntuación habitual y unifica la K para comparar RUT equivalentes. */
export function limpiarRut(valor: string): string {
  return valor.replace(/[.\s-]/g, "").toUpperCase();
}

/** Recorre el cuerpo de derecha a izquierda con factores de 2 a 7 (módulo 11). */
export function digitoVerificador(cuerpo: string): string {
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i -= 1) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  return resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
}

/** Mantiene un único formato visual mientras se escribe el RUT. */
export function formatearEntradaRut(valor: string): string {
  const limpio = valor.toUpperCase().replace(/[^\dK]/g, "").slice(0, 9);
  const cuerpo = limpio.length >= 8 ? limpio.slice(0, -1) : limpio;
  const agrupado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return limpio.length >= 8 ? `${agrupado}-${limpio.slice(-1)}` : agrupado;
}

/** Exige el formato con puntos y guion y verifica el dígito final. */
export function validarRut(valor: string): boolean {
  if (!/^\d{1,2}\.\d{3}\.\d{3}-[\dK]$/.test(valor)) return false;
  const limpio = limpiarRut(valor);
  if (!/^\d{7,8}[\dK]$/.test(limpio)) return false;
  const cuerpo = limpio.slice(0, -1);
  return digitoVerificador(cuerpo) === limpio.slice(-1);
}

/** Normaliza el dato antes de compararlo o guardarlo. */
export function formatearRut(valor: string): string {
  return formatearEntradaRut(valor);
}
