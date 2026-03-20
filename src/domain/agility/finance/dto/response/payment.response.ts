export enum PaymentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface PaymentResponse {
  id: string;
  companyId: string;
  routingId?: string;
  serviceId?: string;
  driverId?: string;
  customerId?: string;
  customerName: string;
  expectedValue: number; // in cents
  receivedValue?: number; // in cents
  status: PaymentStatus;
  paymentDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriverSummaryItem {
  id: string;
  driver: string;
  totalTrips: number;
  totalReceived: number; // in cents
  pendingAmount: number; // in cents
}

export type Payment = PaymentResponse;
