import { PaymentStatus } from '../response/payment.response';

export interface UpdatePaymentRequest {
  receivedValue?: number; // in cents
  status?: PaymentStatus;
  paymentDate?: string;
  notes?: string;
}
