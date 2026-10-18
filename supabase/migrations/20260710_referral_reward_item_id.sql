-- Migração aditiva: campo item_id para recompensas do tipo item

ALTER TABLE referral_reward_configs
  ADD COLUMN IF NOT EXISTS item_id text REFERENCES public.catalog_items(id) ON DELETE SET NULL;
