-- Currency BRL to EUR migration (rate 0.18 — see BRL_TO_EUR_RATE)

ALTER TABLE "Quote" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EUR';
ALTER TABLE "Service" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EUR';

UPDATE "Quote" SET
  "total" = ROUND(("total" * 0.18)::numeric, 2)::double precision,
  "discount" = ROUND(("discount" * 0.18)::numeric, 2)::double precision,
  "currency" = 'EUR';

UPDATE "Service" SET
  "price" = ROUND(("price" * 0.18)::numeric, 2)::double precision,
  "currency" = 'EUR';

UPDATE "Task"
SET "orcamento" = (
  COALESCE("orcamento"::jsonb, '{}'::jsonb)
  || jsonb_build_object(
    'valor', ROUND(((COALESCE("orcamento"->>'valor', '0'))::numeric * 0.18)::numeric, 2),
    'deposito', ROUND(((COALESCE("orcamento"->>'deposito', '0'))::numeric * 0.18)::numeric, 2),
    'saldo', ROUND(((COALESCE("orcamento"->>'saldo', '0'))::numeric * 0.18)::numeric, 2),
    'currency', 'EUR'
  )
)
WHERE "orcamento" IS NOT NULL;
