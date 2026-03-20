import { Platform } from 'react-native';

import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';

import { DeviceFingerprint, DeviceInfo } from '@/types/DeviceType';


const getDeviceFingerprint = async (): Promise<DeviceFingerprint | null> => {
    try {
        let primaryId: string | null = null;
        const platformOS = Platform.OS;

        if (platformOS === 'android') {
            primaryId = Application.getAndroidId();
        } else if (platformOS === 'ios') {
            primaryId = await Application.getIosIdForVendorAsync();
        }

        const buildNumber = platformOS === 'android'
            ? Constants.expoConfig?.android?.versionCode || 1
            : parseInt(Constants.expoConfig?.ios?.buildNumber || '1');

        const versionName = Constants.expoConfig?.version || '1.0.0';

        const deviceInfo: DeviceInfo = {
            platform: getPlatformType(),
            osVersion: Device.osVersion ?? '',
            brand: Device.brand ?? '',
            model: Device.modelName ?? '',
            bundleId: Application.applicationId ?? '',
            modelId: Device.modelId ?? '',
            buildNumber: buildNumber,
            versionName: versionName
        };

        if (primaryId) {
            return {
                deviceId: primaryId,
                source: 'primary',
                deviceInfo
            };
        }

        const fallbackData = [
            Device.osInternalBuildId,
            Device.modelId,
            Device.brand,
            Device.modelName,
            Device.osVersion,
            Application.applicationId,
            getPlatformType(),
            buildNumber.toString(),
            versionName
        ].filter((item): item is string => item !== null && item !== undefined && item !== '');

        const combinedString = fallbackData.join('|');

        if (combinedString.length === 0) {
            console.warn('Não foi possível coletar dados suficientes para o fallback fingerprint.');
            return null;
        }

        const hashedId = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            combinedString
        );

        return {
            deviceId: hashedId,
            source: 'fallback',
            deviceInfo
        };
    } catch (error) {
        console.error('Erro ao gerar fingerprint:', error);
        return null;
    }
};

export { getDeviceFingerprint };

const getPlatformType = (): PlatformType => {
    return Platform.OS === 'ios' ? PlatformType.IOS : PlatformType.ANDROID;
};

export const debugDeviceInfo = async () => {
    const result = await getDeviceFingerprint();
    console.log("Nossa função retorna:");
    console.log("- deviceId:", result?.deviceId);
    console.log("- source:", result?.source);
    console.log("- platform:", result?.deviceInfo.platform);
    console.log("- osVersion:", result?.deviceInfo.osVersion);
    console.log("- buildNumber:", result?.deviceInfo.buildNumber);
    console.log("- versionName:", result?.deviceInfo.versionName);
};


enum PlatformType {
    IOS = 'ios',
    ANDROID = 'android'
}