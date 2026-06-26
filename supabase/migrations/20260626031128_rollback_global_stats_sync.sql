-- Rollback del sync global (Opción B: Stats aislados por grupo)
-- Eliminamos el trigger para que los stats de un jugador puedan 
-- ser diferentes en distintos grupos y evaluados por cada admin.

drop trigger if exists trg_sync_user_player_cards on public.players;
drop function if exists public.sync_user_player_cards();
