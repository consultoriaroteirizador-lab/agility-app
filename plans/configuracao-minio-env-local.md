# Configuração do .env Local para MinIO no Kubernetes

## Informações do MinIO

| Propriedade     | Valor                         |
| --------------- | ----------------------------- |
| URL do MinIO    | `http://38.242.243.205:30001` |
| Usuário         | `admin`                       |
| Senha           | `Agility@2025`                |
| Bucket Chat     | `agility-chat`                |
| Bucket Services | `agility-services`            |

## Configuração do .env

Substitua as variáveis do S3 no arquivo `.env` do agility-services (`C:\Users\daniel\Agility\back-atual\agility-services\.env`) pelas seguintes configurações:

```env
# ===========================================
# S3 / MinIO (obrigatório para anexos do chat e fotos de conclusão de serviço)
# ===========================================
S3_ENDPOINT=http://38.242.243.205:30001
S3_ACCESS_KEY=admin
S3_SECRET_KEY=Agility@2025
S3_REGION=us-east-1

# Bucket para chat/suporte (anexos de mensagens)
S3_BUCKET_CHAT=agility-chat
S3_PUBLIC_URL_CHAT=http://38.242.243.205:30001/agility-chat

# Bucket para fotos de conclusão de serviço / otimização
S3_BUCKET_SERVICES=agility-services
S3_PUBLIC_URL_SERVICES=http://38.242.243.205:30001/agility-services
```

## O que mudou em relação ao ambiente local anterior

| Variável                 | Valor Anterior (localhost)               | Valor Novo (K8s)                               |
| ------------------------ | ---------------------------------------- | ---------------------------------------------- |
| `S3_ENDPOINT`            | `http://localhost:9000` (comentado)      | `http://38.242.243.205:30001`                  |
| `S3_ACCESS_KEY`          | `minioadmin`                             | `admin`                                        |
| `S3_SECRET_KEY`          | `minioadmin`                             | `Agility@2025`                                 |
| `S3_PUBLIC_URL_CHAT`     | `http://localhost:9000/agility-chat`     | `http://38.242.243.205:30001/agility-chat`     |
| `S3_PUBLIC_URL_SERVICES` | `http://localhost:9000/agility-services` | `http://38.242.243.205:30001/agility-services` |

## Como testar a conexão

### 1. Reiniciar o serviço

Após atualizar o `.env`, reinicie o serviço NestJS:

```bash
cd C:\Users\daniel\Agility\back-atual\agility-services
npm run start:dev
```

### 2. Verificar os logs

Você deve ver a seguinte mensagem no log:

```
[StorageService] Storage S3/MinIO enabled: chat=agility-chat, services=agility-services, endpoint=http://38.242.243.205:30001
```

### 3. Testar upload (opcional)

Faça uma requisição POST para o endpoint de upload de fotos ou anexos de chat e verifique se retorna a URL do arquivo corretamente.

### 4. Testar acesso ao MinIO via browser

Acesse `http://38.242.243.205:30001` no navegador para abrir o console do MinIO e verificar os buckets.

---

## Troubleshooting

### Erro: Connection refused / ECONNREFUSED

- Verifique se o IP `38.242.243.205` está acessível a partir da sua máquina
- Verifique se a porta `30001` não está bloqueada por firewall

### Erro: Access Denied / Invalid credentials

- Verifique se as credenciais estão corretas: `admin` / `Agility@2025`
- Verifique no console do MinIO se os buckets existem

### Erro: Storage S3/MinIO not configured

- Verifique se a variável `S3_ENDPOINT` está sem comentários (sem `#` no início)
- Verifique se não há espaços extras antes ou depois dos valores
