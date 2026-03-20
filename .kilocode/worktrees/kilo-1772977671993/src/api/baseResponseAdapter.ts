import { AxiosError, AxiosResponse } from "axios";

import { BaseResponse } from "./baseResponse";
import { BaseResponseAPI } from "./baseResponseAPI";



/**
 * Converts a `BaseResponseAPI<T>` to `BaseResponse<NT | string>`, allowing an optional transformation of the `result` field.
 *
 * @template T - The type of the `result` in the input `BaseResponseAPI`.
 * @template NT - The type of the transformed `result` in the output `BaseResponse`.
 *
 * @param {BaseResponseAPI<T>} baseResponseAPI - The input base response object from the API.
 * @param {NT} [newResult] - An optional transformed value for the `result` field.
 * @returns {BaseResponse<NT | string>} The transformed base response object.
 */
function toBaseResponse<T, NT>(baseResponseAPI: BaseResponseAPI<T>, newResult?: NT): BaseResponse<NT | string> {
    return {
        success: baseResponseAPI.success,
        message: baseResponseAPI.message,
        result: newResult ? newResult : undefined,
        error: baseResponseAPI.error,
    };
}



function toBaseResponseError(error: AxiosError<BaseResponseAPI<any>>): BaseResponse<any> {
    if (error.response) {
        const responseData = error.response.data;
        return {
            success: responseData.success,
            error: {
                message: responseData.error?.message || 'Erro desconhecido',
                code: responseData.error?.code || 'N/A',
                validationErrors: responseData.error?.validationErrors || [],
            },
        };
    } else {
        return {
            success: false,
            error: {
                message: "Ocorreu um erro desconhecido",
                code: "AU-000"
            }
        };
    }
}

function toAxiosErrorBaseResponse(error: AxiosError<BaseResponseAPI<any>>): AxiosError<BaseResponse<any>> {
    const responseData = error.response?.data;

    const adaptedError = new AxiosError(
        responseData?.error?.message || 'Erro desconhecido',
        error.code,
        error.config,
        error.request,
        {
            ...error.response,
            status: error.response?.status || 500, // Garantindo que o status seja sempre um número
            data: toBaseResponseError(error) // Adaptando a resposta para o formato BaseResponse
        } as AxiosResponse<BaseResponse<any>> // Forçando o tipo
    );

    return adaptedError;
}




export const baseResponseAdapter = {
    toBaseResponse,
    toBaseResponseError,
    toAxiosErrorBaseResponse
}



