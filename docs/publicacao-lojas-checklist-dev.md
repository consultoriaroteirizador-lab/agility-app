# Checklist de Publicação — Dev (EAS / Expo)

Responsável: equipe de desenvolvimento.
Projeto EAS: `@agility-labs/agility-app` (id `38a03953-d99c-4fbd-b51e-03fc7f397345`)
Bundle / package: `br.com.agility.agilityapp`
Versão atual: `1.0.0` (Android `versionCode 1`, iOS `buildNumber 1`)

---

## 1. Pré-build — limpeza do projeto

- [ ] Alinhar patches do SDK 54 (hoje 9 pacotes desatualizados):
  ```bash
  npx expo install --check
  ```
  Pacotes afetados: `expo`, `expo-crypto`, `expo-dev-client`, `expo-file-system`,
  `expo-image-picker`, `expo-linking`, `expo-notifications`, `expo-web-browser`,
  `react-native-worklets`.

- [ ] Rodar `npx expo-doctor` até passar 18/18.

- [x] (Opcional) Adicionar plugin `expo-splash-screen` no [app.config.ts](../app.config.ts)
  para substituir a splash legacy 1242×2688 — fica mais nítido em telas modernas.

- [ ] Validar que `.gitignore` realmente ignora `android/` e `ios/` (já está). Não commitar
  pastas nativas.

---

## 2. Credenciais — Android

- [ ] Criar **conta de serviço** no Google Cloud Console com acesso à Play Console
  (papel "Release manager" ou "Service account user").
- [ ] Baixar a chave JSON e salvar como `google-play-service-account.json` na raiz
  do projeto. O caminho já está referenciado em [eas.json:32](../eas.json#L32) e
  [eas.json:43](../eas.json#L43).
- [ ] Adicionar o arquivo ao `.gitignore` (não commitar).
- [ ] Validar com:
  ```bash
  npx eas-cli credentials --platform android
  ```

## 3. Credenciais — iOS

- [ ] Garantir acesso ao **Apple Developer Program** (time `TJXJQG6AL2`) com a conta
  `daniel_ap21@yahoo.com.br` configurada em [eas.json:36](../eas.json#L36). Se essa
  conta não for Account Holder ou Admin do time, trocar antes.
- [ ] Rodar `eas credentials --platform ios` — o EAS gera certificado de distribuição
  e provisioning profile automaticamente.
- [ ] (Recomendado) Gerar uma **App Store Connect API Key** em
  *App Store Connect → Users and Access → Keys* e cadastrar no EAS — evita 2FA em CI.
- [ ] Para push em produção: gerar **APNs Auth Key (.p8)** em
  *Apple Developer → Keys → +* e cadastrar via `eas credentials → Push Key`.

---

## 4. Build de produção

Antes do primeiro build, garantir que o working tree está limpo e commitado.

```bash
# Android (.aab para Play Store)
eas build --platform android --profile production

# iOS (.ipa)
eas build --platform ios --profile production

# Ambos em paralelo
eas build --platform all --profile production
```

O profile `production` já está configurado com `autoIncrement: true` e
`buildType: app-bundle` — não precisa mexer.

---

## 5. Submissão

> ⚠️ A **primeira submissão Android** precisa ser feita manualmente pela Play Console
> para criar a ficha do app com o package `br.com.agility.agilityapp`. Depois disso o
> `eas submit` assume.

```bash
# iOS — TestFlight + App Store
eas submit --platform ios --profile production

# Android — track production (rolling 100%)
eas submit --platform android --profile production
```

Para testes internos antes de produção, usar o profile `staging` (Android: track `internal`).

---

## 6. Variáveis e segredos

- [ ] Confirmar que `API_KEY` (lida em [app.config.ts:120](../app.config.ts#L120)) está
  configurada como **EAS Secret** para o profile de produção:
  ```bash
  eas secret:create --scope project --name API_KEY --value "<valor>"
  ```
- [ ] Confirmar que `APP_ENV=production` é injetado no build (`preview` já faz isso;
  validar se `production` também precisa).

---

## 7. Pós-build / pós-submit

- [ ] Subir o primeiro `.aab` manualmente na Play Console (ver seção 5).
- [ ] Habilitar **EAS Update** se for usar OTA:
  ```bash
  eas update:configure
  ```
- [ ] Documentar como rodar build/submit no README para o próximo dev.
- [ ] Configurar Sentry / Crashlytics (opcional, mas recomendado antes de produção).

---

## 8. Pontos de atenção específicos deste app

- **Background Geolocation**: licenças válidas até `2027-02-26`
  ([app.config.ts:32](../app.config.ts#L32) e [app.config.ts:105](../app.config.ts#L105)).
  Renovar antes desse prazo, senão builds futuros falham.
- **`ACCESS_BACKGROUND_LOCATION`** ([app.config.ts:47](../app.config.ts#L47)) **dispara
  review manual** no Google Play. Preparar vídeo demonstrando o uso (a equipe de loja
  precisa anexar — veja o outro relatório).
- **Permissão de notificação remota** (`UIBackgroundModes: remote-notification`) exige
  APNs Key configurada para funcionar em produção.
- **`ITSAppUsesNonExemptEncryption: false`** já está em
  [app.config.ts:25](../app.config.ts#L25) — evita formulário de exportação de
  criptografia na App Store. Manter assim a menos que adicione algum SDK com criptografia
  custom (TLS padrão não conta).

---

## Sequência condensada

```text
1. npx expo install --check && expo-doctor
2. Criar google-play-service-account.json
3. eas credentials (Android e iOS)
4. eas build --platform all --profile production
5. Upload manual do primeiro .aab na Play Console
6. eas submit --platform ios --profile production
7. eas submit --platform android --profile production (a partir do 2º envio)
```
