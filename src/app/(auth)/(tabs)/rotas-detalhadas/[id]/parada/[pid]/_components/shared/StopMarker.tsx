import Svg, { Path, Rect, Text as SvgText, Circle } from 'react-native-svg';

interface StopMarkerProps {
    /** Cor do pino (cor da rota, verde para origem, vermelho para fim). */
    color: string;
    /** Rótulo no badge: número da parada, "O" (origem), "F" (fim), etc. */
    label?: string | number;
    /** Tamanho do pino em pixels (largura = altura). Default 39 (igual ao platform). */
    size?: number;
}

/**
 * Pino de parada (teardrop com badge numerado) — porte fiel do marcador usado
 * no platform web (`getStopMarkerSVG` em `@/lib/map/leafletRoute`). Mantém o
 * mesmo desenho/proporções pra que app e plataforma exibam o MESMO dado igual.
 *
 * A âncora visual fica na ponta inferior do pino (cx=19, y=39 no viewBox 39x39).
 */
export function StopMarker({ color, label, size = 39 }: StopMarkerProps) {
    const text = label !== undefined && label !== null ? String(label) : '';
    const hasText = text.trim() !== '';
    // Fonte adaptativa: rótulos com 2+ caracteres (ex.: "O-F") encolhem p/ caber no badge.
    const fontSize = text.length >= 3 ? 6 : text.length === 2 ? 7.5 : 9;

    return (
        <Svg width={size} height={size} viewBox="0 0 39 39">
            <Path
                d="M15.8 0.5C17.45 0 19.2 -0.1 20.9 0.15C22.61 0.44 24.23 1.14 25.62 2.19C27.02 3.24 28.15 4.62 28.93 6.21C29.71 7.8 30.12 9.55 30.12 11.34C30.12 13.65 29.55 15.63 28.16 17.81L20.45 30.25C20.11 30.67 19.65 31 19.12 31C18.60 31 18.14 30.67 17.8 30.25L10.13 17.86C9.13 16.40 8.48 14.72 8.24 12.96C7.99 11.20 8.15 9.40 8.70 7.71C9.26 6.02 10.19 4.49 11.42 3.24C12.65 1.99 14.16 1.07 15.8 0.53Z"
                fill={color}
            />
            <Rect x={13} y={4} width={12} height={12} rx={6} fill="white" />
            {hasText && (
                <SvgText
                    x={19}
                    y={13}
                    fontSize={fontSize}
                    textAnchor="middle"
                    fill={color}
                    fontWeight="bold"
                >
                    {text}
                </SvgText>
            )}
            <Circle cx={19} cy={36} r={2.7} fill={color} />
        </Svg>
    );
}
