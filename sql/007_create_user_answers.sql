-- ============================================================
-- 007_create_user_answers.sql
-- User answers: what the learner picked/typed when reviewing a flashcard.
-- Relates the attempt to the subject, the topic and the flashcard, and
-- records the chosen option (or the free-text response for open answers).
--
-- For multiple_choice there is one row per selected option, sharing the
-- same attempt_id. For single_choice / open_answer there is a single row.
-- Depends on: 001_create_subjects.sql, 002_create_topics.sql,
--             003_create_flashcards.sql, 006_create_answers.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS user_answers (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id    UUID        NOT NULL DEFAULT gen_random_uuid(),
    flashcard_id  UUID        NOT NULL,
    answer_id     UUID,                 -- chosen option (NULL for open_answer)
    open_response TEXT,                 -- typed text (NULL for choice types)
    subject_id    UUID        NOT NULL,
    topic_id      UUID        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT user_answers_flashcard_fk FOREIGN KEY (flashcard_id)
        REFERENCES flashcards (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT user_answers_answer_fk FOREIGN KEY (answer_id)
        REFERENCES answers (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT user_answers_subject_fk FOREIGN KEY (subject_id)
        REFERENCES subjects (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT user_answers_topic_fk FOREIGN KEY (topic_id)
        REFERENCES topics (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    -- A row is either a chosen option or a typed response, never both/neither.
    CONSTRAINT user_answers_choice_xor_open CHECK (
        (answer_id IS NOT NULL AND open_response IS NULL)
        OR (answer_id IS NULL AND open_response IS NOT NULL AND length(btrim(open_response)) > 0)
    )
);

-- "All attempts for a flashcard" / "history of a topic" / "history of a subject".
CREATE INDEX IF NOT EXISTS idx_user_answers_flashcard_id ON user_answers (flashcard_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_topic_id     ON user_answers (topic_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_subject_id   ON user_answers (subject_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_attempt_id   ON user_answers (attempt_id);

COMMENT ON TABLE  user_answers               IS 'What the learner picked/typed when reviewing a flashcard (respuestas por parte del usuario).';
COMMENT ON COLUMN user_answers.attempt_id    IS 'Groups the rows of a single review attempt (one row per selected option in multiple_choice).';
COMMENT ON COLUMN user_answers.flashcard_id  IS 'FK to flashcards.id — the question that was reviewed.';
COMMENT ON COLUMN user_answers.answer_id     IS 'FK to answers.id — the option the user selected (NULL for open answers).';
COMMENT ON COLUMN user_answers.open_response IS 'Free-text response for open_answer flashcards (NULL for choice types).';
COMMENT ON COLUMN user_answers.subject_id    IS 'FK to subjects.id — the subject this review belongs to.';
COMMENT ON COLUMN user_answers.topic_id      IS 'FK to topics.id — the topic this review belongs to.';
