import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { ServiceCatalogService } from './catalog.service';

@Module({
  controllers: [CatalogController],
  providers: [ServiceCatalogService],
  exports: [ServiceCatalogService],
})
export class CatalogModule {}
