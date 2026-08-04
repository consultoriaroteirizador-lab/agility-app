import { toTelHref, toWhatsAppHrefs } from '../phoneContact'

describe('toTelHref', () => {
    it('monta o link tel: so com digitos', () => {
        expect(toTelHref('(11) 98888-7777')).toBe('tel:11988887777')
    })

    it('preserva o + do formato internacional', () => {
        expect(toTelHref('+55 11 98888-7777')).toBe('tel:+5511988887777')
    })

    it('devolve null para telefone ausente', () => {
        expect(toTelHref(null)).toBeNull()
        expect(toTelHref('   ')).toBeNull()
    })

    // Numero curto demais nao e telefone — abrir o discador com lixo e pior
    // do que nao oferecer o botao.
    it('devolve null para numero curto demais', () => {
        expect(toTelHref('1234')).toBeNull()
    })
})

describe('toWhatsAppHrefs', () => {
    it('acrescenta o DDI 55 quando o numero vem so com DDD', () => {
        expect(toWhatsAppHrefs('(11) 98888-7777')).toEqual({
            app: 'whatsapp://send?phone=5511988887777',
            web: 'https://wa.me/5511988887777',
        })
    })

    it('nao duplica o DDI quando ele ja veio', () => {
        expect(toWhatsAppHrefs('+55 11 98888-7777')?.web).toBe('https://wa.me/5511988887777')
    })

    it('devolve null para telefone ausente ou invalido', () => {
        expect(toWhatsAppHrefs(null)).toBeNull()
        expect(toWhatsAppHrefs('1234')).toBeNull()
    })

    // DDD 55 (Santa Maria/RS) e o caso que quebraria uma heuristica baseada em
    // prefixo: o discriminador real e o COMPRIMENTO, nao o "55" da frente.
    it('acrescenta DDI a um fixo de DDD 55 sem duplicar o 55', () => {
        expect(toWhatsAppHrefs('(55) 3321-1234')?.web).toBe('https://wa.me/555533211234')
    })

    it('nao acrescenta DDI a um fixo que ja veio com DDI', () => {
        expect(toWhatsAppHrefs('553533211234')?.web).toBe('https://wa.me/553533211234')
    })
})
