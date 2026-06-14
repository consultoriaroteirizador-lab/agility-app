# Sizing de produção — Agility Platform

> Data: 2026-05-28
> Perfil alvo: **produção pequena** (10–30 tenants, 100–500 motoristas), Contabo/VPS, SLA 99.5%
> Autor: análise de infra a partir do estado real dos clusters dev

---

## 1. Estado atual (dev) — fatos coletados

Três clusters RKE2 v1.33.5, **cada um rodando em 1 nó single-control-plane**. Nenhum deles tem alta disponibilidade hoje; todos têm overcommit de limits perigoso.

### 1.1 Cluster `services` (monolito + auth + frontends)
- Nó: `vmi2921852` — **8 vCPU / 24 GB RAM / 405 GB disco**
- Requests alocadas: 45% CPU / 18% memória
- Limits alocados: **102% CPU** / 53% memória (overcommit de CPU)
- Storage: Longhorn instalado mas só 26 GB usados (Postgres 20Gi, Minio 5Gi, Redis 1Gi)
- Aplicações:
  - `back-end/agility-api` — **2 réplicas**, HPA 2–5, requests 250m/256Mi, limits 2/4000Mi
  - `back-end/redis` — 1 réplica
  - `database-dev/postgres` — 1 réplica, **limits 500m/1Gi** (subdimensionado mesmo para dev)
  - `keycloak-dev/keycloak` 26.4.6 — apontando para o mesmo Postgres, DB `keycloak`
  - `front-end/app-frontend` e `platform-frontend` — Nginx leve
  - `minio/minio` — 1 réplica, 5 GB
  - Longhorn, ingress-nginx, cert-manager, Rancher agents

### 1.2 Cluster `route-services` (otimização de rotas)
- Nó: `route-services` — **16 vCPU / 64 GB RAM**
- Uso real (top): 2.5 vCPU (15%) / **21 GB RAM** (33%)
- Requests: 14.9 vCPU (93%) / 33.9 GB (50%)
- Limits: **23.6 vCPU (147%)** — overcommit pesado
- Storage: 50 GB ORS data + 20 GB OSRM data
- Aplicações:
  - `open-route/openrouteservice` v8.0.0 — JVM `Xmx 14g–16g`, **13.5 GB heap em uso**, single-pod
  - `open-route/vroom` (VRP solver) — req 2/4Gi, limit 8/12Gi, idle quase 0
  - Stack Rancher Monitoring + Logging (consome boa parte dos requests)

### 1.3 Cluster `map-services-development` (mapa Brasil completo)
- Nó: `vmi2910999` — **16 vCPU / 64 GB RAM**
- Uso real: 1.8 vCPU (11%) / **20 GB RAM** (31%)
- Requests: 14.9 vCPU (93%) / 62.9 GB (**93%**)
- Limits: 27.6 vCPU (172%) / **122 GB (181%)** — overcommit de memória crítico, vai OOM-killar sob tráfego
- Storage: **250 GB Longhorn** (Nominatim 100Gi, tiles 100Gi, postgres 50Gi)
- Aplicações:
  - `openstreetmap/nominatim` — `mediagis/nominatim:5.2`, PBF Brasil (`brazil-latest.osm.pbf` Geofabrik), Postgres 16 **embutido no container**, limits 8/40Gi
  - `openstreetmap/osm-tile-server` — renderização Mapnik, 10 GB RAM em uso
  - `openstreetmap/postgres` — instância separada (não a do Nominatim), 50 GB PVC

---

## 2. Perfil real do monolito `agility-services`

Confirmado por inspeção do código (não estimativa):

| Característica | Valor |
|---|---|
| Stack | NestJS 11 + Node 22 (Express) |
| Módulos NestJS | **56** |
| Modelos Prisma | **66 tabelas** |
| Migrations | 70 |
| Multi-tenant | Sim — TenantMiddleware + RLS Postgres |
| Realtime | Socket.IO com Redis adapter (multi-réplica OK) |
| Filas | BullMQ (e-mails) |
| Cache | Redis (`RedisCacheService`) |
| Lock distribuído | Redis (`distributed-lock.service.ts`) |
| Rate limiter | `@nestjs/throttler` + Redis |
| Body limit | 50MB (uploads em base64) |
| Storage | S3 (`@aws-sdk/client-s3`) + PVC `/app/uploads` (chat anexos, fotos serviço) |
| Auth | Keycloak (JVM separado) |
| Integrações | OpenRouteService, Vroom, Pusher, Mailgun, integrator externo |
| Vehicle tracking | Polling configurável (hoje desabilitado em dev) |

