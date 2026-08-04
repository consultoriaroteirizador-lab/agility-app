import { filterColegas, hasTeam } from '../rosterFilter'

describe('filterColegas', () => {
    it('remove a própria pessoa comparando por collaboratorId', () => {
        const colegas = filterColegas({
            personId: 'colab-eu',
            personType: 'COLLABORATOR',
            members: [
                { id: 'm1', teamId: 't1', collaboratorId: 'colab-eu', providerId: null, role: 'MEMBER', personName: 'Eu', personPhone: null, skillIds: [], startDate: null, endDate: null },
                { id: 'm2', teamId: 't1', collaboratorId: 'colab-outro', providerId: null, role: 'MEMBER', personName: 'Outro', personPhone: null, skillIds: [], startDate: null, endDate: null },
            ],
        })

        expect(colegas.map((c) => c.id)).toEqual(['m2'])
    })

    it('remove a própria pessoa comparando por providerId (terceirizado)', () => {
        const colegas = filterColegas({
            personId: 'prov-eu',
            personType: 'PROVIDER',
            members: [
                { id: 'm1', teamId: 't1', collaboratorId: null, providerId: 'prov-eu', role: 'MEMBER', personName: 'Eu', personPhone: null, skillIds: [], startDate: null, endDate: null },
                { id: 'm2', teamId: 't1', collaboratorId: 'colab-outro', providerId: null, role: 'MEMBER', personName: 'Outro', personPhone: null, skillIds: [], startDate: null, endDate: null },
            ],
        })

        expect(colegas.map((c) => c.id)).toEqual(['m2'])
    })

    it('members vazio → []', () => {
        expect(filterColegas({ personId: 'colab-eu', personType: 'COLLABORATOR', members: [] })).toEqual([])
    })

    it('roster undefined/null → [] sem estourar', () => {
        expect(filterColegas(undefined)).toEqual([])
        expect(filterColegas(null)).toEqual([])
    })
})

describe('hasTeam', () => {
    it('true quando há membros (mesmo que só a própria pessoa)', () => {
        expect(
            hasTeam({
                personId: 'colab-eu',
                personType: 'COLLABORATOR',
                members: [{ id: 'm1', teamId: 't1', collaboratorId: 'colab-eu', providerId: null, role: 'MEMBER', personName: 'Eu', personPhone: null, skillIds: [], startDate: null, endDate: null }],
            }),
        ).toBe(true)
    })

    it('false quando members é []', () => {
        expect(hasTeam({ personId: 'colab-eu', personType: 'COLLABORATOR', members: [] })).toBe(false)
    })

    it('false quando roster é undefined/null', () => {
        expect(hasTeam(undefined)).toBe(false)
        expect(hasTeam(null)).toBe(false)
    })
})
