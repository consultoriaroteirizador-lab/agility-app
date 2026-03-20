/**
 * EnhancedError - Classe de erro personalizada com suporte a propriedades adicionais
 *
 * Usada para tratamento de erros tipado, substituindo o uso de `as any` em objetos Error.
 */
export class EnhancedError extends Error {
    constructor(
        message: string,
        public code?: string,
        public details?: unknown,
    ) {
        super(message);
        this.name = 'EnhancedError';
    }

    /**
     * Cria um EnhancedError a partir de um erro existente
     */
    static fromError(error: unknown, message?: string): EnhancedError {
        if (error instanceof EnhancedError) {
            return error;
        }

        const errorMessage = message || (error instanceof Error ? error.message : 'Unknown error');
        return new EnhancedError(errorMessage, undefined, error);
    }
}
