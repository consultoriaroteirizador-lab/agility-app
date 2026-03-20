import { useOnboardingViewServiceZustand, useOnboardingViewZustand } from "@/store/onboardingView/useOnboardingViewStore";

export type OnboardingViewState = {
    onboardingCardViewed: boolean;
    onboardingPaymentViewed: boolean;
    setOnboardingPaymentViewed: (onboardingCardViewed: boolean) => void;
    setOnboardingCardViewed: (onboardingPaymentViewed: boolean) => void;
}

export function useOnboardingViewService(): Pick<OnboardingViewState, 'setOnboardingCardViewed' | 'setOnboardingPaymentViewed'> {
    return useOnboardingViewServiceZustand()
}

export function useOnboardingView(): Pick<OnboardingViewState, 'onboardingCardViewed' | 'onboardingPaymentViewed'> {
    return useOnboardingViewZustand()
}