/**
 * Fase 3C do épico itens do pedido (C6): fora de `serviceLines.ts`, nenhum código do app lê
 * `materials` de uma resposta. O tipo já impede a leitura direta (`ServiceResponse` não tem o
 * campo); esta varredura pega o que escaparia por `any` e impede a resposta de voltar a declarar
 * `materials` ou `items`. Os tipos de request (`dto/request/`) ficam de fora: são escrita (os requests de
 * escrita de serviço saíram, e nenhum tipo de `dto/request` declara `materials`).
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../../../..');
const PERMITIDOS = [
    path.join('domain', 'agility', 'service', 'serviceLines.ts'),
    path.join('domain', 'agility', 'service', 'dto', 'request') + path.sep,
];
const LEITURAS = [/\.materials\b/, /\[\s*['"`]materials['"`]\s*\]/];

function arquivosFonte(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
        const caminho = path.join(dir, entrada.name);
        if (entrada.isDirectory()) return entrada.name === '__tests__' || entrada.name === 'node_modules' ? [] : arquivosFonte(caminho);
        return /\.tsx?$/.test(entrada.name) && !/\.test\.tsx?$/.test(entrada.name) ? [caminho] : [];
    });
}

function leiturasDeMaterials(texto: string): string[] {
    return texto.split(/\r?\n/).filter((linha) => LEITURAS.some((re) => re.test(linha)));
}

it('o detector pega a leitura plantada e não confunde o estado interno', () => {
    expect(leiturasDeMaterials('const x = service.materials ?? []')).toHaveLength(1);
    expect(leiturasDeMaterials('const y = (s as any)?.materials')).toHaveLength(1);
    expect(leiturasDeMaterials("const z = (s as any)['materials']")).toHaveLength(1);
    expect(leiturasDeMaterials('const a = linesState.lines; const b = parada.materiaisEntrega; const c = x.materialsState')).toEqual([]);
});

it('fora de serviceLines.ts e dos tipos de request, ninguém lê materials', () => {
    const achados = arquivosFonte(SRC)
        .filter((arquivo) => !PERMITIDOS.some((permitido) => path.relative(SRC, arquivo).startsWith(permitido)))
        .flatMap((arquivo) =>
            leiturasDeMaterials(fs.readFileSync(arquivo, 'utf8')).map((linha) => `${path.relative(SRC, arquivo)}: ${linha.trim()}`),
        );
    expect(achados).toEqual([]);
});

it('a resposta do serviço não declara materials nem items (eles moram só em serviceLines.ts)', () => {
    const resposta = fs.readFileSync(path.join(SRC, 'domain/agility/service/dto/response/service.response.ts'), 'utf8');
    expect(resposta).not.toMatch(/^\s*(materials|items)\??\s*:/m);
});

const PASTA_REQUEST = path.join(SRC, 'domain/agility/service/dto/request');
const ARQUIVOS_REQUEST = fs.readdirSync(PASTA_REQUEST).filter((nome) => nome.endsWith('.ts'));

it('a pasta dto/request não está vazia (sem isso a negativa abaixo passaria calada)', () => {
    expect(ARQUIVOS_REQUEST.length).toBeGreaterThan(1);
});

it.each(ARQUIVOS_REQUEST)(
    'o pedido %s não declara materials (fase 4: o app não escreve linhas)',
    (arquivo) => {
        const pedido = fs.readFileSync(path.join(PASTA_REQUEST, arquivo), 'utf8');
        expect(pedido).not.toMatch(/^\s*materials\??\s*:/m);
    },
);
