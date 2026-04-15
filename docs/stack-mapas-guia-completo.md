# Stack de Mapas Agility - Guia Completo

> Documento de referencia para entender toda a arquitetura de mapas, geocoding e roteirizacao da plataforma Agility.

---

## 1. Visao Geral da Arquitetura

```
                           ┌─────────────────────────────────────┐
                           │          USUARIO FINAL              │
                           │  (Motorista / Operador / Cliente)   │
                           └─────┬──────────┬──────────┬────────┘
                                 │          │          │
                    ┌────────────┘          │          └────────────┐
                    v                       v                       v
          ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
          │   lab-app        │    │ frontend-app     │    │ frontend-platform│
          │  (Motorista RN)  │    │ (Motorista Web)  │    │  (Operador Web)  │
          │  MapLibre + GPS  │    │ GPS Browser      │    │  Leaflet + ORS   │
          └────────┬────────┘    └────────┬────────┘    └────────┬────────┘
                   │                      │                      │
                   └──────────┬───────────┘                      │
                              v                                  │
                   ┌─────────────────────┐                       │
                   │   agility-services   │◄──────────────────────┘
                   │   (Backend Node.js)  │
                   │   Porta: 3000        │
                   └──────────┬──────────┘
                              │
              ┌───────────────┼───────────────┐
              v               v               v
   ┌──────────────────┐ ┌──────────────┐ ┌──────────────┐
   │ dev.maps.         │ │ dev.route.   │ │  PostgreSQL  │
   │ agilitylabs.com.br│ │agilitylabs   │ │  (Agility)   │
   │                   │ │.com.br       │ │              │
   │ - Tile Server     │ │              │ │              │
   │ - Nominatim       │ │ - ORS        │ │              │
   │                   │ │ - VROOM      │ │              │
   └──────────────────┘ └──────────────┘ └──────────────┘
```

---

## 2. Cada Componente e sua Responsabilidade

### 2.1 Tile Server (Mapa Visual)

| | |
|---|---|
| **O que e** | Servidor que gera as "telhas" (tiles) do mapa - aquelas imagens quadradas que formam o mapa quando voce da zoom |
| **Imagem Docker** | `overv/openstreetmap-tile-server:latest` |
| **URL** | `https://dev.maps.agilitylabs.com.br/tile/{z}/{x}/{y}.png` |
| **Responsabilidade** | Renderizar o mapa visual que o usuario ve na tela |
| **Dados** | `brazil-latest.osm.pbf` (OpenStreetMap do Brasil) |
| **Custo** | Auto-hospedado, gratuito, sem limites de requisicoes |
| **Analogia** | E como o Google Maps mostrando o mapa - mas rodando no seu servidor |

**Como funciona:**
1. O app pede uma imagem: `GET /tile/15/12345/6789.png`
2. O servidor verifica se ja tem essa imagem no cache
3. Se nao tem, renderiza usando os dados OSM + estilo openstreetmap-carto
4. Salva no cache (PVC) e retorna a imagem PNG
5. Proximas requisicoes sao instantaneas

**Antes vs Agora:**
- Antes: `https://tile.openstreetmap.org/{z}/{x}/{y}.png` (publico, com rate limiting)
- Agora: `https://dev.maps.agilitylabs.com.br/tile/{z}/{x}/{y}.png` (nosso, sem limites)

---

### 2.2 Nominatim (Geocoding)

| | |
|---|---|
| **O que e** | Servidor de geocoding - converte enderecos em coordenadas e vice-versa |
| **Imagem Docker** | `mediagis/nominatim:5.2` |
| **URL** | `https://dev.maps.agilitylabs.com.br/nominatim/` |
| **Responsabilidade** | Transformar "Av Paulista, Sao Paulo" em lat/lng e lat/lng em endereco |
| **Dados** | `brazil-latest.osm.pbf` (mesmo do tile server) |
| **Custo** | Auto-hospedado, gratuito |

**Endoints principais:**

