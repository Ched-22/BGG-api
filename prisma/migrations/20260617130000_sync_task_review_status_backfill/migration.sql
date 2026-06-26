-- Backfill: sync task status for inspections already pending admin review
UPDATE "Task" AS t
SET
  "status" = 'Pronto para QA',
  "qa" = (
    COALESCE(t."qa"::jsonb, '{}'::jsonb)
    || jsonb_build_object('status', 'Pronto para Revisão')
    || CASE
      WHEN COALESCE(t."qa"->>'concluidoEm', '') = '' AND vi."submittedForReviewAt" IS NOT NULL
      THEN jsonb_build_object(
        'concluidoEm',
        to_char(vi."submittedForReviewAt", 'YYYY-MM-DD HH24:MI')
      )
      ELSE '{}'::jsonb
    END
  )
FROM "VehicleInspection" AS vi
WHERE vi."taskDisplayId" = t."displayId"
  AND vi."reportStatus" = 'PENDING_REVIEW'
  AND t."status" IS DISTINCT FROM 'Pronto para QA';
