import { useState, useEffect } from 'react';

import * as Location from 'expo-location';

/**
 * Hook para gerenciar a localização do usuário
 */
export function useParadaLocation() {
    const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function getCurrentLocation() {
            try {
                setIsLoading(true);
                setError(null);

                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    if (isMounted) {
                        setError('Permissão de localização negada');
                        setIsLoading(false);
                    }
                    return;
                }

                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });

                if (isMounted) {
                    setUserLocation(location);
                    setIsLoading(false);
                }
            } catch (err) {
                if (isMounted) {
                    setError('Erro ao obter localização');
                    setIsLoading(false);
                    console.error('[useParadaLocation] Erro:', err);
                }
            }
        }

        getCurrentLocation();

        return () => {
            isMounted = false;
        };
    }, []);

    // Atualizar localização manualmente
    const refreshLocation = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setError('Permissão de localização negada');
                setIsLoading(false);
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            setUserLocation(location);
            setIsLoading(false);
        } catch (err) {
            setError('Erro ao obter localização');
            setIsLoading(false);
            console.error('[useParadaLocation] Erro ao atualizar:', err);
        }
    };

    return {
        userLocation,
        isLoading,
        error,
        refreshLocation,
        hasLocation: !!userLocation,
        latitude: userLocation?.coords.latitude ?? null,
        longitude: userLocation?.coords.longitude ?? null,
    };
}
