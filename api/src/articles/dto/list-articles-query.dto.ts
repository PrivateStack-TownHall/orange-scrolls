import { IsIn, IsOptional } from 'class-validator'

export class ListArticlesQueryDto {

   // Default (omitted/"false"): only live articles.
   // "true": only soft-deleted articles (the "Deleted" view, for restore).
   @IsOptional()
   @IsIn(['true', 'false'])
   deleted?: 'true' | 'false'

}
