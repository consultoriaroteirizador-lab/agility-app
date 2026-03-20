import { Component, ErrorInfo, ReactNode } from 'react';

import { Box, Text } from '@/components';

import { MapErrorBoundaryProps, MapErrorBoundaryState } from '../_types/stop.types';

/**
 * Error Boundary to catch map rendering errors
 */
class MapErrorBoundary extends Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
    constructor(props: MapErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): MapErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('[StopDetailScreen] Map error:', error, errorInfo);
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <Box flex={1} justifyContent="center" alignItems="center" padding="y20">
                    <Text preset="text15" textAlign="center" color="gray600">
                        Não foi possível carregar o mapa.{'\n'}
                        Use o endereço e o botão de navegação para chegar ao local.
                    </Text>
                </Box>
            );
        }

        return this.props.children;
    }
}

export { MapErrorBoundary };