**Conclusão**: é um SaaS multi-tenant pesado, não um CRUD. Memória é dominada pelo heap V8 sob upload + payload grande. CPU é dominada por serialização Prisma e otimização de rotas (delegada a Vroom/ORS).

---

## 3. Arquitetura proposta para produção

### Decisões de fundo

1. **Manter 3 clusters separados.** Workloads muito diferentes (monolito stateless × JVM Java memory-bound × PostGIS disk-bound). Misturar gera vizinhos barulhentos, dificulta capacity planning e força máquinas exageradamente grandes.
2. **Banco principal fora do K8s.** Já está decidido pelo usuário e é a escolha correta — Postgres não compete bem com workloads K8s por IO/CPU.
3. **HA mínima.** SLA 99.5% (~3.6h/mês de downtime aceitável) permite:
   - 2 nós worker no monolito (não 3) — empate aceitável durante drain
   - Control plane single-node em ORS e Map (workloads tolerantes a delay de scheduling)
   - Failover de banco manual em até 15 min
   - **Mas:** monolito **precisa** de pelo menos 2 réplicas em 2 nós diferentes
4. **Tirar Longhorn de prod.** Em VPS Contabo, Longhorn é fonte de dor (corrupção em reboot brusco, performance ruim). Use **S3 externo para uploads** e **PV host-path local em SSD** só para `tmp`/`cache`.
5. **Tirar MinIO de prod.** Trocar por **Contabo Object Storage** (S3-compatible, ~€3/TB/mês) ou **Backblaze B2** (~$6/TB). Código já usa `@aws-sdk/client-s3`, basta trocar endpoint.

---

### 3.1 Cluster `services` (monolito + auth + frontends + Redis)

**Composição: 3 worker + 3 control-plane**

| Função | Qtd | vCPU | RAM | Disco | Justificativa |
|---|---|---|---|---|---|
| Control plane (etcd, apiserver) | 3 | 2 | 4 GB | 80 GB SSD | Quorum etcd HA. Hoje você não tem — `services` roda tudo num nó só |
| Worker | 3 | 8 | 32 GB | 200 GB NVMe | Cabe 2 réplicas API + Keycloak + Redis + ingress + spike HPA |

**Por que 3 workers (não 2):** drenar um nó para upgrade do RKE2/kernel precisa caber nos outros. Com 2 nós, perder 1 = 100% da carga no que sobra → throttling sob carga. Com 3, sobra ~50% de folga.

**Distribuição típica por worker (target ~70% de allocation):**

```
agility-api × 2 réplicas (anti-afinidade)  : 2 vCPU req / 4 GB limit cada
keycloak × 2 réplicas (anti-afinidade)     : 1 vCPU / 2 GB cada
redis (master + sentinel)                  : 0.5 vCPU / 1 GB
ingress-nginx (DaemonSet)                  : 0.5 vCPU / 512 MB
sistema (kubelet, runtime)                 : 1 vCPU / 2 GB
                                          ─────────────
total por worker                          : ~5 vCPU / ~10 GB usados (~70%)
```

**Configuração do `agility-api` em prod (substitui o atual 250m/256Mi req → 2/4000Mi limit):**

```yaml
resources:
  requests: { cpu: "1", memory: "1Gi" }
  limits:   { cpu: "2", memory: "2.5Gi" }
```

HPA: **min 3, max 10**, CPU 70% / mem 80%. Com 3 réplicas baseline, perder 1 réplica não impacta latência.

**Importante:** ajustar `--max-old-space-size=2048` no Node (Xmx do V8), senão limit 2.5Gi vira OOMKill.

**Uploads (`/app/uploads`):** trocar para S3 externo. Hoje usa `emptyDir` (perde em restart) — em prod precisa ser persistente OU usar S3.

---

### 3.2 Cluster `route-services` (ORS + Vroom)

**Composição: 2 worker + 1 control-plane**

| Função | Qtd | vCPU | RAM | Disco | Justificativa |
|---|---|---|---|---|---|
| Control plane | 1 | 2 | 4 GB | 80 GB | Workload tolera delay de scheduling; HA aqui não compensa custo |
| Worker | 2 | 8 | 32 GB | 200 GB NVMe | ORS pin em 1 worker, Vroom HPA pelos 2 |

**Por que não 1 worker:** durante rebuild de grafo do ORS (`REBUILD_GRAPHS=True`) o pod fica indisponível por 30–60 min. Com 2 workers, agenda em paralelo blue/green.

**ORS dimensionamento:**

Hoje: Brasil completo, JVM 8–16 GB heap, **usa 13.5 GB em uso real**.

