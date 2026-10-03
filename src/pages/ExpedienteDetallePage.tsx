import { EstadoBadge } from '../components/EstadoBadge';
import { Icon } from '../components/Icon';
import type { Expediente } from '../types/expediente';
import { formatearFecha } from '../utils/formato';

interface DetalleProps { expediente: Expediente; alVolver: () => void; }

/** Ficha de lectura inicial; Fabian añadirá edición de colegiatura y acta PDF. */
export function ExpedienteDetallePage({ expediente, alVolver }: DetalleProps) {
  return <><button className="back-link" type="button" onClick={alVolver}><Icon name="arrow" size={17}/> Volver a expedientes</button>
    <div className="page-heading detail-heading"><div><p className="section-context">Expediente de titulación</p><h1>{expediente.nombre}</h1><p>RUT {expediente.rut} · Egreso {expediente.anioEgreso}</p></div><EstadoBadge estado={expediente.colegiatura}/></div>
    <div className="detail-grid"><section className="detail-section"><h2>Datos académicos</h2><dl><div><dt>Año y semestre de egreso</dt><dd>{expediente.anioEgreso} · {expediente.semestreEgreso}º semestre</dd></div><div><dt>Fecha del examen</dt><dd>{formatearFecha(expediente.fechaExamen)}</dd></div><div><dt>Nota del examen</dt><dd>{expediente.notaExamen?.toFixed(1) ?? 'Sin registrar'}</dd></div><div><dt>Profesor guía</dt><dd>{expediente.comision?.guia ?? 'Sin registrar'}</dd></div><div><dt>Informantes</dt><dd>{expediente.comision ? `${expediente.comision.informante1}, ${expediente.comision.informante2}` : 'Sin registrar'}</dd></div></dl></section>
      <div className="detail-side"><section className="detail-section"><h2>Colegiatura</h2><EstadoBadge estado={expediente.colegiatura}/><p>Última actualización: {expediente.fechaColegiatura ? formatearFecha(expediente.fechaColegiatura) : 'Sin informar'}</p>{expediente.colegiatura === 'no-al-dia' && <p className="detail-warning"><Icon name="alert" size={18}/> Revisar antes de continuar el proceso.</p>}</section><section className="detail-section"><h2>Acta de examen</h2><div className="document-status"><Icon name="file" size={21}/><span>{expediente.acta ? expediente.acta.nombre : 'Aún no se adjunta un acta'}</span></div></section></div>
    </div></>;
}
