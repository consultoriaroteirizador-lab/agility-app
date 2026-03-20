import { PaymentStatus } from '../response/payment.response';

export interface CreatePaymentRequest {
  routingId?: string;
  serviceId?: string;
  driverId?: string;
  customerId?: string;
  customerName: string;
  expectedValue: number; // in cents
  receivedValue?: number; // in cents
  status?: PaymentStatus;
  paymentDate?: string;
  notes?: string;
}
