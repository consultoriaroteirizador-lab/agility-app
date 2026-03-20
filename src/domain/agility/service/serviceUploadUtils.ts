/**
 * Upload utilities for service photos, signatures, and attachments
 * Adapted for React Native environment
 */

import { Platform } from 'react-native'

import * as ExpoFileSystem from 'expo-file-system/legacy'
import * as ImageManipulator from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'

import { apiAgility } from '@/api/apiConfig'

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

/**
 * Compress image before upload to reduce memory usage and prevent OOM crashes
 * @param uri - The URI of the image to compress
 * @param maxWidth - Maximum width (default: 1024px)
 * @param maxHeight - Maximum height (default: 1024px)
 * @param quality - Compression quality 0-1 (default: 0.7)
 * @returns The URI of the compressed image
 */
export async function compressImage(
  uri: string,
  maxWidth: number = 1024,
  maxHeight: number = 1024,
  quality: number = 0.7
): Promise<string> {
  try {
    console.log('[compressImage] Comprimindo imagem:', {
      uri,
      maxWidth,
      maxHeight,
      quality,
    })

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth, height: maxHeight } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
    )

    console.log('[compressImage] Imagem comprimida:', {
      originalUri: uri,
      compressedUri: result.uri,
      width: result.width,
      height: result.height,
    })

    return result.uri
  } catch (error) {
    console.error('[compressImage] Erro ao comprimir imagem:', error)
    // Return original URI if compression fails
    return uri
  }
}

/**
 * Interface para dados de arquivo a ser enviado via FormData
 * Usado para uploads em React Native
 *
 * O FormData do React Native aceita um objeto com estas propriedades
 * como segundo parâmetro do método append()
 */
export interface UploadFileData {
  uri: string
  name: string
  type: string
}

/**
 * Helper to process URI for React Native FormData
 * On Android, URIs from image picker may need special handling
 */
function processUriForPlatform(uri: string): string {
  if (Platform.OS === 'ios') {
    // iOS: remove file:// prefix if present
    return uri.replace('file://', '')
  }

  // Android: ensure file:// prefix for local files
  if (uri.startsWith('content://')) {
    // Content URIs work as-is on Android
    return uri
  }

  if (uri.startsWith('file://')) {
    // Already has file:// prefix
    return uri
  }

  // Add file:// prefix for local file paths
  if (!uri.startsWith('/')) {
    return `file://${uri}`
  }

  return `file://${uri}`
}

/**
 * Helper to extract file extension from URI or MIME type
 */
function getFileExtension(uri: string, mimeType?: string): string {
  // Try to get extension from URI
  const uriExtension = uri.split('.').pop()?.toLowerCase()
  if (uriExtension && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(uriExtension)) {
    return uriExtension === 'jpg' ? 'jpeg' : uriExtension
  }

  // Try to get extension from MIME type
  if (mimeType) {
    const mimeToExtension: Record<string, string> = {
      'image/jpeg': 'jpeg',
      'image/jpg': 'jpeg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/heic': 'heic',
      'image/heif': 'heif',
    }
    return mimeToExtension[mimeType.toLowerCase()] || 'jpeg'
  }

  return 'jpeg'
}

/**
 * Helper to append file to FormData with correct typing for React Native
 */
function appendFileToFormData(formData: FormData, fieldName: string, fileData: UploadFileData): void {
  // React Native FormData accepts object with uri, name, type
  // @ts-expect-error - React Native FormData accepts this format
  formData.append(fieldName, fileData)
}

/**
 * Upload a single file (photo or document) to the chat endpoint
 * Returns the S3 URL of the uploaded file
 */
