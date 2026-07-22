import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';

interface CdMarkerProps {
    /** Cor do CD (verde origem / vermelho destino), string dinâmica. */
    color: string;
    /** Rótulo no badge: 'O' (origem), 'D' (destino), etc. */
    label?: string | number;
    /** Tamanho do marcador em px (largura; altura = size*1.2). Default 40. */
    size?: number;
}

/**
 * Marcador de CD (Centro de Distribuição) — "casinha" desenhada em SVG, usada na
 * variante `cd` do mapa pra diferenciar pontos de cross-docking dos pinos
 * teardrop de parada (`StopMarker`).
 *
 * IMPORTANTE: precisa ser SVG (não `<Box>`+icon font). O `PointAnnotation` do
 * MapLibre rasteriza o filho num snapshot, e fontes de ícone (@expo/vector-icons)
 * saem VAZIAS nesse snapshot — por isso a casinha em Box+Icon não aparecia no
 * mapa (só nos cards, que são Views normais). SVG renderiza síncrono e aparece.
 * Âncora visual na base (badge), configurada no PointAnnotation (anchor y=1).
 */
export function CdMarker({ color, label, size = 40 }: CdMarkerProps) {
    const text = label != null ? String(label) : '';
    const hasText = text.trim() !== '';

    return (
        <Svg width={size} height={size * 1.2} viewBox="0 0 40 48">
            {/* chip arredondado colorido com borda branca */}
            <Rect x={3} y={2} width={34} height={34} rx={9} fill={color} stroke="white" strokeWidth={2} />
            {/* casinha branca: telhado + corpo + porta */}
            <Path d="M11 20 L20 12 L29 20 Z" fill="white" />
            <Rect x={14} y={20} width={12} height={9} fill="white" />
            <Rect x={18} y={23} width={4} height={6} fill={color} />
            {/* badge de rótulo (O/D) na base */}
            {hasText ? (
                <>
                    <Rect x={13} y={37} width={14} height={10} rx={5} fill={color} stroke="white" strokeWidth={1} />
                    <SvgText x={20} y={44.5} fontSize={8} textAnchor="middle" fill="white" fontWeight="bold">
                        {text}
                    </SvgText>
                </>
            ) : null}
        </Svg>
    );
}
