-- ============================================================
-- 004_create_answer_types.sql
-- Answer types (Tipo de respuesta): the kind of answer a flashcard expects.
-- Seeds the three supported types:
--   * single_choice   → single-select (una única respuesta de selección)
--   * multiple_choice → multi-select (selección múltiple)
--   * open_answer     → free text (respuesta abierta)
-- Depends on: 000_init.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS answer_types (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code       VARCHAR(30) NOT NULL,
    name       VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT answer_types_code_unique UNIQUE (code),
    CONSTRAINT answer_types_code_not_blank CHECK (length(btrim(code)) > 0),
    CONSTRAINT answer_types_name_not_blank CHECK (length(btrim(name)) > 0)
);

COMMENT ON TABLE  answer_types      IS 'Kinds of answer a flashcard expects (Tipo de respuesta).';
COMMENT ON COLUMN answer_types.code IS 'Stable machine code: single_choice | multiple_choice | open_answer.';
COMMENT ON COLUMN answer_types.name IS 'Human-readable label shown in the UI.';

CREATE OR REPLACE TRIGGER trg_answer_types_updated_at
BEFORE UPDATE ON answer_types
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Seed the three supported types (idempotent thanks to the unique code).
INSERT INTO answer_types (code, name) VALUES
    ('single_choice',   'Selección única'),
    ('multiple_choice', 'Selección múltiple'),
    ('open_answer',     'Respuesta abierta')
ON CONFLICT (code) DO NOTHING;