export async function uploadFile(
  file: ImagePicker.ImagePickerAsset | { uri: string; name?: string; type?: string },
  onProgress?: (progress: UploadProgress) => void,
): Promise<string> {
  const formData = new FormData()

  // Handle different file types
  const uri = file.uri
  const fileName = (file as { uri: string; name?: string }).name || uri.split('/').pop() || 'upload'
  const fileType = (file as { uri: string; type?: string }).type || 'image/jpeg'

  // For React Native, we need to extract filename and type
  appendFileToFormData(formData, 'file', {
    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
    name: fileName,
    type: fileType,
  })

  const response = await apiAgility.post<{ url: string }>('/chats/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = {
          loaded: progressEvent.loaded,
          total: progressEvent.total,
          percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
        }
        onProgress(progress)
      }
    },
  })

  return response.data.url
}

/**
 * Upload multiple files in parallel
 * Returns array of S3 URLs
 */
export async function uploadMultipleFiles(
  files: ImagePicker.ImagePickerAsset[],
  onProgress?: (progress: UploadProgress, index: number) => void,
): Promise<string[]> {
  const uploadPromises = files.map((file, index) =>
    uploadFile(file, (progress) => onProgress?.(progress, index)),
  )

  return Promise.all(uploadPromises)
}

/**
 * Upload a single service photo to the service upload endpoint
 * Returns the S3 URL of the uploaded photo
 */
export async function uploadServicePhoto(
  photo: ImagePicker.ImagePickerAsset | { uri: string; name?: string; type?: string },
  serviceId?: string,
  photoType?: 'before' | 'after',
): Promise<string> {
  const formData = new FormData()

  const uri = photo.uri
  const fileName = (photo as { uri: string; name?: string }).name || uri.split('/').pop() || 'photo.jpg'
  const fileType = (photo as { uri: string; type?: string }).type || 'image/jpeg'

  appendFileToFormData(formData, 'photos', {
    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
    name: fileName,
    type: fileType,
  })

  const response = await apiAgility.post<{ urls: string[] }>('/services/upload-photos', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    params: serviceId ? { serviceId } : {},
  })

  return response.data.urls[0] || ''
}

/**
 * Upload multiple service photos with compression to prevent OOM crashes
 * Photos are compressed before upload to reduce memory usage
 * Returns array of S3 URLs
 */
export async function uploadMultipleServicePhotos(
  photos: ImagePicker.ImagePickerAsset[],
  serviceId?: string,
  photoType?: 'before' | 'after',
  onUploadProgress?: (progress: UploadProgress, index: number) => void,
): Promise<string[]> {
  if (!photos || !photos.length) {
    return []
  }

  console.log('[uploadMultipleServicePhotos] Iniciando upload com compressão:', {
    photosCount: photos.length,
    serviceId,
    photoType,
    platform: Platform.OS,
  })

  const formData = new FormData()

  // Otimizado: compressão paralela com limite de concorrência (2 por vez)
  // para evitar memory spikes e travamento da UI
  const COMPRESS_CONCURRENCY = 2

  const processPhoto = async (photo: ImagePicker.ImagePickerAsset, index: number) => {
    const uri = photo.uri
    const mimeType = (photo as { mimeType?: string }).mimeType || 'image/jpeg'
    const extension = getFileExtension(uri, mimeType)
    const fileName = (photo as { fileName?: string }).fileName || `photo_${Date.now()}_${index}.${extension}`

    let processedUri: string
    try {
      console.log(`[uploadMultipleServicePhotos] Comprimindo foto ${index}...`)
      processedUri = await compressImage(uri, 1024, 1024, 0.7)
      console.log(`[uploadMultipleServicePhotos] Foto ${index} comprimida com sucesso`)
    } catch (compressError) {
      console.warn(`[uploadMultipleServicePhotos] Erro ao comprimir foto ${index}, usando original:`, compressError)
      processedUri = processUriForPlatform(uri)
    }

    const fileType = mimeType.startsWith('image/') ? mimeType : `image/${extension}`

    console.log(`[uploadMultipleServicePhotos] Foto ${index}:`, {
      originalUri: uri,
      processedUri,
      fileName,
      fileType,
      platform: Platform.OS,
    })

    return { processedUri, fileName, fileType }
  }

  // Processa fotos em batches para evitar sobrecarga de memória
  const processedPhotos: { processedUri: string; fileName: string; fileType: string }[] = []

  for (let i = 0; i < photos.length; i += COMPRESS_CONCURRENCY) {
    const batch = photos.slice(i, i + COMPRESS_CONCURRENCY)
    const batchResults = await Promise.all(
      batch.map((photo, batchIndex) => processPhoto(photo, i + batchIndex))
    )
    processedPhotos.push(...batchResults)
  }

  // Adiciona todas as fotos processadas ao FormData
  processedPhotos.forEach(({ processedUri, fileName, fileType }) => {
    appendFileToFormData(formData, 'photos', {
      uri: processedUri,
      name: fileName,
      type: fileType,
    })
  })

  try {
    console.log('[uploadMultipleServicePhotos] Enviando requisição para /services/upload-photos')

    const response = await apiAgility.post<{ urls: string[] }>('/services/upload-photos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      params: serviceId ? { serviceId } : {},
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          const progress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
          }
          // Report progress for each photo
          for (let i = 0; i < photos.length; i++) {
            onUploadProgress(progress, i)
          }
        }
      },
    })

    console.log('[uploadMultipleServicePhotos] Resposta recebida:', {
      status: response.status,
      urls: response.data.urls,
    })

    return response.data.urls || []
  } catch (error) {
    console.error('[uploadMultipleServicePhotos] Erro no upload:', error)
    throw error
  }
}

