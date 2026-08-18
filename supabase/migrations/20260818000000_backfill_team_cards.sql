INSERT INTO team_cards (user_id, stats, primary_position, secondary_position) 
SELECT 
  user_id, 
  CASE 
    WHEN primary_position = 'ARQ' THEN '{"div": 75, "han": 75, "kic": 75, "ref": 75, "spd": 75, "pos": 75}'::jsonb
    ELSE '{"def": 75, "dri": 75, "pac": 75, "pas": 75, "phy": 75, "sho": 75}'::jsonb
  END, 
  primary_position, 
  (CASE WHEN primary_position = 'MED' THEN 'DEL' ELSE 'MED' END)::player_position 
FROM players 
WHERE user_id NOT IN (SELECT user_id FROM team_cards) AND archived_at IS NULL 
ON CONFLICT (user_id) DO NOTHING;
