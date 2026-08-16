-- ============================================================
-- 001_create_subjects.sql
-- Subjects: top-level study areas (e.g. "Mathematics", "History").
-- Maps to the original "Asignatura" entity.
-- ============================================================

CREATE TABLE IF NOT EXISTS subjects (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(150) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT subjects_title_not_blank CHECK (length(btrim(title)) > 0)
);

COMMENT ON TABLE  subjects             IS 'Top-level study areas (Asignaturas).';
COMMENT ON COLUMN subjects.title       IS 'Required, human-readable subject name.';
COMMENT ON COLUMN subjects.description IS 'Optional longer description of the subject.';

CREATE OR REPLACE TRIGGER trg_subjects_updated_at
BEFORE UPDATE ON subjects
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
