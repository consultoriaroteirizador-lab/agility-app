import type { MyRosterResponse, TeamRosterMemberResponse } from './dto'

/**
 * Filtra o próprio motorista para fora do roster.
 *
 * O backend devolve o roster INCLUINDO a própria pessoa (contrato do P2) — o
 * filtro compara o `personId` do envelope contra `collaboratorId` **e**
 * `providerId` de cada membro, porque a pessoa logada pode estar vinculada
 * por qualquer um dos dois (colaborador CLT ou terceirizado/provider). Um
 * filtro que checasse só `collaboratorId` deixaria o próprio terceirizado na
 * lista dos "colegas".
 *
 * Extraída como função pura (em vez de inline no hook) porque o Jest deste
 * projeto roda `testEnvironment: node` (preset `jest-expo`, sem jsdom) — não
 * dá para montar o hook com `@testing-library/react-hooks` sem DOM. É o
 * mesmo padrão de `service/codeGate.ts`: lógica de negócio pura, testável
 * sem infraestrutura de UI.
 */
export function filterColegas(roster: MyRosterResponse | undefined | null): TeamRosterMemberResponse[] {
    if (!roster) return []

    return roster.members.filter(
        (m) => m.collaboratorId !== roster.personId && m.providerId !== roster.personId,
    )
}

/** Verdadeiro quando o roster (cru, antes do filtro do próprio motorista) tem ao menos um membro. */
export function hasTeam(roster: MyRosterResponse | undefined | null): boolean {
    return (roster?.members?.length ?? 0) > 0
}
