-- ============================================================
-- 006_create_answers.sql
-- Answers: the answer options that belong to a flashcard.
-- Each option carries whether it is correct, so a flashcard can have one
-- correct option (single_choice) or several (multiple_choice).
-- Depends on: 003_create_flashcards.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS answers (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    answer_text  TEXT        NOT NULL,
    is_correct   BOOLEAN     NOT NULL DEFAULT false,
    flashcard_id UUID        NOT NULL,
    topic_id     UUID        NOT NULL,
    subject_id   UUID        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT answers_text_not_blank CHECK (length(btrim(answer_text)) > 0),
    CONSTRAINT answers_flashcard_fk FOREIGN KEY (flashcard_id)
        REFERENCES flashcards (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT answers_topic_fk FOREIGN KEY (topic_id)
        REFERENCES topics (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT answers_subject_fk FOREIGN KEY (subject_id)
        REFERENCES subjects (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_answers_flashcard_id ON answers (flashcard_id);
CREATE INDEX IF NOT EXISTS idx_answers_topic_id     ON answers (topic_id);
CREATE INDEX IF NOT EXISTS idx_answers_subject_id   ON answers (subject_id);

COMMENT ON TABLE  answers              IS 'Answer options that belong to a flashcard.';
COMMENT ON COLUMN answers.answer_text  IS 'Required text of this answer option.';
COMMENT ON COLUMN answers.is_correct   IS 'True when this option is a correct answer for the flashcard.';
COMMENT ON COLUMN answers.flashcard_id IS 'FK to flashcards.id — the question this option belongs to.';
COMMENT ON COLUMN answers.topic_id     IS 'FK to topics.id — denormalized for topic delete/filter.';
COMMENT ON COLUMN answers.subject_id   IS 'FK to subjects.id — denormalized for subject delete/filter.';

CREATE OR REPLACE TRIGGER trg_answers_updated_at
BEFORE UPDATE ON answers
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