/**
 * Upload a signature image to the service upload endpoint
 * Returns the S3 URL of the uploaded signature
 */
export async function uploadSignature(
  signatureUri: string,
  serviceId?: string,
): Promise<string> {
  const formData = new FormData()

  const fileName = `signature-${serviceId || Date.now()}.png`

  appendFileToFormData(formData, 'photos', {
    uri: Platform.OS === 'ios' ? signatureUri.replace('file://', '') : signatureUri,
    name: fileName,
    type: 'image/png',
  })

  const response = await apiAgility.post<{ urls: string[] }>('/services/upload-photos', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    params: serviceId ? { serviceId } : {},
  })

  return response.data.urls[0] || ''
}


/**
 * Convert a base64 string to a temporary file for upload
 * Used for canvas signature (base64) to be sent to POST /services/upload-photos
 * Uses the new expo-file-system API (v19+) with File and Paths classes
 *
 * @param base64 - The base64 string (with or without data:image/png;base64, prefix)
 * @param fileName - The name of the file to create
 * @returns The URI of the temporary file
 */
export async function base64ToTempFile(
  base64: string,
  fileName = 'signature.png',
): Promise<string> {
  try {
    console.log('[base64ToTempFile] Iniciando conversão:', {
      fileName,
      base64Length: base64?.length,
    })

    // Remove o prefixo data:image/png;base64, se existir
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '')

    // Verificar se cacheDirectory está disponível
    if (!ExpoFileSystem.cacheDirectory) {
      throw new Error('FileSystem.cacheDirectory não está disponível')
    }

    console.log('[base64ToTempFile] Dados limpos:', {
      base64DataLength: base64Data.length,
      cacheDir: ExpoFileSystem.cacheDirectory,
    })

    // Caminho do arquivo no diretório de cache
    const fileUri = `${ExpoFileSystem.cacheDirectory}${fileName}`

    console.log('[base64ToTempFile] Escrevendo arquivo...')

    // Usa a API legada para maior compatibilidade
    await ExpoFileSystem.writeAsStringAsync(fileUri, base64Data, {
      encoding: ExpoFileSystem.EncodingType.Base64,
    })

    console.log('[base64ToTempFile] Arquivo criado:', fileUri)

    return fileUri
  } catch (error) {
    console.error('[base64ToTempFile] Erro ao converter base64:', error)
    throw error
  }
}

