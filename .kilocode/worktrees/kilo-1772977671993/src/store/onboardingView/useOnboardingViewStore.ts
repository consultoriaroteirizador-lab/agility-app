import { create } from "zustand";
import { persist } from 'zustand/middleware'


import { OnboardingViewState } from "@/services/onboardingView/useOnboardingViewService";
import { asyncStorage } from "@/services/storage/implementation/asyncStorage";


const useOnboardingViewStore = create<OnboardingViewState>()(
    persist(
        (set) => ({
            onboardingCardViewed: false,
            onboardingPaymentViewed: false,
            setOnboardingPaymentViewed: (viewed: boolean) => set({ onboardingPaymentViewed: viewed }),
            setOnboardingCardViewed: (viewed: boolean) => set({ onboardingCardViewed: viewed }),
        }),
        {
            name: '@OnboardingView',
            storage: asyncStorage,
        }
    )
);

export function useOnboardingViewServiceZustand(): Pick<OnboardingViewState, 'setOnboardingCardViewed' | 'setOnboardingPaymentViewed'> {
    const setOnboardingCardViewed = useOnboardingViewStore(state => state.setOnboardingCardViewed)
    const setOnboardingPaymentViewed = useOnboardingViewStore(state => state.setOnboardingPaymentViewed)
    return {
        setOnboardingCardViewed, setOnboardingPaymentViewed
    }

}

export function useOnboardingViewZustand(): Pick<OnboardingViewState, 'onboardingCardViewed' | 'onboardingPaymentViewed'> {
    const onboardingCardViewed = useOnboardingViewStore(state => state.onboardingCardViewed)
    const onboardingPaymentViewed = useOnboardingViewStore(state => state.onboardingPaymentViewed)
    return {
        onboardingCardViewed, onboardingPaymentViewed
    }

}