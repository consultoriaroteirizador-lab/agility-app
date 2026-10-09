const soDigitos = (valor: string) => valor.replace(/\D/g, '');
// Com "+" e outro código de país: os dígitos sozinhos não distinguem de um celular daqui.
const estrangeiro = (valor: string) => valor.trim().startsWith('+') && !valor.trim().startsWith('+55');

/** Tira o código do Brasil de um número com DDD (12 ou 13 dígitos começando com 55). */
function semCodigoDoPais(digitos: string): string {
    return (digitos.length === 12 || digitos.length === 13) && digitos.startsWith('55') ? digitos.slice(2) : digitos;
}

function mascaraLocal(digitos: string): string | null {
    if (digitos.length === 11) return digitos.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    if (digitos.length === 10) return digitos.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    return null;
}

/**
 * Telefone como aparece no campo do perfil: "(12) 98811-9699". O back guarda "+5512988119699";
 * formato que não for brasileiro com DDD aparece como veio.
 */
export function telefoneParaExibir(raw: string | null | undefined): string {
    if (!raw) return '';
    if (estrangeiro(raw)) return raw;
    return mascaraLocal(semCodigoDoPais(soDigitos(raw))) ?? raw;
}

/**
 * Telefone a enviar ao salvar. O campo mostra sem o 55, então o número brasileiro volta com
 * "+55" (o formato que o back documenta). Outro formato manda os dígitos, como o app já fazia.
 */
export function telefoneParaSalvar(exibido: string): string | undefined {
    const digitos = soDigitos(exibido);
    if (!digitos) return undefined;
    if (estrangeiro(exibido)) return digitos;
    if (digitos.length === 10 || digitos.length === 11) return `+55${digitos}`;
    if (semCodigoDoPais(digitos) !== digitos) return `+${digitos}`;
    return digitos;
}

/** CPF com máscara; outro tamanho aparece como veio. */
export function cpfParaExibir(raw: string | null | undefined): string {
    if (!raw) return '';
    const digitos = soDigitos(raw);
    return digitos.length === 11 ? digitos.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : raw;
}
