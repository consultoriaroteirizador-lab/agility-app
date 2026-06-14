import * as Location from 'expo-location';

export interface CapturedCoords {
    latitude: number;
    longitude: number;
    accuracy?: number;
}

/**
 * Captura a posição GPS atual do dispositivo de forma BEST-EFFORT.
 *
 * Usado para registrar "de onde" o motorista executou uma ação (ex.: onde apertou
 * "Estou aqui" / onde finalizou a entrega). NUNCA lança: se a permissão for negada,
 * o GPS falhar ou demorar, retorna `undefined` e a ação segue normalmente — a
 * referência de localização é um extra, não um bloqueio.
 */
/** Tempo máximo aguardando o GPS. Passou disso, segue sem localização. */
const GPS_TIMEOUT_MS = 5000;

/** Resolve `undefined` após `ms` — garante que a captura NUNCA trava o fluxo. */
function timeout<T>(ms: number): Promise<T | undefined> {
    return new Promise((resolve) => setTimeout(() => resolve(undefined), ms));
}

export async function getCurrentCoords(): Promise<CapturedCoords | undefined> {
    try {
        const perm = await Promise.race([
            Location.getForegroundPermissionsAsync(),
            timeout<Location.LocationPermissionResponse>(GPS_TIMEOUT_MS),
        ]);
        let granted = perm?.status === 'granted';

        if (!granted) {
            const requested = await Promise.race([
                Location.requestForegroundPermissionsAsync(),
                timeout<Location.LocationPermissionResponse>(GPS_TIMEOUT_MS),
            ]);
            granted = requested?.status === 'granted';
        }

        if (!granted) {
            return undefined;
        }

        // getCurrentPositionAsync pode demorar/travar (aquisição de GPS). Corremos
        // contra um timeout para nunca bloquear a mudança de status no backend.
        const position = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            timeout<Location.LocationObject>(GPS_TIMEOUT_MS),
        ]);

        if (!position) {
            if (__DEV__) {
                console.warn('[getCurrentCoords] GPS não respondeu a tempo — seguindo sem localização.');
            }
            return undefined;
        }

        return {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy ?? undefined,
        };
    } catch (error) {
        if (__DEV__) {
            console.warn('[getCurrentCoords] Falha ao capturar localização (best-effort):', error);
        }
        return undefined;
    }
}
