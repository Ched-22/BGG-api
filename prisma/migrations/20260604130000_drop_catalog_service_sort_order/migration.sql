-- Drop manual sort order; catalog lists use createdAt instead.
ALTER TABLE "CatalogService" DROP COLUMN "sortOrder";
