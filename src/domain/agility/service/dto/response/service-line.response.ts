/**
 * Status do material durante entrega/coleta
 */
export type MaterialStatus =
  | 'PENDING'   // Aguardando entrega/coleta
  | 'CHECKED'   // Entregue/Coletado com sucesso
  | 'PARTIAL'   // Entrega parcial
  | 'MISSING'   // Não encontrado
  | 'DAMAGED'   // Danificado
  | 'REFUSED'   // Recusado pelo cliente
  | 'SWAPPED'   // Trocado na parada (fase 3D): a linha B, com replacesMaterialId, ficou no lugar

/**
 * Direção do material:
 * - DELIVERY: entregue ao cliente
 * - PICKUP: coletado/devolvido no mesmo stop (volume de retorno)
 */
export type MaterialDirection = 'DELIVERY' | 'PICKUP'

/**
 * Uma linha do serviço com o status da conferência: item do pedido (`items`) ou material/equipamento
 * do SERVICE (`materials`). O formato é o mesmo nas duas famílias (`toServiceLineResponse` no backend).
 */
export interface ServiceLine {
  id: string
  material: string
  quantity: number
  unit?: string
  sku?: string
  productId?: string
  volume?: number
  weight?: number
  notes?: string
  serialNumber?: string | null
  /** Vínculo com o cadastro de produtos (linha de pedido). */
  catalogProductId?: string | null
  /** Vínculo com o cadastro de equipamentos (linha de SERVICE). */
  catalogEquipmentId?: string | null
  /** Troca na parada (fase 3D): a linha que esta substitui. Nulo ou ausente: linha prevista. */
  replacesMaterialId?: string | null
  /** Entrega (DELIVERY) ou coleta de retorno (PICKUP). Default tratável como DELIVERY. */
  direction?: MaterialDirection
  status: MaterialStatus
  actualQuantity?: number
  checkedAt?: string
  checkedBy?: string
  checkNotes?: string
  checkPhotoProof?: string
  createdAt: string
  updatedAt: string
}

/**
 * Request para check de material
 */
export interface MaterialCheckRequest {
  status: MaterialStatus
  actualQuantity?: number
  notes?: string
  photoProof?: string
}

/**
 * Resposta do check de material
 */
export interface MaterialCheckResponse {
  materialId: string
  status: MaterialStatus
  checkedAt: string
  allMaterialsChecked: boolean
  summary?: {
    total: number
    checked: number
    pending: number
    withIssues: number
  }
}

/** Consulta do código no cadastro do dono do pedido, para a troca (fase 3D). */
export type EquipmentLookupResponse =
  | { found: true; code: string; name: string; unit: string | null }
  | { found: false; code: string }

/** Corpo da troca de equipamento na parada (fase 3D). */
export interface SwapLineRequest {
  code: string
  serialNumber: string
  description?: string
  reason?: string
}

/** Resposta da troca: a linha A (SWAPPED) e a B que ficou no lugar dela. */
export interface SwapLineResponse {
  replaced: ServiceLine
  installed: ServiceLine
}
