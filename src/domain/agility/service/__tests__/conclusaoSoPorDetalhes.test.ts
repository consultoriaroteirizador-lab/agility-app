/**
 * Pedido com cobrança só conclui por `POST /services/:id/completion-details` (F3, back:
 * `SERVICE_REQUIRES_PAYMENT_DETAILS`). `PATCH /services/:id/complete` e `PUT /services/:id/status`
 * recusam esse pedido e não levam valor nem forma de pagamento. O app não guarda nenhum caminho
 * para eles — nem em tela órfã, nem em hook sem consumidor (R8).
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../../../..');
const PROIBIDOS = [/\/services\/\$\{[^}]+\}\/complete[`'"]/, /\/services\/\$\{[^}]+\}\/status[`'"]/];

function arquivosFonte(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
        const caminho = path.join(dir, entrada.name);
        if (entrada.isDirectory()) return entrada.name === '__tests__' || entrada.name === 'node_modules' ? [] : arquivosFonte(caminho);
        return /\.tsx?$/.test(entrada.name) && !/\.test\.tsx?$/.test(entrada.name) ? [caminho] : [];
    });
}

it('nenhum código do app chama PATCH /services/:id/complete nem PUT /services/:id/status', () => {
    const achados = arquivosFonte(SRC).flatMap((arquivo) => {
        const texto = fs.readFileSync(arquivo, 'utf8');
        return PROIBIDOS.filter((re) => re.test(texto)).map((re) => `${path.relative(SRC, arquivo)} ~ ${re}`);
    });
    expect(achados).toEqual([]);
});

it('o caminho com cobrança continua existindo', () => {
    const api = fs.readFileSync(path.join(SRC, 'domain/agility/service/serviceAPI.ts'), 'utf8');
    expect(api).toMatch(/\/services\/\$\{id\}\/completion-details/);
});
