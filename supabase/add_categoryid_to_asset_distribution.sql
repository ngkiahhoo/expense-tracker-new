alter table asset_distribution_records
add column if not exists category_id integer;

-- Ensure the foreign key points to the distribution categories table,
-- not the bookkeeping categories table.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_asset_distribution_category'
      AND conrelid = 'asset_distribution_records'::regclass
  ) THEN
    ALTER TABLE asset_distribution_records
    DROP CONSTRAINT IF EXISTS fk_asset_distribution_category;
  END IF;

  ALTER TABLE asset_distribution_records
  ADD CONSTRAINT fk_asset_distribution_category
  FOREIGN KEY (category_id) REFERENCES asset_distribution_categories(id) ON DELETE SET NULL;
END$$ LANGUAGE plpgsql;
