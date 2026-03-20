// import { api, refreshToken } from "@/api/apiConfig";
// import { AuthCredentialsState } from "@/services/authCredentials";

// export async function checkAndRefreshToken(state: AuthCredentialsState) {
//     const { authCredentials: authCredentials, removeCredentials: remove, saveCredentials: saveCredencial } = state;

//     if (!authCredentials) {
//         throw new Error('Credenciais ausentes, redirecionando para login.');
//     }

//     let { expiration, expirationRefreshToken, accessToken } = authCredentials;

//     expiration = new Date(expiration);
//     expirationRefreshToken = new Date(expirationRefreshToken);

//     const currentTime = new Date();

//     if (isNaN(expiration.getTime()) || isNaN(expirationRefreshToken.getTime())) {
//         throw new Error("Datas de expiração inválidas");
//     }

//     const remainingTimeAccessToken = expiration.getTime() - currentTime.getTime();
//     const remainingTimeRefreshToken = expirationRefreshToken.getTime() - currentTime.getTime();

//     // const remainingTimeAccessToken = 0;
//     // const remainingTimeRefreshToken = 0;

//     console.log('remainingTimeAccessToken', remainingTimeAccessToken)
//     console.log('remainingTimeRefreshToken', remainingTimeRefreshToken)


//     try {
//         if (remainingTimeAccessToken <= 0) {
//             if (remainingTimeRefreshToken <= 0) {
//                 remove();
//                 delete api.defaults.headers.common.Authorization;
//                 throw new Error('Token expirado, redirecionando para login.');
//             }
//             await refreshToken(state);
//         } else if (remainingTimeAccessToken <= 60 * 1000 && remainingTimeRefreshToken > 0) {
//             await refreshToken(state);
//         }

//         const updatedAccessToken = state.authCredentials?.accessToken;
//         if (updatedAccessToken) {
//             api.defaults.headers.common.Authorization = `Bearer ${updatedAccessToken}`;
//         } else {
//             delete api.defaults.headers.common.Authorization;
//         }
//     } catch (error) {
//         if (error instanceof Error) {
//             remove();
//             delete api.defaults.headers.common.Authorization;
//             throw error; // Relança o erro original
//         }
//         throw new Error('Erro desconhecido ao renovar o token.');
//     }

// }