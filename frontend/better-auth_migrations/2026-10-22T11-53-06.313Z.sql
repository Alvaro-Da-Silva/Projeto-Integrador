-- -----------------------------------------------------------------------------
-- DO NOT RUN THIS SCRIPT AS IT IS.
-- Applying it to a populated database corrupts the rows it touches:
--
-- Cannot add required column "patent" to populated table "user": the schema declares no default value, so existing rows have no value to backfill. MySQL accepts this statement instead of rejecting it and fills every existing row with an implicit default for the column type, reporting a successful migration over corrupted data. For a text column, every existing row ends up with the same empty string. Add the column as nullable, backfill a correct value for every row, then make it NOT NULL.
-- -----------------------------------------------------------------------------
alter table "user" add column "patent" text;