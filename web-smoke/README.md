# App no navegador (smoke)

Roda o app do motorista no navegador, contra a API que `src/config/urls.ts` aponta (hoje o dev). Serve para conferir telas e fluxos sem aparelho, por exemplo com o Playwright. Não é um produto web: o build da loja não muda.

```bash
npm run web:smoke            # http://localhost:8095
npm run web:smoke -- --clear # limpa o cache do Metro
PORT=8096 npm run web:smoke  # outra porta
```

Só com `EXPO_WEB_SMOKE=1`, que o script já define, acontecem três coisas:

- **Módulos nativos viram substitutos** (`web-smoke/stubs/`), só na plataforma web:
  - os mapas (`react-native-maps`, `expo-maps`, `@maplibre/maplibre-react-native`) renderizam nada;
  - a geolocalização em segundo plano resolve vazio;
  - o `expo-secure-store` guarda no `localStorage`, com o prefixo `web-smoke:`.
- **O envio de foto funciona.** O app monta o arquivo no formato do React Native (`{ uri, name, type }`), que o navegador manda vazio. O ajuste em `formdata-polyfill.js` converte a uri num `Blob`.
- **O `web.output` vira `single`.** O `static` renderiza no servidor e quebra no import dos módulos nativos.

## Worktree

Em worktree com `node_modules` em junção para o checkout principal, o `web-smoke/metro.js` também acrescenta o `node_modules` real às `watchFolders` e põe a raiz do servidor do Metro na raiz do drive. Sem isso, o bundle de entrada fica fora do projeto e não carrega.

A junção precisa apontar para `C:\...`, com a letra do drive maiúscula. Com `c:\...`, o Metro monta `C:\c:\...` e falha. O script avisa e mostra o comando que corrige.

## Login

A tela pede o código da empresa (o slug, por exemplo `transportadora-express`), o e-mail ou CPF e a senha de um motorista do dev.

## O que não dá para testar aqui

- Mapa, GPS em segundo plano, câmera e notificação push. O aviso que chega pelo socket aparece.
- O gesto de puxar para atualizar.
- O modo avião. Dá para simular a resposta perdida com `page.route` do Playwright: deixar o pedido chegar ao servidor e cortar a resposta.

Erros de console esperados:
- `/mobile-version/check` bloqueado por CORS: o dev não libera esse endpoint para `localhost`, e o resto da API passa.

## Cache do Metro

Num worktree com junção, o cache do Metro fica em `.expo/web-smoke-metro-cache`, um por worktree. O cache padrão é do `node_modules` compartilhado e guarda a raiz de rotas de quem compilou antes: o app abria em "Welcome to Expo", sem nenhuma tela.
