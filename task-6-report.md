# Task 6: Opções e títulos no app — Relatório (Corrigido)

## Status
DONE

## Commit
`bc4e51b` — feat(app): opcoes de relacao vindas da empresa, com titulo por fluxo

## Testes
- Jest: `396 passed` (baseline 388 + 8 testes novos de recipientRelations)
- TypeScript: `2 erros pré-existentes` em `src/app/(auth)/(tabs)/menu/suporte/[id].tsx` (conforme esperado, nenhum novo)

## Implantação
- `src/domain/agility/company/recipientRelations.ts`:
  - Códigos em português (copiados literalmente do backend)
  - Clone profundo: `lista.map((r) => ({ ...r }))`
  - Lógica de fallback: ausente/null → clone do default; array presente → sanitizado (mesmo que vazio)
  - Dois testes novos: mutação de objeto e array todo malformado
- `src/domain/agility/company/__tests__/recipientRelations.test.ts` — 8 testes
- `src/domain/agility/driver/dto/response/driver-me.response.ts` — `recipientRelations?` em `companyFeatures`
- `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/companyRules.ts` — resolução via `resolveRecipientRelations()`

## Códigos (confirmação)

| Fluxo | Códigos |
|---|---|
| **delivery** | `CLIENTE`, `PORTEIRO`, `VIZINHO`, `FAMILIAR`, `OUTRO` |
| **pickup** | `CLIENTE`, `ESTOQUISTA`, `PORTARIA`, `OUTRO` |
| **service** | `CLIENTE`, `RESP_LOCAL`, `ENCARREGADO`, `NINGUEM`, `OUTRO` |

## Preocupações
Nenhuma.
