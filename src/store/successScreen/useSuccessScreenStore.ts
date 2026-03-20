import { create } from "zustand"

import { LocalIconName } from "@/components"
import { OperationType, SuccessScreenState } from "@/services/successScreen/useSuccessScreenService"



const useSuccessScreenStore = create<SuccessScreenState>(set => ({
    operationType: 'default',
    message: undefined,
    iconName: undefined,
    clearData: () => set({ operationType: 'default', message: undefined, iconName: undefined }),
    setData: (operationType: OperationType, message?: string | undefined, iconName?: LocalIconName | undefined) => set({ operationType, message, iconName })
}))


export function useSuccessScreenZustand(): Pick<SuccessScreenState, 'operationType' | 'message' | 'iconName'> {
    const operationType = useSuccessScreenStore(state => state.operationType)
    const message = useSuccessScreenStore(state => state.message)
    const iconName = useSuccessScreenStore(state => state.iconName)
    return {
        operationType,
        message,
        iconName
    }

}


export function useSuccessScreenServiceZustand(): Pick<SuccessScreenState, 'clearData' | 'setData'> {
    const clearData = useSuccessScreenStore(state => state.clearData)
    const setData = useSuccessScreenStore(state => state.setData)

    return {
        clearData, setData
    }

}
