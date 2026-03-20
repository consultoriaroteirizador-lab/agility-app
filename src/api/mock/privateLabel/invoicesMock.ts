import { BaseResponseAPI } from "@/api/baseResponseAPI";

// Adicionei 'LATE' ao enum para corresponder à sua solicitação
export enum StatusInvoicePrivateLabelEnum {
    OPENED = "OPENED",
    PAID = "PAID",
    LATE = "LATE"
}

export interface InvoiceMovement {
    release: string;
    date: string;
    value: number;
    signal: string;
    status: string;
    futureRelease: string;
}

export interface InvoicePrivateLabelResponseAPI {
    invoiceCode: number;
    dueDate: string;
    totalPayable: number;
    minimumPayable: number;
    totalDue: number;
    closed: string;
    digitableLine: string;
    status: StatusInvoicePrivateLabelEnum | string; // Permitindo string caso haja outros status não mapeados
    invoiceMovements: InvoiceMovement[];
}

export const mockInvoicePrivateLabel: BaseResponseAPI<InvoicePrivateLabelResponseAPI[]> = {
    "success": true,
    "message": undefined,
    "result": [
        {
            "invoiceCode": 123968201, // Fatura Atual - Status ABERTA
            "dueDate": "2025-10-03T00:00:00", // Vencimento em Outubro
            "totalPayable": 414.42,
            "minimumPayable": 314.99,
            "totalDue": 0.0,
            "closed": "S",
            "digitableLine": "23793.15225 60020.770032 15032.433904 1 00000000000000",
            "status": StatusInvoicePrivateLabelEnum.OPENED,
            "invoiceMovements": [
                {
                    "release": "COMPRA ONLINE - LOJA X",
                    "date": "2025-09-05T10:30:00-03:00",
                    "value": 150.00,
                    "signal": "+",
                    "status": "F",
                    "futureRelease": "N"
                },
                {
                    "release": "ASSINATURA STREAMING",
                    "date": "2025-09-10T08:00:00-03:00",
                    "value": 49.90,
                    "signal": "+",
                    "status": "F",
                    "futureRelease": "N"
                },
                {
                    "release": "RECARGA CELULAR",
                    "date": "2025-09-18T14:15:00-03:00", // Data variada
                    "value": 30.00,
                    "signal": "+",
                    "status": "F",
                    "futureRelease": "N"
                },
                {
                    "release": "ANUIDADE CARTÃO",
                    "date": "2025-09-25T00:00:00-03:00", // Data variada
                    "value": 19.90,
                    "signal": "+",
                    "status": "F",
                    "futureRelease": "N"
                },
                {
                    "release": "COMPRA SUPERMERCADO",
                    "date": "2025-09-02T17:00:00-03:00", // Data variada
                    "value": 100.00,
                    "signal": "+",
                    "status": "F",
                    "futureRelease": "N"
                }
            ]
        },
        {
            "invoiceCode": 123968202, // Fatura Penúltima - Status ATRASADA
            "dueDate": "2025-08-03T00:00:00", // Vencimento em Agosto (passado)
            "totalPayable": 350.00,
            "minimumPayable": 70.00,
            "totalDue": 350.00, // Valor total devido
            "closed": "S",
            "digitableLine": "23793.15225 60020.770032 15032.433904 1 00000000000000",
            "status": StatusInvoicePrivateLabelEnum.LATE, // Corrigido para LATE
            "invoiceMovements": [
                {
                    "release": "COMPRA SUPERMERCADO",
                    "date": "2025-07-07T18:00:00-03:00", // Data variada
                    "value": 120.00,
                    "signal": "+",
                    "status": "F",
                    "futureRelease": "N"
                },
                {
                    "release": "COMPRA FARMÁCIA",
                    "date": "2025-07-14T11:45:00-03:00", // Data variada
                    "value": 45.00,
                    "signal": "+",
                    "status": "F",
                    "futureRelease": "N"
                },
                {
                    "release": "PAGAMENTO PARCIAL",
                    "date": "2025-08-05T10:00:00-03:00", // Após vencimento
                    "value": 50.00,
                    "signal": "-",
                    "status": "F",
                    "futureRelease": "N"
                },
                {
                    "release": "JUROS DE MORA",
                    "date": "2025-08-25T00:00:00-03:00", // Após vencimento
                    "value": 15.00,
                    "signal": "+",
                    "status": "F",
                    "futureRelease": "N"
                },
                {
                    "release": "MULTA POR ATRASO",
                    "date": "2025-08-25T00:00:00-03:00", // Após vencimento
                    "value": 7.50,
                    "signal": "+",
                    "status": "F",
                    "futureRelease": "N"
                },
                {
                    "release": "ASSINATURA REVISTA",
                    "date": "2025-07-22T09:00:00-03:00", // Data variada
                    "value": 25.00,
                    "signal": "+",
                    "status": "F",
                    "futureRelease": "N"
                }
            ]
        },
        {
            "invoiceCode": 122723298, // Fatura PAGA 1
            "dueDate": "2025-07-03T00:00:00", // Vencimento em Julho (passado e paga)
            "totalPayable": 290.13,
            "minimumPayable": 0.0,
            "totalDue": 0.0,
            "closed": "S",
            "digitableLine": "",
            "status": StatusInvoicePrivateLabelEnum.PAID,
            "invoiceMovements": [
                {
                    "release": "FATURA ANTERIOR",
                    "date": "2025-06-03T00:00:00-03:00",
                    "value": 320.58,
                    "signal": "+",
                    "status": "F",
                    "futureRelease": "N"
                },
                {
                    "release": "PAGAMENTOS EFETUADOS",
                    "date": "2025-07-01T00:00:00-03:00",
                    "value": 320.58,
                    "signal": "-",
                    "status": "F",
                    "futureRelease": "N"
                },
                {
                    "release": "COMPRA RESTAURANTE",
                    "date": "2025-06-08T20:00:00-03:00", // Data variada
                    "value": 80.00,
                    "signal": "+",
                    "status": "F",
                    "futureRelease": "N"
                },
                {
                    "release": "ASSINETTECH",
                    "date": "2025-06-15T00:00:00-03:00", // Data variada
                    "value": 9.90,
                    "signal": "+",
                    "status": "F",
                    "futureRelease": "N"
                },
                {
                    "release": "PEDIDO DE COMIDA",
                    "date": "2025-06-20T19:30:00-03:00", // Data variada
                    "value": 45.00,
                    "signal": "+",
                    "status": "F",
                    "futureRelease": "N"
                }
            ]
        },
        {
            "invoiceCode": 122723299, // Fatura PAGA 2
            "dueDate": "2025-06-03T00:00:00", // Vencimento em Junho (mais antiga e paga)
            "totalPayable": 180.50,
            "minimumPayable": 0.0,
            "totalDue": 0.0,
            "closed": "S",
            "digitableLine": "",
            "status": StatusInvoicePrivateLabelEnum.PAID,
            "invoiceMovements": [
                {
                    "release": "COMPRA ROUPAS",
                    "date": "2025-05-05T16:00:00-03:00", // Data variada
                    "value": 120.00,
                    "signal": "+",
                    "status": "F",
                    "futureRelease": "N"
                },
                {
                    "release": "PAGAMENTOS EFETUADOS",
                    "date": "2025-06-01T00:00:00-03:00",
                    "value": 180.50,
                    "signal": "-",
                    "status": "F",
                    "futureRelease": "N"
                },
                {
                    "release": "TAXA DE SERVIÇO",
                    "date": "2025-05-12T00:00:00-03:00", // Data variada
                    "value": 10.50,
                    "signal": "+",
                    "status": "F",
                    "futureRelease": "N"
                },
                {
                    "release": "LAVA RÁPIDO",
                    "date": "2025-05-19T14:00:00-03:00", // Data variada
                    "value": 30.00,
                    "signal": "+",
                    "status": "F",
                    "futureRelease": "N"
                }
            ]
        }
    ],
    "error": undefined
};