```yaml
# openrouteservice
resources:
  requests: { cpu: "4", memory: "20Gi" }
  limits:   { cpu: "8", memory: "26Gi" }
env:
  - name: JAVA_OPTS
    value: "-Xms16g -Xmx20g"
```

Se for adicionar mais países (Latam): subir heap para 32 GB e workers para **8 vCPU / 48 GB**.

**Vroom dimensionamento (VRP solver — IMPORTANTE):**

Vroom é CPU-intensivo sob carga. Hoje 49 MB em uso porque sem requisições. Sob otimização real (rotas 100+ stops), pode queimar 8 CPUs por minutos.

```yaml
# vroom — habilitar HPA
resources:
  requests: { cpu: "1", memory: "512Mi" }
  limits:   { cpu: "4", memory: "4Gi" }
```

HPA min 2 max 6, CPU 60% — solver é bursty e cliente fica esperando.

**Storage**: 50 GB ORS é suficiente. **Local-path em SSD do nó** (não Longhorn — ORS regenera grafo do PBF, replicação é desperdício).

---

### 3.3 Cluster `map-services` (Nominatim + Tile Server + OSM Postgres)

**Composição: 2 worker + 1 control-plane**

| Função | Qtd | vCPU | RAM | Disco | Justificativa |
|---|---|---|---|---|---|
| Control plane | 1 | 2 | 4 GB | 80 GB | Mesma lógica de route-services |
| Worker A (Nominatim) | 1 | 8 | **48 GB** | **500 GB NVMe** | Nominatim+Postgres16 embutido, Brasil completo |
| Worker B (Tile Server) | 1 | 8 | 32 GB | **500 GB NVMe** | Tiles renderizados Brasil |

**Por que 2 workers separados:** Nominatim e Tile Server competem por IO de disco brutalmente. PostGIS do Nominatim faz queries grandes, Mapnik renderiza/lê do disco. Em prod, isolar.

**Nominatim** (`mediagis/nominatim:5.2`):

```yaml
resources:
  requests: { cpu: "4", memory: "24Gi" }
  limits:   { cpu: "6", memory: "40Gi" }
env:
  - name: PBF_URL
    value: https://download.geofabrik.de/south-america/brazil-latest.osm.pbf
  - name: REPLICATION_URL
    value: https://download.geofabrik.de/south-america/brazil-updates/
  - name: THREADS
    value: "6"  # alinhado com vCPU
```

**Atenção**: o Postgres está **embutido** no container Nominatim, com PVC montado em `/var/lib/postgresql/16/main`. Isso é OK para o caso de uso (Nominatim é mostly-read e o schema é específico), mas **não migra para o Postgres principal** — é um Postgres dedicado do Nominatim.

**Brasil completo no Nominatim**: importação inicial leva **8–24h** (8 vCPU, 24 GB RAM, depende do IO do disco). Replicação incremental: diária. **Reserve janela de manutenção mensal** para reimportação se houver mudanças significativas.

**OSM Tile Server**:

```yaml
resources:
  requests: { cpu: "2", memory: "8Gi" }
  limits:   { cpu: "4", memory: "16Gi" }
```

HPA 2–4 réplicas. Cache de tiles cresce com uso — monitore disco.

**Postgres separado do `openstreetmap`**: está rodando mas só 212 MB em uso. Não vi código consumindo. **Investigar antes de subir prod** — pode ser deploy histórico desnecessário.

---

### 3.4 Banco de dados PostgreSQL (aplicação + Keycloak)

**Fora do K8s, em VPS dedicada.**

**Setup: Primary + Standby (streaming async)**

| Função | Qtd | vCPU | RAM | Disco | OS |
|---|---|---|---|---|---|
| Primary | 1 | **8** | **32 GB** | **500 GB NVMe** + 500 GB HDD (WAL archive) | Ubuntu 24.04 + Postgres 16 |
| Standby (warm) | 1 | 8 | 32 GB | 500 GB NVMe | Mesma config |

**Parâmetros Postgres recomendados (para 32 GB RAM):**

```conf
shared_buffers = 8GB
effective_cache_size = 24GB
maintenance_work_mem = 2GB
work_mem = 32MB
max_connections = 200
max_wal_size = 4GB
checkpoint_completion_target = 0.9
random_page_cost = 1.1   # NVMe
synchronous_commit = on
wal_level = replica
```

**PgBouncer na frente do primary** (transaction pooling):

```ini
pool_mode = transaction
default_pool_size = 50
max_client_conn = 500
reserve_pool_size = 10
```

NestJS conecta no PgBouncer (port 6432), não no Postgres direto.

**Schemas:**
- `agility` (banco da aplicação, com RLS por tenant)
- `keycloak` (banco do Keycloak)

