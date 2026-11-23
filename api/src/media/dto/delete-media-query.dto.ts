import { IsIn, IsOptional } from 'class-validator'

export class DeleteMediaQueryDto {

   // Explicit confirmation to delete media that is still linked to articles.
   @IsOptional()
   @IsIn(['true', 'false'])
   force?: 'true' | 'false'

}
