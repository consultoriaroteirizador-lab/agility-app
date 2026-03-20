export type PlatformType = 'ios' | 'android';

export interface DeviceInfo {
    platform: PlatformType;
    osVersion: string;
    brand: string;
    model: string;
    bundleId: string;
    modelId: string;
    buildNumber: number;
    versionName: string;
}

export interface DeviceFingerprint {
    deviceId: string;
    source: 'primary' | 'fallback';
    deviceInfo: DeviceInfo;
}
