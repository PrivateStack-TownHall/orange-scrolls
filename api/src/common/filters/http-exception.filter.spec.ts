import {
  BadRequestException,
  Logger,
  ConflictException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { HttpExceptionFilter } from './http-exception.filter'

const run = (exception: unknown) => {
  const json = jest.fn()
  const status = jest.fn().mockReturnValue({ json })
  const host: any = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  }

  new HttpExceptionFilter().catch(exception, host)

  return { status: status.mock.calls[0][0], body: json.mock.calls[0][0] }
}

const prismaError = (code: string, meta?: any) =>
  new Prisma.PrismaClientKnownRequestError('msg', { code, clientVersion: 'test', meta })

describe('HttpExceptionFilter', () => {
  beforeEach(() => {
    // the filter logs server-side on purpose; keep test output quiet
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
  })

  it('maps Prisma P2025 to 404', () => {
    const { status, body } = run(prismaError('P2025'))
    expect(status).toBe(404)
    expect(body).toMatchObject({ success: false, statusCode: 404, message: 'Record not found', code: 'P2025' })
  })

  it('maps Prisma P2002 (unique) to 409 and names the field', () => {
    const { status, body } = run(prismaError('P2002', { target: ['slug', 'brandId'] }))
    expect(status).toBe(409)
    expect(body.message).toBe('Duplicate value for: slug, brandId')
  })

  it('reports an out-of-sync id sequence as a server error, not as user input', () => {
    const { status } = run(prismaError('P2002', { target: ['id'] }))
    expect(status).toBe(500)
  })

  it('maps Prisma P2003 (still linked) to 409', () => {
    expect(run(prismaError('P2003')).status).toBe(409)
  })

  it('keeps 400 for other Prisma errors', () => {
    expect(run(prismaError('P2000')).status).toBe(400)
  })

  it('keeps the real message and status of Nest HttpExceptions', () => {
    expect(run(new BadRequestException('title: should not be empty'))).toEqual({
      status: 400,
      body: { success: false, statusCode: 400, message: 'title: should not be empty' },
    })
    expect(run(new NotFoundException('Article not found')).status).toBe(404)
  })

  it('passes structured details through (409 for media still in use)', () => {
    const { status, body } = run(
      new ConflictException({ message: 'in use', details: { articles: [{ id: 1 }] } }),
    )
    expect(status).toBe(409)
    expect(body.details).toEqual({ articles: [{ id: 1 }] })
  })

  it('hides internals of unexpected errors behind a generic 500', () => {
    const { status, body } = run(new Error('secret stack info'))
    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR)
    expect(body.message).toBe('Internal server error')
    expect(JSON.stringify(body)).not.toContain('secret')
  })
})
