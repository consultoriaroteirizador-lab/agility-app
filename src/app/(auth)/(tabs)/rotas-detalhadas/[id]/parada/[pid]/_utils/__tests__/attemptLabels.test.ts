import { outcomeTentativaLabel, tentativaTitulo } from '../attemptLabels'

describe('outcomeTentativaLabel', () => {
    it('mapeia os tres desfechos', () => {
        expect(outcomeTentativaLabel('AWAITING_RETURN')).toBe('Aguardando devolucao ao CD')
        expect(outcomeTentativaLabel('REQUEUED')).toBe('Voltou para a fila')
        expect(outcomeTentativaLabel('FAILED_FINAL')).toBe('Insucesso definitivo')
    })

    it('cai no rotulo neutro para valor desconhecido ou ausente', () => {
        expect(outcomeTentativaLabel(null)).toBe('Tentativa registrada')
        expect(outcomeTentativaLabel('QUALQUER_COISA')).toBe('Tentativa registrada')
    })
})

describe('tentativaTitulo', () => {
    it('mostra o limite quando o backend o envia', () => {
        expect(tentativaTitulo(2, 3)).toBe('2a tentativa de 3')
    })

    it('omite o limite quando o backend nao envia (app novo x backend antigo)', () => {
        expect(tentativaTitulo(2, undefined)).toBe('2a tentativa')
        expect(tentativaTitulo(2, 0)).toBe('2a tentativa')
    })
})
