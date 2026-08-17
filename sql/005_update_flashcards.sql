-- ============================================================
-- 005_update_flashcards.sql  (a.k.a. "update_flashcards")
-- Adds the answer type to flashcards so every question knows whether it is
-- single-select, multi-select or open answer.
-- Depends on: 003_create_flashcards.sql, 004_create_answer_types.sql
-- ============================================================

-- 1) Add the column (nullable for now so existing rows don't break).
ALTER TABLE flashcards
    ADD COLUMN IF NOT EXISTS answer_type_id UUID;

-- 2) Backfill any existing flashcards to "single_choice" so we can enforce NOT NULL.
UPDATE flashcards f
SET answer_type_id = at.id
FROM answer_types at
WHERE at.code = 'single_choice'
  AND f.answer_type_id IS NULL;

-- 3) Now require it.
ALTER TABLE flashcards
    ALTER COLUMN answer_type_id SET NOT NULL;

-- 4) Wire the foreign key (guarded so the script is safe to re-run).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'flashcards_answer_type_fk'
    ) THEN
        ALTER TABLE flashcards
            ADD CONSTRAINT flashcards_answer_type_fk FOREIGN KEY (answer_type_id)
                REFERENCES answer_types (id)
                ON DELETE RESTRICT
                ON UPDATE CASCADE;
    END IF;
END $$;

-- 5) Speed up filtering flashcards by their answer type.
CREATE INDEX IF NOT EXISTS idx_flashcards_answer_type_id ON flashcards (answer_type_id);

COMMENT ON COLUMN flashcards.answer_type_id IS 'FK to answer_types.id — how this question is answered.';
