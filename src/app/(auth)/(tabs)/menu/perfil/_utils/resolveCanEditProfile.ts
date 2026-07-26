import type { CollaboratorResponse } from '@/domain/agility/collaborator/dto';
import type { DriverMeResponse } from '@/domain/agility/driver/dto';

/**
 * Decide se a tela de perfil pode oferecer edição.
 *
 * `/collaborators/profile` (useGetProfile) é exclusiva de colaborador no backend
 * (`@Roles('COLLABORATOR')`) — se ela respondeu 200 com dados, a pessoa É
 * colaborador, independente do que `/drivers/me` (useGetMe) diga. Antes, a
 * decisão dependia só de `me?.linkType`; se `/collaborators/profile` respondesse
 * 200 mas `/drivers/me` falhasse (rede instável esgotando as 3 tentativas), um
 * colaborador legítimo perdia a edição do próprio perfil. Evidência positiva de
 * QUALQUER uma das duas fontes já basta.
 */
export function resolveCanEditProfile(
    profile: CollaboratorResponse | null | undefined,
    me: Pick<DriverMeResponse, 'linkType'> | null | undefined,
): boolean {
    return Boolean(profile) || me?.linkType === 'COLLABORATOR';
}