/**
 * Upload a base64 signature to S3
 * Converts base64 to a temporary file first, then uploads
 * Returns the S3 URL of the uploaded signature
 */
export async function uploadBase64Signature(
  base64: string,
  serviceId?: string,
  onProgress?: (progress: UploadProgress) => void,
): Promise<string> {
  const fileName = `signature-${serviceId || Date.now()}.png`

  // Converter base64 para arquivo temporário
  const fileUri = await base64ToTempFile(base64, fileName)

  const formData = new FormData()

  appendFileToFormData(formData, 'photos', {
    uri: Platform.OS === 'ios' ? fileUri.replace('file://', '') : fileUri,
    name: fileName,
    type: 'image/png',
  })

  try {
    const response = await apiAgility.post<{ urls: string[] }>('/services/upload-photos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      params: serviceId ? { serviceId } : {},
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
          }
          onProgress(progress)
        }
      },
    })

    return response.data.urls[0] || ''
  } finally {
    // Remover arquivo temporário após upload
    try {
      await ExpoFileSystem.deleteAsync(fileUri, { idempotent: true })
    } catch {
      // Ignorar erro ao deletar
    }
  }
}

/**
 * Upload chat attachments (images and documents) to chat endpoint
 * Returns array of S3 URLs
 */
export async function uploadChatAttachments(
  files: string[],
  onProgress?: (progress: UploadProgress, index: number) => void,
): Promise<{ urls: string[] }> {
  console.log('[uploadChatAttachments] Iniciando upload:', {
    filesCount: files.length,
    files: files.map(f => f?.substring(0, 50)),
    platform: Platform.OS,
  })

  const formData = new FormData()

  // Filter out any undefined/null/empty URIs
  const validFiles = files.filter(uri => uri && typeof uri === 'string' && uri.trim() !== '')

  if (validFiles.length === 0) {
    console.warn('[uploadChatAttachments] Nenhum arquivo válido para upload')
    return { urls: [] }
  }

  console.log('[uploadChatAttachments] Arquivos válidos:', validFiles.length)

  validFiles.forEach((fileUri, index) => {
    const fileName = `chat-attachment-${Date.now()}-${index}`
    const fileType = fileUri.match(/\.(jpg|jpeg|png|gif|webp)$/i)
      ? 'image/jpeg'
      : fileUri.match(/\.pdf$/i)
        ? 'application/pdf'
        : fileUri.match(/\.(doc|docx)$/i)
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/octet-stream'

    console.log(`[uploadChatAttachments] Processando arquivo ${index}:`, {
      uri: fileUri?.substring(0, 100),
      fileName,
      fileType,
    })

    appendFileToFormData(formData, 'files', {
      uri: Platform.OS === 'ios' ? fileUri.replace('file://', '') : fileUri,
      name: fileName,
      type: fileType,
    })
  })

  try {
    console.log('[uploadChatAttachments] Enviando requisição POST /chats/upload')

    const response = await apiAgility.post<{ urls: string[] }>('/chats/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
          }
          console.log('[uploadChatAttachments] Progress:', progress.percentage + '%')
          // Report progress for all files
          for (let i = 0; i < files.length; i++) {
            onProgress(progress, i)
          }
        }
      },
    })

    console.log('[uploadChatAttachments] Resposta recebida:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      hasResult: !!(response.data as any)?.result,
      resultUrls: (response.data as any)?.result?.urls,
    })

    // A API retorna { success: true, result: { urls: [...] } }
    const responseData = response.data as any;
    const urls = responseData?.result?.urls || responseData?.urls || [];

    console.log('[uploadChatAttachments] URLs extraídas:', {
      urlsCount: urls.length,
      urls,
    });

    return {
      urls,
    }
  } catch (error: any) {
    console.error('[uploadChatAttachments] Erro no upload:', {
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      config: {
        url: error?.config?.url,
        method: error?.config?.method,
        headers: error?.config?.headers,
      },
    })
    throw error
  }
}
