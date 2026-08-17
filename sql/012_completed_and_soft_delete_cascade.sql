-- ============================================================
-- 012_completed_and_soft_delete_cascade.sql
-- 1. Rename active_recall.correct_answer → completed (boolean, default false).
--    completed = the learner answered every question of that review,
--    regardless of whether the answers were right or wrong.
-- 2. Functions that soft-delete a subject or a topic and every related row
--    (topics, flashcards, answers, active_recall, user_answers).
--
-- Do not run this from the app. Apply it manually after 011.
-- ============================================================

-- --- completed flag (legacy DBs that still have correct_answer) ----------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'active_recall'
           AND column_name = 'correct_answer'
    ) THEN
        ALTER TABLE active_recall
            ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT false;

        UPDATE active_recall
           SET completed = true
         WHERE correct_answer IS NOT NULL;

        ALTER TABLE active_recall
            DROP COLUMN correct_answer;
    ELSIF NOT EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'active_recall'
           AND column_name = 'completed'
    ) THEN
        ALTER TABLE active_recall
            ADD COLUMN completed BOOLEAN NOT NULL DEFAULT false;
    END IF;
END
$$;

COMMENT ON COLUMN active_recall.completed IS
    'false = review still open; true = every question of the topic was answered (right or wrong).';

CREATE INDEX IF NOT EXISTS idx_active_recall_completed
    ON active_recall (completed)
    WHERE completed = false;

-- --- relationship reminder (already enforced by FKs) ----------
-- subjects 1──* topics
-- topics   1──* flashcards  1──* answers
-- topics   1──* active_recall
-- topics   1──* user_answers
-- subjects 1──* user_answers

-- --- cascade soft-delete: topic -------------------------------
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
     WHERE deleted = false
       AND flashcard_id IN (
           SELECT id FROM flashcards WHERE topic_id = p_topic_id
       );

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

COMMENT ON FUNCTION soft_delete_topic(UUID) IS
    'Soft-deletes a topic and its flashcards, answers, recalls and user answers.';

-- --- cascade soft-delete: subject -----------------------------
CREATE OR REPLACE FUNCTION soft_delete_subject(p_subject_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    topic_row RECORD;
    any_topic BOOLEAN := false;
BEGIN
    UPDATE subjects
       SET deleted = true
     WHERE id = p_subject_id
       AND deleted = false;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    FOR topic_row IN
        SELECT id FROM topics WHERE subject_id = p_subject_id AND deleted = false
    LOOP
        PERFORM soft_delete_topic(topic_row.id);
        any_topic := true;
    END LOOP;

    -- Topics already deleted still have children that must go with the subject.
    IF NOT any_topic THEN
        UPDATE flashcards
           SET deleted = true
         WHERE deleted = false
           AND topic_id IN (SELECT id FROM topics WHERE subject_id = p_subject_id);

        UPDATE answers
           SET deleted = true
         WHERE deleted = false
           AND flashcard_id IN (
               SELECT f.id
                 FROM flashcards f
                 JOIN topics t ON t.id = f.topic_id
                WHERE t.subject_id = p_subject_id
           );

        UPDATE active_recall
           SET deleted = true
         WHERE deleted = false
           AND topic_id IN (SELECT id FROM topics WHERE subject_id = p_subject_id);
    END IF;

    UPDATE user_answers
       SET deleted = true
     WHERE subject_id = p_subject_id
       AND deleted = false;

    RETURN true;
END;
$$;

COMMENT ON FUNCTION soft_delete_subject(UUID) IS
    'Soft-deletes a subject and every topic, question, answer, recall and user answer under it.';
