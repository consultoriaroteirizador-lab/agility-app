# Teste de Upload para MinIO

## Endpoints de Upload

O agility-services possui dois endpoints para upload de arquivos:

### 1. Upload de Fotos de Serviço (Bucket: `agility-services`)

**Endpoint:** `POST /services/upload-photos`

**Headers:**

```
Authorization: Bearer {token}
x-tenant-id: {company-id}
Content-Type: multipart/form-data
```

**Parâmetros Query:**

- `serviceId` (opcional): ID do serviço para organizar as fotos

**Body:** `multipart/form-data` com campo `files` contendo as imagens

**Tipos aceitos:** JPEG, PNG, WebP

**Exemplo cURL:**

```bash
curl -X POST "http://192.168.15.11:3000/services/upload-photos" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "x-tenant-id: cf9d5837-4151-4a0d-80ff-71baec4594e6" \
  -F "files=@/caminho/para/imagem.jpg"
```

**Resposta esperada:**

```json
{
  "success": true,
  "result": {
    "urls": [
      "http://38.242.243.205:30001/agility-services/services/{companyId}/photo-1234567890.jpg"
    ],
    "count": 1
  }
}
```

---

### 2. Upload de Anexos de Chat (Bucket: `agility-chat`)

**Endpoint:** `POST /chat/attachment`

**Headers:**

```
Authorization: Bearer {token}
x-tenant-id: {company-id}
Content-Type: multipart/form-data
```

**Body:** `multipart/form-data` com campo `files` contendo os arquivos

**Tipos aceitos:** JPEG, PNG, WebP, GIF, PDF, Word (doc/docx)

**Exemplo cURL:**

```bash
curl -X POST "http://192.168.15.11:3000/chat/attachment" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "x-tenant-id: cf9d5837-4151-4a0d-80ff-71baec4594e6" \
  -F "files=@/caminho/para/imagem.jpg"
```

**Resposta esperada:**

```json
{
  "success": true,
  "result": {
    "urls": [
      "http://38.242.243.205:30001/agility-chat/chat/{companyId}/chat-1234567890.jpg"
    ],
    "count": 1
  }
}
```

---

## Teste via Swagger UI

Se o Swagger estiver habilitado, você pode testar pela interface:

**URL:** `http://192.168.15.11:3000/api`

1. Abra o Swagger UI
2. Localize os endpoints `POST /services/upload-photos` ou `POST /chat/attachment`
3. Clique em "Try it out"
4. Adicione o header `Authorization` com seu token Bearer
5. Adicione o header `x-tenant-id` com o ID da empresa
6. Selecione um arquivo de imagem
7. Execute e verifique a resposta

---

## Teste via Postman

### Collection para Importar

```json
{
  "info": {
    "name": "MinIO Upload Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Upload Service Photo",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          },
          {
            "key": "x-tenant-id",
            "value": "{{tenant-id}}"
          }
        ],
        "body": {
          "mode": "formdata",
          "formdata": [
            {
              "key": "files",
              "type": "file",
              "src": []
            }
          ]
        },
        "url": {
          "raw": "{{base-url}}/services/upload-photos",
          "host": ["{{base-url}}"],
          "path": ["services", "upload-photos"]
        }
      }
    },
    {
      "name": "Upload Chat Attachment",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          },
          {
            "key": "x-tenant-id",
            "value": "{{tenant-id}}"
          }
        ],
        "body": {
          "mode": "formdata",
          "formdata": [
            {
              "key": "files",
              "type": "file",
              "src": []
            }
          ]
        },
        "url": {
          "raw": "{{base-url}}/chat/attachment",
          "host": ["{{base-url}}"],
          "path": ["chat", "attachment"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base-url",
      "value": "http://192.168.15.11:3000"
    },
    {
      "key": "token",
      "value": ""
    },
    {
      "key": "tenant-id",
      "value": "cf9d5837-4151-4a0d-80ff-71baec4594e6"
    }
  ]
}
```

---

## Verificar Upload no MinIO Console

Após o upload, você pode verificar os arquivos no console do MinIO:

**URL do Console:** `http://38.242.243.205:30001`

**Credenciais:**

- Usuário: `admin`
- Senha: `Agility@2025`

1. Acesse o console
2. Navegue até os buckets:
   - `agility-services` - para fotos de serviços
   - `agility-chat` - para anexos de chat
3. Verifique se os arquivos foram criados nas pastas corretas

---

## Verificar URL Pública

Após o upload, a URL retornada deve ser acessível diretamente no navegador:

```
http://38.242.243.205:30001/agility-services/services/{companyId}/photo-xxx.jpg
http://38.242.243.205:30001/agility-chat/chat/{companyId}/chat-xxx.jpg
```

---

## Troubleshooting

### Erro: "S3 storage is required for service photos"

**Causa:** Variáveis de ambiente do MinIO não configuradas

**Solução:** Verifique se o `.env` contém:

```env
S3_ENDPOINT=http://38.242.243.205:30001
S3_ACCESS_KEY=admin
S3_SECRET_KEY=Agility@2025
S3_BUCKET_SERVICES=agility-services
S3_BUCKET_CHAT=agility-chat
```

### Erro: "Connection refused"

**Causa:** MinIO não está acessível

**Solução:**

1. Verifique se o IP `38.242.243.205` está acessível
2. Teste: `curl http://38.242.243.205:30001/minio/health/live`

### Erro: "Access Denied"

**Causa:** Credenciais incorretas ou bucket não existe

**Solução:**

1. Acesse o console do MinIO e verifique se os buckets existem
2. Verifique as credenciais no `.env`
