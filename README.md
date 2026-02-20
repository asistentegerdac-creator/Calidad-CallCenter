# Sistema de Gestión de Calidad DAC

Este proyecto consta de un Frontend (React + Vite) y un Backend (Node.js + Express + Postgres).

## Requisitos Previos

- [Node.js](https://nodejs.org/) (v18 o superior)
- [PostgreSQL](https://www.postgresql.org/) (Opcional, la app funciona en modo local sin él)

## Instalación

1. Descargue o clone el repositorio.
2. Abra una terminal en la carpeta raíz del proyecto.
3. Instale las dependencias:
   ```bash
   npm install
   ```

## Ejecución

Para iniciar tanto el servidor de desarrollo como el backend simultáneamente:

```bash
npm run dev
```

La aplicación estará disponible en:
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:3008](http://localhost:3008)

## Estructura del Proyecto

- `/` - Código fuente del Frontend (React).
- `/backend` - Código fuente del Backend (Node.js).
- `/components` - Componentes de React.
- `/services` - Servicios de comunicación con la API.

## Notas

- Si no tiene una base de datos Postgres configurada, la aplicación iniciará en **Modo Local**.
- El usuario por defecto es `admin` y la contraseña es `admin`.
- Para configurar Postgres, vaya a la sección de **Ajustes** dentro de la aplicación una vez iniciada.
