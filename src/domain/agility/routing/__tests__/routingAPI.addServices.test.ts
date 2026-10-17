jest.mock('@/api/apiConfig', () => ({ apiAgility: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }))

import { routingAPI } from '../routingAPI'
import { routingService } from '../routingService'

it('routingAPI e routingService não expõem addServices (backlog: caminho morto)', () => {
    expect(routingAPI).not.toHaveProperty('addServices')
    expect(routingService).not.toHaveProperty('addServices')
})
