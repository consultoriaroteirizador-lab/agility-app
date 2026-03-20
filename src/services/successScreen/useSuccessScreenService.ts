

import { LocalIconName } from "@/components"

import { useSuccessScreenServiceZustand, useSuccessScreenZustand } from "../../store/successScreen/useSuccessScreenStore"

export type OperationType = 'Withdrawal' | 'Shopping_Card' | 'Shopping_Recharge' | 'default'

export interface SuccessScreenState {
    operationType: OperationType,
    message: string | undefined,
    iconName?: LocalIconName | undefined,
    setData: (operationType: OperationType, message: string | undefined, iconName: LocalIconName | undefined) => void
    clearData: () => void
}

export function useSuccessScreen(): Pick<SuccessScreenState, 'operationType' | 'message' | 'iconName'> {
    return useSuccessScreenZustand()
}

export function useSuccessScreenService(): Pick<SuccessScreenState, 'clearData' | 'setData'> {
    return useSuccessScreenServiceZustand()
}