-- Add new phone columns (nullable for backfill)
ALTER TABLE "Client" ADD COLUMN "phoneCountryCode" TEXT;
ALTER TABLE "Client" ADD COLUMN "phoneNationalNumber" TEXT;

ALTER TABLE "Quote" ADD COLUMN "clientPhoneCountryCode" TEXT;
ALTER TABLE "Quote" ADD COLUMN "clientPhoneNationalNumber" TEXT;

ALTER TABLE "Task" ADD COLUMN "clienteTelCountryCode" TEXT;
ALTER TABLE "Task" ADD COLUMN "clienteTelNationalNumber" TEXT;

-- Backfill Client from legacy phone
UPDATE "Client"
SET
  "phoneCountryCode" = CASE
    WHEN regexp_replace("phone", '[^0-9]', '', 'g') ~ '^351' AND length(regexp_replace("phone", '[^0-9]', '', 'g')) > 10 THEN '351'
    WHEN regexp_replace("phone", '[^0-9]', '', 'g') ~ '^55' AND length(regexp_replace("phone", '[^0-9]', '', 'g')) > 10 THEN '55'
    WHEN regexp_replace("phone", '[^0-9]', '', 'g') ~ '^34' AND length(regexp_replace("phone", '[^0-9]', '', 'g')) > 9 THEN '34'
    WHEN length(regexp_replace("phone", '[^0-9]', '', 'g')) BETWEEN 10 AND 11 THEN '55'
    ELSE '34'
  END,
  "phoneNationalNumber" = CASE
    WHEN regexp_replace("phone", '[^0-9]', '', 'g') ~ '^351' AND length(regexp_replace("phone", '[^0-9]', '', 'g')) > 10
      THEN substring(regexp_replace("phone", '[^0-9]', '', 'g') from 4)
    WHEN regexp_replace("phone", '[^0-9]', '', 'g') ~ '^55' AND length(regexp_replace("phone", '[^0-9]', '', 'g')) > 10
      THEN substring(regexp_replace("phone", '[^0-9]', '', 'g') from 3)
    WHEN regexp_replace("phone", '[^0-9]', '', 'g') ~ '^34' AND length(regexp_replace("phone", '[^0-9]', '', 'g')) > 9
      THEN substring(regexp_replace("phone", '[^0-9]', '', 'g') from 3)
    WHEN length(regexp_replace("phone", '[^0-9]', '', 'g')) BETWEEN 10 AND 11
      THEN regexp_replace("phone", '[^0-9]', '', 'g')
    ELSE regexp_replace("phone", '[^0-9]', '', 'g')
  END
WHERE "phone" IS NOT NULL AND trim("phone") <> '';

UPDATE "Client"
SET "phoneCountryCode" = '34', "phoneNationalNumber" = ''
WHERE "phoneCountryCode" IS NULL;

-- Backfill Quote from legacy clientPhone
UPDATE "Quote"
SET
  "clientPhoneCountryCode" = CASE
    WHEN regexp_replace("clientPhone", '[^0-9]', '', 'g') ~ '^351' AND length(regexp_replace("clientPhone", '[^0-9]', '', 'g')) > 10 THEN '351'
    WHEN regexp_replace("clientPhone", '[^0-9]', '', 'g') ~ '^55' AND length(regexp_replace("clientPhone", '[^0-9]', '', 'g')) > 10 THEN '55'
    WHEN regexp_replace("clientPhone", '[^0-9]', '', 'g') ~ '^34' AND length(regexp_replace("clientPhone", '[^0-9]', '', 'g')) > 9 THEN '34'
    WHEN length(regexp_replace("clientPhone", '[^0-9]', '', 'g')) BETWEEN 10 AND 11 THEN '55'
    ELSE '34'
  END,
  "clientPhoneNationalNumber" = CASE
    WHEN regexp_replace("clientPhone", '[^0-9]', '', 'g') ~ '^351' AND length(regexp_replace("clientPhone", '[^0-9]', '', 'g')) > 10
      THEN substring(regexp_replace("clientPhone", '[^0-9]', '', 'g') from 4)
    WHEN regexp_replace("clientPhone", '[^0-9]', '', 'g') ~ '^55' AND length(regexp_replace("clientPhone", '[^0-9]', '', 'g')) > 10
      THEN substring(regexp_replace("clientPhone", '[^0-9]', '', 'g') from 3)
    WHEN regexp_replace("clientPhone", '[^0-9]', '', 'g') ~ '^34' AND length(regexp_replace("clientPhone", '[^0-9]', '', 'g')) > 9
      THEN substring(regexp_replace("clientPhone", '[^0-9]', '', 'g') from 3)
    WHEN length(regexp_replace("clientPhone", '[^0-9]', '', 'g')) BETWEEN 10 AND 11
      THEN regexp_replace("clientPhone", '[^0-9]', '', 'g')
    ELSE regexp_replace("clientPhone", '[^0-9]', '', 'g')
  END
