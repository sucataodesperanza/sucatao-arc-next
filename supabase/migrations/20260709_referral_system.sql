-- Sistema de Indicações
-- Migração aditiva: não remove nem altera colunas existentes

-- Código de indicação de cada usuário (1 por usuário)
CREATE TABLE IF NOT EXISTS referral_codes (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code         text        NOT NULL UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Registro de cada indicação
CREATE TABLE IF NOT EXISTS referrals (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id             uuid        NOT NULL REFERENCES auth.users(id),
  referred_id             uuid        UNIQUE REFERENCES auth.users(id),
  code_used               text        NOT NULL,
  -- registered | pending_requirements | confirmed | reward_delivered | cancelled
  status                  text        NOT NULL DEFAULT 'registered',
  registered_at           timestamptz DEFAULT now(),
  contract_accepted_at    timestamptz,
  contract_completed_at   timestamptz,
  confirmed_at            timestamptz,
  reward_delivered_at     timestamptz,
  cancelled_at            timestamptz,
  origin                  text,
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- Configuração de recompensas (admin)
CREATE TABLE IF NOT EXISTS referral_reward_configs (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text        NOT NULL,
  description    text,
  -- points | sucatas | item | custom
  reward_type    text        NOT NULL DEFAULT 'points',
  reward_amount  numeric     NOT NULL DEFAULT 0,
  -- registered | confirmed | reward_delivered
  trigger_status text        NOT NULL DEFAULT 'confirmed',
  active         boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE referral_codes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_reward_configs ENABLE ROW LEVEL SECURITY;

-- Policies: usuário vê apenas o próprio código
CREATE POLICY "user sees own referral code"
  ON referral_codes FOR SELECT
  USING (auth.uid() = user_id);

-- Usuário pode ver indicações onde é o referrer
CREATE POLICY "user sees own referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = referrer_id);

-- Configurações de recompensa: qualquer autenticado pode ler (para exibir no perfil)
CREATE POLICY "authenticated read reward configs"
  ON referral_reward_configs FOR SELECT
  TO authenticated
  USING (active = true);
