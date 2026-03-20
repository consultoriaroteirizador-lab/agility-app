/**
 * Licenças do React Native Background Geolocation da TransistorSoft
 * 
 * IMPORTANTE: Estas licenças são vinculadas ao bundle ID "br.com.agility.agilityapp"
 * e são válidas até 26/02/2027 (build stamp)
 * 
 * NÃO altere o bundle ID do app sem adquirir novas licenças.
 * 
 * Sufixos permitidos para builds de desenvolvimento:
 * - .dev, .development, .staging, .stage, .qa, .uat, .test, .debug
 */

export const BACKGROUND_GEOLOCATION_LICENSES = {
  ios: 'eyJhbGciOiJFZERTQSIsImtpZCI6ImVkMjU1MTktbWFpbi12MSJ9.eyJvcyI6ImlvcyIsImFwcF9pZCI6ImJyLmNvbS5hZ2lsaXR5LmFnaWxpdHlhcHAiLCJvcmRlcl9udW1iZXIiOjE1MzQ0LCJyZW5ld2FsX3VybCI6Imh0dHBzOi8vc2hvcC50cmFuc2lzdG9yc29mdC5jb20vY2FydC8xNjUwNzg2MTUwNToxP25vdGU9MTAyMTMiLCJjdXN0b21lcl9pZCI6OTI5MiwicHJvZHVjdCI6InJlYWN0LW5hdGl2ZS1iYWNrZ3JvdW5kLWdlb2xvY2F0aW9uIiwia2V5X3ZlcnNpb24iOjEsImFsbG93ZWRfc3VmZml4ZXMiOlsiLmRldiIsIi5kZXZlbG9wbWVudCIsIi5zdGFnaW5nIiwiLnN0YWdlIiwiLnFhIiwiLnVhdCIsIi50ZXN0IiwiLmRlYnVnIl0sIm1heF9idWlsZF9zdGFtcCI6MjAyNzAyMjYsImdyYWNlX2J1aWxkcyI6MCwiZW50aXRsZW1lbnRzIjpbImNvcmUiXSwiaWF0IjoxNzY5NDUyMzM3fQ.iliR5Dui32zcTsa1OxEpMIoa_PrDtGy-4Y8IQg8PzwAHgR-s0iWh8TK3oxe-4wjv275_HhyqMDPNHSXnna0QAQ',
  
  android: 'eyJhbGciOiJFZERTQSIsImtpZCI6ImVkMjU1MTktbWFpbi12MSJ9.eyJvcyI6ImFuZHJvaWQiLCJhcHBfaWQiOiJici5jb20uYWdpbGl0eS5hZ2lsaXR5YXBwIiwib3JkZXJfbnVtYmVyIjoxNTM0NCwicmVuZXdhbF91cmwiOiJodHRwczovL3Nob3AudHJhbnNpc3RvcnNvZnQuY29tL2NhcnQvMTY1MDc4NjE1MDU6MT9ub3RlPTEwMjEzIiwiY3VzdG9tZXJfaWQiOjkyOTIsInByb2R1Y3QiOiJyZWFjdC1uYXRpdmUtYmFja2dyb3VuZC1nZW9sb2NhdGlvbiIsImtleV92ZXJzaW9uIjoxLCJhbGxvd2VkX3N1ZmZpeGVzIjpbIi5kZXYiLCIuZGV2ZWxvcG1lbnQiLCIuc3RhZ2luZyIsIi5zdGFnZSIsIi5xYSIsIi51YXQiLCIudGVzdCIsIi5kZWJ1ZyJdLCJtYXhfYnVpbGRfc3RhbXAiOjIwMjcwMjI2LCJncmFjZV9idWlsZHMiOjAsImVudGl0bGVtZW50cyI6WyJjb3JlIl0sImlhdCI6MTc2OTQ1MjMzN30.f1eo_Of7GJTtepT7N-cSs8jsM7uGBXl_PLns3dBf4aVHZ1Lw7rzeO2b_oV3PmpZ36tLLbnWVbHZd5igNsrKsCg',
};

/**
 * Retorna a licença apropriada para a plataforma atual
 */
export const getBackgroundGeolocationLicense = (): string => {
  const { Platform } = require('react-native');
  
  if (Platform.OS === 'ios') {
    return BACKGROUND_GEOLOCATION_LICENSES.ios;
  }
  
  return BACKGROUND_GEOLOCATION_LICENSES.android;
};
