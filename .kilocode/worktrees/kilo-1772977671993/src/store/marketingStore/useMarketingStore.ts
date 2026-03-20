import { create } from "zustand";

export interface MarketingState {
  hasShownPromoBanner: boolean;
  setHasShownPromoBanner: (value: boolean) => void;
  clearMarketingSession: () => void;
}

const useMarketingStore = create<MarketingState>((set) => ({
  hasShownPromoBanner: false,
  setHasShownPromoBanner: (value: boolean) => set({ hasShownPromoBanner: value }),
  clearMarketingSession: () => set({ hasShownPromoBanner: false }),
}));

export function useMarketingZustand(): Pick<MarketingState, "hasShownPromoBanner"> {
  const hasShownPromoBanner = useMarketingStore((state) => state.hasShownPromoBanner);
  return { hasShownPromoBanner };
}

export function useMarketingZustandService(): Pick<
  MarketingState,
  "setHasShownPromoBanner" | "clearMarketingSession"
> {
  const setHasShownPromoBanner = useMarketingStore((state) => state.setHasShownPromoBanner);
  const clearMarketingSession = useMarketingStore((state) => state.clearMarketingSession);
  return { setHasShownPromoBanner, clearMarketingSession };
}




