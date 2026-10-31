import { formatComposicao } from '../composicao'

describe('formatComposicao', () => {
    it('veículo rígido sem carretas', () => {
        expect(formatComposicao({ plate: 'ABC1D23' }, [])).toBe('Veículo ABC1D23')
    })
    it('cavalo com duas carretas', () => {
        expect(formatComposicao({ plate: 'ABC1D23' }, [{ plate: 'XYZ9K87' }, { plate: 'QWE5R55' }])).toBe(
            'Cavalo ABC1D23 · carretas XYZ9K87, QWE5R55',
        )
    })
    it('cavalo com uma carreta', () => {
        expect(formatComposicao({ plate: 'ABC1D23' }, [{ plate: 'XYZ9K87' }])).toBe('Cavalo ABC1D23 · carreta XYZ9K87')
    })
    it('cavalo sem carretas', () => {
        expect(formatComposicao({ plate: 'ABC1D23', kind: 'TRACTOR' }, [])).toBe('Cavalo ABC1D23')
    })
    it('sem veículo ou sem placa devolve null', () => {
        expect(formatComposicao(null, [])).toBeNull()
        expect(formatComposicao(undefined, undefined)).toBeNull()
        expect(formatComposicao({}, [{ plate: 'XYZ9K87' }])).toBeNull()
    })
    it('trailers ausente (backend antigo) é veículo simples', () => {
        expect(formatComposicao({ plate: 'ABC1D23' }, undefined)).toBe('Veículo ABC1D23')
    })
})
