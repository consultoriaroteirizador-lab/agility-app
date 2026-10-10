import {
    formatDecimalBR, formatFilledAt, formatKm, formatLiters, fuelEntryErrorMessage, fuelEntrySuccessToast, inconsistencyText, OFFLINE_MESSAGE, TIMEOUT_MESSAGE,
} from '../fuelEntryDisplay';

describe('formatDecimalBR', () => {
    it.each<[number, number, string]>([
        [45.5, 3, '45,5'], [45, 3, '45'], [450, 0, '450'], [48210, 0, '48.210'], [1234.567, 3, '1.234,567'], [0.1, 3, '0,1'],
    ])('%p com %p casas = %p', (n, d, e) => expect(formatDecimalBR(n, d)).toBe(e));
});

it('litros e km', () => {
    expect(formatLiters(45.5)).toBe('45,5 L');
    expect(formatKm(48210)).toBe('48.210 km');
});

it('data e hora no fuso de São Paulo, com o ano', () => {
    // 01:30 UTC do dia 9 = 22:30 do dia 8 em São Paulo.
    expect(formatFilledAt('2026-10-09T01:30:00.000Z')).toBe('08/10/2026 22:30');
});

it('inconsistência só quando marcada e com o anterior', () => {
    expect(inconsistencyText({ odometerInconsistent: true, previousOdometerKm: 50000 })).toBe('Odômetro abaixo do anterior (50.000 km): a central vai revisar.');
    expect(inconsistencyText({ odometerInconsistent: false, previousOdometerKm: 50000 })).toBeNull();
});

describe('fuelEntryErrorMessage', () => {
    it('sem rede: a frase de que precisa de internet', () => {
        expect(fuelEntryErrorMessage({ success: false, error: { message: 'Sem conexão com o servidor.', code: 'AU-000' } })).toBe(OFFLINE_MESSAGE);
    });
    it('timeout: o envio pode ter sido gravado, então manda conferir antes de enviar de novo', () => {
        expect(fuelEntryErrorMessage({ success: false, error: { message: 'A requisição demorou demais.', code: 'AU-000', timeout: true } })).toBe(TIMEOUT_MESSAGE);
        expect(TIMEOUT_MESSAGE).toContain('Meus abastecimentos');
        expect(TIMEOUT_MESSAGE).not.toBe(OFFLINE_MESSAGE);
    });
    it('validação: as frases de cada campo, nunca o genérico', () => {
        expect(fuelEntryErrorMessage({
            success: false,
            error: { message: 'Um ou mais campos estão com erros de validação', code: 'BAD_REQUEST', validationErrors: [{ field: 'x', message: 'Litros acima do tanque.' }, { field: 'y', message: 'A data do abastecimento está no futuro.' }] },
        })).toBe('Litros acima do tanque.\nA data do abastecimento está no futuro.');
    });
    it('erro de serviço: a mensagem do back', () => {
        expect(fuelEntryErrorMessage({ success: false, error: { message: 'Você não tem veículo associado. Fale com a central.', code: 'UNPROCESSABLE_ENTITY', validationErrors: [] } }))
            .toBe('Você não tem veículo associado. Fale com a central.');
    });
    it('sem mensagem: o texto padrão', () => {
        expect(fuelEntryErrorMessage(undefined)).toBe('Não foi possível registrar o abastecimento. Tente novamente.');
    });
});

it('toast de sucesso avisa a revisão quando o odômetro ficou abaixo', () => {
    expect(fuelEntrySuccessToast({ odometerInconsistent: false, previousOdometerKm: null })).toEqual({ message: 'Abastecimento registrado.', type: 'success' });
    expect(fuelEntrySuccessToast({ odometerInconsistent: true, previousOdometerKm: 50000 })).toEqual({
        message: 'Abastecimento registrado, mas o odômetro está abaixo do último (50.000 km). A central vai revisar.',
        type: 'success',
    });
});
