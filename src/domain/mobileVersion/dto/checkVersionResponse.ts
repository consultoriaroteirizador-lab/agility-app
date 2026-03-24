export interface CheckVersionResponse {
    needsUpdate: boolean;
    forceUpdate: boolean;
    currentBuildNumber: number;
    minBuildNumber: number;
    versionName: string | null;
}
