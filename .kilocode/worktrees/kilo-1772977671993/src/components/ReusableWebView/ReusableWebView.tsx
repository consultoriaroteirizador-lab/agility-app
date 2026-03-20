import React, { useState } from 'react';

import { ActivityIndicator } from '../ActivityIndicator/ActivityIndicator';
import { Box } from '../BoxBackGround/BoxBackGround';
import { WebViewBox, WebViewBoxProps } from '../RestyleComponent/RestyleComponent';
import { Text } from '../Text/Text';



interface ReusableWebViewProps extends WebViewBoxProps {
    containerProps?: React.ComponentProps<typeof Box>;
}

export function ReusableWebView({
    source,
    containerProps,
    onLoadStart,
    onLoadEnd,
    onError,
    ...restWebViewBoxProps
}: ReusableWebViewProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handleLoadStart = (event: any) => {
        setIsLoading(true);
        setError(null);
        onLoadStart?.(event);
    };

    const handleLoadEnd = (event: any) => {
        setIsLoading(false);
        onLoadEnd?.(event);
    };

    const handleError = (syntheticEvent: any) => {
        const { nativeEvent } = syntheticEvent;
        setError(`Erro ao carregar: ${nativeEvent.description || 'Desconhecido'}`);
        setIsLoading(false);
        onError?.(syntheticEvent);
    };

    return (
        <Box flex={1} position="relative" {...containerProps}>
            <WebViewBox
                source={source}
                onLoadStart={handleLoadStart}
                onLoadEnd={handleLoadEnd}
                onError={handleError}
                flex={1}
                {...restWebViewBoxProps}
            />

            {isLoading && (
                <Box
                    position="absolute"
                    top={measure.t0}
                    bottom={measure.b0}
                    left={measure.l0}
                   right={measure.r0}
                    justifyContent="center"
                    alignItems="center"
                    opacity={0.9}
                >
                    <ActivityIndicator
                        size="large"
                    />
                </Box>
            )}

            {error && !isLoading && (
                <Box
                    position="absolute"
                    top={measure.t0}
                    bottom={measure.b0}
                    left={measure.l0}
                   right={measure.r0}
                    justifyContent="center"
                    alignItems="center"
                    opacity={0.9}
                >
                    <Text
                        color='redError'
                        preset="text15"
                        textAlign="center"
                        mx="x10"
                    >
                        {error}
                    </Text>
                </Box>
            )}
        </Box>
    );
};
