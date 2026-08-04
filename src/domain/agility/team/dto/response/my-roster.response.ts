/** Papel da pessoa dentro da equipe. */
export type TeamMemberRole = 'LEADER' | 'MEMBER'

export interface TeamRosterMemberResponse {
    /** Id do VÍNCULO (linha de team_members), não o da pessoa. */
    id: string
    teamId: string
    collaboratorId: string | null
    providerId: string | null
    role: TeamMemberRole
    personName: string | null
    /** Só o endpoint `roster/me` devolve este campo. */
    personPhone: string | null
    skillIds: number[]
    startDate: string | null
    endDate: string | null
}

/**
 * Resposta de `GET /teams/roster/me`.
 *
 * `personId` identifica QUEM PERGUNTOU: o roster inclui a própria pessoa por
 * contrato do backend, e é por este campo que a tela se filtra da lista.
 */
export interface MyRosterResponse {
    personId: string
    personType: 'COLLABORATOR' | 'PROVIDER'
    members: TeamRosterMemberResponse[]
}
