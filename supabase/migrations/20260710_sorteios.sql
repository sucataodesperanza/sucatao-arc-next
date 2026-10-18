-- Sistema de Sorteios
-- Migração aditiva

CREATE TABLE IF NOT EXISTS sorteios (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text        NOT NULL,
  description  text,
  image_url    text,
  badge        text,                           -- "EXCLUSIVO", "RARO", etc.
  badge_color  text        NOT NULL DEFAULT 'purple', -- purple | yellow | cyan | red | green
  ticket_price integer     NOT NULL DEFAULT 10, -- em pontos
  max_tickets  integer     NOT NULL,
  tickets_sold integer     NOT NULL DEFAULT 0,
  -- upcoming | active | finished | cancelled
  status       text        NOT NULL DEFAULT 'upcoming',
  starts_at    timestamptz NOT NULL,
  ends_at      timestamptz NOT NULL,
  winner_id    uuid        REFERENCES auth.users(id),
  winner_ticket integer,
  winner_name  text,
  drawn_at     timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sorteio_tickets (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sorteio_id    uuid        NOT NULL REFERENCES sorteios(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES auth.users(id),
  ticket_number integer     NOT NULL,
  purchased_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sorteio_id, ticket_number)
);

CREATE INDEX IF NOT EXISTS sorteio_tickets_sorteio_idx ON sorteio_tickets(sorteio_id);
CREATE INDEX IF NOT EXISTS sorteio_tickets_user_idx    ON sorteio_tickets(user_id);
CREATE INDEX IF NOT EXISTS sorteios_status_idx         ON sorteios(status);

ALTER TABLE sorteios         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sorteio_tickets  ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode ver sorteios
CREATE POLICY "sorteios_public_read"
  ON sorteios FOR SELECT
  TO authenticated
  USING (true);

-- Usuário vê próprios tickets
CREATE POLICY "sorteio_tickets_own"
  ON sorteio_tickets FOR SELECT
  USING (auth.uid() = user_id);

-- Função atômica para compra de tickets (evita race condition no número sequencial)
CREATE OR REPLACE FUNCTION buy_sorteio_tickets(
  p_sorteio_id uuid,
  p_user_id    uuid,
  p_quantity   integer
) RETURNS TABLE(ticket_number integer) AS $$
DECLARE
  v_sorteio  sorteios%ROWTYPE;
  v_start    integer;
  v_i        integer;
BEGIN
  SELECT * INTO v_sorteio FROM sorteios WHERE id = p_sorteio_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sorteio não encontrado';
  END IF;
  IF v_sorteio.status != 'active' THEN
    RAISE EXCEPTION 'Sorteio não está ativo';
  END IF;
  IF now() > v_sorteio.ends_at THEN
    RAISE EXCEPTION 'Sorteio encerrado';
  END IF;
  IF v_sorteio.tickets_sold + p_quantity > v_sorteio.max_tickets THEN
    RAISE EXCEPTION 'Tickets insuficientes disponíveis';
  END IF;

  v_start := v_sorteio.tickets_sold + 1;

  FOR v_i IN 0..p_quantity-1 LOOP
    INSERT INTO sorteio_tickets(sorteio_id, user_id, ticket_number)
    VALUES (p_sorteio_id, p_user_id, v_start + v_i);
    ticket_number := v_start + v_i;
    RETURN NEXT;
  END LOOP;

  UPDATE sorteios SET tickets_sold = tickets_sold + p_quantity WHERE id = p_sorteio_id;
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
