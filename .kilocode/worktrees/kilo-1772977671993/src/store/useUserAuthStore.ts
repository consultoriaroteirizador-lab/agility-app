import {create} from 'zustand';

interface UserAuthState {
  state: {
    // userAuth: UserAuth | null,
    // tokenInfo: TokenInfo | null
    isAuthenticated: boolean;
    firstAccess: boolean;
  };
  actions: {
    // setUserAuth: (userAuth: UserAuth) => void,
    // setTokenInfo: (tokenInfo: TokenInfo) => void,
    setIsAuthenticate: (authenticate: boolean) => void;
    setFirstAccess: (firstAccess: boolean) => void;
  };
}

const useUserAuthStore = create<UserAuthState>(set => ({
  state: {
    // userAuth: null,
    // tokenInfo: null,
    isAuthenticated: false,
    firstAccess: false,
  },
  actions: {
    // setUserAuth: (userAuth: UserAuth) => set(({ state }) => ({ state: { ...state, userAuth } })),
    // setTokenInfo: (tokenInfo: TokenInfo) => set(({ state }) => ({ state: { ...state, tokenInfo } })),
    setIsAuthenticate: (isAuthenticated: boolean) =>
      set(({state}) => ({state: {...state, isAuthenticated: isAuthenticated}})),
    setFirstAccess: (firstAccess: boolean) =>
      set(({state}) => ({state: {...state, firstAccess: firstAccess}})),
  },
}));

export {useUserAuthStore};
