/**
 * Tipagens fortes para o módulo de Chat
 * Substituem o uso de Record<string, unknown> para melhor type-safety
 */

export enum ChatStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  PENDING = 'PENDING',
}

export enum ParticipantType {
  DRIVER = 'DRIVER',
  CUSTOMER = 'CUSTOMER',
  SUPPORT = 'SUPPORT',
  COLLABORATOR = 'COLLABORATOR',
  AGENT = 'AGENT',
}

export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
}

export enum AttachmentType {
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
}

export interface ChatParticipant {
  id: string
  driverId?: string
  customerId?: string
  collaboratorId?: string
  keycloakUserId?: string
  type: ParticipantType
  name?: string
}

export interface ChatMessage {
  id: string
  chatId: string
  senderId: string
  senderKeycloakUserId?: string  // Keycloak User ID para comparação no cliente
  senderType: ParticipantType
  content: string
  attachmentUrl?: string
  attachmentType?: AttachmentType
  status: MessageStatus
  readAt?: string
  deliveredAt?: string
  createdAt: string
  updatedAt?: string
}

/**
 * Alias para ChatMessage usado na API
 * Mantém compatibilidade com código existente
 */
export type MessageItem = ChatMessage & Record<string, unknown>

/**
 * Interface para a última mensagem de um chat (versão parcial)
 * Usada na listagem de chats
 */
export interface LastMessage {
  id?: string
  content?: string
  message?: string // Campo alternativo usado em algumas APIs
  senderId?: string
  senderType?: ParticipantType
  createdAt?: string
}

/**
 * Interface principal para um item de chat
 * Retornada pela API de listagem de chats
 */
export interface ChatItem {
  id: string
  subject?: string
  status: ChatStatus
  lastMessage?: LastMessage
  lastMessageAt?: string
  unreadCount?: number
  participants?: ChatParticipant[]
  routeId?: string
  serviceId?: string
  createdAt: string
  updatedAt?: string
}

/**
 * Interface para chat com participantes
 * Retornada pela API de detalhes do chat
 */
export interface ChatWithParticipants {
  id: string
  subject?: string
  status: ChatStatus
  participants: ChatParticipant[]
  routeId?: string
  serviceId?: string
  lastMessage?: LastMessage
  lastMessageAt?: string
  createdAt: string
  updatedAt?: string
}

/**
 * Payload para criação de chat de suporte do driver
 */
export interface CreateDriverSupportChatPayload {
  driverId?: string
  supportId?: string
  subject?: string
  serviceId?: string
}

/**
 * Payload para envio de mensagem
 */
export interface SendMessagePayload {
  chatId: string
  content: string
  attachmentUrl?: string
  attachmentType?: AttachmentType
}
