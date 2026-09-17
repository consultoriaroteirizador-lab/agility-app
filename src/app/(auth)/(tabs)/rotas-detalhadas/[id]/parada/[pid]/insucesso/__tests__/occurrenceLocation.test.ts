import { coordsParaOcorrencia } from '../occurrenceLocation'

describe('coordsParaOcorrencia', () => {
    it('manda o par completo', () => {
        expect(coordsParaOcorrencia({ latitude: -23.5, longitude: -46.6, accuracy: 8 }))
            .toEqual({ latitude: -23.5, longitude: -46.6, accuracy: 8 })
    })

    it('nao poda a coordenada zero', () => {
        expect(coordsParaOcorrencia({ latitude: 0, longitude: 0 }))
            .toEqual({ latitude: 0, longitude: 0 })
    })

    it('sem GPS nao manda nada', () => {
        expect(coordsParaOcorrencia(undefined)).toBeNull()
    })

    it('meia coordenada nao vai (o backend responde 400)', () => {
        expect(coordsParaOcorrencia({ latitude: -23.5 } as never)).toBeNull()
        expect(coordsParaOcorrencia({ latitude: Number.NaN, longitude: -46.6 } as never)).toBeNull()
    })

    it('descarta accuracy invalida sem descartar o par', () => {
        expect(coordsParaOcorrencia({ latitude: -23.5, longitude: -46.6, accuracy: -1 }))
            .toEqual({ latitude: -23.5, longitude: -46.6 })
        expect(coordsParaOcorrencia({ latitude: -23.5, longitude: -46.6, accuracy: Number.NaN }))
            .toEqual({ latitude: -23.5, longitude: -46.6 })
    })
})
