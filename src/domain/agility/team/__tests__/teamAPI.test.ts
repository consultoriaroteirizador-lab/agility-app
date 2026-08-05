/**
 * Trava o contrato de `GET /teams/roster/me`: a resposta VEM ENVELOPADA em
 * `BaseResponse` pelo `ResponseInterceptor` global do Nest (`agility-services`
 * `src/main.ts`), mesmo o `TeamController` devolvendo o objeto cru. Uma versão
 * anterior lia `data` como se já fosse `MyRosterResponse` cru — sem exceção,
 * sem erro de tipo, sem teste vermelho — e `data.members` virava sempre
 * `undefined`. Este teste é a rede que faltava (C1 da revisão final).
 */

jest.mock('@/api/apiConfig', () => ({
    apiAgility: { get: jest.fn() },
}))

import { apiAgility } from '@/api/apiConfig'

import { teamAPI } from '../teamAPI'

const mockedGet = apiAgility.get as jest.Mock

describe('teamAPI.getMyRoster', () => {
    beforeEach(() => mockedGet.mockReset())

    it('devolve o envelope BaseResponse inteiro, sem desempacotar (quem desempacota é o chamador)', async () => {
        const roster = {
            personId: 'colab-1',
            personType: 'COLLABORATOR' as const,
            members: [
                { id: 'm1', teamId: 't1', collaboratorId: 'colab-1', providerId: null, role: 'MEMBER', personName: 'Eu', personPhone: null, skillIds: [], startDate: null, endDate: null },
            ],
        }
        mockedGet.mockResolvedValue({
            data: { success: true, message: undefined, result: roster, error: undefined },
        })

        const response = await teamAPI.getMyRoster()

        expect(response.success).toBe(true)
        expect(response.result).toEqual(roster)
    })

    it('chama o endpoint sem params quando date não é informado', async () => {
        mockedGet.mockResolvedValue({ data: { success: true, result: { personId: 'x', personType: 'COLLABORATOR', members: [] } } })

        await teamAPI.getMyRoster()

        expect(mockedGet).toHaveBeenCalledWith('/teams/roster/me', { params: {} })
    })

    it('propaga a data como query param', async () => {
        mockedGet.mockResolvedValue({ data: { success: true, result: { personId: 'x', personType: 'COLLABORATOR', members: [] } } })

        await teamAPI.getMyRoster('2026-08-04')

        expect(mockedGet).toHaveBeenCalledWith('/teams/roster/me', { params: { date: '2026-08-04' } })
    })
})
