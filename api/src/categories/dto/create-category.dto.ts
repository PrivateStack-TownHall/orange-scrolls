import { IsInt, IsString } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateCategoryDto {

   @IsString()
   name: string

   @IsString()
   slug: string

   // @Type(() => Number) coerces a numeric string (e.g. from a <select>
   // value, which is always a string in the DOM) into an actual number
   // before @IsInt() runs. Without it, ValidationPipe's `transform: true`
   // alone does NOT convert primitives, so "3" fails @IsInt() even though
   // it's numeric.
   @Type(() => Number)
   @IsInt()
   brandId: number

}