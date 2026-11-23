import { BadRequestException } from '@nestjs/common'
import { ParsePositiveIntPipe } from './parse-positive-int.pipe'

describe('ParsePositiveIntPipe', () => {
  const pipe = new ParsePositiveIntPipe()

  it.each([
    ['1', 1],
    ['42', 42],
    ['2147483647', 2147483647],
  ])('accepts %s', (input, expected) => {
    expect(pipe.transform(input)).toBe(expected)
  })

  it.each(['0', '-1', '1.5', '1e3', 'abc', '12abc', '', ' 5', '007', '2147483648', '99999999999999999999'])(
    'rejects %p with 400',
    (input) => {
      expect(() => pipe.transform(input)).toThrow(BadRequestException)
    },
  )

  it('names the offending parameter', () => {
    expect(() => pipe.transform('x', { data: 'id' })).toThrow('id must be a positive integer')
  })
})
