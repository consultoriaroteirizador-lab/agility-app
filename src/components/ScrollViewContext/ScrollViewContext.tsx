import { createContext, useContext, ReactNode, memo } from 'react';

interface ScrollViewContextValue {
    isInsideScrollView: boolean;
}

const ScrollViewContext = createContext<ScrollViewContextValue>({
    isInsideScrollView: false,
});

export function useScrollViewContext(): ScrollViewContextValue {
    return useContext(ScrollViewContext);
}

interface ScrollViewProviderProps {
    children: ReactNode;
}

export const ScrollViewProvider = memo(function ScrollViewProvider({
    children,
}: ScrollViewProviderProps) {
    return (
        <ScrollViewContext.Provider value={{ isInsideScrollView: true }}>
            {children}
        </ScrollViewContext.Provider>
    );
});

export { ScrollViewContext };
