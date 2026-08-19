# Active Recall — Backend

API REST del sistema de estudio **Active Recall** (active recall + repetición
espaciada). Persiste en **PostgreSQL** y se consume desde el cliente Angular
(repositorio aparte).

Toda respuesta sigue el sobre `{ data, msg }` (y `code` en errores). Los textos
de negocio van en español; los nombres de tests, en inglés.

---

## Tabla de contenidos

- [Stack tecnológico](#stack-tecnológico)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Modelos de dominio](#modelos-de-dominio)
- [Reglas de negocio importantes](#reglas-de-negocio-importantes)
- [Base de datos](#base-de-datos)
- [Puesta en marcha](#puesta-en-marcha)
- [Scripts](#scripts)
- [Endpoints](#endpoints)
- [Variables de entorno](#variables-de-entorno)
- [Documentación adicional](#documentación-adicional)

---

## Stack tecnológico

| Componente    | Tecnología                         |
| ------------- | ---------------------------------- |
| Runtime       | Node.js 22                         |
| Framework     | Express 4                          |
| Base de datos | PostgreSQL 16                      |
| Driver SQL    | `pg`                               |
| Auth          | JWT HMAC-SHA256 + scrypt + pepper  |
| Config        | `dotenv`                           |
| CORS          | `cors` (abierto; listo para Vercel)|
| Tests         | `node:test`                        |

Arquitectura: **Clean Architecture** con patrón **Repository** (ports & adapters).

---

## Estructura del proyecto

```
backend/
├── app.js                         # Arranque HTTP (PORT, SIGINT/SIGTERM)
├── .env.example                   # Plantilla de variables
├── sql/                           # Esquema, en orden numérico
├── test/                          # Unitarias + HTTP en memoria
└── src/
    ├── domain/                    # Núcleo, sin Express ni pg
    │   ├── entities/
    │   ├── repositories/          # Ports
    │   ├── errors/
    │   ├── retention.js           # Fórmula R(t) del dashboard
    │   └── recallSchedule.js      # 7 fechas de repaso al crear un tema
    ├── application/use-cases/     # Orquestación
    └── infrastructure/
        ├── database/postgresPool.js
        ├── persistence/postgres/  # Adapters SQL
        └── container.js           # Composition root
    └── interfaces/http/           # Rutas, controladores, middlewares
```

---

## Modelos de dominio

| Entidad        | Tabla            | Campos clave |
| -------------- | ---------------- | ------------ |
| `User`         | `users`          | `email`, `username`, `enabled` |
| `Subject`      | `subjects`       | `title`, `description` |
| `Topic`        | `topics`         | `title`, `description`, `subjectId` |
| `Flashcard`    | `flashcards`     | `question`, `topicId`, `subjectId`, `answerTypeId` |
| `Answer`       | `answers`        | `answerText`, `isCorrect`, `flashcardId`, `topicId`, `subjectId` |
| `AnswerType`   | `answer_types`   | `code`: `single_choice` \| `multiple_choice` \| `open_answer` |
| `ActiveRecall` | `active_recall`  | `dateRecall`, `completed`, `topicId`, `subjectId` |
| `UserAnswer`   | `user_answers`   | `attemptId`, `isCorrect`, `flashcardId` |

Todas las tablas de negocio tienen `deleted` (borrado lógico). Los GET filtran
`deleted = false`.

Relaciones: materia 1—N temas 1—N preguntas 1—N respuestas. Al crear un tema se
programan **7 filas** en `active_recall`.

---

## Reglas de negocio importantes

- **Borrado lógico**: nunca se hace `DELETE` físico de filas de negocio. Borrar
  una materia marca como `deleted` sus temas, preguntas, respuestas, repasos y
  respuestas de usuario. Igual al borrar un tema.
- **Repaso**: `active_recall.completed` pasa a `true` cuando el alumno contestó
  **todas** las preguntas de ese tema (acierte o falle). El acierto por pregunta
  vive en `user_answers.is_correct`.
- **Agenda**: al crear el tema, 7 fechas desde el día de creación: +1 día, +3,
  +7, +15, +30, +3 meses, +6 meses.
- **Retención (dashboard)**: promedio de `R(t) = 100 × e^(−t / S)` por tema.
  `t` son días desde el último repaso completado (o desde la creación). `S = 7 × 2.5ⁿ`
  (`n` = repasos completados). Con 7 repasos completados se fija en 100 %. Un
  tema creado **hoy** sale al 100 % aunque no se haya repasido.
- **Preguntas en proceso** (cards del inicio): preguntas cuyo tema tiene **menos
  de 7** repasos `completed`.

---

## Base de datos

Los scripts en `sql/` son idempotentes. Ejecútalos **en este orden** sobre una
base vacía (nombre típico de desarrollo: `recalldb`):

```bash
sudo -u postgres createdb recalldb

for f in sql/000_init.sql \
         sql/001_create_subjects.sql \
         sql/002_create_topics.sql \
         sql/003_create_flashcards.sql \
         sql/004_create_answer_types.sql \
         sql/005_update_flashcards.sql \
         sql/006_create_answers.sql \
         sql/007_create_user_answers.sql \
         sql/008_create_active_recall.sql \
         sql/009_add_user_answers_is_correct.sql \
         sql/010_create_users.sql \
         sql/011_add_deleted_and_user_enabled.sql \
         sql/012_completed_and_soft_delete_cascade.sql \
         sql/013_denormalize_subject_and_topic_fks.sql
do
  psql -h localhost -U postgres -d recalldb -f "$f"
done
```

En una instalación nueva hace falta **toda** la serie. No ejecutes solo los
últimos scripts si las tablas aún no existen.

---

## Puesta en marcha

Requisitos: Node.js 22+ y PostgreSQL 16+ en ejecución.

```bash
cp .env.example .env        # rellena PGPASSWORD, PASSWORD_PEPPER y JWT_SECRET
npm install
npm run dev                 # recarga con node --watch
# o
npm start
```

El puerto por defecto es **3000** (`PORT` en `.env`). En desarrollo local suele
usarse **8080** para coincidir con el front (`environment.development.ts`).

Comprueba:

```bash
curl http://localhost:8080/api/health
```

---

## Scripts

| Comando        | Descripción                                      |
| -------------- | ------------------------------------------------ |
| `npm start`    | Arranque de producción (`node app.js`)           |
| `npm run dev`  | Desarrollo con recarga                           |
| `npm test`     | Suite `node:test` (unitarias + HTTP en memoria)  |

---

## Endpoints

Públicos (sin JWT):

| Método | Ruta                         | Descripción              |
| ------ | ---------------------------- | ------------------------ |
| GET    | `/api/health`                | Salud del servicio       |
| POST   | `/api/auth/register`         | Alta de usuario          |
| POST   | `/api/auth/login`            | Sesión (devuelve JWT)    |
| POST   | `/api/auth/password-reset`   | Solicitud de reset       |
| POST   | `/api/users`                 | Alta (compatibilidad)    |

El resto de `/api/*` exige `Authorization: Bearer <token>`.

| Método | Ruta                    | Descripción |
| ------ | ----------------------- | ----------- |
| GET    | `/api/auth/me`          | Usuario actual |
| GET    | `/api/db/ping`          | Ping a PostgreSQL |
| CRUD   | `/api/subjects`         | Materias |
| CRUD   | `/api/topics`           | Temas (GET `:id` hidrata preguntas y repasos) |
| CRUD   | `/api/flashcards`       | Preguntas |
| GET    | `/api/answer-types`     | Catálogo de tipos |
| GET    | `/api/reviews/due-today`| Repasos pendientes |
| GET    | `/api/reviews/session`  | Sesión de hoy |
| POST   | `/api/reviews/answer`   | Respuesta (opción múltiple) |
| POST   | `/api/reviews/grade`    | Corrección de abierta |
| GET    | `/api/dashboard/stats`  | Métricas del inicio |

---

## Variables de entorno

| Variable          | Por defecto        | Descripción |
| ----------------- | ------------------ | ----------- |
| `PORT`            | `3000`             | Puerto HTTP |
| `PGHOST`          | `localhost`        | Host de PostgreSQL |
| `PGPORT`          | `5432`             | Puerto de PostgreSQL |
| `PGUSER`          | `postgres`         | Usuario |
| `PGPASSWORD`      | `postgres`         | Contraseña |
| `PGDATABASE`      | `active_recall`    | Base (`recalldb` en el ejemplo local) |
| `PGPOOL_MAX`      | `10`               | Tamaño del pool |
| `PGSSLMODE`       | —                  | `require` si la base es RDS o Aurora |
| `PGSSL_REJECT_UNAUTHORIZED` | `true` si hay SSL | Pon `false` solo si el CA de RDS no está instalado |
| `PGIDLE_TIMEOUT_MS` | `30000`          | Cierra clientes idle (ayuda a Aurora a pausar) |
| `PGCONNECTION_TIMEOUT_MS` | `5000`     | Con Aurora a 0 ACU usa ≥ `20000` (tarda ~15 s en despertar) |
| `PASSWORD_PEPPER` | —                  | Obligatorio en serio: se mezcla con la clave antes de scrypt |
| `JWT_SECRET`      | —                  | Firma HMAC de las sesiones |
| `JWT_EXPIRES_IN`  | `7d`               | Caducidad del token (`15m`, `7d`, …) |

Genera secretos largos y aleatorios para `PASSWORD_PEPPER` y `JWT_SECRET`. Si
rotas el pepper, las contraseñas guardadas dejan de validar.

---

## Documentación adicional

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — capas, esquema, retención y decisiones.
- [`deploy.md`](deploy.md) — despliegue en AWS (Lightsail barato; RDS/Aurora
  opcional y de pago). El front se publica en Vercel (`*.vercel.app`).
