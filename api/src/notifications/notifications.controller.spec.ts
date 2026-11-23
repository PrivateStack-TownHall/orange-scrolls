import { Test, TestingModule } from '@nestjs/testing'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'

describe('NotificationsController', () => {
  let controller: NotificationsController
  const service = {
    findAll: jest.fn(),
    countUnread: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: service }],
    }).compile()

    controller = module.get(NotificationsController)
  })

  it('maps ?unread=true to unreadOnly', () => {
    controller.findAll({ unread: 'true', limit: 10 })
    expect(service.findAll).toHaveBeenCalledWith({ unreadOnly: true, limit: 10 })

    controller.findAll({})
    expect(service.findAll).toHaveBeenLastCalledWith({ unreadOnly: false, limit: undefined })
  })

  it('delegates read / read-all / unread-count', () => {
    controller.markRead(3)
    controller.markAllRead()
    controller.countUnread()

    expect(service.markRead).toHaveBeenCalledWith(3)
    expect(service.markAllRead).toHaveBeenCalled()
    expect(service.countUnread).toHaveBeenCalled()
  })
})
