import { LocationObject } from "expo-location";
import { create } from "zustand";

interface LocationState {
    location: LocationObject | null,
    validateLocation: number,
    setValidateLocation: (validateLocation: number) => void,
    setLocation: (location: LocationObject) => void,
    clearLocation: () => void,
}

const useLocation = create<LocationState>((set) => ({
    location: null,
    validateLocation: 0,
    setLocation: (location) => set({ location }),
    clearLocation: () => set({ location: null }),
    setValidateLocation: (validateLocation) => set({ validateLocation }),
}));

export default useLocation;