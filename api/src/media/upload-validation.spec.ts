import { assertValidImage, isAllowedMimeType, MAX_UPLOAD_BYTES } from './upload-validation'

const bytes = (...b: number[]) => Buffer.from([...b, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])

const f = (mimetype: string, buffer: Buffer) =>
  ({ mimetype, buffer, size: buffer.length }) as any

describe('upload validation', () => {
  it('limits uploads to 5 MB', () => {
    expect(MAX_UPLOAD_BYTES).toBe(5 * 1024 * 1024)
  })

  it('allows raster images only', () => {
    for (const t of ['image/png', 'image/jpeg', 'image/gif', 'image/webp']) {
      expect(isAllowedMimeType(t)).toBe(true)
    }
    for (const t of ['image/svg+xml', 'text/html', 'application/pdf', '', undefined]) {
      expect(isAllowedMimeType(t as any)).toBe(false)
    }
  })

  it('accepts files whose bytes match their type', () => {
    expect(() => assertValidImage(f('image/png', bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)))).not.toThrow()
    expect(() => assertValidImage(f('image/jpeg', bytes(0xff, 0xd8, 0xff, 0xe0)))).not.toThrow()
    expect(() => assertValidImage(f('image/gif', Buffer.from('GIF89a' + '\0'.repeat(10))))).not.toThrow()
    expect(() =>
      assertValidImage(f('image/webp', Buffer.from('RIFF\0\0\0\0WEBPVP8 '))),
    ).not.toThrow()
  })

  it('rejects a PNG label on JPEG bytes', () => {
    expect(() => assertValidImage(f('image/png', bytes(0xff, 0xd8, 0xff, 0xe0)))).toThrow(
      /does not match/,
    )
  })
})
