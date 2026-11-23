import { resolveCorsOptions } from './app.setup'

describe('resolveCorsOptions', () => {
  it('uses exactly the origins in CORS_ORIGIN', () => {
    expect(resolveCorsOptions({ CORS_ORIGIN: 'https://a.com, https://b.com' } as any)).toEqual({
      origin: ['https://a.com', 'https://b.com'],
    })
  })

  it('honours an explicit "*" (an operator decision)', () => {
    expect(resolveCorsOptions({ CORS_ORIGIN: '*' } as any)).toEqual({ origin: true })
  })

  it('without CORS_ORIGIN, development allows localhost origins only', () => {
    const opts: any = resolveCorsOptions({ NODE_ENV: 'development' } as any)

    expect(opts.origin.test('http://localhost:5175')).toBe(true)
    expect(opts.origin.test('http://127.0.0.1:3000')).toBe(true)
    expect(opts.origin.test('https://evil.example.com')).toBe(false)
    expect(opts.origin.test('http://localhost.evil.com')).toBe(false)
  })

  it('without CORS_ORIGIN, production keeps CORS disabled (never wide open)', () => {
    expect(resolveCorsOptions({ NODE_ENV: 'production' } as any)).toBe(false)
  })

  it('treats a blank CORS_ORIGIN as unset', () => {
    expect(resolveCorsOptions({ CORS_ORIGIN: '  ', NODE_ENV: 'production' } as any)).toBe(false)
  })
})
