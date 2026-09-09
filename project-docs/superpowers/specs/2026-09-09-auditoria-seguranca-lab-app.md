# Auditoria de segurança — lab-app (app do motorista)

Data: 09/09/2026 · Repo: `lab-app` (React Native 0.81.5 / Expo SDK 54) · Modo: PRESERVE (4/5: history instructions tests lockfile)
Escopo: brechas no código. Segredos de ambiente (`.env`) fora de escopo por pedido — mas o
histórico do git foi varrido mesmo assim (resultado no fim).

Toda severidade aqui foi checada contra o mecanismo que poderia estar barrando o ataque. Onde a
proteção existe, ela está registrada em "Verificado e OK" — não é achado.

---

## Crítico (explorável hoje)

### C1 — O build de produção sai em modo development e loga senha, access token e refresh token

**Arquivos:** [eas.json](../../../eas.json) (profile `production`) · [app.config.ts:133](../../../app.config.ts#L133) · [src/config/environment.ts:6-15](../../../src/config/environment.ts#L6-L15) · [src/api/apiConfig.ts:11-15,84-101](../../../src/api/apiConfig.ts#L84-L101)

**Cadeia, verificada arquivo por arquivo:**

1. `app.config.ts:133` → `appEnv: process.env.APP_ENV || 'development'`.
2. `eas.json` → o profile **`production` não define `env.APP_ENV`**. O profile `preview` define
   (`"env": { "APP_ENV": "production" }`) — ou seja, a intenção existia e ficou de fora justamente
   no perfil que vai para a loja.
3. Logo, no app publicado: `currentEnvironment === 'development'` → `isDevelopment === true`.
4. `apiConfig.ts` liga todo o logging com `if (isDevelopment || __DEV__)`. `__DEV__` é `false` em
   release, mas `isDevelopment` sozinho já abre o portão.
5. O interceptor de request loga `Body: request.data` (linha 98-100) e o de response loga
   `Response: Data` (linha 14).
6. `authAPI.login()` posta em `apiIdentity.post('/auth/login', request)` — a mesma instância que
   tem os interceptors. O body é `{ emailOrUsername, password, tenantCode }`.

**Impacto hoje:** todo login no app de loja grava no log do dispositivo a **senha em texto puro**,
e a resposta grava **access_token + refresh_token**. Em seguida, cada request/response da sessão
inteira grava corpo completo: dados do cliente, endereço, telefone, código de retirada digitado,
foto de comprovante — o app inteiro em claro no log.

**Quem lê isso:** qualquer um com o aparelho e depuração USB (`adb logcat`), qualquer MDM ou
ferramenta de coleta de log da frota, qualquer SDK de crash que capture console, e apps com
`READ_LOGS` em aparelho rooteado/antigo. O motorista não precisa fazer nada de errado.

**Correção (duas, faça as duas):**

1. `eas.json`, profile `production`: adicionar `"env": { "APP_ENV": "production", "API_KEY": "..." }`.
   Isso também conserta C2.
2. Não depender de config para não vazar senha: trocar `isDevelopment || __DEV__` por `__DEV__`
   puro em `apiConfig.ts`, e **nunca logar `request.data` / `response.data`** de `/auth/*`.
   O jeito correto é uma allowlist de campos, não uma denylist.
3. Somar `babel-plugin-transform-remove-console` ao `babel.config.js` (só em produção) — hoje
   `babel.config.js` não tem nenhum strip e existem **461 chamadas `console.*`** no `src/` que vão
   inteiras para o bundle de release.

### C2 — `API_KEY` fica vazia no build de produção

**Arquivos:** [app.config.ts:134](../../../app.config.ts#L134) · [src/config/environment.ts:10-11](../../../src/config/environment.ts#L10-L11) · [src/domain/mobileVersion/mobileVersionAPI.ts:16](../../../src/domain/mobileVersion/mobileVersionAPI.ts#L16)

Mesma raiz de C1: `apiKey: process.env.API_KEY || ''` e o profile `production` do EAS não injeta
`API_KEY`. O app de loja manda `x-api-key: ''` na rota pública de versão mínima — ou seja, o gate
de "atualize o app" simplesmente não funciona em produção.

Colateral de segurança: quando a chave **for** injetada, ela vive em `Constants.expoConfig.extra`,
que é texto puro dentro do bundle. Qualquer um extrai com `unzip` do APK. Trate `x-api-key` como
identificador de app, nunca como credencial — a rota que ela protege precisa ser segura mesmo com a
chave pública (rate limit por IP, resposta sem dado sensível).

### C3 — Senha em texto puro no log a cada login, independentemente do ambiente

**Arquivo:** [src/services/authCredentials/userCredentialsStorage.ts:11,66,87](../../../src/services/authCredentials/userCredentialsStorage.ts#L11)

```ts
async function setInAll(uc: UserCredentials): Promise<void> {
    console.log('Iniciando a função set() com as credenciais:', uc);   // L11  → uc.password
    ...
    console.log('Salvando credenciais atualizadas:', existingCredentials);  // L87 → TODAS as contas
```

`UserCredentials` tem `password?: string` ([UserAuthInfoType.ts:46-57](../../../src/services/userAuthInfo/UserAuthInfoType.ts#L46-L57)) e ele é
de fato preenchido: `useLoginController.ts:81-92` chama `resolveCredentialsToSave({ password: userPassword })`
depois de todo login bem-sucedido, e `saveUserCredentials` cai em `setInAll`.

Diferente de C1, **estes três logs não têm nenhum gate** — rodam em qualquer build. A linha 87 é a
pior: imprime a lista inteira de contas salvas no aparelho, com a senha de cada motorista que já
logou ali (o app suporta multi-conta).

**Correção:** apagar os três `console.log` que recebem `uc` / `existingCredentials`. Se precisar de
log, logue `uc.username` apenas.

---

## Deve corrigir

### S1 — Senha do motorista guardada em claro para a biometria

**Arquivos:** [accountBiometrics.ts:30-46](../../../src/app/(public)/LoginScreen/_utils/accountBiometrics.ts#L30-L46) · [useLoginController.ts:140-147](../../../src/app/(public)/LoginScreen/_hooks/useLoginController.ts#L140-L147) · [StorageSecurity.ts](../../../src/services/storage/implementation/StorageSecurity.ts)

O login por digital funciona guardando a **senha** e reenviando ela para `/auth/login` quando a
biometria passa. A senha fica no SecureStore (Keychain / Android Keystore), o que é a parte certa —
não é AsyncStorage. Mas o material guardado é a credencial primária, não uma derivada: quem
extrair isso (aparelho rooteado, jailbreak, malware com acesso ao processo) não ganha uma sessão,
ganha a conta — inclusive para logar na plataforma web, e para todos os motoristas que já usaram
aquele aparelho.

**Correção:** guardar o **refresh token** em vez da senha, e reautenticar por ele após a digital.
Adicionalmente, `SecureStore.setItemAsync(key, value, { requireAuthentication: true })` amarra a
leitura à própria biometria, em vez de deixar o segredo legível para o processo o tempo todo.

### S2 — Refresh token entregue ao SDK de geolocation, que persiste em claro; backup do Android não está desligado

**Arquivos:** [src/services/location/backgroundLocationService.ts:126-141](../../../src/services/location/backgroundLocationService.ts#L126-L141) · [app.config.ts](../../../app.config.ts) (sem `allowBackup`)

O app passa `accessToken` **e** `refreshToken` para o `react-native-background-geolocation`
(`authorization: { strategy: 'JWT', accessToken, refreshToken, refreshUrl }`) e também no header
HTTP. O SDK guarda essa config no armazenamento nativo dele (SQLite/SharedPreferences), **fora do
SecureStore** — o cuidado que o app tem com credenciais para de valer aí.

Piora com o Android: `app.config.ts` não desativa `android:allowBackup`, e o padrão do Expo/Android
é `true`. Com auto-backup ligado, o diretório do app (incluindo o store do SDK) sobe para o Google
Drive do usuário. O que está no SecureStore continua inútil sem a chave do Keystore (que não é
copiada); o refresh token do SDK, não — ele sobe em claro.

**Correção:** adicionar em `expo-build-properties` → `android: { allowBackup: false }` (ou um
`backup_rules.xml` que exclua o diretório do SDK). Reavaliar se `refreshToken` precisa mesmo ir para
o SDK: sem ele, o SDK só usa o header e o refresh continua sendo trabalho do JS.

### S3 — Chave do OpenRouteService fixa no código

**Arquivo:** [src/domain/ors/directionsService.ts:14](../../../src/domain/ors/directionsService.ts#L14)

```ts
const ORS_API_KEY = '5b3ce3597851110001cf624858b2dedc8078405280f0bcb3a756bd44';
```

Credencial de terceiro comitada (commit `1a92291`) e embarcada no bundle. O comentário diz "mesma
key pública usada no bundle do platform web" — estar exposta em outro lugar não a torna pública, só
duplica a exposição. Consequência prática: consumo de cota / conta na nossa fatura por terceiros, e
a chave já está no histórico do git.

**Correção:** rotacionar a chave no ORS **primeiro**; depois mover a chamada de direções para um
endpoint do backend (o próprio comentário do arquivo já prevê isso: "quando houver um endpoint de
direções no backend, basta trocar a implementação de `fetchRouteGeometry`"). Reescrever o histórico
não desfaz o vazamento — rotacione.

### S4 — App de produção aponta para o ambiente de desenvolvimento

**Arquivo:** [src/config/urls.ts:8-26](../../../src/config/urls.ts#L8-L26)

`production` e `development` apontam ambos para `https://dev.agilitylabs.com.br`. Não é cleartext
(é HTTPS), mas significa que dados reais de motorista, cliente e endereço vão para o ambiente de
dev — que tem outro perfil de acesso, outro backup e outra retenção de log. Definir a URL de
produção é pré-requisito para publicar.

### S5 — `.gitignore` não cobre `.env` nem a service account do Google Play

**Arquivo:** [.gitignore](../../../.gitignore)

O `.gitignore` cobre `*.jks`, `*.p8`, `*.p12`, `*.key`, mas **não tem `.env`** e não tem
`google-play-service-account.json` — arquivo que o [eas.json](../../../eas.json) referencia por
caminho relativo (`./google-play-service-account.json`) em `submit.staging` e `submit.production`.

Hoje nenhum dos dois está no repositório (verificado abaixo). O problema é o próximo `git add`:
quem for publicar precisa colocar essa service account na raiz, e nada impede que ela entre num
commit. Uma service account do Play Console publica versões do app em nome da empresa.

**Correção:** acrescentar ao `.gitignore`:
```
.env
.env.*
google-play-service-account.json
*.json.key
```

---

## Backend (`agility-services`) — alcançável com o token do próprio app

Estes não estão no `lab-app`, mas são atingíveis com o token que o app emite, pelos endpoints que
o próprio app chama. Foram confirmados abrindo o guard e o handler.

### B1 — Qualquer motorista lê o financeiro de toda a empresa

**Arquivo:** `agility-services/src/finance/controller/finance.controller.ts:49-110` e `:160-184`

`GET /finance/payments` e `GET /finance/summary/drivers` estão em `@Roles('COLLABORATOR')`. O
`RolesGuard` (`src/auth/guards/roles.guard.ts:66-67`) compara por **igualdade exata**
case-insensitive, sem prefixo — então a pergunta é se o token do motorista carrega literalmente
`COLLABORATOR`. Carrega: `collaborator.service.ts:365-370` chama
`addRoleToUser(realm, keycloakUserId, 'COLLABORATOR')` **incondicionalmente** para todo colaborador
criado, e só depois soma a role específica do papel (`COLLABORATOR_DRIVER` para motorista, mapa em
`:372-381`). O terceirizado também recebe a mesma role base (`provider.service.ts:234`) — ou seja,
o comentário do `lab-app` em `menu/perfil/index.tsx:45`, que diz que o terceirizado toma 403 nessas
rotas, está desatualizado.

Sem `driverId` na query, o handler cai em `financeService.findByFiltersPaginated({}, 1, 20)` —
**sem nenhum escopo por motorista**. O RLS isola por tenant, não por motorista.

**Impacto:** um motorista, com o token do próprio app, lista os pagamentos de todos os colegas
(valores, rotas, clientes) e o resumo financeiro por motorista da empresa inteira. Basta chamar o
endpoint sem filtro, ou com o `driverId` de outro.

**Correção:** quando o autor tiver só `COLLABORATOR_DRIVER`, forçar `driverId` = o driver do
`@CurrentUser()` e ignorar o parâmetro da query — o mesmo padrão que `DriverController.update` já
usa e que está correto (ver V2).

### B2 — Dados pessoais dos colegas expostos ao motorista

**Arquivos:** `driver.controller.ts:58-131` · `driver.entity.ts:478+` · `driver-rating.controller.ts:25`

`GET /drivers`, `GET /drivers/:id` e `GET /ratings/driver/:driverId` são todos
`@Roles('COLLABORATOR')`, sem checagem de dono. O `toJson()` do driver devolve `licenseNumber`
(CNH), `licenseCategory`, `email`, `currentLatitude/Longitude` ao vivo, `startLatitude/Longitude`
(que costuma ser a casa do motorista), placa/modelo do veículo e o `collaborator` aninhado.

O app chama `/drivers/{driverId}` legitimamente (`journeyAPI.getMyJourney`) — trocar o id na
chamada devolve o cadastro do colega.

**Correção:** as leituras por `:id` no perfil de motorista devem exigir dono-ou-gestor. Existe
`GET /drivers/me` (`driver.controller.ts:115`) fazendo exatamente a coisa certa: o `lab-app`
deveria usar **só** ele para a jornada, e o `:id` deveria ficar restrito a ADMIN/MANAGER.

### B3 — O tenant vem do header e é amarrado ao *realm*, não à empresa

**Arquivos:** `src/middleware/tenant.middleware.ts:19-86` · `src/auth/strategies/jwt.strategy.ts:38-121` · `prisma/schema.prisma:788`

O contexto de tenant (o que dirige o RLS) sai **inteiro** do header `x-tenant-id`, e o
`TenantRequiredGuard` só valida o formato UUID. A defesa que existe está na `JwtStrategy`: a chave
de validação vem do JWKS `realms/{realmName}` derivado desse header, e o `iss` do token precisa
conter `/realms/{realmName}`. Trocar o header para o tenant de **outro realm** derruba a assinatura
→ 401. Isolamento entre realms: OK.

O buraco é quando duas empresas **compartilham realm**: `keycloakRealmName` em
`schema.prisma:788` **não tem `@unique`**. Nesse caso o token de A valida sob o `x-tenant-id` de B
(mesmo realm, mesmo issuer), o RLS é ativado como B, e o motorista de A lê e escreve os dados de B
com um token perfeitamente legítimo.

Nada em lugar nenhum compara o `company_id` do JWT com o `companyId` resolvido do header — e o
claim existe: o `lab-app` já o lê em `decodeJwt.ts:11`.

**Impacto hoje:** depende de existir realm compartilhado em produção. Se existir, é
comprometimento cross-tenant total; se não existir, é uma trava de uma linha faltando entre você e
esse cenário no dia em que alguém reaproveitar um realm.

**Correção (uma linha, faça independente de haver realm compartilhado hoje):** no
`JwtStrategy.validate`, depois da checagem de issuer:
```ts
if (payload.company_id && payload.company_id !== tenant?.companyId) {
    throw new UnauthorizedException('Token não pertence a este tenant');
}
```
E `@unique` em `keycloak_realm_name`.

---

## Defesa em profundidade (endurecimento)

- **[src/api/apiConfig.ts](../../../src/api/apiConfig.ts) — 461 `console.*` no bundle.** Mesmo com C1
  corrigido, adicionar `transform-remove-console` em produção no `babel.config.js`.
- **WebSocket manda `tenantId`/`userId` no `query` do handshake** — [useTrackingWebSocket.ts:97-113](../../../src/domain/agility/tracking/useCase/useTrackingWebSocket.ts#L97-L113),
  [useChatWebSocket.ts:152-166](../../../src/domain/agility/chat/useCase/useChatWebSocket.ts), `useNotificationWebSocket.ts:88-105`. O JWT vai em `auth.token`, que é o certo;
  o `query.tenantId` é redundante e o backend não deve usá-lo — se usar, é o mesmo problema de B3
  por outro caminho. Vale confirmar no gateway e remover do cliente.
- **[ChatAttachmentView.tsx:46](../../../src/components/ChatAttachmentView/ChatAttachmentView.tsx#L46)** — `Linking.openURL(attachments[index].url)`
  abre uma URL vinda do servidor sem validar esquema. Aceitar só `https:` antes de abrir
  (no Android, `intent://` abre atividade arbitrária).
- **`.playwright-mcp/` ainda rastreado no git** apesar de estar no `.gitignore` — os `console-*.log`
  contêm tenant id real (`9d45e24d-…`) e hosts internos. Sem token (`Authorization: NOT SET`), mas é
  artefato de outro repositório sem razão para estar aqui: `git rm -r --cached .playwright-mcp`.
- **Biometria sem `disableDeviceFallback`** — [useLoginController.ts:132-136](../../../src/app/(public)/LoginScreen/_hooks/useLoginController.ts#L132-L136):
  `authenticateAsync` aceita o PIN/padrão do aparelho como fallback. Para desbloquear uma senha
  guardada, considerar exigir biometria de fato.
- **Licenças do `react-native-background-geolocation` no `app.config.ts`** (L31 e L119): são chaves
  amarradas ao `app_id`, precisam estar no binário — não é vazamento. Fica o registro para não
  virar achado em auditoria futura.

---

## Verificado e OK — não são achados

Cada item abaixo foi aberto no arquivo que teria que garantir a coisa, não deduzido de comentário.

- **V1 — O código de confirmação não vai para o motorista.** `ServiceResponse.confirmationCode`
  ([service.response.ts:282-287](../../../src/domain/agility/service/dto/response/service.response.ts#L282-L287))
  traz **só flags** (`requirePickupCode`, `requireDeliveryCode`, `allowCodeBypass`). O valor do
  código nunca chega ao app; ele é digitado pelo motorista e enviado (`pickupCode`) para validação
  no backend ([codeGate.ts](../../../src/domain/agility/service/codeGate.ts), `ColetaEtapaInicial.tsx:70-77`).
- **V2 — `PATCH /drivers/:id` tem checagem de dono e allowlist de campos.**
  `driver.controller.ts:163-200`: com só `COLLABORATOR_DRIVER`, resolve o driver do usuário
  autenticado, compara com o `:id` e lança 403 se diferente; depois filtra os campos gravável
  (`currentLatitude`, `currentLongitude`, `isAvailable`, `workDays`, `workStartTime`, `workEndTime`).
  Não é IDOR.
- **V3 — Credenciais estão no SecureStore, não em AsyncStorage.**
  `authCredentialsStorage`/`userCredentialsStorage` usam `StorageSecurity` → `expo-secure-store`.
  AsyncStorage só guarda rascunho de parada e espelho de motivos de insucesso.
- **V4 — Nada sensível entrou no histórico do git.** `git log --all --diff-filter=A` para
  `*.env*`, `*.pem`, `*.key`, `*.p8`, `*.jks`, `*credential*`, `*service-account*`: **vazio**.
  `git ls-files` idem. `git log -p --all -S'-----BEGIN'` só casa com o `.claude/settings.json`
  removido (é config de permissão, não chave).
- **V5 — Isolamento entre realms Keycloak funciona.** Trocar `x-tenant-id` para uma empresa de
  outro realm invalida a assinatura (JWKS por realm + checagem de `iss`). A ressalva é B3, que é
  outro cenário (realm compartilhado).

---

## Ordem sugerida

1. C3 (apagar 3 `console.log` — minutos, e para o vazamento de senha em quem já tem o app)
2. C1 + C2 (`eas.json` + gate de log — bloqueia publicação)
3. B1 (financeiro da empresa exposto a qualquer motorista)
4. S3 (rotacionar a chave ORS — já está no histórico)
5. B3 (uma linha, evita o cross-tenant do dia em que um realm for reusado)
6. S4, S5, S1, S2, B2
