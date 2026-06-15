export type RegisterUserNotificationRequest = {
    token: string,
    platform: "ANDROID" | "IOS",
    deviceId: string
}
