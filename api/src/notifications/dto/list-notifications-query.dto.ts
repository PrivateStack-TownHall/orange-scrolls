import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class ListNotificationsQueryDto {

   @IsOptional()
   @IsIn(['true', 'false'])
   unread?: 'true' | 'false'

   @IsOptional()
   @Type(() => Number)
   @IsInt()
   @Min(1)
   @Max(100)
   limit?: number

}