Mesma instância é seguro — Keycloak é leve. Confirma o que já está em dev.

**Backups:**
- `pgbackrest` ou `wal-g` para **Backblaze B2 / Contabo Object Storage**
- Full diário + incremental a cada 6h
- WAL archive contínuo
- Retenção: 14 dias + 1 mensal × 12 meses

**Migração de dev para prod**:
1. `pg_dump --schema-only` para gerar schema atual + roles
2. Configurar RLS conforme `[[database-rls]]` (memória existente)
3. Subir Prisma migrations em vazio (deploy do init container `prisma-migrate`)

---

### 3.5 Redis (cache + filas + Socket.IO adapter)

**Dentro do cluster `services`**, **Redis Sentinel** (1 master + 2 replicas + 3 sentinels).

| Pod | Recursos | Storage |
|---|---|---|
| Master | 1 vCPU / 2 GB | 5 GB PV local-path SSD |
| Replica × 2 | 0.5 vCPU / 1 GB | 5 GB PV local-path SSD |
| Sentinel × 3 | 100m / 64Mi | - |

Working set estimado para 500 motoristas: < 500 MB (sockets, cache, locks, filas curtas). Não precisa Redis Cluster.

**Persistência**: `appendonly yes` com `appendfsync everysec`. Aceita perder ≤ 1s em crash (é cache + sockets, não verdade do negócio).

**Alternativa simples (1 réplica)**: aceitável para SLA 99.5%, mas durante restart todos os sockets caem. Recomendo Sentinel.

---

### 3.6 Object Storage (uploads + backup)

| Necessidade | Recomendação |
|---|---|
| Uploads (chat, fotos serviço, anexos) | Contabo Object Storage 1TB (~€3/mês) ou Backblaze B2 (~$6/TB) |
| Backup Postgres | Mesmo bucket / outro bucket separado |
| Backup ORS data / OSM tiles | Não precisa — regenerável do PBF Geofabrik |

Trocar `S3_ENDPOINT` para o endpoint do provedor escolhido. Código já usa `@aws-sdk/client-s3` v3 — funciona com qualquer S3-compatible.

---

## 4. Resumo de máquinas

### 4.1 Total de VPS necessárias

| Cluster | Função | Qtd | Spec | Custo Contabo aprox/mês |
|---|---|---|---|---|
| `services` | Control plane | 3 | 2 vCPU / 4 GB / 80 GB | 3× €5 = €15 |
| `services` | Worker | 3 | 8 vCPU / 32 GB / 200 GB NVMe | 3× €17 = €51 |
| `route-services` | Control plane | 1 | 2 vCPU / 4 GB / 80 GB | €5 |
| `route-services` | Worker | 2 | 8 vCPU / 32 GB / 200 GB NVMe | 2× €17 = €34 |
| `map-services` | Control plane | 1 | 2 vCPU / 4 GB / 80 GB | €5 |
| `map-services` | Worker (Nominatim) | 1 | 8 vCPU / 48 GB / 500 GB NVMe | €30 |
| `map-services` | Worker (Tile Server) | 1 | 8 vCPU / 32 GB / 500 GB NVMe | €25 |
| Postgres app+keycloak | Primary | 1 | 8 vCPU / 32 GB / 500 GB NVMe + 500 GB HDD | €25 |
| Postgres app+keycloak | Standby | 1 | 8 vCPU / 32 GB / 500 GB NVMe | €22 |
| Object Storage | Buckets | - | 1 TB | €5 |
| **Total** | | **14 VPS** | | **~€217 / mês** |

Valores Contabo VDS são aproximados; faixa real €200–€280/mês para essa lista.

### 4.2 Total de recursos

- **vCPUs**: 78 (workers + DB + CPs)
- **RAM**: 312 GB
- **Disco NVMe**: ~3 TB
- **Object storage**: 1 TB

### 4.3 O que **não** está incluído (custo adicional)

| Item | Quando precisar |
|---|---|
| Load Balancer externo (Cloudflare / Contabo LB) | Para terminar TLS antes do ingress. Hoje ingress-nginx fica nos workers (não há LB) — funciona mas IP do worker fica exposto |
| Monitoring stack (Prometheus, Grafana, Loki) | Hoje só está no cluster route-services. Em prod, considere Grafana Cloud free tier ou Self-host num VPS €5 |
| CI runner | Se for self-host o runner do GitLab/GitHub Actions |
| Bastion / VPN | Tailscale free ou WireGuard num VPS €3 |

---

## 5. Riscos e gaps identificados (seja honesto com o usuário)

