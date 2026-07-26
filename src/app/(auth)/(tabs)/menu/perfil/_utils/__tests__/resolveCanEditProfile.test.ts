import type { CollaboratorResponse } from '@/domain/agility/collaborator/dto';
import type { DriverMeResponse } from '@/domain/agility/driver/dto';

import { resolveCanEditProfile } from '../resolveCanEditProfile';

function makeProfile(over: Partial<CollaboratorResponse> = {}): CollaboratorResponse {
    return {
        id: 'c1',
        keycloakUserId: 'kc1',
        email: 'colaborador@empresa.com',
        firstName: 'Fulano',
        lastName: 'Silva',
        nickname: null,
        fullName: 'Fulano Silva',
        displayName: 'Fulano Silva',
        phone: null,
        taxNumber: null,
        gender: null,
        birthDate: null,
        age: null,
        department: null,
        position: null,
        employeeCode: null,
        managerId: null,
        hireDate: null,
        roles: [],
        skills: null,
        addressId: null,
        fixedVehicleId: null,
        workSchedule: null,
        driverId: null,
        customFields: null,
        isActive: true,
        isDriver: true,
        isHelper: false,
        isAdmin: false,
        isManager: false,
        isSupervisor: false,
        isShipper: false,
        isSupport: false,
        hasManager: false,
        hasFixedVehicle: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...over,
    };
}

describe('resolveCanEditProfile', () => {
    it('permite edição quando /drivers/me confirma COLLABORATOR (caminho feliz)', () => {
        const me = { linkType: 'COLLABORATOR' } as Pick<DriverMeResponse, 'linkType'>;

        expect(resolveCanEditProfile(null, me)).toBe(true);
    });

    it('permite edição quando /collaborators/profile respondeu 200, mesmo com /drivers/me falho (regressão real)', () => {
        // Cenário do bug: /collaborators/profile é exclusiva de colaborador no
        // backend — se respondeu com dados, a pessoa É colaborador. /drivers/me
        // pode ter falhado por rede instável (as 3 tentativas se esgotaram),
        // representado aqui por `me` undefined/null.
        const profile = makeProfile();

        expect(resolveCanEditProfile(profile, null)).toBe(true);
        expect(resolveCanEditProfile(profile, undefined)).toBe(true);
    });

    it('nega edição para terceirizado (PROVIDER) sem profile de colaborador', () => {
        const me = { linkType: 'PROVIDER' } as Pick<DriverMeResponse, 'linkType'>;

        expect(resolveCanEditProfile(null, me)).toBe(false);
    });

    it('nega edição quando nenhuma das duas fontes deu evidência ainda (na dúvida, não)', () => {
        expect(resolveCanEditProfile(null, null)).toBe(false);
        expect(resolveCanEditProfile(undefined, undefined)).toBe(false);
    });
});
