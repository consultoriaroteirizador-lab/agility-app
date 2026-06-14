# Checklist de Publicação — Equipe das Lojas (Google Play + App Store)

Responsável: pessoas que cuidam das contas Google Play Console e App Store Connect.
Nome do app: **Agility App**
Identificadores: `br.com.agility.agilityapp` (Android e iOS)

> Tudo nesta lista é feito **fora do projeto de código**, pelo painel web das lojas.
> O dev entrega o `.aab` e o `.ipa`; vocês cuidam de ficha, mídias, classificação
> e revisão. Combinar com o dev quando os primeiros binários estarão prontos.

---

## 1. Contas e acessos (fazer antes de tudo)

### Google Play
- [ ] Conta na **Google Play Console** ativa (taxa única de US$ 25 já paga).
- [ ] Criar a **conta de desenvolvedor da organização** (não pessoal), se ainda não existir.
- [ ] Verificação de identidade da organização concluída (Google pede documento e
  endereço — pode levar dias).
- [ ] Liberar acesso ao dev para a conta de serviço Google Cloud que vai automatizar
  os envios (o dev fornece o e-mail da service account; vocês adicionam como
  *Users → Invite new users → Release manager*).

### App Store Connect
- [ ] Conta no **Apple Developer Program** ativa (US$ 99/ano).
- [ ] Time Apple: `TJXJQG6AL2` (já configurado no projeto).
- [ ] Conta `daniel_ap21@yahoo.com.br` precisa estar como **Admin** ou
  **Account Holder** do time.
- [ ] Criar o app em *App Store Connect → My Apps → +* com o bundle
  `br.com.agility.agilityapp` e o ID `6766254061` (esse ID já está em uso pelo projeto,
  confirmar se a ficha existe).

---

## 2. Materiais que precisam ser produzidos (design / marketing)

Estes são pedidos pelas lojas e não saem do código — alguém precisa criar:

### Ícones e gráficos
| Item | Onde usa | Tamanho |
|---|---|---|
| Ícone do app (alta resolução) | Play Store | **512×512 PNG** |
| Feature graphic | Play Store (banner do topo) | **1024×500 PNG/JPG** |
| Ícone do app | App Store | **1024×1024 PNG sem transparência** |

### Screenshots
- [ ] **Android**: mínimo 2, máximo 8 — telefones (1080×1920 ou maior).
  Recomendado também 7" e 10" tablet se houver UI de tablet (este app é `supportsTablet: false`,
  então só telefone basta).
- [ ] **iOS** (obrigatórios):
  - **6.7"** (iPhone 15 Pro Max) — 1290×2796
  - **6.5"** (iPhone 11 Pro Max) — 1242×2688
  - Mínimo 3 por tamanho, recomendado 5–8.
- [ ] (Opcional) Vídeo de preview da loja — 15 a 30s.

### Textos
- [ ] **Nome curto** (até 30 caracteres) — Play e App Store.
- [ ] **Descrição curta** Play Store (até 80 caracteres).
- [ ] **Descrição completa** Play Store (até 4000 caracteres).
- [ ] **Subtítulo** App Store (até 30 caracteres).
- [ ] **Descrição** App Store (até 4000 caracteres).
- [ ] **Palavras-chave** App Store (até 100 caracteres, separadas por vírgula).
- [ ] **Novidades desta versão** (changelog da v1.0.0).
- [ ] **Idioma principal**: Português (Brasil).

---

## 3. URLs e documentos legais (precisam estar publicados na internet)

- [ ] **Política de Privacidade** — URL pública e acessível. **Obrigatória** nas duas lojas.
  - Precisa descrever: coleta de localização (inclusive em background), uso de
    biometria (Face ID / impressão digital), notificações, dados enviados para servidores
    da Agility.
- [ ] **Termos de uso** — recomendado, opcional.
- [ ] **URL de suporte** (e-mail ou página de contato).
- [ ] **URL de marketing** (opcional, geralmente o site da empresa).

---

## 4. Classificação e categorização

### Google Play
- [ ] Categoria do app (sugestão: *Maps & Navigation* ou *Business*).
- [ ] **Questionário de classificação etária** (IARC) — preencher na Console.
- [ ] **Public target audience**: definir faixa etária (provavelmente 18+ por ser
  app de motorista profissional).
- [ ] **Data Safety form** (obrigatório) — declarar:
  - Coleta de localização precisa ✅
  - Coleta em background ✅
  - Coleta de informações do dispositivo
  - Se há criptografia em trânsito (sim, HTTPS)
  - Política de retenção de dados
- [ ] **News app declaration**: Não.
- [ ] **Government app declaration**: Não.
- [ ] **COVID-19 app declaration**: Não.
- [ ] **Anúncios**: declarar se o app exibe anúncios (provavelmente Não).

