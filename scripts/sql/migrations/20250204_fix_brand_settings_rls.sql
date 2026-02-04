-- Migration: Fix RLS policy violation when creating new brands
-- Date: 2025-02-04
-- Description: Make the create_default_brand_settings() function SECURITY DEFINER
--              to bypass RLS when auto-creating brand_settings for new brands

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS create_brand_settings_trigger ON brands;

-- Recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION create_default_brand_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO brand_settings (brand_id)
  VALUES (NEW.id)
  ON CONFLICT (brand_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER create_brand_settings_trigger
  AFTER INSERT ON brands
  FOR EACH ROW
  EXECUTE FUNCTION create_default_brand_settings();

-- Add comment explaining the SECURITY DEFINER
COMMENT ON FUNCTION create_default_brand_settings() IS 
  'Auto-creates default brand_settings when a brand is inserted. 
   SECURITY DEFINER allows this function to bypass RLS policies, 
   which is necessary because the trigger runs in the user''s context 
   but needs to insert into brand_settings which has RLS enabled.';
