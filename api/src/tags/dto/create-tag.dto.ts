import { IsInt, IsString } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateTagDto {

   @IsString()
   name: string

   @Type(() => Number)
   @IsInt()
   brandId: number

}