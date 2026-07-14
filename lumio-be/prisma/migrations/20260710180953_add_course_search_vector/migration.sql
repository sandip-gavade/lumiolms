-- Postgres full-text search for the course catalog (FR-2.1).
-- Prisma models `search_vector` as an Unsupported("tsvector") column so it shows up in the
-- schema/client types, but Prisma cannot generate the column's population logic — that's
-- hand-written here as a trigger so the column self-maintains on every insert/update and
-- callers never have to remember to refresh it.
--
-- Weighting: title (A) ranks highest, short_desc (B) next, long_desc (C) lowest, so a title
-- match outranks a body-text match in ts_rank ordering.

CREATE OR REPLACE FUNCTION courses_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.short_desc, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.long_desc, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER courses_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, short_desc, long_desc ON courses
  FOR EACH ROW
  EXECUTE FUNCTION courses_search_vector_update();

-- Backfill existing rows (no-op on a fresh database, safe on a populated one).
UPDATE courses SET title = title;

CREATE INDEX courses_search_vector_idx ON courses USING GIN (search_vector);
