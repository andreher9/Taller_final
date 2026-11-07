import { useEffect, useState } from 'react'
import './App.css'

const complejidades = {
  'muy-facil': { nombre: 'Muy fácil', tarifa: 50000, descuento: 20 },
  facil: { nombre: 'Fácil', tarifa: 50000, descuento: 5 },
  alta: { nombre: 'Alta', tarifa: 80000, descuento: 0 },
}

const formatoPesos = (valor) => '$ ' + valor.toLocaleString('es-CO')

const Logo = () => (
  <div className="logo">
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
      <rect x="0" y="0" width="18" height="18" rx="4" fill="#FFFFFF" />
      <rect x="0" y="22" width="18" height="18" rx="4" fill="#FFFFFF" />
      <rect x="22" y="22" width="18" height="18" rx="4" fill="#FFFFFF" />
      <rect x="22" y="0" width="18" height="18" rx="4" fill="#F59E0B" />
      <path d="M27 13 L35 5 M29 5 H35 V11" stroke="#0F172A" strokeWidth="2.5" fill="none" />
    </svg>
    <div>
      <p className="logo-nombre">JHAB</p>
      <p className="logo-sub">Web Solutions</p>
    </div>
  </div>
)

function App() {
  const [horas, setHoras] = useState(8)
  const [complejidad, setComplejidad] = useState('facil')
  const [cotizaciones, setCotizaciones] = useState([])
  const [editandoId, setEditandoId] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const actualizarHistorial = async () => {
    const respuesta = await fetch('/api/cotizaciones')
    const datos = await respuesta.json()
    if (!respuesta.ok) {
      throw new Error(datos.error || 'No se pudo cargar el historial.')
    }
    setCotizaciones(datos)
  }

  useEffect(() => {
    let activa = true

    fetch('/api/cotizaciones')
      .then(async (respuesta) => {
        const datos = await respuesta.json()
        if (!respuesta.ok) {
          throw new Error(datos.error || 'No se pudo cargar el historial.')
        }
        if (activa) setCotizaciones(datos)
      })
      .catch((problema) => {
        if (activa) setError(`No se pudo conectar con la API: ${problema.message}`)
      })
      .finally(() => {
        if (activa) setCargando(false)
      })

    return () => {
      activa = false
    }
  }, [])

  const complejidadSeleccionada = complejidades[complejidad]
  const valorDeServicio = horas * complejidadSeleccionada.tarifa
  const descuentoAplicado = Math.round(
    (valorDeServicio * complejidadSeleccionada.descuento) / 100,
  )
  const total = valorDeServicio - descuentoAplicado

  const manejarEnvio = async (evento) => {
    evento.preventDefault()
    setError('')
    setMensaje('')
    setGuardando(true)

    try {
      const respuesta = await fetch(
        editandoId ? `/api/cotizaciones/${editandoId}` : '/api/cotizaciones',
        {
          method: editandoId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ horas: Number(horas), complejidad }),
        },
      )
      const datos = respuesta.status === 204 ? null : await respuesta.json()
      if (!respuesta.ok) {
        throw new Error(datos?.error || 'No se pudo guardar la cotización.')
      }

      await actualizarHistorial()
      setEditandoId(null)
      setMensaje(editandoId ? 'Cotización actualizada.' : 'Cotización guardada en el historial.')
    } catch (problema) {
      setError(problema.message)
    } finally {
      setGuardando(false)
    }
  }

  const editarCotizacion = (cotizacion) => {
    setHoras(cotizacion.horas)
    setComplejidad(cotizacion.complejidad)
    setEditandoId(cotizacion.id)
    setMensaje('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelarEdicion = () => {
    setEditandoId(null)
    setHoras(8)
    setComplejidad('facil')
    setError('')
    setMensaje('')
  }

  const borrarCotizacion = async (id) => {
    if (!window.confirm('¿Deseas borrar esta cotización del historial?')) return

    setError('')
    setMensaje('')
    try {
      const respuesta = await fetch(`/api/cotizaciones/${id}`, { method: 'DELETE' })
      if (!respuesta.ok) {
        const datos = await respuesta.json()
        throw new Error(datos.error || 'No se pudo borrar la cotización.')
      }
      await actualizarHistorial()
      if (editandoId === id) cancelarEdicion()
      setMensaje('Cotización borrada.')
    } catch (problema) {
      setError(problema.message)
    }
  }

  const fechaFormato = (fecha) =>
    new Date(`${fecha.replace(' ', 'T')}Z`).toLocaleString('es-CO')

  return (
    <div className="pagina">
      <header className="encabezado">
        <Logo />
        <p className="slogan">Juntos, Haciendo Avanzar tu Business</p>
      </header>

      <section className="inicio">
        <h6>Cotizador en línea</h6>
        <h1>Cotiza tu página web</h1>
        <p>Elige las horas y la complejidad, y conoce el valor de tu proyecto al instante.</p>
      </section>

      <main className="contenido">
        <form className="tarjeta" onSubmit={manejarEnvio}>
          <h2>
            <i className="fa-solid fa-laptop-code"></i> Datos del servicio
          </h2>

          <label>
            <i className="fa-solid fa-clock"></i> Horas de trabajo
            <input
              type="number"
              min="1"
              max="10000"
              required
              value={horas}
              onChange={(evento) => setHoras(Number(evento.target.value))}
            />
          </label>

          <label>
            <i className="fa-solid fa-layer-group"></i> Complejidad
            <select value={complejidad} onChange={(evento) => setComplejidad(evento.target.value)}>
              {Object.entries(complejidades).map(([clave, opcion]) => (
                <option key={clave} value={clave}>
                  {opcion.nombre} ({formatoPesos(opcion.tarifa)} por hora)
                </option>
              ))}
            </select>
          </label>

          <div className="descuento-info">
            Descuento automático: <strong>{complejidadSeleccionada.descuento}%</strong>
          </div>
          <button className="boton" type="submit" disabled={guardando}>
            <i className="fa-solid fa-floppy-disk"></i>{' '}
            {guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Guardar cotización'}
          </button>
          {editandoId && (
            <button className="boton boton-secundario" type="button" onClick={cancelarEdicion}>
              Cancelar edición
            </button>
          )}
          {error && <p className="aviso error" role="alert">{error}</p>}
          {mensaje && <p className="aviso exito" role="status">{mensaje}</p>}
        </form>

        <section className="tarjeta resumen">
          <h2>
            <i className="fa-solid fa-file-invoice-dollar"></i> Cotización
          </h2>
          <p><span>Servicio:</span> <strong>Diseño web</strong></p>
          <p><span>Complejidad:</span> <strong>{complejidadSeleccionada.nombre}</strong></p>
          <p><span>Valor del servicio:</span> <strong>{formatoPesos(valorDeServicio)}</strong></p>
          <p>
            <span>Descuento ({complejidadSeleccionada.descuento}%):</span>
            <strong>- {formatoPesos(descuentoAplicado)}</strong>
          </p>
          <p className="total"><span>Total a pagar:</span> <strong>{formatoPesos(total)}</strong></p>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Hola, quisiera solicitar esta cotización de Diseño web: ${horas} horas, complejidad ${complejidadSeleccionada.nombre}, total ${formatoPesos(total)}.`)}`}
            className="boton"
            target="_blank"
            rel="noreferrer"
          >
            <i className="fa-brands fa-whatsapp"></i> Solicitar cotización
          </a>
        </section>
      </main>

      <section className="historial tarjeta">
        <div className="historial-titulo">
          <div>
            <h2><i className="fa-solid fa-clock-rotate-left"></i> Historial de cotizaciones</h2>
            <p>Consulta, modifica o elimina las cotizaciones guardadas.</p>
          </div>
          <span className="contador">{cotizaciones.length} cotizaciones</span>
        </div>

        {cargando ? (
          <p className="estado-historial">Cargando historial...</p>
        ) : cotizaciones.length === 0 ? (
          <p className="estado-historial">Aún no hay cotizaciones guardadas.</p>
        ) : (
          <div className="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Horas</th>
                  <th>Complejidad</th>
                  <th>Valor</th>
                  <th>Descuento</th>
                  <th>Total</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cotizaciones.map((cotizacion) => (
                  <tr key={cotizacion.id}>
                    <td>{fechaFormato(cotizacion.creadaEn)}</td>
                    <td>{cotizacion.horas}</td>
                    <td>{complejidades[cotizacion.complejidad].nombre}</td>
                    <td>{formatoPesos(cotizacion.valorServicio)}</td>
                    <td>{cotizacion.descuentoPorcentaje}% ({formatoPesos(cotizacion.descuento)})</td>
                    <td><strong>{formatoPesos(cotizacion.total)}</strong></td>
                    <td className="acciones">
                      <button type="button" className="accion editar" onClick={() => editarCotizacion(cotizacion)}>
                        Modificar
                      </button>
                      <button type="button" className="accion borrar" onClick={() => borrarCotizacion(cotizacion.id)}>
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="pie">
        <p>JHAB Web Solutions · Juntos, Haciendo Avanzar tu Business</p>
        <p>Julian Grisales · Hamelit Arcila · Andres Hernandez · Bryan Herrera</p>
        <p>Tecnológico de Antioquia · CAT Guarne 2026</p>
      </footer>
    </div>
  )
}

export default App
