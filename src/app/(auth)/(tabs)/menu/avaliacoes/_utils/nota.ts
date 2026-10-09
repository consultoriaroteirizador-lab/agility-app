/** Média das avaliações como a motorista lê: uma casa, com vírgula ("4,3"). */
export function notaMedia(media: number): string {
    return media.toFixed(1).replace('.', ',');
}
