-- ============================================================
-- 011_add_deleted_and_user_enabled.sql
-- Soft-delete flag on every table. Users also get `enabled`
-- (only enabled = true accounts may sign in).
-- Depends on: 001–010. Safe to re-run.
-- Do not execute automatically from the app.
-- ============================================================

-- --- Soft delete (false = visible / active row) ---
ALTER TABLE subjects
    ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE topics
    ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE flashcards
    ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE answer_types
    ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE answers
    ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE user_answers
    ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE active_recall
    ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT false;

-- --- Users: may sign in only when enabled = true ---
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN subjects.deleted      IS 'true = baja lógica; el registro no se borra.';
COMMENT ON COLUMN topics.deleted        IS 'true = baja lógica; el registro no se borra.';
COMMENT ON COLUMN flashcards.deleted    IS 'true = baja lógica; el registro no se borra.';
COMMENT ON COLUMN answer_types.deleted  IS 'true = baja lógica; el registro no se borra.';
COMMENT ON COLUMN answers.deleted       IS 'true = baja lógica; el registro no se borra.';
COMMENT ON COLUMN user_answers.deleted  IS 'true = baja lógica; el registro no se borra.';
COMMENT ON COLUMN active_recall.deleted IS 'true = baja lógica; el registro no se borra.';
COMMENT ON COLUMN users.deleted         IS 'true = baja lógica; el registro no se borra.';
COMMENT ON COLUMN users.enabled         IS 'true = puede iniciar sesión; false = cuenta deshabilitada.';

CREATE INDEX IF NOT EXISTS idx_subjects_deleted      ON subjects (deleted);
CREATE INDEX IF NOT EXISTS idx_topics_deleted        ON topics (deleted);
CREATE INDEX IF NOT EXISTS idx_flashcards_deleted    ON flashcards (deleted);
CREATE INDEX IF NOT EXISTS idx_answer_types_deleted  ON answer_types (deleted);
CREATE INDEX IF NOT EXISTS idx_answers_deleted       ON answers (deleted);
CREATE INDEX IF NOT EXISTS idx_user_answers_deleted  ON user_answers (deleted);
CREATE INDEX IF NOT EXISTS idx_active_recall_deleted ON active_recall (deleted);
CREATE INDEX IF NOT EXISTS idx_users_deleted         ON users (deleted);
CREATE INDEX IF NOT EXISTS idx_users_enabled         ON users (enabled);
