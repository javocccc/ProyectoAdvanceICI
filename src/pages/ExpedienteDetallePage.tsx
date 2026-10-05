import { useEffect, useState } from "react";

import { EstadoBadge } from "../components/EstadoBadge";
import { Icon } from "../components/Icon";



import type { Expediente } from "../types/expediente";
import { formatearFecha } from "../utils/formato";

interface DetalleProps {
  expediente: Expediente;
  alVolver: () => void;
}

export function ExpedienteDetallePage({ expediente, alVolver }: DetalleProps) {
  const [actual, setActual] = useState(expediente);
  // Si se selecciona otro expediente sin desmontar la página, actualiza la ficha local.
  useEffect(() => setActual(expediente), [expediente]);



  return (
    <>
      <button className="back-link" type="button" onClick={alVolver}>
        <Icon name="arrow" size={17} /> Volver a expedientes
      </button>
      <div className="page-heading detail-heading">
        <div>
          <p className="section-context">Expediente de titulación</p>
          <h1>{actual.nombre}</h1>
          <p>RUT {actual.rut} · Egreso {actual.anioEgreso}</p>
        </div>
        <EstadoBadge estado={actual.colegiatura} />
      </div>
      <div className="detail-grid">
        <section className="detail-section">
          <h2>Datos académicos</h2>
          <dl>
            <div><dt>Año y semestre de egreso</dt><dd>{actual.anioEgreso} · {actual.semestreEgreso}º semestre</dd></div>
            <div><dt>Fecha del examen</dt><dd>{formatearFecha(actual.fechaExamen)}</dd></div>
            <div><dt>Nota del examen</dt><dd>{actual.notaExamen?.toFixed(1) ?? "Sin registrar"}</dd></div>
            <div><dt>Profesor guía</dt><dd>{actual.comision?.guia ?? "Sin registrar"}</dd></div>
            <div><dt>Primer informante</dt><dd>{actual.comision?.informante1 ?? "Sin registrar"}</dd></div>
            <div><dt>Segundo informante</dt><dd>{actual.comision?.informante2 ?? "Sin registrar"}</dd></div>
            {/* El informante adicional es opcional y solo se muestra si fue informado. */}
            {actual.comision?.informanteAdicional && <div><dt>Informante adicional</dt><dd>{actual.comision.informanteAdicional}</dd></div>}
          </dl>
        </section>
        <div className="detail-side">
          <section className="detail-section">
            <h2>Colegiatura</h2>
            <EstadoBadge estado={actual.colegiatura} />
            <p>Última actualización: {actual.fechaColegiatura ? formatearFecha(actual.fechaColegiatura) : "Sin informar"}</p>



          </section>
          <section className="detail-section">
            <h2>Acta de examen</h2>
            <div className="document-status"><Icon name="file" size={21} /><span>{actual.acta?.nombre ?? "Aún no se adjunta un acta"}</span></div>

          </section>
        </div>
      </div>
    </>
  );
}