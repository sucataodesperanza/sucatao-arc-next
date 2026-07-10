-- Migração aditiva: suporte a recompensa para o indicado e rastreamento de entregas

-- Campo de recompensa para o indicado na mesma config
ALTER TABLE referral_reward_configs
  ADD COLUMN IF NOT EXISTS reward_amount_referred numeric NOT NULL DEFAULT 0;

-- Tabela de entregas realizadas (evita dupla entrega)
CREATE TABLE IF NOT EXISTS referral_reward_deliveries (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id  uuid        NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  config_id    uuid        NOT NULL REFERENCES referral_reward_configs(id) ON DELETE CASCADE,
  delivered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(referral_id, config_id)
);

ALTER TABLE referral_reward_deliveries ENABLE ROW LEVEL SECURITY;
