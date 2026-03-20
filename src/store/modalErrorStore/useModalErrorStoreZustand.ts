import { create } from "zustand";

import { ModalErrorState } from "@/services/modalError/useModalErrorService";

const useModalErrorStore = create<ModalErrorState>(set => ({
    isVisible: false,
    errorMessage: '',
    onClose: () => set({ isVisible: false, errorMessage: '' }),
    openModal: (errorMessage?: string) => set({ isVisible: true, errorMessage: errorMessage ?? 'Houve um erro na sua solicitação' }),
    setErroMessage: (errorMessage: string) => set({ errorMessage })

}))

export function useModalErrorZustand(): Pick<ModalErrorState, 'isVisible' | 'errorMessage'> {
    const isVisible = useModalErrorStore(state => state.isVisible);
    const errorMessage = useModalErrorStore(state => state.errorMessage);
    return {
        isVisible,
        errorMessage
    }
}

export function useModalErrorServiceZustand(): Pick<ModalErrorState, 'openModal' | 'onClose' | 'setErroMessage'> {

    const openModal = useModalErrorStore(state => state.openModal)
    const onClose = useModalErrorStore(state => state.onClose)
    const setErroMessage = useModalErrorStore(state => state.setErroMessage)

    return {
        openModal,
        onClose,
        setErroMessage
    }
}