```bash
# Forward Geocoding (endereco -> coordenadas)
GET /nominatim/search?q=Av+Paulista,Sao+Paulo&format=json
# Retorna: [{ "lat": "-23.5611", "lon": "-46.6568", "display_name": "Avenida Paulista, ..." }]

# Reverse Geocoding (coordenadas -> endereco)
GET /nominatim/reverse?lat=-23.56&lon=-46.65&format=json
# Retorna: { "address": { "road": "Rua Rocha", "city": "Sao Paulo", ... } }
```

**Onde e usado:**
- `frontend-platform`: `openRouteService.ts` -> `buscarLatLng()` - converte enderecos de servicos em coordenadas para o ORS
- Antes apontava para `nominatim.openstreetmap.org` (publico), agora aponta para o nosso

**Analogia:** E como quando voce digita um endereco no Google Maps e ele encontra no mapa.

---

### 2.3 ORS - OpenRouteService (Roteirizacao)

| | |
|---|---|
| **O que e** | Motor de roteirizacao - calcula rotas, distancias e tempos entre pontos |
| **Imagem Docker** | `openrouteservice/openrouteservice:v8.0.0` |
| **URL** | `https://dev.route.agilitylabs.com.br/ors/v2/` |
| **Responsabilidade** | Calcular a melhor rota, distancia e tempo entre coordenadas |
| **Dados** | `brazil-latest.osm.pbf` (mesmo OSM) |
| **Profile** | `driving-car` (carro) |

**Endpoints principais:**

```bash
# Directions (rota entre pontos)
POST /ors/v2/directions/driving-car
Body: { "coordinates": [[-46.63, -23.55], [-46.60, -23.52]] }
# Retorna: polyline codificada da rota, distancia (m), duracao (s)

# Matrix (distancias entre N pontos)
POST /ors/v2/matrix/driving-car
Body: { "locations": [[lon1,lat1], [lon2,lat2], ...] }
# Retorna: matriz de distancias e duracoes entre todos os pontos

# Optimization (roteirizacao com veiculos multiplos)
POST /ors/v2/optimization
Body: { "vehicles": [...], "jobs": [...] }
# Retorna: ordem otima de visitas para cada veiculo
```

**Onde e usado:**
- `frontend-platform`: Roteirizacao - otimiza a ordem de visitas dos motoristas
- `agility-services` (backend): Chama ORS para calcular rotas e distancias
- Retorna **polyline codificada** (linha da rota no mapa)

**Analogia:** E como o "calcular rota" do Waze/Google Maps - diz qual caminho pegar.

---

### 2.4 VROOM (Otimizacao de Veiculos)

| | |
|---|---|
| **O que e** | Resolver o problema do caixeiro viajante para multiplos veiculos |
| **Imagem Docker** | `ghcr.io/vroom-project/vroom-docker:v1.14.0` |
| **URL** | `https://dev.route.agilitylabs.com.br/ors/v2/optimization` |
| **Responsabilidade** | Dado N servicos e M veiculos, decidir qual veiculo vai a qual servico e em qual ordem |
| **Conecta-se a** | ORS (para calcular distancias reais entre pontos) |

**Onde e usado:**
- O endpoint `/ors/v2/optimization` do ingress na verdade roteia para o VROOM
- VROOM usa o ORS internamente para calcular distancias reais de estrada

**Analogia:** Se voce tem 50 entregas e 5 motoristas, o VROOM decide qual motorista faz quais entregas e em qual ordem para minimizar tempo/distancia total.

---

### 2.5 Backend (agility-services)

| | |
|---|---|
| **O que e** | API principal da Agility (Node.js) |
| **Responsabilidade** | Orquestrar tudo - gerenciar rotas, motoristas, servicos, enderecos |
| **Conecta-se a** | ORS (via `OPENROUTE_API_URL`), PostgreSQL (dados de negocio) |

**O que o backend faz com mapas:**
1. Armazena enderecos com lat/lng no banco
2. Chama ORS para calcular rota quando necessario (`calculateRoute`)
3. Expoe endpoints para o frontend buscar dados de mapa
4. Gerencia localizacao em tempo real dos motoristas
5. Chama VROOM/ORS para otimizacao de rotas

---

## 3. Os 3 Frontends e suas Responsabilidades com Mapas

### 3.1 lab-app (Motorista - React Native)

