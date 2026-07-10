-- Migração aditiva: campo sorteio_id para recompensas do tipo raffle_tickets

ALTER TABLE referral_reward_configs
  ADD COLUMN IF NOT EXISTS sorteio_id uuid REFERENCES sorteios(id) ON DELETE SET NULL;
