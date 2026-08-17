-- ============================================================
-- 003_create_flashcards.sql
-- Flashcards: the questions reviewed via spaced repetition.
-- Maps to the original "Repeticiones espaciadas" entity.
-- Depends on: 002_create_topics.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS flashcards (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    question   TEXT        NOT NULL,
    topic_id   UUID        NOT NULL,
    subject_id UUID        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT flashcards_question_not_blank CHECK (length(btrim(question)) > 0),
    CONSTRAINT flashcards_topic_fk FOREIGN KEY (topic_id)
        REFERENCES topics (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT flashcards_subject_fk FOREIGN KEY (subject_id)
        REFERENCES subjects (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_flashcards_topic_id   ON flashcards (topic_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_subject_id ON flashcards (subject_id);

COMMENT ON TABLE  flashcards            IS 'Questions reviewed via spaced repetition (Repeticiones espaciadas).';
COMMENT ON COLUMN flashcards.question   IS 'Required question prompt shown during a review.';
COMMENT ON COLUMN flashcards.topic_id   IS 'FK to topics.id (was "temaId").';
COMMENT ON COLUMN flashcards.subject_id IS 'FK to subjects.id — denormalized for subject delete/filter.';

CREATE OR REPLACE TRIGGER trg_flashcards_updated_at
BEFORE UPDATE ON flashcards
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
