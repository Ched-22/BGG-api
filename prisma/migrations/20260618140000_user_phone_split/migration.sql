-- AlterTable: split User.phone into country + national fields
ALTER TABLE "User" ADD COLUMN "phoneCountryCode" TEXT;
ALTER TABLE "User" ADD COLUMN "phoneNationalNumber" TEXT;

UPDATE "User"
SET
  "phoneCountryCode" = CASE
    WHEN "phone" IS NULL OR TRIM("phone") = '' THEN NULL
    WHEN REGEXP_REPLACE("phone", '\D', '', 'g') ~ '^34' AND LENGTH(REGEXP_REPLACE("phone", '\D', '', 'g')) > 9
      THEN '34'
    WHEN REGEXP_REPLACE("phone", '\D', '', 'g') ~ '^351' AND LENGTH(REGEXP_REPLACE("phone", '\D', '', 'g')) > 9
      THEN '351'
    WHEN LENGTH(REGEXP_REPLACE("phone", '\D', '', 'g')) BETWEEN 10 AND 11
      THEN '55'
    ELSE '34'
  END,
  "phoneNationalNumber" = CASE
    WHEN "phone" IS NULL OR TRIM("phone") = '' THEN NULL
    WHEN REGEXP_REPLACE("phone", '\D', '', 'g') ~ '^34' AND LENGTH(REGEXP_REPLACE("phone", '\D', '', 'g')) > 9
      THEN SUBSTRING(REGEXP_REPLACE("phone", '\D', '', 'g') FROM 3)
    WHEN REGEXP_REPLACE("phone", '\D', '', 'g') ~ '^351' AND LENGTH(REGEXP_REPLACE("phone", '\D', '', 'g')) > 9
      THEN SUBSTRING(REGEXP_REPLACE("phone", '\D', '', 'g') FROM 4)
    WHEN LENGTH(REGEXP_REPLACE("phone", '\D', '', 'g')) BETWEEN 10 AND 11
      THEN REGEXP_REPLACE("phone", '\D', '', 'g')
    ELSE REGEXP_REPLACE("phone", '\D', '', 'g')
  END
WHERE "phone" IS NOT NULL;

ALTER TABLE "User" DROP COLUMN "phone";