### App Store
- [ ] Categoria primária (sugestão: *Business* ou *Navigation*).
- [ ] Categoria secundária (opcional).
- [ ] **Age rating** (questionário Apple — equivalente ao IARC).
- [ ] **App Privacy** — preencher os "data types" coletados (igual ao Data Safety da Google).

---

## 5. ⚠️ Atenção especial: permissão de localização em background

Este app usa `ACCESS_BACKGROUND_LOCATION` (Android) e `UIBackgroundModes: location` (iOS).
**Ambas as lojas exigem justificativa adicional.**

### Google Play
- [ ] **Background Location Permission Declaration** — formulário obrigatório dentro da
  Play Console. É preciso enviar:
  - **Vídeo** demonstrando como a localização em background é usada no app
    (gravar a tela mostrando uma rota de entrega rodando com o app fechado).
  - Explicação textual: *"O app rastreia a posição do motorista durante a execução
    de rotas de entrega para registrar evidências de parada e otimizar trajetos.
    O uso em background é essencial porque o motorista mantém o app em segundo plano
    enquanto dirige."*
  - Confirmar que a permissão é **essencial para o uso principal** do app.
- ⏱️ Esse review é **manual** e pode levar 7+ dias. Planejar.

### App Store
- [ ] No campo **Review Notes** da submissão, explicar o mesmo: por que `Always` location
  é necessário, e citar que o app é para motoristas profissionais executando rotas.
- [ ] Garantir que as strings de uso da localização em português (já estão configuradas
  pelo dev) sejam **claras** para o revisor da Apple.

---

## 6. Preço e disponibilidade

- [ ] Definir se o app é **gratuito** ou pago (recomendado: gratuito, já que é de uso
  interno / B2B).
- [ ] Países disponíveis: provavelmente **só Brasil** inicialmente.
- [ ] App Store: definir se aparece em **Family Sharing** (Não, app profissional).
- [ ] Play Store: confirmar **distribuição** apenas no Brasil se for o caso.

---

## 7. Faixas de teste antes de produção (recomendado)

### Google Play
- [ ] **Internal testing**: até 100 testadores por e-mail. Usar isso para validar o
  primeiro `.aab` antes de mandar para produção.
- [ ] **Closed testing**: lista maior, grupos de testadores.
- [ ] **Open testing**: público, opcional.

### App Store
- [ ] **TestFlight Internal**: até 100 testadores (membros do time Apple Developer).
- [ ] **TestFlight External**: até 10.000 testadores, passa por mini-review da Apple
  (~24h).

---

## 8. Submissão para produção

Quando o dev entregar o `.aab` (Android) e o `.ipa` (iOS), ou quando esses arquivos
chegarem automaticamente pelo `eas submit`:

### Google Play
- [ ] Subir o primeiro `.aab` manualmente em *Production → Create new release*
  (a partir da segunda versão o `eas submit` faz isso automaticamente).
- [ ] Preencher *Release notes* (changelog).
- [ ] **Roll-out**: começar com 10–20% e ir aumentando, ou ir direto a 100%.
- [ ] Submeter para review (Google demora de horas a 7 dias, mais tempo se a
  localização em background for analisada).

### App Store
- [ ] Confirmar que o build aparece em *App Store Connect → TestFlight* (chega
  automaticamente após o `eas submit`).
- [ ] Em *App Store → versão 1.0.0*, selecionar esse build.
- [ ] Preencher *What's New*, screenshots, descrição, palavras-chave.
- [ ] Em *App Review Information*: dar **usuário e senha de teste** para o revisor
  Apple poder logar no app (isso é obrigatório quando o app tem login).
- [ ] Em *Export Compliance*: marcar "uses standard encryption" — já está pré-configurado
  no app (`ITSAppUsesNonExemptEncryption: false`).
- [ ] Submeter para review (Apple costuma responder em 24–48h).

---

## Resumo de prazos esperados

| Etapa | Prazo típico |
|---|---|
| Verificação da conta Google Play (organização) | 3–14 dias |
| Apple Developer Program (após pagamento) | imediato a 48h |
| Review Google Play (primeira submissão) | 7+ dias (background location) |
| Review App Store | 24–48h |
| Review TestFlight externo | ~24h |

**Plano realista**: contar pelo menos **2 semanas** entre "binário pronto" e
"app disponível na loja" na primeira vez, principalmente por causa do review
de background location no Google Play.

---

## O que vocês NÃO precisam fazer (é do dev)

- Gerar os arquivos `.aab` / `.ipa` (vem do EAS).
- Configurar certificados e provisioning profiles (EAS faz automaticamente).
- Incrementar versão / build number (já é automático).
- Gerar a service account do Google Cloud (dev gera; vocês só dão permissão dela na Play
  Console).