1. **Postgres dev está com limit 500m/1Gi.** Em prod com 500 motoristas, 200 conexões abertas e Prisma fazendo queries N+1 (típico), 1 GB é insuficiente. Recomendação é 32 GB.

2. **HPA atual está 2–5 réplicas.** Sob pico de tracking real (motoristas mandando GPS a cada 30s) com WebSocket aberto, 5 réplicas vai apertar. Subir para 3–10 antes de chegar carga real.

3. **Uploads em emptyDir** (config atual). Restart do pod = perda dos arquivos. Trocar para S3 externo **antes** do go-live.

4. **MinIO dentro do cluster** com Longhorn é antipattern para prod. Trocar por Object Storage externo.

5. **Vroom em 1 réplica idle** parece OK em dev, mas em prod sob carga de otimização, 1 réplica vira gargalo. HPA min 2.

6. **ORS reload é destrutivo.** `REBUILD_GRAPHS=True` derruba o pod por 30–60 min. Em prod, automatizar blue/green com 2 PVCs (data-active e data-staging).

7. **Nominatim com Postgres embutido** é OK para o caso, mas **escalar Nominatim horizontalmente exige replicar todo o PVC de 100GB** — não é trivial. Se precisar HA do Nominatim, considere Photon (alternativa Java, mais leve).

8. **Cluster control plane single-node em `route-services` e `map-services`**: aceita-se para SLA 99.5%, mas perda do CP significa que pods existentes continuam mas você perde scheduling, kubectl e auto-healing por algumas horas. Decisão consciente.

9. **Sem load balancer externo hoje.** Ingress-nginx está rodando nos próprios workers — se IP do worker mudar, DNS quebra. Considerar Cloudflare na frente (free tier resolve para SLA 99.5%).

10. **Backup atual = não tem.** Antes de subir prod, pgbackrest configurado e **teste de restore obrigatório**.

11. **Imagens de container no Harbor self-host** (`registry.agilitylabs.com.br`). Se o Harbor cair durante deploy, deploy falha. Considere espelhar imagens críticas em registro público (GHCR free) como fallback.

12. **Em dev você tem ~30 imagens de `platform-frontend` antigas no nó** (~17 GB de imagens). Configurar imagePullPolicy + image GC em prod.

---

## 6. Plano de migração dev → prod (esboço)

| Fase | Duração | Ações |
|---|---|---|
| **0. Preparação** | 1 sem | Provisionar 14 VPS, instalar RKE2 + ArgoCD/Fleet, configurar DNS prod |
| **1. Banco** | 3 dias | Postgres primary+standby, PgBouncer, backup pgbackrest testado |
| **2. Clusters K8s** | 1 sem | Subir 3 clusters, conectar Fleet/Rancher, sealed-secrets, cert-manager |
| **3. Map + Route** | 1 sem | Importar OSM Brasil no Nominatim (24h), build grafo ORS, subir Vroom |
| **4. Monolito + Keycloak** | 3 dias | Helm chart aplicado, Prisma migrate em vazio, importar realm Keycloak |
| **5. Smoke** | 1 sem | Teste de fumaça com 1 tenant piloto |
| **6. Carga** | 3 dias | Teste de carga (k6) — simular 500 motoristas |
| **7. Go-live** | 1 dia | DNS swap, monitoring ON, plano de rollback documentado |

---

## 7. Crescimento futuro — sinais para escalar

| Métrica | Threshold | Ação |
|---|---|---|
| CPU agility-api > 70% sustentado | 7 dias | Subir HPA max ou adicionar 4º worker |
| Memória Postgres > 80% | 7 dias | Vertical scale para 64 GB |
| Latência p95 API > 500ms | sustentado | Profile + cache Redis mais agressivo |
| Vroom queue > 30s | sustentado | Vertical scale solver ou HPA max |
| Nominatim p95 > 1s | sustentado | Cache CDN (Cloudflare) ou trocar por Photon |
| Conexões PgBouncer > 80% | sustentado | Aumentar `default_pool_size` ou subir réplica de leitura |
| > 50 tenants | - | Considerar separar Keycloak em instância dedicada |
| > 100 tenants | - | Considerar Postgres em serviço gerenciado (Aiven, Crunchy) |

---

## 8. Próximos passos imediatos

1. Aprovar este sizing ou pedir ajustes
2. Provisionar 1 VPS de teste para Postgres prod + pgbackrest e validar restore
3. Helm chart de prod do `agility-services` (hoje está em `k8s/deployment.yaml` no repo, precisa parametrizar)
4. Documentar runbook de DR (failover Postgres, rebuild ORS, reimport Nominatim)
5. Definir janela de manutenção mensal (idealmente domingo madrugada)
