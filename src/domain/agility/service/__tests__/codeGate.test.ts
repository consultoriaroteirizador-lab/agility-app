import { resolveCodeRequirement } from '../codeGate'
import type { ServiceResponse } from '../dto/response/service.response'
import { ServiceType } from '../dto/types'

type PartialService = Pick<ServiceResponse, 'serviceType' | 'confirmationCode'>

const service = (
    serviceType: ServiceType | null,
    confirmationCode: PartialService['confirmationCode'],
): PartialService => ({ serviceType, confirmationCode })

describe('resolveCodeRequirement', () => {
    describe('leg PICKUP', () => {
        it('exige código para PICKUP quando requirePickupCode=true', () => {
            const s = service(ServiceType.PICKUP, {
                requirePickupCode: true,
                requireDeliveryCode: false,
                allowCodeBypass: false,
            })
            expect(resolveCodeRequirement(s, 'PICKUP')).toEqual({ required: true, allowBypass: false })
        })

        it('exige código para TRANSFER quando requirePickupCode=true', () => {
            const s = service(ServiceType.TRANSFER, {
                requirePickupCode: true,
                requireDeliveryCode: false,
                allowCodeBypass: false,
            })
            expect(resolveCodeRequirement(s, 'PICKUP')).toEqual({ required: true, allowBypass: false })
        })

        it('não exige quando requirePickupCode=false, mesmo em PICKUP', () => {
            const s = service(ServiceType.PICKUP, {
                requirePickupCode: false,
                requireDeliveryCode: false,
                allowCodeBypass: false,
            })
            expect(resolveCodeRequirement(s, 'PICKUP')).toEqual({ required: false, allowBypass: false })
        })

        it('não exige para DELIVERY mesmo com requirePickupCode=true (tipo sem checkpoint de retirada)', () => {
            const s = service(ServiceType.DELIVERY, {
                requirePickupCode: true,
                requireDeliveryCode: false,
                allowCodeBypass: false,
            })
            expect(resolveCodeRequirement(s, 'PICKUP')).toEqual({ required: false, allowBypass: false })
        })

        it('não exige para SERVICE mesmo com requirePickupCode=true (tipo sem checkpoint de retirada)', () => {
            const s = service(ServiceType.SERVICE, {
                requirePickupCode: true,
                requireDeliveryCode: false,
                allowCodeBypass: false,
            })
            expect(resolveCodeRequirement(s, 'PICKUP')).toEqual({ required: false, allowBypass: false })
        })

        it('não exige para RETURN mesmo com requirePickupCode=true (tipo sem checkpoints)', () => {
            const s = service(ServiceType.RETURN, {
                requirePickupCode: true,
                requireDeliveryCode: true,
                allowCodeBypass: false,
            })
            expect(resolveCodeRequirement(s, 'PICKUP')).toEqual({ required: false, allowBypass: false })
        })
    })

    describe('leg DELIVERY', () => {
        it('exige código para DELIVERY quando requireDeliveryCode=true', () => {
            const s = service(ServiceType.DELIVERY, {
                requirePickupCode: false,
                requireDeliveryCode: true,
                allowCodeBypass: false,
            })
            expect(resolveCodeRequirement(s, 'DELIVERY')).toEqual({ required: true, allowBypass: false })
        })

        it('exige código para TRANSFER quando requireDeliveryCode=true', () => {
            const s = service(ServiceType.TRANSFER, {
                requirePickupCode: false,
                requireDeliveryCode: true,
                allowCodeBypass: false,
            })
            expect(resolveCodeRequirement(s, 'DELIVERY')).toEqual({ required: true, allowBypass: false })
        })

        it('exige código para SERVICE quando requireDeliveryCode=true', () => {
            const s = service(ServiceType.SERVICE, {
                requirePickupCode: false,
                requireDeliveryCode: true,
                allowCodeBypass: false,
            })
            expect(resolveCodeRequirement(s, 'DELIVERY')).toEqual({ required: true, allowBypass: false })
        })

        it('não exige quando requireDeliveryCode=false, mesmo em DELIVERY', () => {
            const s = service(ServiceType.DELIVERY, {
                requirePickupCode: false,
                requireDeliveryCode: false,
                allowCodeBypass: false,
            })
            expect(resolveCodeRequirement(s, 'DELIVERY')).toEqual({ required: false, allowBypass: false })
        })

        it('não exige para PICKUP mesmo com requireDeliveryCode=true (tipo sem checkpoint de entrega)', () => {
            const s = service(ServiceType.PICKUP, {
                requirePickupCode: false,
                requireDeliveryCode: true,
                allowCodeBypass: false,
            })
            expect(resolveCodeRequirement(s, 'DELIVERY')).toEqual({ required: false, allowBypass: false })
        })

        it('não exige para RETURN mesmo com requireDeliveryCode=true (tipo sem checkpoints)', () => {
            const s = service(ServiceType.RETURN, {
                requirePickupCode: true,
                requireDeliveryCode: true,
                allowCodeBypass: false,
            })
            expect(resolveCodeRequirement(s, 'DELIVERY')).toEqual({ required: false, allowBypass: false })
        })
    })

    describe('allowBypass é independente de required', () => {
        it('propaga allowCodeBypass=true mesmo quando required=false', () => {
            const s = service(ServiceType.RETURN, {
                requirePickupCode: false,
                requireDeliveryCode: false,
                allowCodeBypass: true,
            })
            expect(resolveCodeRequirement(s, 'PICKUP')).toEqual({ required: false, allowBypass: true })
            expect(resolveCodeRequirement(s, 'DELIVERY')).toEqual({ required: false, allowBypass: true })
        })

        it('propaga allowCodeBypass=true junto com required=true', () => {
            const s = service(ServiceType.DELIVERY, {
                requirePickupCode: false,
                requireDeliveryCode: true,
                allowCodeBypass: true,
            })
            expect(resolveCodeRequirement(s, 'DELIVERY')).toEqual({ required: true, allowBypass: true })
        })
    })

    describe('edge cases nulos', () => {
        it('service undefined → { required: false, allowBypass: false }', () => {
            expect(resolveCodeRequirement(undefined, 'PICKUP')).toEqual({ required: false, allowBypass: false })
            expect(resolveCodeRequirement(undefined, 'DELIVERY')).toEqual({ required: false, allowBypass: false })
        })

        it('service null → { required: false, allowBypass: false }', () => {
            expect(resolveCodeRequirement(null, 'PICKUP')).toEqual({ required: false, allowBypass: false })
        })

        it('confirmationCode null → { required: false, allowBypass: false }', () => {
            const s = service(ServiceType.DELIVERY, null)
            expect(resolveCodeRequirement(s, 'DELIVERY')).toEqual({ required: false, allowBypass: false })
        })

        it('confirmationCode undefined → { required: false, allowBypass: false }', () => {
            const s = service(ServiceType.PICKUP, undefined)
            expect(resolveCodeRequirement(s, 'PICKUP')).toEqual({ required: false, allowBypass: false })
        })

        it('serviceType null → { required: false, allowBypass: false } mesmo com flags true', () => {
            const s = service(null, {
                requirePickupCode: true,
                requireDeliveryCode: true,
                allowCodeBypass: true,
            })
            expect(resolveCodeRequirement(s, 'PICKUP')).toEqual({ required: false, allowBypass: false })
            expect(resolveCodeRequirement(s, 'DELIVERY')).toEqual({ required: false, allowBypass: false })
        })
    })
})
