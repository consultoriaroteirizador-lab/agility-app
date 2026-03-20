import { create } from "zustand";

import { UserAuth } from "@/services/userAuthInfo/UserAuthInfoType";
import { UserAuthInfoState } from "@/services/userAuthInfo/useUserAuthInfo";

const useUserAuthInfoStore = create<UserAuthInfoState>(set => ({
    userAuth: undefined,
    removeUserAuth: () => set({ userAuth: undefined }),
    setUserAuth: (userAuth: UserAuth) => set({ userAuth })
}))

export function useUserAuthInfoZustand(): Pick<UserAuthInfoState, 'userAuth'> {
    const userAuth = useUserAuthInfoStore(state => state.userAuth)
    return { userAuth }
}

export function useUserAuthInfoServiceZustand(): Pick<UserAuthInfoState, 'removeUserAuth' | 'setUserAuth'> {
    const removeUserAuth = useUserAuthInfoStore(state => state.removeUserAuth)
    const setUserAuth = useUserAuthInfoStore(state => state.setUserAuth)
    return { removeUserAuth, setUserAuth }
}