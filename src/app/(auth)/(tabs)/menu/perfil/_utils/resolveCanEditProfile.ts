import type { CollaboratorResponse } from '@/domain/agility/collaborator/dto';
import type { DriverMeResponse } from '@/domain/agility/driver/dto';

/**
 * Decide se a tela de perfil pode oferecer edição.
 *
 * Se `/collaborators/profile` (useGetProfile) respondeu 200 com dados, a pessoa É
 * colaborador, independente do que `/drivers/me` (useGetMe) diga. O que garante
 * isso NÃO é uma role — a rota não declara `@Roles` nenhum, e o `RolesGuard`
 * libera quando não há role exigida. É o handler: ele resolve o Collaborator do
 * usuário por `findByKeycloakUserId` e devolve 404 para quem não tem registro,
 * que é o caso do motorista terceirizado (vínculo por Provider). A conclusão vale;
 * o mecanismo é 404 de recurso, não barreira de autorização. Antes, a
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
