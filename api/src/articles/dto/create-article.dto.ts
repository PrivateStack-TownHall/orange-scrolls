import {
   IsBoolean,
   IsInt,
   IsOptional,
   IsString,
   IsArray,
   IsNotEmpty,
   IsIn,
   IsDateString,
   Min,
   ValidateNested
} from 'class-validator'
import { Type } from 'class-transformer'

// Kept as plain string literals instead of importing the Prisma-generated
// ArticleStatus/ArticleVisibility enums: those decorators run the moment
// this module is imported, so if `npx prisma generate` hasn't produced a
// client yet (fresh clone, CI cache miss, etc.) the whole API crashes on
// boot with "Cannot convert undefined or null to object" instead of a
// normal startup error. This keeps DTO validation independent of codegen
// timing while still matching the ArticleStatus/ArticleVisibility enums
// defined in schema.prisma.
const ARTICLE_STATUS_VALUES = ['Draft', 'Published', 'Archived'] as const
const ARTICLE_VISIBILITY_VALUES = ['Public', 'Private'] as const

// Roles a media item can play for an article (ArticleMedia.type).
export const ARTICLE_MEDIA_TYPES = ['thumbnail', 'cover', 'gallery'] as const
export type ArticleMediaTypeValue = (typeof ARTICLE_MEDIA_TYPES)[number]

export class ArticleMediaItemDto {

   @Type(() => Number)
   @IsInt()
   @Min(1)
   mediaId: number

   @IsIn(ARTICLE_MEDIA_TYPES)
   type: ArticleMediaTypeValue

}

type ArticleStatusValue = (typeof ARTICLE_STATUS_VALUES)[number]
type ArticleVisibilityValue = (typeof ARTICLE_VISIBILITY_VALUES)[number]

export class CreateArticleDto {

   @IsNotEmpty()
   @IsString()
   title: string

   @IsNotEmpty()
   @IsString()
   slug: string

   @IsNotEmpty()
   @Type(() => Number)
   @IsInt()
   brandId: number

   @IsNotEmpty()
   @Type(() => Number)
   @IsInt()
   categoryId: number

   @IsOptional()
   @IsString()
   excerpt?: string

   @IsNotEmpty()
   @IsString()
   content: string

   @IsOptional()
   @IsString()
   thumbnail?: string

   @IsOptional()
   @IsString()
   coverImage?: string

   @IsOptional()
   @IsString()
   author?: string

   @IsNotEmpty()
   @IsIn(ARTICLE_STATUS_VALUES)
   status: ArticleStatusValue

   @IsNotEmpty()
   @IsIn(ARTICLE_VISIBILITY_VALUES)
   visibility: ArticleVisibilityValue

   @IsOptional()
   @IsBoolean()
   featured?: boolean

   @IsOptional()
   @IsInt()
   readingTime?: number

   @IsOptional()
   @IsString()
   seoTitle?: string

   @IsOptional()
   @IsString()
   seoDescription?: string

   @IsOptional()
   @IsString()
   canonicalUrl?: string

   // ISO-8601 date-time. Set automatically when an article becomes Published
   // and never cleared afterwards (kept as history).
   @IsOptional()
   @IsDateString()
   publishedAt?: string

   // ISO-8601 date-time for a planned publication. null/"" clears it.
   @IsOptional()
   @IsDateString()
   scheduledAt?: string | null

   // Full desired set of media relations. Omit to leave relations untouched;
   // send [] to remove them all.
   @IsOptional()
   @IsArray()
   @ValidateNested({ each: true })
   @Type(() => ArticleMediaItemDto)
   media?: ArticleMediaItemDto[]

   @IsOptional()
   @IsArray()
   @IsInt({ each: true })
   tagIds?: number[]

   @IsOptional()
   @IsArray()
   @IsString({ each: true })
   tags?: string[]
}