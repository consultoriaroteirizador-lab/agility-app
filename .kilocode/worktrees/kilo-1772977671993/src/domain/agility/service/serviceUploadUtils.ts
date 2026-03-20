/**
 * Upload utilities for service photos, signatures, and attachments
 * Adapted for React Native environment
 */

import { Platform } from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import { apiAgility } from '@/api/apiConfig';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Upload a single file (photo or document) to the chat endpoint
 * Returns the S3 URL of the uploaded file
 */
export async function uploadFile(
  file: ImagePicker.ImagePickerAsset | { uri: string; name?: string; type?: string },
  onProgress?: (progress: UploadProgress) => void,
): Promise<string> {
  const formData = new FormData();

  // Handle different file types
  const uri = file.uri;
  const fileName = file.name || uri.split('/').pop() || 'upload';
  const fileType = file.type || 'image/jpeg';

  // For React Native, we need to extract filename and type
  formData.append('file', {
    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
    name: fileName,
    type: fileType,
  } as any);

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
        };
        onProgress(progress);
      }
    },
  });

  return response.data.url;
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
  );

  return Promise.all(uploadPromises);
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
  const formData = new FormData();

  const uri = photo.uri;
  const fileName = photo.name || uri.split('/').pop() || 'photo.jpg';
  const fileType = photo.type || 'image/jpeg';

  formData.append('photos', {
    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
    name: fileName,
    type: fileType,
  } as any);

  const response = await apiAgility.post<{ urls: string[] }>('/services/upload-photos', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    params: serviceId ? { serviceId } : {},
  });

  return response.data.urls[0] || '';
}

/**
 * Upload multiple service photos in parallel
 * Returns array of S3 URLs
 */
export async function uploadMultipleServicePhotos(
  photos: ImagePicker.ImagePickerAsset[],
  serviceId?: string,
  photoType?: 'before' | 'after',
  onUploadProgress?: (progress: UploadProgress, index: number) => void,
): Promise<string[]> {
  if (!photos.length) {
    return [];
  }

  const formData = new FormData();

  photos.forEach((photo) => {
    const uri = photo.uri;
    const fileName = photo.name || uri.split('/').pop() || 'photo.jpg';
    const fileType = photo.type || 'image/jpeg';

    formData.append('photos', {
      uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
      name: fileName,
      type: fileType,
    } as any);
  });

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
        };
        // Report progress for each photo
        for (let i = 0; i < photos.length; i++) {
          onUploadProgress(progress, i);
        }
      }
    },
  });

  return response.data.urls || [];
}

/**
 * Upload a signature image to the service upload endpoint
 * Returns the S3 URL of the uploaded signature
 */
export async function uploadSignature(
  signatureUri: string,
  serviceId?: string,
): Promise<string> {
  const formData = new FormData();

  const fileName = `signature-${serviceId || Date.now()}.png`;

  formData.append('photos', {
    uri: Platform.OS === 'ios' ? signatureUri.replace('file://', '') : signatureUri,
    name: fileName,
    type: 'image/png',
  } as any);

  const response = await apiAgility.post<{ urls: string[] }>('/services/upload-photos', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    params: serviceId ? { serviceId } : {},
  });

  return response.data.urls[0] || '';
}

/**
 * Convert a base64 string to a file-like object for upload
 * Used for canvas signature (base64) to be sent to POST /services/upload-photos
 */
export function base64ToFile(
  base64: string,
  fileName = 'signature.png',
  type = 'image/png',
): { uri: string; name: string; type: string } {
  const dataUrl = base64.startsWith('data:') ? base64 : `data:${type};base64,${base64}`;

  // For React Native, we can create a temporary file from base64
  // This is a simplified version - in production you'd use FileSystem.writeAsStringAsync
  return {
    uri: dataUrl,
    name: fileName,
    type: type,
  };
}

/**
 * Upload a base64 signature to S3
 * Returns the S3 URL of the uploaded signature
 */
export async function uploadBase64Signature(
  base64: string,
  serviceId?: string,
  onProgress?: (progress: UploadProgress) => void,
): Promise<string> {
  const formData = new FormData();

  // Create a temporary URI from base64
  const fileName = `signature-${serviceId || Date.now()}.png`;

  formData.append('photos', {
    uri: base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`,
    name: fileName,
    type: 'image/png',
  } as any);

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
        };
        onProgress(progress);
      }
    },
  });

  return response.data.urls[0] || '';
}

/**
 * Upload chat attachments (images and documents) to chat endpoint
 * Returns array of S3 URLs
 */
export async function uploadChatAttachments(
  files: string[],
  onProgress?: (progress: UploadProgress, index: number) => void,
): Promise<{ urls: string[] }> {
  const formData = new FormData();

  files.forEach((fileUri, index) => {
    const fileName = `chat-attachment-${Date.now()}-${index}`;
    const fileType = fileUri.match(/\.(jpg|jpeg|png|gif|webp)$/i)
      ? 'image/jpeg'
      : fileUri.match(/\.pdf$/i)
        ? 'application/pdf'
        : fileUri.match(/\.(doc|docx)$/i)
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/octet-stream';

    formData.append('files', {
      uri: Platform.OS === 'ios' ? fileUri.replace('file://', '') : fileUri,
      name: fileName,
      type: fileType,
    } as any);
  });

  const response = await apiAgility.post<{ urls: string[] }>('/chats/upload-attachments', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: progressEvent => {
      if (onProgress && progressEvent.total) {
        const progress = {
          loaded: progressEvent.loaded,
          total: progressEvent.total,
          percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
        };
        // Report progress for all files
        for (let i = 0; i < files.length; i++) {
          onProgress(progress, i);
        }
      }
    },
  });

  return {
    urls: response.data.urls || [],
  };
}
