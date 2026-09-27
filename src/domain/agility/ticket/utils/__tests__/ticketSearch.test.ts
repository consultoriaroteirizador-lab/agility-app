import { ticketMatchesSearch } from '../ticketSearch';

describe('ticketMatchesSearch', () => {
    const legado = { ticketNumber: '250920263507257826399', subject: 'Support Request', description: null };

    it('busca vazia (ou só espaços) casa tudo', () => {
        expect(ticketMatchesSearch(legado, '')).toBe(true);
        expect(ticketMatchesSearch(legado, '   ')).toBe(true);
    });

    it('assunto legado "Support Request" é achado por "suporte", o título que a tela mostra', () => {
        expect(ticketMatchesSearch(legado, 'suporte')).toBe(true);
        expect(ticketMatchesSearch(legado, 'Supor')).toBe(true);
    });

    it('continua casando o assunto cru', () => {
        expect(ticketMatchesSearch(legado, 'support request')).toBe(true);
        expect(ticketMatchesSearch({ subject: 'Customer Support' }, 'customer')).toBe(true);
    });

    it('assunto vazio aparece como "Suporte" e é achado por ele', () => {
        expect(ticketMatchesSearch({ subject: null }, 'suporte')).toBe(true);
    });

    it('ignora acento nos dois lados', () => {
        expect(ticketMatchesSearch({ subject: 'Avaria na mercadoria' }, 'avária')).toBe(true);
        expect(ticketMatchesSearch({ subject: 'Endereço não encontrado' }, 'endereco nao')).toBe(true);
    });

    it('número do protocolo: inteiro, parcial e final', () => {
        expect(ticketMatchesSearch(legado, '250920263507257826399')).toBe(true);
        expect(ticketMatchesSearch(legado, '3507')).toBe(true);
        expect(ticketMatchesSearch(legado, '826399')).toBe(true);
    });

    it('descrição e rótulo de status continuam casando', () => {
        expect(ticketMatchesSearch({ subject: 'X', description: 'Cliente ausente' }, 'ausente')).toBe(true);
        expect(ticketMatchesSearch({ subject: 'X' }, 'atribuido', 'Atribuído')).toBe(true);
    });

    it('não casa o que não está em nenhum campo', () => {
        expect(ticketMatchesSearch(legado, 'avaria')).toBe(false);
        expect(ticketMatchesSearch({ subject: 'Avaria' }, 'suporte')).toBe(false);
    });
});
