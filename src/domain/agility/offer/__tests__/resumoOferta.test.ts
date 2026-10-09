// Rodada de 09/10/2026: o aviso de oferta dizia "0 paradas · 0 km · 0min" e a confirmação de
// aceitar não dizia nada além do título.
import { resumoDaOferta, textoAceitarOferta } from '../resumoOferta';

describe('resumoDaOferta', () => {
    it('rota otimizada: paradas, distância e tempo', () => {
        expect(resumoDaOferta({ totalServices: 2, totalDistanceKm: 12.34, totalDurationMinutes: 95 }))
            .toBe('2 paradas · 12,3 km · 1h 35min');
    });

    it('rota sem cálculo: não afirma 0 km nem 0 min', () => {
        expect(resumoDaOferta({ totalServices: 2, totalDistanceKm: 0, totalDurationMinutes: 0 })).toBe('2 paradas');
        expect(resumoDaOferta({ totalServices: 1 })).toBe('1 parada');
    });

    it('sem contagem de paradas, mostra o que tiver', () => {
        expect(resumoDaOferta({ totalDistanceKm: 5, totalDurationMinutes: 40 })).toBe('5,0 km · 40min');
        expect(resumoDaOferta({})).toBe('');
    });
});

describe('textoAceitarOferta', () => {
    it('diz qual rota, quantas paradas e o valor', () => {
        expect(textoAceitarOferta({ code: '0000029', totalParadas: 2, totalValue: 30 }))
            .toBe('Você vai assumir a rota 0000029: 2 paradas, R$ 30,00.');
    });

    it('sem valor de frete, não inventa R$ 0,00', () => {
        expect(textoAceitarOferta({ code: '0000029', totalParadas: 1, totalValue: null }))
            .toBe('Você vai assumir a rota 0000029: 1 parada, frete não definido.');
    });

    it('sem código, fala da rota', () => {
        expect(textoAceitarOferta({ totalParadas: 3, totalValue: 120.5 }))
            .toBe('Você vai assumir esta rota: 3 paradas, R$ 120,50.');
    });
});
