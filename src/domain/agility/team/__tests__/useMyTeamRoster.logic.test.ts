/**
 * Cobre o par `teamAPI` + lógica de `useMyTeamRoster` fim a fim, sobre um
 * payload COM o envelope real do backend (`{success, message, result, error}`).
 * É a lacuna que deixou o C1 (leitura do roster como objeto cru) sobreviver a
 * 10 revisões individuais: nenhum teste existente exercitava o envelope.
 *
 * `useMyTeamRoster` não é renderizado aqui: o Jest deste projeto usa o preset
 * `jest-expo`, que resolve para `testEnvironment: 'node'` (sem jsdom) fora da
 * plataforma web — não há DOM para `@testing-library/react-hooks`/RTL montar
 * o hook. Em vez disso, este teste reproduz exatamente os dois passos que o
 * hook faz por cima de `teamService.getMyRoster()` — `data?.result` e depois
 * `filterColegas`/`hasTeam` — que é a lógica que de fato continha o bug.
 * `filterColegas`/`hasTeam` também têm cobertura própria, mais granular, em
 * `rosterFilter.test.ts`.
 */

jest.mock('@/api/apiConfig', () => ({
    apiAgility: { get: jest.fn() },
}))

import { apiAgility } from '@/api/apiConfig'

import type { MyRosterResponse } from '../dto'
import { filterColegas, hasTeam } from '../rosterFilter'
import { teamService } from '../teamService'

const mockedGet = apiAgility.get as jest.Mock

/** Simula exatamente o que `useMyTeamRoster` faz com o retorno do service. */
async function loadRoster() {
    const response = await teamService.getMyRoster()
    const roster = response.result
    return { colegas: filterColegas(roster), temEquipe: hasTeam(roster) }
}

function envelope(result: MyRosterResponse) {
    return { data: { success: true, message: undefined, result, error: undefined } }
}

describe('useMyTeamRoster (lógica, payload com envelope real)', () => {
    beforeEach(() => mockedGet.mockReset())

    it('payload com envelope: os colegas aparecem', async () => {
        mockedGet.mockResolvedValue(
            envelope({
                personId: 'colab-eu',
                personType: 'COLLABORATOR',
                members: [
                    { id: 'm-eu', teamId: 't1', collaboratorId: 'colab-eu', providerId: null, role: 'MEMBER', personName: 'Eu', personPhone: '11999990000', skillIds: [], startDate: null, endDate: null },
                    { id: 'm-colega', teamId: 't1', collaboratorId: 'colab-colega', providerId: null, role: 'LEADER', personName: 'Colega Líder', personPhone: '11988887777', skillIds: [], startDate: null, endDate: null },
                ],
            }),
        )

        const { colegas, temEquipe } = await loadRoster()

        expect(temEquipe).toBe(true)
        expect(colegas).toHaveLength(1)
        expect(colegas[0].personName).toBe('Colega Líder')
    })

    it('o motorista se filtra da lista via collaboratorId', async () => {
        mockedGet.mockResolvedValue(
            envelope({
                personId: 'colab-eu',
                personType: 'COLLABORATOR',
                members: [
                    { id: 'm-eu', teamId: 't1', collaboratorId: 'colab-eu', providerId: null, role: 'MEMBER', personName: 'Eu', personPhone: null, skillIds: [], startDate: null, endDate: null },
                ],
            }),
        )

        const { colegas, temEquipe } = await loadRoster()

        expect(temEquipe).toBe(true)
        expect(colegas).toHaveLength(0)
    })

    it('membro terceirizado: o motorista se filtra via providerId (não collaboratorId)', async () => {
        mockedGet.mockResolvedValue(
            envelope({
                personId: 'prov-eu',
                personType: 'PROVIDER',
                members: [
                    // vínculo do próprio motorista terceirizado: collaboratorId é null.
                    { id: 'm-eu', teamId: 't1', collaboratorId: null, providerId: 'prov-eu', role: 'MEMBER', personName: 'Eu (terceirizado)', personPhone: null, skillIds: [], startDate: null, endDate: null },
                    { id: 'm-colega', teamId: 't1', collaboratorId: 'colab-colega', providerId: null, role: 'MEMBER', personName: 'Colega CLT', personPhone: '11977776666', skillIds: [], startDate: null, endDate: null },
                ],
            }),
        )

        const { colegas, temEquipe } = await loadRoster()

        expect(temEquipe).toBe(true)
        expect(colegas).toHaveLength(1)
        expect(colegas[0].personName).toBe('Colega CLT')
        // Um filtro que checasse só collaboratorId deixaria o próprio
        // terceirizado (m-eu) passar — este é justamente o caso que pega isso.
        expect(colegas.find((c) => c.id === 'm-eu')).toBeUndefined()
    })

    it('members: [] → temEquipe falso, sem erro', async () => {
        mockedGet.mockResolvedValue(
            envelope({ personId: 'colab-eu', personType: 'COLLABORATOR', members: [] }),
        )

        const { colegas, temEquipe } = await loadRoster()

        expect(temEquipe).toBe(false)
        expect(colegas).toEqual([])
    })
})
