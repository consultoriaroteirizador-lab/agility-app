import { create } from "zustand";

type PasswordScreenPropsState<TParams = void, TResult = void> = {
    title: string | null;
    action: (params?: TParams) => TResult;
    setTitle: (title: string | null) => void;
    setAction: (action: (params?: TParams) => TResult) => void;
    clear: () => void; // Função para limpar o estado
};

const usePasswordScreenPropsStore = create<PasswordScreenPropsState>((set) => ({
    title: null,
    action: () => {
        console.log("Default action");
        return; // Sem retorno por padrão
    },
    setTitle: (title) => set({ title }),
    setAction: (action) => set({ action }),
    clear: () => set({
        title: null,
        action: () => {
            console.log("Default action");
            return; // Sem retorno por padrão
        },
    }),
}));

export default usePasswordScreenPropsStore;
