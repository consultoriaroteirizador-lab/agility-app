/**
 * Ciclo salvar/reidratar do draft (autosave -> ServiceDraftData -> reidratacao).
 *
 * Motivo do teste: `relationCode`/`relationLabel` (RecipientData) e os 4 campos
 * de documento/relacao em `PickupEvidence` foram adicionados DEPOIS que o draft
 * ja existia — exatamente o tipo de mudanca que essa feature ja perdeu em
 * silencio 4 vezes em outros lugares (toJson()/mapper do backend, mapper da
 * listagem da plataforma, guard do drawer). Testar round-trip aqui garante que
 * um campo novo em `RecipientData`/`PickupEvidence` que nao passe por
 * `recipientToDraft`/`draftToRecipient` (ou o par de pickupEvidence) quebra o
 * teste, em vez de sumir silenciosamente depois de um crash/restart.
 */
import {
    draftHasAnyValue,
    draftToPickupEvidence,
    draftToRecipient,
    pickupEvidenceToDraft,
    recipientToDraft,
} from '../paradaDraftMapping';

describe('recipientToDraft / draftToRecipient — ciclo salvar/reidratar', () => {
    it('relationCode e relationLabel sobrevivem ao ciclo completo', () => {
        const recipient = {
            tipo: 'porteiro',
            nome: 'Elaine Rocha',
            tipoDocumento: 'RG',
            numeroDocumento: '12.456.789-01',
            relationCode: 'PORTEIRO',
            relationLabel: 'Porteiro',
        };

        const persisted = recipientToDraft(recipient);
        const restored = draftToRecipient(persisted);

        expect(restored).toEqual(recipient);
    });

    it('sem relationCode/relationLabel (empresa nao configurou / opcao antiga): reidrata sem os campos, sem virar string vazia', () => {
        const recipient = {
            tipo: 'cliente',
            nome: 'Ana',
            tipoDocumento: 'RG',
            numeroDocumento: '12345678900',
        };

        const persisted = recipientToDraft(recipient);
        // `recipientToDraft` grava `undefined` explicitamente (a chave existe no
        // objeto, mas AsyncStorage/JSON descartam `undefined` na serializacao) —
        // o que importa e que a reidratacao nao inventa uma string vazia.
        expect(persisted.relationCode).toBeUndefined();

        const restored = draftToRecipient(persisted);
        expect(restored.relationCode).toBeUndefined();
        expect(restored.relationLabel).toBeUndefined();
    });

    it('draft vazio (primeira visita, nada hidratado ainda) cai nos defaults de RECIPIENT_INITIAL', () => {
        const restored = draftToRecipient(undefined);

        expect(restored).toEqual({
            tipo: null,
            nome: '',
            tipoDocumento: 'RG',
            numeroDocumento: '',
            relationCode: undefined,
            relationLabel: undefined,
        });
    });
});

describe('draftHasAnyValue — gate do autosave', () => {
    // Caso da revisao: "Ninguem acompanhou" (recipientType e a UNICA coisa
    // exigida, todo o resto HIDDEN) — o motorista so escolhe a relacao, nome
    // fica vazio. O `hasContent` antigo (`!!recipient.nome || ...`) nao via
    // isso como conteudo e o draft nunca era gravado.
    it('so relationCode/relationLabel preenchidos (nome vazio) ja conta como conteudo', () => {
        const draft = recipientToDraft({
            tipo: 'ninguem',
            nome: '',
            tipoDocumento: 'RG',
            numeroDocumento: '',
            relationCode: 'NINGUEM',
            relationLabel: 'Ninguem acompanhou',
        });

        expect(draftHasAnyValue(draft)).toBe(true);
    });

    it('recipient totalmente vazio (RECIPIENT_INITIAL) nao conta como conteudo', () => {
        const draft = recipientToDraft({
            tipo: null,
            nome: '',
            tipoDocumento: '',
            numeroDocumento: '',
        });

        expect(draftHasAnyValue(draft)).toBe(false);
    });

    it('so nome preenchido (comportamento antigo) continua contando como conteudo', () => {
        const draft = recipientToDraft({ tipo: null, nome: 'Ana', tipoDocumento: '', numeroDocumento: '' });
        expect(draftHasAnyValue(draft)).toBe(true);
    });
});

describe('pickupEvidenceToDraft / draftToPickupEvidence — ciclo salvar/reidratar (TRANSFER)', () => {
    it('documento e relacao da perna de coleta sobrevivem ao ciclo completo', () => {
        const evidence = {
            receivedBy: 'Joao Estoquista',
            receivedByDocumentType: 'RG',
            receivedByDocument: '98.765.432-00',
            receivedByRelationCode: 'ESTOQUISTA',
            receivedByRelationLabel: 'Estoquista',
            signatureUrl: 'https://s3/sig.png',
            photoUrls: ['https://s3/foto1.jpg'],
            notes: 'Recebido no deposito',
        };

        const persisted = pickupEvidenceToDraft(evidence);
        const restored = draftToPickupEvidence(persisted);

        expect(restored).toEqual(evidence);
    });

    it('perna de coleta sem documento/relacao (nao exigidos): reidrata sem os campos', () => {
        const evidence = {
            receivedBy: 'Joao',
            photoUrls: [] as string[],
        };

        const persisted = pickupEvidenceToDraft(evidence);
        const restored = draftToPickupEvidence(persisted);

        expect(restored?.receivedByDocument).toBeUndefined();
        expect(restored?.receivedByRelationCode).toBeUndefined();
    });

    it('draft sem pickupEvidence (nao e TRANSFER, ou ainda na perna de coleta): reidratacao devolve undefined, nao um objeto vazio', () => {
        expect(draftToPickupEvidence(undefined)).toBeUndefined();
    });
});