```
Tecnologia: MapLibre GL Native + TransistorSoft GPS
Plataforma: iOS / Android (Expo)
```

| Funcionalidade | Como funciona |
|---|---|
| **Mapa visual** | MapLibre GL com tiles OSM (raster) |
| **Rota no mapa** | Recebe polyline codificada do backend, decodifica e renderiza |
| **Marcadores** | Pins nos pontos de parada (coleta, servico, entrega) |
| **Localizacao do motorista** | TransistorSoft (GPS em background, envia para backend a cada 5 posicoes) |
| **Geofences** | Detecta quando motorista chega/sai de uma parada (raio 100m) |
| **Navegacao** | Abre Waze/Google Maps/Apple Maps via deep link (NAO tem navegacao integrada) |
| **Geocoding** | NAO faz geocoding - recebe coordenadas do backend |

**Fluxo de dados:**
```
1. Motorista abre a rota
2. App busca GET /routings/{id}/map-data no backend
3. Backend retorna: { services: [{lat, lng}], routes: [{geometry: "encoded_polyline"}] }
4. App decodifica a polyline e desenha a linha no mapa
5. TransistorSoft rastreia GPS e envia para backend em background
6. Quando motorista quer navegar, abre Google Maps/Waze com coordenadas
```

---

### 3.2 agility-frontend-app (Motorista - Web/PWA)

```
Tecnologia: Browser Geolocation API (sem mapa embutido)
Plataforma: Web (Next.js)
```

| Funcionalidade | Como funciona |
|---|---|
| **Mapa visual** | NAO tem mapa embutido - usa imagem estatica placeholder |
| **Rota no mapa** | NAO mostra rota no mapa |
| **Localizacao do motorista** | `navigator.geolocation` a cada 15s, envia para backend a cada 60s |
| **Navegacao** | Modal com botoes para abrir Google Maps ou Waze (deep link) |
| **Geocoding** | NAO faz geocoding |
| **Optimizacao** | Chama backend para otimizar rota (backend chama ORS) |

**Fluxo de dados:**
```
1. Motorista abre a rota
2. Vê lista de paradas com enderecos
3. Clica em "Abrir mapa" -> escolhe Google Maps ou Waze
4. Browser geolocation rastreia GPS em background
5. Para otimizar: POST /optimization/optimize (backend chama ORS)
```

---

### 3.3 agility-frontend-platform (Operador - Web)

```
Tecnologia: Leaflet.js (raw, NAO react-leaflet na maioria) + @mapbox/polyline
Plataforma: Web (Next.js)
```

| Funcionalidade | Como funciona |
|---|---|
| **Mapa visual** | Leaflet com tiles OSM publicos (ainda NAO usa nosso tile server) |
| **Rota no mapa** | Decodifica polyline ORS e renderiza com Leaflet polyline |
| **Marcadores** | Custom SVG com numeros, agrupamento (marker cluster) |
| **Regioes** | Desenha poligonos no mapa com leaflet-draw (areas de agrupamento) |
| **Motoristas no mapa** | Posicoes em tempo real via WebSocket (icone de carro colorido) |
| **Geocoding** | `buscarLatLng()` - chama Nominatim para converter endereco -> coordenadas |
| **Optimizacao** | Monta payload ORS/VROOM e envia para roteirizacao |
| **Roteirizacao** | Converte equipes -> veiculos ORS, servicos -> jobs ORS |

**Componentes de mapa:**

| Componente | Funcao |
|---|---|
| `Mapa.tsx` | Componente principal - marcadores, poligonos, motoristas, rotas |
| `MapaResultado.tsx` | Mostra resultado da otimizacao com rotas desenhadas |
| `RouteMonitoringMap.tsx` | Monitoramento em tempo real com posicao dos motoristas |
| `TrackingMap.tsx` | Mapa publico de rastreio para clientes |
| `OrderMap.tsx` | Mapa de pedidos com marcadores por status |
| `RoutingPreviewMap.tsx` | Preview da rota antes de confirmar |
| `LocationMapModal.tsx` | Modal para ver um ponto especifico |

---

## 4. Fluxo Completo de uma Rota (End-to-End)

### Cenario: Operador cria uma rota otimizada para 3 motoristas com 30 entregas

