# lab-app (app do motorista Agility)

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## graphify: o que o rebuild automatico NAO preserva

Os hooks de `post-commit`/`post-checkout` (instalados localmente via `graphify hook install`,
nao versionados) mantem a estrutura do grafo em dia, mas o rebuild e AST-only. Duas coisas
regridem e nao devem ser lidas como estado real do codigo:

- **Nomes de comunidade.** Quando o clustering muda, o graphify renomeia toda comunidade pelo
  no central: nomes como `Box` ou `src/components/index.ts` sao automaticos, nao curados.
  A primeira construcao (29/07/2026) tinha nomes escritos a mao ("Restyle UI Primitives",
  "Coleta (Pickup) Flow"); backup em `graphify-out/<data>/`. `graphify label` regenera com LLM.
- **Arestas de import via barrel file.** O extrator AST aponta `src/components/index.ts` -> `Box`
  para um id que nao existe (a definicao real mora em outro arquivo), e o build descarta essas
  arestas. Custa ~570 arestas (9085 -> 8514 na medicao de 29/07/2026). Um contador de arestas
  menor depois de um rebuild nao significa que o codigo perdeu acoplamento.

Para o grafo completo (docs, imagens, especificacoes + resolucao dos barrels), rode `/graphify`
no Claude Code em vez de confiar so no rebuild do hook.
