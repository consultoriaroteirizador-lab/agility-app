import * as Location from 'expo-location';

import type { ServiceMaterialResponse } from '@/domain/agility/service/dto'

export type TabType = 'local' | 'equipment';

export type NavigationApp = 'waze' | 'googleMaps' | 'appleMaps';

export interface StopCoordinates {
    latitude: number;
    longitude: number;
}

export interface MapRegion extends StopCoordinates {
    latitudeDelta: number;
    longitudeDelta: number;
}


export interface StopStatus {
    isPending: boolean;
    /** A caminho do cliente (IN_PROGRESS) */
    isInProgress: boolean;
    /** Em atendimento — chegou no cliente (IN_ATTENDANCE) */
    isInAttendance: boolean;
    isCompleted: boolean;
    isCanceled: boolean;
    canStartService: boolean;
    isNextStop: boolean;
    hasOtherServiceInProgress: boolean;
    canCompleteRouting: boolean;
    /**
     * Motivo do bloqueio para iniciar a parada (regras configuráveis da empresa),
     * ou null quando pode iniciar. Usado no toast ao tentar iniciar bloqueado.
     */
    startBlockReason: string | null;
}

export interface StopActionsHandlers {
    onGoToLocation: () => void;
    onArrivedAtLocation: () => void;
    onServiceCompleted: () => void;
    onServiceNotCompleted: () => void;
}

export interface StopMapProps {
    latitude: number | null;
    longitude: number | null;
    addressText: string;
    customerName: string;
    userLocation: Location.LocationObject | null;
    onNavigatePress: () => void;
    isLoadingAddress: boolean;
}

export interface StopActionsProps extends StopStatus {
    /** Alias derivado de isInAttendance — mantido para compat. */
    hasArrivedAtLocation: boolean;
    isStarting?: boolean;
    isStartingAttendance?: boolean;
    isCompletingRouting?: boolean;
    onGoToLocation: () => void;
    /** "Estou aqui" — inicia o atendimento (IN_ATTENDANCE). */
    onArrivedAtLocation: () => void;
    onServiceCompleted: () => void;
    onServiceNotCompleted: () => void;
    onCompleteRouting?: () => void;
}

export interface NavigationModalProps {
    isVisible: boolean;
    onClose: () => void;
    onSelectApp: (app: NavigationApp) => void;
    showAppleMaps: boolean;
}

export interface EquipmentListProps {
    materials: ServiceMaterialResponse[];
}

export interface StopTabsProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    localContent: React.ReactNode;
    equipmentContent: React.ReactNode;
}

export interface MapErrorBoundaryState {
    hasError: boolean;
}

export interface MapErrorBoundaryProps {
    children: React.ReactNode;
}

export interface MaterialListProps {
    materials: ServiceMaterialResponse[];
}