```
PASSO 1: Operador cadastra servicos
   frontend-platform -> backend POST /services
   Cada servico tem: endereco, lat, lng (preenchidos via Nominatim)

PASSO 2: Operador monta equipes
   frontend-platform -> define 3 veiculos com capacidade, janela de tempo

PASSO 3: Operador clica "Otimizar"
   frontend-platform monta payload ORS:
   {
     vehicles: [
       { start: [lon, lat], capacity: [10], time_window: [...] },
       { start: [lon, lat], capacity: [10], time_window: [...] },
       { start: [lon, lat], capacity: [10], time_window: [...] }
     ],
     jobs: [
       { location: [lon, lat], service: 300, amount: [1] },
       ... 30 jobs
     ]
   }

   frontend-platform -> ORS POST /ors/v2/optimization
   (OU frontend-platform -> backend -> ORS)

PASSO 4: ORS/VROOM calcula
   - Para cada motorista: qual a melhor ordem de visitas
   - Para cada par de pontos: distancia e tempo reais de estrada
   - Retorna: { routes: [{ steps: [...], geometry: "polyline" }] }

PASSO 5: Resultado e exibido
   MapaResultado.tsx desenha:
   - Linhas coloridas (verde = ida, azul = volta) para cada motorista
   - Marcadores numerados em cada parada
   - Distancia e tempo total

PASSO 6: Rotas sao criadas no backend
   Cada motorista recebe sua rota no lab-app / frontend-app

PASSO 7: Motorista inicia a rota
   lab-app:
   - Busca GET /routings/{id}/map-data
   - Recebe polyline e desenha no MapLibre
   - TransistorSoft comeca rastreamento GPS
   - Geofences ativados nas paradas

PASSO 8: Monitoramento em tempo real
   frontend-platform:
   - WebSocket recebe driver_location_updated
   - RouteMonitoringMap.tsx mostra posicao do motorista no mapa
   - Linha da rota atualizada

PASSO 9: Cliente rastreia
   TrackingMap.tsx (pagina publica):
   - Mostra posicao do motorista e destino
   - Polyline da rota
```

---

## 5. Infraestrutura Kubernetes

### Cluster 1: map-services-development (Mapas)

| Recurso | Namespace | CPU/RAM |
|---|---|---|
| osm-tile-server | openstreetmap | 4-12 CPU / 16-40Gi |
| nominatim | openstreetmap | 4-8 CPU / 24-40Gi |
| postgres (PostGIS) | openstreetmap | 2-4 CPU / 15-30Gi |
| **Total** | | ~20 CPU / ~80Gi |

### Cluster 2: route-services-development (Roteirizacao)

| Recurso | Namespace | CPU/RAM |
|---|---|---|
| openrouteservice | open-route | 4-8 CPU / 10-20Gi |
| vroom | open-route | 4-8 CPU / 10-20Gi |
| **Total** | | ~12 CPU / ~30Gi |

---

## 6. O que falta migrar para nossa infra

Atualmente, varios componentes ainda apontam para servicos publicos:

| Componente | Usa publico? | Precisa migrar? |
|---|---|---|
| **Tiles do mapa** (frontend-platform) | Sim - `tile.openstreetmap.org` | Sim -> `dev.maps.agilitylabs.com.br/tile/` |
| **Tiles do mapa** (lab-app) | Sim - `tile.openstreetmap.org` | Sim -> `dev.maps.agilitylabs.com.br/tile/` |
| **Nominatim** (frontend-platform) | Sim - `nominatim.openstreetmap.org` | Sim -> `dev.maps.agilitylabs.com.br/nominatim/` |
| **ORS** (frontend-platform MapaResultado) | Parcial - hardcode da URL | Ja usa `dev.route.agilitylabs.com.br` |
| **ORS** (backend agility-services) | Nao | Ja usa nosso ORS |
| **Tiles** (frontend-app) | Nao tem mapa | N/A |

---

## 7. Roadmap de Evolucao

