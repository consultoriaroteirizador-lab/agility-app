import { create } from 'zustand';

interface CreateUserState {
    state: {
        alias?: string;
        taxNumber?: string;
        fullName?: string;
        birthDate?: Date;
        gender?: string;
        phoneNumber?: string;
        email?: string;
    };
    actions: {
        setAlias: (alias: string) => void;
        setTaxNumber: (taxNumber: string) => void;
        setFullName: (fullName: string) => void;
        setBirthDate: (birthDate?: Date) => void;
        setGender: (gender: string) => void;
        setPhoneNumber: (phoneNumber: string) => void;
        setEmail: (email: string) => void;
    };
}

const useUserInfoStore = create<
    CreateUserState['state'] & CreateUserState['actions'] & { clearUserInfo: () => void }
>(set => ({
    alias: undefined,
    taxNumber: undefined,
    fullName: undefined,
    birthDate: undefined,
    phoneNumber: undefined,
    email: undefined,
    setAlias: (alias: string) => set(state => ({ ...state, alias: alias })),
    setTaxNumber: taxNumber => set(state => ({ ...state, taxNumber: taxNumber })),
    setFullName: (fullName: string) =>
        set(state => ({ ...state, fullName: fullName })),
    setBirthDate: (birthDate?: Date) =>
        set(state => ({ ...state, birthDate: birthDate })),
    setGender: (gender: string) => set(state => ({ ...state, gender: gender })),
    setEmail: (email: string) => set(state => ({ ...state, email: email })),
    setPhoneNumber: (phoneNumber: string) =>
        set(state => ({ ...state, phoneNumber: phoneNumber })),
    clearUserInfo: () => set({
        alias: undefined,
        taxNumber: undefined,
        fullName: undefined,
        birthDate: undefined,
        gender: undefined,
        phoneNumber: undefined,
        email: undefined,
    }),
}));

export function useUserInfoService() {
    const clearUserInfo = useUserInfoStore(state => state.clearUserInfo);
    return { clearUserInfo };
}

export { useUserInfoStore };