// import { BaseResponseAPI } from "@/api/baseResponseAPI";
// import {
//     InvoicePrivateLabelResponseAPI,
//     StatusInvoicePrivateLabelEnum
// } from "@/domain/privateLabel/dto/response/InvoiceResponse";

// export const mockInvoicePrivateLabel: BaseResponseAPI<InvoicePrivateLabelResponseAPI[]> = {
//     "success": true,
//     "message": undefined,
//     "result": [
//         {
//             "invoiceCode": 123968200,
//             "dueDate": "2025-09-03T00:00:00",
//             "totalPayable": 414.42,
//             "minimumPayable": 314.99,
//             "totalDue": 0.0,
//             "closed": "S",
//             "digitableLine": "23793.15225 60020.770032 15032.433904 1 00000000000000",
//             "status": StatusInvoicePrivateLabelEnum.OPENED,
//             "invoiceMovements": [
//                 {
//                     "release": "FATURA ANTERIOR",
//                     "date": "2025-08-03T00:00:00-03:00",
//                     "value": 290.13,
//                     "signal": "+",
//                     "status": "F",
//                     "futureRelease": "N"
//                 },
//                 {
//                     "release": "99* ",
//                     "date": "2025-08-04T00:00:00-03:00",
//                     "value": 7.9,
//                     "signal": "+",
//                     "status": "F",
//                     "futureRelease": "N"
//                 },
//                 {
//                     "release": "ENCARGOS DE ROTATIVO",
//                     "date": "2025-08-25T00:00:00-03:00",
//                     "value": 68.9,
//                     "signal": "+",
//                     "status": "F",
//                     "futureRelease": "N"
//                 },
//                 {
//                     "release": "JUROS DE MORA",
//                     "date": "2025-08-25T00:00:00-03:00",
//                     "value": 3.0,
//                     "signal": "+",
//                     "status": "F",
//                     "futureRelease": "N"
//                 },
//                 {
//                     "release": "MULTA DE MORA",
//                     "date": "2025-08-25T00:00:00-03:00",
//                     "value": 5.8,
//                     "signal": "+",
//                     "status": "F",
//                     "futureRelease": "N"
//                 },
//                 {
//                     "release": "IOF DE ROTATIVO",
//                     "date": "2025-08-25T00:00:00-03:00",
//                     "value": 1.81,
//                     "signal": "+",
//                     "status": "F",
//                     "futureRelease": "N"
//                 },
//                 {
//                     "release": "TARIFA DE ACIONAMENTO",
//                     "date": "2025-08-25T00:00:00-03:00",
//                     "value": 9.99,
//                     "signal": "+",
//                     "status": "F",
//                     "futureRelease": "N"
//                 },
//                 {
//                     "release": "SMS ALERTA",
//                     "date": "2025-08-25T00:00:00-03:00",
//                     "value": 6.99,
//                     "signal": "+",
//                     "status": "F",
//                     "futureRelease": "N"
//                 },
//                 {
//                     "release": "ANUIDADE DM",
//                     "date": "2025-08-25T00:00:00-03:00",
//                     "value": 19.9,
//                     "signal": "+",
//                     "status": "F",
//                     "futureRelease": "N"
//                 }
//             ]
//         },
//         {
//             "invoiceCode": 122723297,
//             "dueDate": "2025-08-03T00:00:00",
//             "totalPayable": 290.13,
//             "minimumPayable": 58.03,
//             "totalDue": 0.0,
//             "closed": "S",
//             "digitableLine": "",
//             "status": StatusInvoicePrivateLabelEnum.PAID,
//             "invoiceMovements": [
//                 {
//                     "release": "FATURA ANTERIOR",
//                     "date": "2025-07-03T00:00:00-03:00",
//                     "value": 320.58,
//                     "signal": "+",
//                     "status": "F",
//                     "futureRelease": "N"
//                 },
//                 {
//                     "release": "PAGAMENTOS EFETUADOS",
//                     "date": "2025-06-29T00:00:00-03:00",
//                     "value": 320.58,
//                     "signal": "-",
//                     "status": "F",
//                     "futureRelease": "N"
//                 },
//                 {
//                     "release": "AssinetTech ",
//                     "date": "2025-06-29T00:00:00-03:00",
//                     "value": 9.9,
//                     "signal": "+",
//                     "status": "F",
//                     "futureRelease": "N"
//                 },
//                 {
//                     "release": "PIX CRÉDITO - TAINA ALVES FERNANDES JERONIMO",
//                     "date": "2025-07-07T00:00:00-03:00",
//                     "value": 150.0,
//                     "signal": "+",
//                     "status": "F",
//                     "futureRelease": "N"
//                 },
//                 {
//                     "release": "IOF PIX CRÉDITO",
//                     "date": "2025-07-07T00:00:00-03:00",
//                     "value": 0.9,
//                     "signal": "+",
//                     "status": "F",
//                     "futureRelease": "N"
//                 },
//                 {
//                     "release": "JUROS PIX CRÉDITO",
//                     "date": "2025-07-07T00:00:00-03:00",
//                     "value": 10.55,
//                     "signal": "+",
//                     "status": "F",
//                     "futureRelease": "N"
//                 },
//                 {
//                     "release": "RECARGA CELULAR",
//                     "date": "2025-07-14T00:00:00-03:00",
//                     "value": 30.0,
//                     "signal": "+",
//                     "status": "F",
//                     "futureRelease": "N"
//                 },
//                 {
//                     "release": "NETFLIX ENTRETENIMENTO ",
//                     "date": "2025-07-16T00:00:00-03:00",
//                     "value": 59.9,
//                     "signal": "+",
//                     "status": "F",
//                     "futureRelease": "N"
//                 },
//                 {
//                     "release": "ANUIDADE DM",
//                     "date": "2025-07-25T00:00:00-03:00",
//                     "value": 19.9,
//                     "signal": "+",
//                     "status": "F",
//                     "futureRelease": "N"
//                 },
//                 {
//                     "release": "TAXA DE COMODIDADE - CELULAR",
//                     "date": "2025-07-25T00:00:00-03:00",
//                     "value": 1.99,
//                     "signal": "+",
//                     "status": "F",
//                     "futureRelease": "N"
//                 },
//                 {
//                     "release": "SMS ALERTA",
//                     "date": "2025-07-25T00:00:00-03:00",
//                     "value": 6.99,
//                     "signal": "+",
//                     "status": "F",
//                     "futureRelease": "N"
//                 }
//             ]
//         }
//     ],
//     "error": undefined
// };
