import { useModalErrorServiceZustand, useModalErrorZustand } from "@/store/modalErrorStore/useModalErrorStoreZustand";

export type ModalErrorState = {
    isVisible: boolean;
    errorMessage: string;
    onClose: () => void;
    openModal: (erroMessage?: string) => void;
    setErroMessage: (message: string) => void;
};


export function useModalError(): Pick<ModalErrorState, 'isVisible' | 'errorMessage'> {
    return useModalErrorZustand();
}



export function useModalErrorService(): Pick<ModalErrorState, 'openModal' | 'onClose' | 'setErroMessage'> {
    return useModalErrorServiceZustand();
}

