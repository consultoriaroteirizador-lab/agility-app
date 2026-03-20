import { useUserAuthInfoServiceZustand, useUserAuthInfoZustand } from "@/store/userAuthInfo/useUserAuthInfoStore";

import { UserAuth } from "./UserAuthInfoType"

export type UserAuthInfoState = {
    userAuth: UserAuth | undefined;
    setUserAuth: (userAuth: UserAuth) => void
    removeUserAuth: () => void
}


export function useAuthInfo(): Pick<UserAuthInfoState, 'userAuth'> {
    return useUserAuthInfoZustand()
}


export function useAuthInfoService(): Pick<UserAuthInfoState, 'setUserAuth' | 'removeUserAuth'> {
    return useUserAuthInfoServiceZustand()

}