export enum TicketStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  TRANSFERRED = 'TRANSFERRED',
  CLOSED = 'CLOSED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface Ticket {
  id: string
  ticketNumber: string
  subject: string
  description?: string
  status: TicketStatus
  priority: TicketPriority

  // Relacionamentos
  chatId?: string
  driverId?: string
  customerId?: string
  assignedToId?: string

  // Datas
  openedAt: string
  resolvedAt?: string
  closedAt?: string
  createdAt: string
  updatedAt?: string

  // Campos adicionais
  transferDescription?: string
  resolutionDescription?: string

  // Metadata
  createdBy?: string
  updatedBy?: string
}

// Tipo para criação de ticket
export interface CreateTicketPayload {
  subject: string
  description?: string
  priority?: TicketPriority
  driverId?: string
  customerId?: string
  chatId?: string
}

// Tipo para atualização de ticket
export interface UpdateTicketPayload {
  subject?: string
  description?: string
  status?: TicketStatus
  priority?: TicketPriority
  assignedToId?: string
}
