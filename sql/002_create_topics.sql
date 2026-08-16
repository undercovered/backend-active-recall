-- ============================================================
-- 002_create_topics.sql
-- Topics: units of study that belong to a subject.
-- Maps to the original "Temas" entity.
-- Depends on: 001_create_subjects.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS topics (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(150) NOT NULL,
    description TEXT,
    subject_id  UUID         NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT topics_title_not_blank CHECK (length(btrim(title)) > 0),
    CONSTRAINT topics_subject_fk FOREIGN KEY (subject_id)
        REFERENCES subjects (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Speeds up "all topics for a subject" lookups.
CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON topics (subject_id);

COMMENT ON TABLE  topics             IS 'Study units that belong to a subject (Temas).';
COMMENT ON COLUMN topics.title       IS 'Required, human-readable topic name.';
COMMENT ON COLUMN topics.description IS 'Optional longer description of the topic.';
COMMENT ON COLUMN topics.subject_id  IS 'FK to subjects.id (was "asignaturaId").';

CREATE OR REPLACE TRIGGER trg_topics_updated_at
BEFORE UPDATE ON topics
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
