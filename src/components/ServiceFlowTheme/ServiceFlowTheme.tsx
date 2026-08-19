import { ReactNode } from 'react';

import { ThemeProvider } from '@shopify/restyle';

import { ServiceType } from '@/domain/agility/service/dto/types';
import { serviceTheme, theme } from '@/theme';

interface ServiceFlowThemeProps {
    /** Telas de UMA nota: `service.serviceType`. Indefinido enquanto o fetch não volta. */
    serviceType?: ServiceType | string | null;
    /**
     * Telas de ROTA, onde não existe uma nota só: resultado de
     * `isFieldServiceRoute(routing)`. É a mesma pergunta que decide a etiqueta
     * "Serviço" na lista de rotas.
     */
    isFieldService?: boolean;
    children: ReactNode;
}

/**
 * Pinta de laranja as ações das telas de uma nota de SERVIÇO.
 *
 * O fluxo de serviço reusa os mesmos componentes do fluxo de entrega
 * (`SharedEtapaDados`, `SharedEtapaFinalizacao`, `Button`...), então não dá para
 * fixar a cor no componente. Aqui a troca é no TEMA: dentro deste provider a
 * rampa `primary*` inteira aponta para a `secondary*` (ver `serviceTheme`), e
 * botões, etiquetas, seleção de rádio e ícones seguem junto sem saber de nada.
 *
 * Enquanto a nota/rota ainda não chegou (ou não é de serviço), o tema devolvido
 * é o padrão, ou seja: nada muda para os outros fluxos.
 */
export function ServiceFlowTheme({ serviceType, isFieldService, children }: ServiceFlowThemeProps) {
    const isService = isFieldService === true || serviceType === ServiceType.SERVICE;

    return (
        <ThemeProvider theme={isService ? serviceTheme : theme}>{children}</ThemeProvider>
    );
}
