
-- Start a new transaction
CREATE OR REPLACE FUNCTION start_transaction()
RETURNS text AS $$
BEGIN
  RETURN 'BEGIN;';
END;
$$ LANGUAGE plpgsql;

-- Commit the current transaction
CREATE OR REPLACE FUNCTION commit_transaction()
RETURNS text AS $$
BEGIN
  RETURN 'COMMIT;';
END;
$$ LANGUAGE plpgsql;

-- Rollback the current transaction
CREATE OR REPLACE FUNCTION rollback_transaction()
RETURNS text AS $$
BEGIN
  RETURN 'ROLLBACK;';
END;
$$ LANGUAGE plpgsql;