WHERE "clientPhone" IS NOT NULL AND trim("clientPhone") <> '';

UPDATE "Quote"
SET "clientPhoneCountryCode" = '34', "clientPhoneNationalNumber" = ''
WHERE "clientPhoneCountryCode" IS NULL;

-- Backfill Task from legacy clienteTel
UPDATE "Task"
SET
  "clienteTelCountryCode" = CASE
    WHEN "clienteTel" IS NULL OR trim("clienteTel") = '' THEN NULL
    WHEN regexp_replace("clienteTel", '[^0-9]', '', 'g') ~ '^351' AND length(regexp_replace("clienteTel", '[^0-9]', '', 'g')) > 10 THEN '351'
    WHEN regexp_replace("clienteTel", '[^0-9]', '', 'g') ~ '^55' AND length(regexp_replace("clienteTel", '[^0-9]', '', 'g')) > 10 THEN '55'
    WHEN regexp_replace("clienteTel", '[^0-9]', '', 'g') ~ '^34' AND length(regexp_replace("clienteTel", '[^0-9]', '', 'g')) > 9 THEN '34'
    WHEN length(regexp_replace("clienteTel", '[^0-9]', '', 'g')) BETWEEN 10 AND 11 THEN '55'
    ELSE '34'
  END,
  "clienteTelNationalNumber" = CASE
    WHEN "clienteTel" IS NULL OR trim("clienteTel") = '' THEN NULL
    WHEN regexp_replace("clienteTel", '[^0-9]', '', 'g') ~ '^351' AND length(regexp_replace("clienteTel", '[^0-9]', '', 'g')) > 10
      THEN substring(regexp_replace("clienteTel", '[^0-9]', '', 'g') from 4)
    WHEN regexp_replace("clienteTel", '[^0-9]', '', 'g') ~ '^55' AND length(regexp_replace("clienteTel", '[^0-9]', '', 'g')) > 10
      THEN substring(regexp_replace("clienteTel", '[^0-9]', '', 'g') from 3)
    WHEN regexp_replace("clienteTel", '[^0-9]', '', 'g') ~ '^34' AND length(regexp_replace("clienteTel", '[^0-9]', '', 'g')) > 9
      THEN substring(regexp_replace("clienteTel", '[^0-9]', '', 'g') from 3)
    WHEN length(regexp_replace("clienteTel", '[^0-9]', '', 'g')) BETWEEN 10 AND 11
      THEN regexp_replace("clienteTel", '[^0-9]', '', 'g')
    ELSE regexp_replace("clienteTel", '[^0-9]', '', 'g')
  END;

ALTER TABLE "Client" ALTER COLUMN "phoneCountryCode" SET NOT NULL;
ALTER TABLE "Client" ALTER COLUMN "phoneNationalNumber" SET NOT NULL;
ALTER TABLE "Quote" ALTER COLUMN "clientPhoneCountryCode" SET NOT NULL;
ALTER TABLE "Quote" ALTER COLUMN "clientPhoneNationalNumber" SET NOT NULL;

ALTER TABLE "Client" DROP COLUMN "phone";
ALTER TABLE "Quote" DROP COLUMN "clientPhone";
ALTER TABLE "Task" DROP COLUMN "clienteTel";
