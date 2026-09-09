/**
 * Trava a redação do log da camada de API.
 *
 * O motivo de existir: o build de loja rodava com o log ligado (o profile
 * `production` do `eas.json` não injetava `APP_ENV`, e `isDevelopment` caía no
 * default `'development'`), então o corpo do `POST /auth/login` e a resposta com
 * o par de tokens iam inteiros para o log do aparelho. O portão virou `__DEV__`,
 * mas o portão sozinho já falhou uma vez — `redact` é a segunda tranca, e é esta
 * que estes testes seguram.
 *
 * A checagem é case-insensitive de propósito: o axios 1.x normaliza nome de
 * header para minúsculo, e um campo com grafia nova (`Password`) escaparia de um
 * Set com casing fixo.
 */

import { isSensitiveKey, redact } from '../apiConfig'

describe('isSensitiveKey', () => {
    it.each([
        'password',
        'currentPassword',
        'newPassword',
        'newPasswordConfirmation',
        'access_token',
        'refresh_token',
        'accessToken',
        'refreshToken',
        'authorization',
        'x-api-key',
        'pickupCode',
        'deliveryCode',
    ])('reconhece %s', (key) => {
        expect(isSensitiveKey(key)).toBe(true)
    })

    it('ignora a caixa da chave', () => {
        expect(isSensitiveKey('Password')).toBe(true)
        expect(isSensitiveKey('PASSWORD')).toBe(true)
        expect(isSensitiveKey('Authorization')).toBe(true)
        expect(isSensitiveKey('X-Api-Key')).toBe(true)
    })

    it('deixa passar campo comum', () => {
        expect(isSensitiveKey('emailOrUsername')).toBe(false)
        expect(isSensitiveKey('tenantCode')).toBe(false)
        expect(isSensitiveKey('serviceId')).toBe(false)
    })
})

describe('redact', () => {
    it('esconde a senha do corpo do login e preserva o resto', () => {
        expect(redact({ emailOrUsername: 'motorista@x.com', password: 'senhaReal', tenantCode: 'AGL' })).toEqual({
            emailOrUsername: 'motorista@x.com',
            password: '***',
            tenantCode: 'AGL',
        })
    })

    it('alcança os tokens aninhados dentro de `result`', () => {
        expect(
            redact({
                success: true,
                result: { access_token: 'ey.real', refresh_token: 'ey.refresh', expires_in: 300 },
            })
        ).toEqual({
            success: true,
            result: { access_token: '***', refresh_token: '***', expires_in: 300 },
        })
    })

    it('esconde o código de retirada/entrega que o motorista digita', () => {
        expect(redact({ pickupCode: '4821', deliveryCode: '9930', serviceId: 'abc' })).toEqual({
            pickupCode: '***',
            deliveryCode: '***',
            serviceId: 'abc',
        })
    })

    it('esconde campo sensível com grafia diferente da cadastrada', () => {
        expect(redact({ Password: 'senhaReal', Token: 'ey.real' })).toEqual({
            Password: '***',
            Token: '***',
        })
    })

    it('percorre array', () => {
        expect(redact([{ password: 'a' }, { password: 'b' }])).toEqual([{ password: '***' }, { password: '***' }])
    })

    it('devolve primitivo e null intactos', () => {
        expect(redact('texto')).toBe('texto')
        expect(redact(42)).toBe(42)
        expect(redact(null)).toBeNull()
        expect(redact(undefined)).toBeUndefined()
    })

    it('para de descer depois do limite de profundidade, sem estourar a pilha', () => {
        // 6 níveis: além do teto de 4. O que sobra do teto para baixo é devolvido
        // como está — por isso o teto tem que ficar FORA do alcance de um corpo
        // real (login e refresh aninham em 2).
        const fundo = { a: { b: { c: { d: { e: { password: 'escapa' } } } } } }
        expect(() => redact(fundo)).not.toThrow()
    })

    it('não vaza o valor original no objeto devolvido', () => {
        const redacted = JSON.stringify(redact({ nested: { deep: { password: 'senhaReal' } } }))
        expect(redacted).not.toContain('senhaReal')
    })
})
