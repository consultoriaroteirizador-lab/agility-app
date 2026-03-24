export interface CheckVersionRequest {
    platform: 'IOS' | 'ANDROID';
    buildNumber: number;
}
