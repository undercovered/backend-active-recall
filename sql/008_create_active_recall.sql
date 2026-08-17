-- ============================================================
-- 008_create_active_recall.sql
-- Active recall schedule: the dates on which a topic must be reviewed.
-- One row per planned review. `correct_answer` stays NULL until the learner
-- actually reviews that date (true = remembered, false = missed).
-- Depends on: 002_create_topics.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS active_recall (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    date_recall    TIMESTAMPTZ NOT NULL,
    correct_answer BOOLEAN,
    topic_id       UUID        NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT active_recall_topic_fk FOREIGN KEY (topic_id)
        REFERENCES topics (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_active_recall_topic_id    ON active_recall (topic_id);
CREATE INDEX IF NOT EXISTS idx_active_recall_date_recall ON active_recall (date_recall);

COMMENT ON TABLE  active_recall                IS 'Spaced-repetition review dates for a topic.';
COMMENT ON COLUMN active_recall.date_recall    IS 'When this review is due (computed from the topic creation date).';
COMMENT ON COLUMN active_recall.correct_answer IS 'NULL = not reviewed yet; true = remembered; false = missed.';
COMMENT ON COLUMN active_recall.topic_id       IS 'FK to topics.id — the topic this review belongs to.';

CREATE OR REPLACE TRIGGER trg_active_recall_updated_at
BEFORE UPDATE ON active_recall
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
