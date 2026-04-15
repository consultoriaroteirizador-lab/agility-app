import React, { useState } from 'react';

import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { View } from 'react-native';

import { Box, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import {
    useGetDriverRatings,
    useGetDriverRatingStats,
} from '@/domain/agility/rating';
import type { DriverRating, RatingReason } from '@/domain/agility/rating';
import { useAuthCredentialsService } from '@/services';
import { measure } from '@/theme';

function StarDisplay({ score, size = 16 }: { score: number; size?: number }) {
    return (
        <Box flexDirection="row" alignItems="center">
            {[1, 2, 3, 4, 5].map(star => (
                <Ionicons
                    key={star}
                    name={star <= score ? 'star' : 'star-outline'}
                    size={size}
                    color={star <= score ? '#F5A623' : '#CCCCCC'}
                />
            ))}
        </Box>
    );
}

function ProgressBar({
    value,
    max,
    fillColor = '#F5A623',
}: {
    value: number;
    max: number;
    fillColor?: string;
}) {
    const percentage = max > 0 ? (value / max) * 100 : 0;

    return (
        <Box
            flex={1}
            height={measure.y8}
            backgroundColor="gray100"
            borderRadius="s4"
            overflow="hidden">
            <View
                style={{
                    width: `${percentage}%`,
                    height: '100%',
                    backgroundColor: fillColor,
                    borderRadius: 4,
                }}
            />
        </Box>
    );
}

function getReasonLabel(reason: RatingReason): string {
    const map: Record<RatingReason, string> = {
        PUNCTUALITY: 'Pontualidade',
        KINDNESS: 'Simpatia',
        VEHICLE_CONDITION: 'Veículo',
        ROUTE_KNOWLEDGE: 'Rota',
        COMMUNICATION: 'Comunicação',
        SAFETY: 'Segurança',
        GENERAL: 'Geral',
        COMPLAINT: 'Reclamação',
    };
    return map[reason] ?? reason;
}

function getReasonColor(reason: RatingReason): string {
    if (reason === 'COMPLAINT') return 'redError';
    if (reason === 'PUNCTUALITY' || reason === 'KINDNESS' || reason === 'SAFETY')
        return 'colorTextSuccess';
    return 'primary100';
}

function RatingCard({ rating }: { rating: DriverRating }) {
    return (
        <Box
            backgroundColor="white"
            borderRadius="s16"
            padding="m12"
            marginBottom="y10"
            borderWidth={measure.m1}
            borderColor="borderColor">
            <Box
                flexDirection="row"
                justifyContent="space-between"
                alignItems="center"
                marginBottom="y6">
                <StarDisplay score={rating.score} />
                <Text preset="text12" color="secondaryTextColor">
                    {rating.createdAt
                        ? format(new Date(rating.createdAt), 'dd/MM/yyyy')
                        : ''}
                </Text>
            </Box>

            {rating.reason && (
                <Box marginBottom="y6">
                    <Box
                        backgroundColor={getReasonColor(rating.reason) as any}
                        borderRadius="s8"
                        paddingVertical="y2"
                        paddingHorizontal="x8"
                        alignSelf="flex-start">
                        <Text preset="text10" color="white" fontWeight="bold">
                            {getReasonLabel(rating.reason)}
                        </Text>
                    </Box>
                </Box>
            )}

            {rating.customerName && (
                <Text
                    preset="text12"
                    color="secondaryTextColor"
                    marginBottom="y4">
                    {rating.customerName}
                </Text>
            )}

            {rating.comment && (
                <Text preset="text14" color="colorTextPrimary">
                    "{rating.comment}"
                </Text>
            )}
        </Box>
    );
}

export default function AvaliacoesScreen() {
    const { userAuth } = useAuthCredentialsService();
    const driverId = userAuth?.driverId || '';
    const [page, setPage] = useState(1);
    const limit = 10;

    const { stats, isLoading: statsLoading } =
        useGetDriverRatingStats(driverId);
    const { ratings, meta, isLoading: ratingsLoading } =
        useGetDriverRatings(driverId, page, limit);

    const isLoading = statsLoading || ratingsLoading;

    const averageScore = stats?.averageScore ?? 0;
    const totalRatings = stats?.totalRatings ?? 0;
    const distribution = stats?.distribution;

    const hasMorePages = meta ? page < meta.totalPages : false;

    return (
        <ScreenBase
            buttonLeft={<ButtonBack />}
            title={<Text preset="textTitleScreen">Minhas Avaliações</Text>}>
            {/* Score Card */}
            <Box
                backgroundColor="white"
                borderRadius="s20"
                padding="m16"
                marginBottom="b12"
                alignItems="center">
                <Box
                    flexDirection="row"
                    alignItems="center"
                    marginBottom="y8">
                    <Ionicons name="star" size={36} color="#F5A623" />
                    <Text
                        preset="text32"
                        color="colorTextPrimary"
                        fontWeight="bold"
                        marginLeft="x8">
                        {averageScore.toFixed(1)}
                    </Text>
                    <Text
                        preset="text16"
                        color="secondaryTextColor"
                        marginLeft="x4">
                        / 5.0
                    </Text>
                </Box>

                <Text preset="text14" color="secondaryTextColor">
                    {totalRatings}{' '}
                    {totalRatings === 1 ? 'avaliação' : 'avaliações'}
                </Text>
            </Box>

            {/* Score Distribution */}
            {distribution && (
                <Box
                    backgroundColor="white"
                    borderRadius="s20"
                    padding="m16"
                    marginBottom="b12">
                    <Text
                        preset="text16"
                        color="colorTextPrimary"
                        fontWeight="bold"
                        marginBottom="y12">
                        Distribuição
                    </Text>

                    {[
                        { label: '5 estrelas', value: distribution.star5 },
                        { label: '4 estrelas', value: distribution.star4 },
                        { label: '3 estrelas', value: distribution.star3 },
                        { label: '2 estrelas', value: distribution.star2 },
                        { label: '1 estrela', value: distribution.star1 },
                    ].map(item => (
                        <Box
                            key={item.label}
                            flexDirection="row"
                            alignItems="center"
                            marginBottom="y8">
                            <Box width={measure.x80}>
                                <Text
                                    preset="text12"
                                    color="secondaryTextColor">
                                    {item.label}
                                </Text>
                            </Box>
                            <Box flex={1} marginHorizontal="x8">
                                <ProgressBar
                                    value={item.value}
                                    max={totalRatings}
                                />
                            </Box>
                            <Box width={measure.x32} alignItems="flex-end">
                                <Text preset="text12" color="colorTextPrimary">
                                    {item.value}
                                </Text>
                            </Box>
                        </Box>
                    ))}
                </Box>
            )}

            {/* Recent Ratings */}
            <Box>
                <Text
                    preset="text16"
                    color="colorTextPrimary"
                    fontWeight="bold"
                    marginBottom="y12">
                    Avaliações Recentes
                </Text>

                {isLoading ? (
                    <Box padding="y32" alignItems="center">
                        <Text preset="text14" color="secondaryTextColor">
                            Carregando avaliações...
                        </Text>
                    </Box>
                ) : ratings.length === 0 ? (
                    <Box padding="y32" alignItems="center">
                        <Text preset="text14" color="secondaryTextColor">
                            Nenhuma avaliação encontrada
                        </Text>
                    </Box>
                ) : (
                    ratings.map(rating => (
                        <RatingCard key={rating.id} rating={rating} />
                    ))
                )}

                {/* Load More */}
                {hasMorePages && (
                    <TouchableOpacityBox
                        backgroundColor="primary100"
                        borderRadius="s12"
                        paddingVertical="y12"
                        alignItems="center"
                        marginTop="y8"
                        marginBottom="y16"
                        onPress={() => setPage(prev => prev + 1)}>
                        <Text preset="text14" color="white" fontWeight="bold">
                            Carregar mais
                        </Text>
                    </TouchableOpacityBox>
                )}
            </Box>

            <Box height={measure.y20} />
        </ScreenBase>
    );
}
