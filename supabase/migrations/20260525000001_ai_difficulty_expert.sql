-- Add expert difficulty, rename medium→hard and hard→expert, recalculate ELO.
-- New ladder: easy (600) | medium/depth-1 (1000) | hard/depth-2 (1200) | expert/depth-3 (1400)

begin;

-- 1. Widen the check constraint to include 'expert'.
alter table matches drop constraint if exists matches_ai_difficulty_check;
alter table matches add constraint matches_ai_difficulty_check
  check (ai_difficulty is null or ai_difficulty = any (
    array['easy'::text, 'medium'::text, 'hard'::text, 'expert'::text]
  ));

-- 2. Rename existing difficulties (hard → expert first to avoid collision).
update matches set ai_difficulty = 'expert' where ai_difficulty = 'hard';
update matches set ai_difficulty = 'hard'   where ai_difficulty = 'medium';

-- 3. Recalculate ELO for the renamed matches using the corrected AI ratings.
--    hard   (was medium): old AI ELO 1000 → new 1200
--    expert (was hard):   old AI ELO 1200 → new 1400
--    Draws already give 0 delta (fixed earlier); that rule is preserved here.
--    Cumulative correction propagates the delta difference through sequential
--    games for each player, preserving PvP ELO changes between AI games.

do $$
declare
  v_player_id          uuid;
  v_cumulative_corr    int;
  v_ai_elo_new         int;
  v_corrected_before   int;
  v_delta_old          int;
  v_delta_new          int;
  v_actual             float;
  v_expected_new       float;
  rec                  record;
begin
  for v_player_id in (
    select distinct white_id
    from matches
    where black_id is null
      and white_elo_before is not null
      and ai_difficulty in ('hard', 'expert')
  ) loop

    v_cumulative_corr := 0;

    for rec in (
      select id, result, ai_difficulty, white_elo_before, white_elo_after
      from matches
      where white_id = v_player_id
        and black_id is null
        and white_elo_before is not null
        and ai_difficulty in ('hard', 'expert')
      order by played_at asc
    ) loop

      v_ai_elo_new := case rec.ai_difficulty when 'hard' then 1200 else 1400 end;

      v_delta_old        := rec.white_elo_after - rec.white_elo_before;
      v_corrected_before := rec.white_elo_before + v_cumulative_corr;

      if rec.result = 'draw' then
        v_delta_new := 0;
      else
        v_actual       := case rec.result when 'white' then 1.0 else 0.0 end;
        v_expected_new := 1.0 / (1 + power(10, (v_ai_elo_new - v_corrected_before)::float / 400));
        v_delta_new    := round(32 * (v_actual - v_expected_new))::int;
      end if;

      update matches
         set white_elo_before = v_corrected_before,
             white_elo_after  = v_corrected_before + v_delta_new,
             black_elo_before = v_ai_elo_new,
             black_elo_after  = v_ai_elo_new
       where id = rec.id;

      v_cumulative_corr := v_cumulative_corr + (v_delta_new - v_delta_old);
    end loop;

    update profiles set elo = elo + v_cumulative_corr where id = v_player_id;

  end loop;
end $$;

commit;
