import * as Location from 'expo-location';

import type { EquipmentResponse, ServiceMaterialResponse } from '@/domain/agility/service/dto'

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

export { EquipmentResponse } from '@/domain/agility/service/dto'

export interface StopStatus {
    isPending: boolean;
    isInProgress: boolean;
    isCompleted: boolean;
    isCanceled: boolean;
    canStartService: boolean;
    isNextStop: boolean;
    hasOtherServiceInProgress: boolean;
    canCompleteRouting: boolean;
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
    hasArrivedAtLocation: boolean;
    isStarting?: boolean;
    isCompletingRouting?: boolean;
    onGoToLocation: () => void;
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
    equipments: EquipmentResponse[];
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
