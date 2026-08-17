-- ============================================================
-- 013_denormalize_subject_and_topic_fks.sql
-- Copy subject_id (and topic_id on answers) onto child tables so deletes
-- and filters hit one indexed column instead of walking
-- subject → topics → flashcards → answers.
--
-- Apply after 012. Do not run this from the app.
-- ============================================================

-- --- flashcards.subject_id -----------------------------------
ALTER TABLE flashcards
    ADD COLUMN IF NOT EXISTS subject_id UUID;

UPDATE flashcards f
   SET subject_id = t.subject_id
  FROM topics t
 WHERE t.id = f.topic_id
   AND f.subject_id IS NULL;

ALTER TABLE flashcards
    ALTER COLUMN subject_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'flashcards_subject_fk'
    ) THEN
        ALTER TABLE flashcards
            ADD CONSTRAINT flashcards_subject_fk FOREIGN KEY (subject_id)
                REFERENCES subjects (id)
                ON DELETE CASCADE
                ON UPDATE CASCADE;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_flashcards_subject_id ON flashcards (subject_id);

COMMENT ON COLUMN flashcards.subject_id IS
    'FK to subjects.id — denormalized so a subject delete/filter does not walk topics.';

-- --- answers.topic_id + answers.subject_id -------------------
ALTER TABLE answers
    ADD COLUMN IF NOT EXISTS topic_id UUID;

ALTER TABLE answers
    ADD COLUMN IF NOT EXISTS subject_id UUID;

UPDATE answers a
   SET topic_id   = f.topic_id,
       subject_id = COALESCE(f.subject_id, t.subject_id)
  FROM flashcards f
  JOIN topics t ON t.id = f.topic_id
 WHERE a.flashcard_id = f.id
   AND (a.topic_id IS NULL OR a.subject_id IS NULL);

ALTER TABLE answers
    ALTER COLUMN topic_id SET NOT NULL;

ALTER TABLE answers
    ALTER COLUMN subject_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'answers_topic_fk'
    ) THEN
        ALTER TABLE answers
            ADD CONSTRAINT answers_topic_fk FOREIGN KEY (topic_id)
                REFERENCES topics (id)
                ON DELETE CASCADE
                ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'answers_subject_fk'
    ) THEN
        ALTER TABLE answers
            ADD CONSTRAINT answers_subject_fk FOREIGN KEY (subject_id)
                REFERENCES subjects (id)
                ON DELETE CASCADE
                ON UPDATE CASCADE;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_answers_topic_id   ON answers (topic_id);
CREATE INDEX IF NOT EXISTS idx_answers_subject_id ON answers (subject_id);

COMMENT ON COLUMN answers.topic_id   IS 'FK to topics.id — denormalized for topic delete/filter.';
COMMENT ON COLUMN answers.subject_id IS 'FK to subjects.id — denormalized for subject delete/filter.';

-- --- active_recall.subject_id --------------------------------
ALTER TABLE active_recall
    ADD COLUMN IF NOT EXISTS subject_id UUID;

UPDATE active_recall ar
   SET subject_id = t.subject_id
  FROM topics t
 WHERE t.id = ar.topic_id
   AND ar.subject_id IS NULL;

ALTER TABLE active_recall
    ALTER COLUMN subject_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'active_recall_subject_fk'
    ) THEN
        ALTER TABLE active_recall
            ADD CONSTRAINT active_recall_subject_fk FOREIGN KEY (subject_id)
                REFERENCES subjects (id)
                ON DELETE CASCADE
                ON UPDATE CASCADE;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_active_recall_subject_id ON active_recall (subject_id);

COMMENT ON COLUMN active_recall.subject_id IS
    'FK to subjects.id — denormalized so due/delete queries do not walk topics.';

-- --- cascade soft-delete by the denormalized keys ------------
CREATE OR REPLACE FUNCTION soft_delete_topic(p_topic_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE topics
       SET deleted = true
     WHERE id = p_topic_id
       AND deleted = false;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    UPDATE flashcards
       SET deleted = true
     WHERE topic_id = p_topic_id
       AND deleted = false;

    UPDATE answers
       SET deleted = true
     WHERE topic_id = p_topic_id
       AND deleted = false;

    UPDATE active_recall
       SET deleted = true
     WHERE topic_id = p_topic_id
       AND deleted = false;

    UPDATE user_answers
       SET deleted = true
     WHERE topic_id = p_topic_id
       AND deleted = false;

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION soft_delete_subject(p_subject_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE subjects
       SET deleted = true
     WHERE id = p_subject_id
       AND deleted = false;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    UPDATE topics
       SET deleted = true
     WHERE subject_id = p_subject_id
       AND deleted = false;

    UPDATE flashcards
       SET deleted = true
     WHERE subject_id = p_subject_id
       AND deleted = false;

    UPDATE answers
       SET deleted = true
     WHERE subject_id = p_subject_id
       AND deleted = false;

    UPDATE active_recall
       SET deleted = true
     WHERE subject_id = p_subject_id
       AND deleted = false;

    UPDATE user_answers
       SET deleted = true
     WHERE subject_id = p_subject_id
       AND deleted = false;

    RETURN true;
END;
$$;
