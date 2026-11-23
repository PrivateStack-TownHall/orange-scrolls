import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common'

/**
 * Validates a route parameter as a positive integer (1, 2, 3, ...).
 * Stricter than ParseIntPipe, which also lets "0" and negative numbers
 * through (and would turn "12abc" into a 400 only by accident of regex).
 */
@Injectable()
export class ParsePositiveIntPipe implements PipeTransform<string, number> {
   transform(value: string, metadata?: { data?: string }): number {
      const name = metadata?.data || 'id'

      if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
         throw new BadRequestException(`${name} must be a positive integer`)
      }

      const parsed = Number(value)

      // Postgres INTEGER is 32-bit; anything larger can never match a row
      // and would otherwise surface as an opaque database error.
      if (!Number.isSafeInteger(parsed) || parsed > 2147483647) {
         throw new BadRequestException(`${name} must be a positive integer`)
      }

      return parsed
   }
}
