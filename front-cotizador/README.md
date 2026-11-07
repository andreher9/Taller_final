# Cotizador JHAB Web Solutions

Aplicación React para cotizar servicios de diseño web y administrar un historial persistente de cotizaciones mediante una API Express y SQLite.

## Iniciar localmente

Se requiere Node.js 22 o superior. Abre dos terminales desde la carpeta del proyecto:

1. Inicia la API: `cd api-cotizador`, `npm install` y luego `npm start`.
2. Inicia la aplicación: `cd front-cotizador`, `npm install` y luego `npm run dev`.

Abre la dirección que indique Vite (normalmente `http://localhost:5173`). La API usa `http://localhost:3000` y guarda la base de datos en `api-cotizador/data/cotizaciones.sqlite`.

## Descuentos

- Muy fácil: 20 %.
- Fácil: 5 %.
- Alta: sin descuento.

La API calcula las tarifas y los totales al guardar, y expone `GET`, `POST`, `PUT` y `DELETE` en `/api/cotizaciones`.
