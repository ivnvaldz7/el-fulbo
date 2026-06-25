-- Cura todos los players que estan pending_approval pero cuyo usuario
-- ya tiene al menos una carta approved en OTRO grupo.
-- Se actualizan a approved automaticamente.
--
-- Esto resuelve el caso de usuarios que quedaron con pending_approval
-- al unirse a un nuevo grupo y cuya carta se creo con estado pending_approval
-- cuando ya tenian una carta approved en otro grupo.

update public.players p
set stats_status = 'approved'
where p.stats_status = 'pending_approval'
  and exists (
    select 1
    from public.players other
    where other.user_id = p.user_id
      and other.id <> p.id
      and other.stats_status = 'approved'
  );
