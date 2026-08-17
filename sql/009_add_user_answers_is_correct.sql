-- ============================================================
-- 009_add_user_answers_is_correct.sql
-- Stores whether the learner got that flashcard right on this attempt.
-- NULL = still waiting (open answer typed but not self-graded).
-- Depends on: 007_create_user_answers.sql
-- ============================================================

ALTER TABLE user_answers
    ADD COLUMN IF NOT EXISTS is_correct BOOLEAN;

COMMENT ON COLUMN user_answers.is_correct IS 'NULL = not graded yet; true = remembered; false = missed. Overwritten on the next review attempt.';
