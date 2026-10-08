import type { PaymentMethodType } from '@/domain/agility/service/dto/types';

export enum PaymentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/** Dívida do dinheiro vivo ligada à cobrança (F6). Valores em centavos. */
export interface PaymentDebtSnapshot {
  advanceId: string;
  status: 'PENDING' | 'PARTIAL' | 'RETURNED' | 'CANCELLED';
  amountCents: number;
  returnedAmountCents: number;
  /** Só PENDING/PARTIAL têm pendente; decidida = 0. */
  pendingAmountCents: number;
  dueDate: string | null;
  isOverdue: boolean;
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
  /** Código da rota (snapshot do backend via JOIN). */
  routingCode?: string | null;
  /** Nome da rota (snapshot do backend via JOIN; null em rota antiga sem nome). */
  routingName?: string | null;
  /** Título do serviço (snapshot do backend via JOIN). */
  serviceTitle?: string | null;
  /** Forma de pagamento (F6). `null` em cobrança pendente ou antiga. */
  paymentMethod?: PaymentMethodType | null;
  /** Cancelamento pela empresa (F6). Cancelado = REJECTED com `cancelledAt`; recusado não tem. */
  cancelledAt?: string | null;
  cancelReason?: string | null;
  /** Dívida do dinheiro vivo (F6). `null` = nenhuma ligada (PIX/cartão, ou o job ainda não criou). */
  debt?: PaymentDebtSnapshot | null;
}

export type Payment = PaymentResponse;