### Fase 1: Independencia de Servicos Publicos (Atual)
- [x] Tile server auto-hospedado
- [x] Nominatim auto-hospedado
- [x] ORS auto-hospedado
- [x] VROOM auto-hospedado
- [ ] Migrar frontend-platform para usar nosso Nominatim
- [ ] Migrar frontend-platform para usar nossos tiles
- [ ] Migrar lab-app para usar nossos tiles

### Fase 2: Navegacao Integrada
- [ ] Substituir "abrir no Waze/Google Maps" por navegacao dentro do app
- [ ] Usar ORS directions para instrucoes turno a turno
- [ ] Implementar recalculo automatico de rota ao desviar

### Fase 3: Melhorias de Mapa
- [ ] Adicionar botao "Minha localizacao" (GPS)
- [ ] Adicionar busca de endereco dentro do app (Nominatim search)
- [ ] Adicionar mapas vetoriais (PBF/MBTiles) ao inves de raster
- [ ] Implementar modo offline (cache de tiles)

---

## 8. Conceitos-Chave para Iniciantes

### Tile (Telha)
O mapa e feito de milhoes de imagens quadradas 256x256 pixels chamadas "tiles". Cada zoom level tem mais tiles. Zoom 0 tem 1 tile, zoom 10 tem ~1 milhao, zoom 15 tem ~1 bilhao. O navegador so carrega os tiles visiveis na tela.

### Polyline Codificada
Uma forma compacta de representar uma linha (rota) como texto. Ex: `_p~iF~ps|U_ulLnnqC_mqNvxq`@`. O algoritmo do Google codifica coordenadas lat/lng em uma string curta. Nosso codigo decodifica com `@mapbox/polyline`.

### Geocoding (Forward)
Converter texto em coordenadas: "Rua Augusta, 100, Sao Paulo" -> `{ lat: -23.55, lng: -46.65 }`

### Reverse Geocoding
Converter coordenadas em texto: `{ lat: -23.55, lng: -46.65 }` -> "Rua Augusta, 100, Cerqueira Cesar, Sao Paulo"

### Roteirizacao (Routing)
Calcular o melhor caminho entre dois pontos considerando a malha viaria real. Retorna: distancia, tempo, geometria (polyline).

### Otimizacao (VRP - Vehicle Routing Problem)
Dado um conjunto de entregas e veiculos, determinar qual veiculo faz quais entregas e em qual ordem para minimizar custo total.

### ShapeSource / LineLayer (MapLibre)
- `ShapeSource`: Define dados geograficos (pontos, linhas, poligonos) em formato GeoJSON
- `LineLayer`: Renderiza uma ShapeSource como uma linha visual (cor, espessura)

### WebSocket (Socket.IO)
Conexao persistente bidirecional entre navegador e servidor. Permite que o servidor envie atualizacoes em tempo real (posicao do motorista) sem que o navegador precise ficar perguntando.

---

## 9. Glossario de URLs

| URL | Servico | Funcao |
|---|---|---|
| `dev.maps.agilitylabs.com.br/tile/{z}/{x}/{y}.png` | Tile Server | Imagens do mapa |
| `dev.maps.agilitylabs.com.br/nominatim/search?q=...&format=json` | Nominatim | Endereco -> Coordenadas |
| `dev.maps.agilitylabs.com.br/nominatim/reverse?lat=...&lon=...` | Nominatim | Coordenadas -> Endereco |
| `dev.route.agilitylabs.com.br/ors/v2/directions/driving-car` | ORS | Calcular rota |
| `dev.route.agilitylabs.com.br/ors/v2/matrix/driving-car` | ORS | Matriz de distancias |
| `dev.route.agilitylabs.com.br/ors/v2/optimization` | VROOM | Otimizar multiplas rotas |
| `dev.agilitylabs.com.br/api/*` | Backend | API principal |

---

## 10. Resumo Rapido

```
Tile Server  = Desenha o mapa (a imagem que voce ve)
Nominatim    = Encontra enderecos (texto <-> coordenadas)
ORS          = Calcula rotas (caminho entre pontos)
VROOM        = Otimiza entregas (quem vai onde, em que ordem)
Backend      = Orquestra tudo e guarda os dados
lab-app      = App do motorista com mapa e GPS
frontend-app = App do motorista na web (sem mapa)
frontend-platform = Painel do operador com mapa completo
```
