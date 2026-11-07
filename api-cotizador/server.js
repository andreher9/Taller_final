const cors = require("cors");
const Database = require("better-sqlite3");
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const databasePath =
  process.env.DATABASE_PATH ||
  path.join(__dirname, "data", "cotizaciones.sqlite");

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const database = new Database(databasePath);
database.pragma("journal_mode = WAL");
database.exec(`
  CREATE TABLE IF NOT EXISTS cotizaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    servicio TEXT NOT NULL,
    horas INTEGER NOT NULL CHECK (horas > 0),
    complejidad TEXT NOT NULL CHECK (complejidad IN ('muy-facil', 'facil', 'alta')),
    valor_servicio INTEGER NOT NULL,
    descuento_porcentaje INTEGER NOT NULL,
    descuento INTEGER NOT NULL,
    total INTEGER NOT NULL,
    creada_en TEXT NOT NULL DEFAULT (datetime('now')),
    actualizada_en TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const tarifas = {
  "muy-facil": { tarifa: 50000, descuento: 20 },
  facil: { tarifa: 50000, descuento: 5 },
  alta: { tarifa: 80000, descuento: 0 },
};

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

const cotizacionDesdeFila = (fila) => ({
  id: fila.id,
  servicio: fila.servicio,
  horas: fila.horas,
  complejidad: fila.complejidad,
  valorServicio: fila.valor_servicio,
  descuentoPorcentaje: fila.descuento_porcentaje,
  descuento: fila.descuento,
  total: fila.total,
  creadaEn: fila.creada_en,
  actualizadaEn: fila.actualizada_en,
});

const validarDatos = (datos) => {
  if (
    !datos ||
    !Number.isInteger(datos.horas) ||
    datos.horas < 1 ||
    datos.horas > 10000
  ) {
    return "Las horas deben ser un número entero entre 1 y 10.000.";
  }

  if (!Object.hasOwn(tarifas, datos.complejidad)) {
    return "La complejidad debe ser muy-facil, facil o alta.";
  }

  return null;
};

const calcularValores = ({ horas, complejidad }) => {
  const { tarifa, descuento: descuentoPorcentaje } = tarifas[complejidad];
  const valorServicio = horas * tarifa;
  const descuento = Math.round((valorServicio * descuentoPorcentaje) / 100);

  return {
    servicio: "Diseño web",
    horas,
    complejidad,
    valorServicio,
    descuentoPorcentaje,
    descuento,
    total: valorServicio - descuento,
  };
};

app.get("/", (_req, res) => {
  res.json({ mensaje: "API de cotizaciones activa." });
});

app.get("/api/cotizaciones", (_req, res) => {
  const cotizaciones = database
    .prepare("SELECT * FROM cotizaciones ORDER BY creada_en DESC, id DESC")
    .all()
    .map(cotizacionDesdeFila);

  res.json(cotizaciones);
});

app.post("/api/cotizaciones", (req, res) => {
  const error = validarDatos(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const valores = calcularValores(req.body);
  const resultado = database
    .prepare(`
      INSERT INTO cotizaciones (
        servicio, horas, complejidad, valor_servicio,
        descuento_porcentaje, descuento, total
      ) VALUES (
        @servicio, @horas, @complejidad, @valorServicio,
        @descuentoPorcentaje, @descuento, @total
      )
    `)
    .run(valores);

  const cotizacion = database
    .prepare("SELECT * FROM cotizaciones WHERE id = ?")
    .get(resultado.lastInsertRowid);

  res.status(201).json(cotizacionDesdeFila(cotizacion));
});

app.put("/api/cotizaciones/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "El identificador no es válido." });
  }

  const error = validarDatos(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const valores = calcularValores(req.body);
  const resultado = database
    .prepare(`
      UPDATE cotizaciones
      SET servicio = @servicio,
          horas = @horas,
          complejidad = @complejidad,
          valor_servicio = @valorServicio,
          descuento_porcentaje = @descuentoPorcentaje,
          descuento = @descuento,
          total = @total,
          actualizada_en = datetime('now')
      WHERE id = @id
    `)
    .run({ ...valores, id });

  if (resultado.changes === 0) {
    return res.status(404).json({ error: "No se encontró la cotización." });
  }

  const cotizacion = database
    .prepare("SELECT * FROM cotizaciones WHERE id = ?")
    .get(id);

  res.json(cotizacionDesdeFila(cotizacion));
});

app.delete("/api/cotizaciones/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "El identificador no es válido." });
  }

  const resultado = database
    .prepare("DELETE FROM cotizaciones WHERE id = ?")
    .run(id);

  if (resultado.changes === 0) {
    return res.status(404).json({ error: "No se encontró la cotización." });
  }

  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`API activa en http://localhost:${PORT}`);
  console.log(`Base de datos SQLite: ${databasePath}`);
});
