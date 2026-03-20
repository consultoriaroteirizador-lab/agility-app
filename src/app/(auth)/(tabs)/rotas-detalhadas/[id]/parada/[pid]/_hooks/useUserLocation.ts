import { useEffect, useState } from 'react';

import * as Location from 'expo-location';

export interface UseUserLocationReturn {
    userLocation: Location.LocationObject | null;
    isLoading: boolean;
    error: string | null;
}

/**
 * Hook to get and track the user's current location
 */
export const useUserLocation = (): UseUserLocationReturn => {
    const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const getCurrentLocation = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Request permission
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    if (isMounted) {
                        setError('Location permission denied');
                        setIsLoading(false);
                    }
                    return;
                }

                // Get current location
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });

                if (isMounted) {
                    setUserLocation(location);
                    setIsLoading(false);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err.message : 'Failed to get location');
                    setIsLoading(false);
                }
            }
        };

        getCurrentLocation();

        return () => {
            isMounted = false;
        };
    }, []);

    return {
        userLocation,
        isLoading,
        error,
    };
};
