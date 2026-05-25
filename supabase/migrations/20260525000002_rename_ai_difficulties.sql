-- Rename AI difficulty labels to Beginner / Easy / Medium / Hard.
-- ELO ratings and AI logic are unchanged — this is a label-only rename.
--   easy   (600,  random)    → beginner
--   medium (1000, depth-1)   → easy
--   hard   (1200, depth-2)   → medium
--   expert (1400, depth-3)   → hard

begin;

alter table matches drop constraint if exists matches_ai_difficulty_check;
alter table matches add constraint matches_ai_difficulty_check
  check (ai_difficulty is null or ai_difficulty = any (
    array['beginner'::text, 'easy'::text, 'medium'::text, 'hard'::text]
  ));

-- Rename highest → lowest to avoid collisions.
update matches set ai_difficulty = 'hard'     where ai_difficulty = 'expert';
update matches set ai_difficulty = 'medium'   where ai_difficulty = 'hard';
update matches set ai_difficulty = 'easy'     where ai_difficulty = 'medium';
update matches set ai_difficulty = 'beginner' where ai_difficulty = 'easy';

commit;
