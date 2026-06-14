# Máquinas de produção — Agility Platform

> Perfil alvo: produção pequena (10–30 tenants, 100–500 motoristas), SLA 99.5%
> Total: **14 VPS** — 78 vCPU, 312 GB RAM, ~3 TB NVMe

---

## 1. Cluster `services` (monolito + Keycloak + Redis + frontends)

| Função | Qtd | vCPU | RAM | Disco |
|---|---|---|---|---|
| Control plane (etcd HA) | 3 | 2 | 4 GB | 80 GB SSD |
| Worker | 3 | 8 | 32 GB | 200 GB NVMe |

**Por que 3 control plane**: quorum etcd HA (perda de 1 nó tolerada).
**Por que 3 workers**: anti-afinidade do `agility-api` em 2 nós + folga para drain durante upgrade de kernel/RKE2.

**Workloads por worker (target ~70% de allocation):**
- `agility-api` × 2 réplicas (anti-afinidade): 1/1Gi req → 2/2.5Gi limit cada
- `keycloak` × 2 réplicas: 1/2Gi cada
- Redis master/replica + Sentinel
- ingress-nginx (DaemonSet)

---

## 2. Cluster `route-services` (ORS + Vroom)

| Função | Qtd | vCPU | RAM | Disco |
|---|---|---|---|---|
| Control plane | 1 | 2 | 4 GB | 80 GB SSD |
| Worker | 2 | 8 | 32 GB | 200 GB NVMe |

**Por que 1 control plane**: workload tolera delay de scheduling (ORS/Vroom não precisam de auto-healing instantâneo).
**Por que 2 workers**: rebuild de grafo do ORS bloqueia o pod por 30–60 min; com 2 nós você faz blue/green sem indisponibilidade.

**Workloads:**
- `openrouteservice` v8.0.0 (Brasil): 4/20Gi req → 8/26Gi limit, JVM `-Xms16g -Xmx20g`
- `vroom` (VRP solver): HPA min 2 max 6, 1/512Mi req → 4/4Gi limit

**Se adicionar Latam ao ORS**: subir workers para **8 vCPU / 48 GB**.

---

## 3. Cluster `map-services` (Nominatim + OSM Tile Server)

| Função | Qtd | vCPU | RAM | Disco |
|---|---|---|---|---|
| Control plane | 1 | 2 | 4 GB | 80 GB SSD |
| Worker A — Nominatim | 1 | 8 | **48 GB** | **500 GB NVMe** |
| Worker B — Tile Server | 1 | 8 | 32 GB | **500 GB NVMe** |

**Por que workers separados**: Nominatim (PostGIS embutido) e Tile Server (Mapnik) competem violentamente por IO de disco. Isolar é mais barato que pagar SSD de altíssima IOPS num nó só.

**Workloads:**
- `nominatim` (mediagis/nominatim 5.2 + Postgres 16 embutido): 4/24Gi req → 6/40Gi limit, PBF Brasil (Geofabrik), THREADS=6
- `osm-tile-server`: HPA 2–4 réplicas, 2/8Gi req → 4/16Gi limit

**Atenção**: Postgres do Nominatim é dedicado (embutido no container) — não migra para o Postgres principal da aplicação.

---

## 4. PostgreSQL dedicado (aplicação + Keycloak)

**Fora do Kubernetes**, em VPS dedicadas.

| Função | Qtd | vCPU | RAM | Disco |
|---|---|---|---|---|
| Primary | 1 | 8 | 32 GB | 500 GB NVMe + 500 GB HDD (WAL archive) |
| Standby (streaming async) | 1 | 8 | 32 GB | 500 GB NVMe |

**Configuração:**
- Postgres 16 + PgBouncer (transaction pooling) no primary
- Schemas separados: `agility` (app com RLS) + `keycloak` (auth)
- Backup: pgbackrest → Object Storage externo
- Conexão da aplicação: via PgBouncer (porta 6432)

**Por que não 3 nós (cascading replica)**: SLA 99.5% comporta failover manual em até 15 min.

---

## 5. Object Storage (uploads + backup)

| Necessidade | Volume inicial |
|---|---|
| Uploads (chat, fotos serviço, anexos) | 1 TB |
| Backup Postgres (full + WAL) | inclusos no mesmo bucket ou bucket separado |

Provedor S3-compatible externo. Código já usa `@aws-sdk/client-s3` v3 — basta trocar `S3_ENDPOINT`.

---

## 6. Resumo total

| Categoria | Qtd | vCPU total | RAM total | Disco NVMe total |
|---|---|---|---|---|
| Control plane K8s | 5 | 10 | 20 GB | 400 GB SSD |
| Workers K8s | 7 | 56 | 224 GB | 2.1 TB |
| Postgres dedicado | 2 | 16 | 64 GB | 1 TB NVMe + 500 GB HDD |
| **Total** | **14** | **82** | **308 GB** | **~3 TB NVMe + 500 GB HDD** |

---

## 7. O que **não** está incluído

| Item | Quando precisar |
|---|---|
| Load Balancer externo (Cloudflare ou LB do provedor) | Para terminar TLS antes do ingress; protege IP dos workers |
| Monitoring stack (Prometheus, Grafana, Loki) | Self-host em 1 VPS pequeno ou Grafana Cloud free tier |
| CI runner self-hosted | Se for rodar runner próprio (GitLab/GitHub) |
| Bastion / VPN | Tailscale ou WireGuard em VPS mínimo |

---

## 8. Sinais para escalar no futuro

| Métrica | Threshold | Ação |
|---|---|---|
| CPU `agility-api` > 70% sustentado | 7 dias | Aumentar HPA max ou +1 worker |
| Memória Postgres > 80% | 7 dias | Vertical scale para 64 GB |
| Latência p95 API > 500ms | sustentado | Profile + cache Redis mais agressivo |
| Vroom queue > 30s | sustentado | Vertical scale solver ou HPA max |
| Nominatim p95 > 1s | sustentado | Cache CDN ou trocar por Photon |
| Conexões PgBouncer > 80% | sustentado | Aumentar `default_pool_size` ou subir réplica de leitura |
| > 50 tenants | — | Considerar Keycloak em instância dedicada |
| > 100 tenants | — | Considerar Postgres em serviço gerenciado |
