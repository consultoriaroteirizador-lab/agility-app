import { BaseResponse, MutationOptions, useMutationService } from "@/api";

import { RegisterUserServiceNotificationRequest } from "../dto/RegisterUserServiceRequest";
import { notificationService } from "../notificationService";



export function useRegisterUserServiceNotification(options?: MutationOptions<BaseResponse<string>>) {
    const mutation = useMutationService<string, RegisterUserServiceNotificationRequest>({
        action: (request: RegisterUserServiceNotificationRequest) => notificationService.registerUserService(request),
        onSuccess: options?.onSuccess,
        onError: options?.onError
    });

    return {
        isLoading: mutation.isLoading,
        registerUserServiceNotification: (variables: RegisterUserServiceNotificationRequest) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    };
}