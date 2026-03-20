import { BaseResponse, MutationOptions, useMutationService } from "@/api";

import { RegisterUserNotificationRequest } from "../dto/RegisterUserRequest";
import { notificationService } from "../notificationService";



export function useRegisterUserNotification(options?: MutationOptions<BaseResponse<string>>) {
    const mutation = useMutationService<string, RegisterUserNotificationRequest>({
        action: (request: RegisterUserNotificationRequest) => notificationService.registerUser(request),
        onSuccess: options?.onSuccess,
        onError: options?.onError
    });

    return {
        isLoading: mutation.isLoading,
        registerUserNotification: (variables: RegisterUserNotificationRequest) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    };
}