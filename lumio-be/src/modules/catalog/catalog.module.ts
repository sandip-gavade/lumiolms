import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { CurriculumService } from './curriculum.service';
import { LecturesController } from './lectures.controller';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { SectionsController } from './sections.controller';

@Module({
  controllers: [
    CoursesController,
    SectionsController,
    LecturesController,
    ReviewsController,
    CategoriesController,
  ],
  providers: [
    CoursesService,
    CurriculumService,
    ReviewsService,
    CategoriesService,
  ],
  exports: [CoursesService],
})
export class CatalogModule {}
