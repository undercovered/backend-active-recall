# Active Recall — Backend

API del sistema de estudio **Active Recall** (active recall + repetición espaciada).
Expone una API REST sobre `/api` y persiste los datos en **PostgreSQL**.

Este repositorio es **independiente** del cliente (front-end en Angular), que consume
esta API por HTTP.

> Estado actual: base del backend montada (Clean Architecture + capa de persistencia
> desacoplada). Los casos de uso y las rutas REST de negocio se irán añadiendo.

---

## Tabla de contenidos

- [Stack tecnológico](#stack-tecnológico)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Modelos de dominio](#modelos-de-dominio)
- [Base de datos](#base-de-datos)
- [Puesta en marcha](#puesta-en-marcha)
- [Endpoints actuales](#endpoints-actuales)
- [Variables de entorno](#variables-de-entorno)
- [Documentación adicional](#documentación-adicional)

---

## Stack tecnológico

| Componente   | Tecnología          |
| ------------ | ------------------- |
| Runtime      | Node.js 22          |
| Framework    | Express 4           |
| Base de datos| PostgreSQL 16       |
| Driver SQL   | `pg`                |
| Config       | `dotenv`            |
| CORS         | `cors`              |

Arquitectura: **Clean Architecture** con patrón **Repository** (ports & adapters).

---

## Estructura del proyecto

```
backend/
├── app.js                         # Punto de entrada (Express). Composición HTTP.
├── .env.example                   # Plantilla de variables de entorno
├── sql/                           # Scripts de esquema (migraciones manuales)
│   ├── 000_init.sql
│   ├── 001_create_subjects.sql
│   ├── 002_create_topics.sql
│   └── 003_create_flashcards.sql
└── src/
    ├── domain/                    # Núcleo, sin dependencias externas
    │   ├── entities/              #   Reglas de negocio de cada entidad
    │   │   ├── Subject.js
    │   │   ├── Topic.js
    │   │   └── Flashcard.js
    │   └── repositories/          #   PORTS: contratos de persistencia (abstractos)
    │       ├── SubjectRepository.js
    │       ├── TopicRepository.js
    │       └── FlashcardRepository.js
    └── infrastructure/            # Detalles técnicos (intercambiables)
        ├── database/
        │   └── postgresPool.js    #   Único lugar que conoce el driver `pg`
        ├── persistence/postgres/  #   ADAPTERS: implementación de los ports
        │   ├── PgSubjectRepository.js
        │   ├── PgTopicRepository.js
        │   └── PgFlashcardRepository.js
        └── container.js           #   Composition root: cablea ports ↔ adapters
```

---

## Modelos de dominio

| Entidad     | Tabla        | Campos clave                              |
| ----------- | ------------ | ----------------------------------------- |
| `Subject`   | `subjects`   | `id`, `title`, `description`              |
| `Topic`     | `topics`     | `id`, `title`, `description`, `subjectId` |
| `Flashcard` | `flashcards` | `id`, `question`, `topicId`               |

Todas incluyen `createdAt` y `updatedAt`. Relaciones: `Subject` 1—N `Topic`,
`Topic` 1—N `Flashcard` (borrado en cascada).

Cada entidad valida sus invariantes en el constructor, mapea filas con
`fromRow()` y serializa con `toJSON()`.

---

## Base de datos

Los scripts en `sql/` son idempotentes y deben ejecutarse en orden:

```bash
sudo -u postgres createdb active_recall

psql -h localhost -U postgres -d active_recall -f sql/000_init.sql
psql -h localhost -U postgres -d active_recall -f sql/001_create_subjects.sql
psql -h localhost -U postgres -d active_recall -f sql/002_create_topics.sql
psql -h localhost -U postgres -d active_recall -f sql/003_create_flashcards.sql
```

Detalles de diseño (UUID como PK, triggers `updated_at`, FKs en cascada, índices y
checks) en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Puesta en marcha

Requisitos: Node.js 22+ y PostgreSQL 16+ en ejecución.

```bash
cp .env.example .env        # ajusta credenciales si es necesario
npm install
npm run dev                 # con recarga automática (node --watch)
# o
npm start                   # sin recarga
```

El servidor arranca en `http://localhost:3000`.

---

## Endpoints actuales

| Método | Ruta            | Descripción                              |
| ------ | --------------- | ---------------------------------------- |
| GET    | `/api/health`   | Estado del servicio                      |
| GET    | `/api/db/ping`  | Prueba la conexión a PostgreSQL          |

Los endpoints CRUD de negocio (`/api/subjects`, `/api/topics`, `/api/flashcards`) se
añadirán junto con los casos de uso.

---

## Variables de entorno

| Variable     | Por defecto     | Descripción                     |
| ------------ | --------------- | ------------------------------- |
| `PORT`       | `3000`          | Puerto del servidor HTTP        |
| `PGHOST`     | `localhost`     | Host de PostgreSQL              |
| `PGPORT`     | `5432`          | Puerto de PostgreSQL            |
| `PGUSER`     | `postgres`      | Usuario                         |
| `PGPASSWORD` | `postgres`      | Contraseña                      |
| `PGDATABASE` | `active_recall` | Nombre de la base de datos      |

---

## Documentación adicional

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arquitectura detallada, capas,
  patrón Repository, esquema SQL y justificación de decisiones.
