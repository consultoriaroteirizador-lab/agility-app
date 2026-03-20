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

/**
 * Material do serviço com status de check
 */
export interface ServiceMaterialResponse {
  id: string
  material: string
  quantity: number
  unit?: string
  sku?: string
  productId?: string
  volume?: number
  weight?: number
  notes?: string
  serialNumber?: string
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
 * Item para check em lote
 */
export interface MaterialCheckItem {
  materialId: string
  status: MaterialStatus
  actualQuantity?: number
  notes?: string
  photoProof?: string
}

/**
 * Request para check em lote
 */
export interface BatchMaterialCheckRequest {
  items: MaterialCheckItem[]
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

/**
 * Resultado de check individual
 */
export interface MaterialCheckResult {
  materialId: string
  success: boolean
  error?: string
  status?: MaterialStatus
}

/**
 * Resposta do check em lote
 */
export interface BatchMaterialCheckResponse {
  successCount: number
  errorCount: number
  results: MaterialCheckResult[]
  allMaterialsChecked: boolean
}
