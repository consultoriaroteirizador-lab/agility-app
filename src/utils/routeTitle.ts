/**
 * Título da rota para o motorista: o nome; sem nome, "Rota <código>"; sem os dois, "Rota sem nome".
 * Nunca o id: o motorista não tem o que fazer com um UUID na tela.
 */
export function routeTitle(r: { name?: string | null; code?: string | null }): string {
    const name = r.name?.trim();
    if (name) return name;
    const code = r.code?.trim();
    return code ? `Rota ${code}` : 'Rota sem nome';
}
