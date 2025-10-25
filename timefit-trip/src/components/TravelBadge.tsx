import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TransportMode } from '../types';
import { formatMinutes } from '../utils/timeCalculator';
import { DUOLINGO_COLORS, TRANSPORT_MODES } from '../constants';

interface Props {
  transportMode: TransportMode;
  travelTime: number;
  travelDistance?: number;
  onPress?: () => void;
  editable?: boolean;
}

export const TravelBadge: React.FC<Props> = ({
  transportMode,
  travelTime,
  travelDistance,
  onPress,
  editable = true,
}) => {
  const { t } = useTranslation();
  const transport = TRANSPORT_MODES.find(t => t.value === transportMode);
  const transportIcon = transport?.icon || '🚗';
  const transportLabel = transport?.label || '자동차';

  const content = (
    <View style={styles.container}>
      <View style={styles.line} />
      <View style={styles.badge}>
        <Text style={styles.icon}>{transportIcon}</Text>
        <Text style={styles.label}>{transportLabel}</Text>
        <Text style={styles.time}>{formatMinutes(travelTime, { hours: t('hours'), minutes: t('minutes') })}</Text>
        {travelDistance && (
          <>
            <Text style={styles.separator}>·</Text>
            <Text style={styles.distance}>
              {(travelDistance / 1000).toFixed(1)}km
            </Text>
          </>
        )}
      </View>
      <View style={styles.line} />
    </View>
  );

  if (editable && onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    marginHorizontal: 16,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: DUOLINGO_COLORS.lightGray,
    opacity: 0.5,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 8,
    opacity: 0.95,
  },
  icon: {
    fontSize: 16,
    marginRight: 6,
  },
  label: {
    fontSize: 11,
    color: DUOLINGO_COLORS.gray,
    fontWeight: '500',
    marginRight: 6,
  },
  time: {
    fontSize: 12,
    fontWeight: '700',
    color: DUOLINGO_COLORS.red,
  },
  separator: {
    fontSize: 11,
    color: DUOLINGO_COLORS.gray,
    marginHorizontal: 3,
  },
  distance: {
    fontSize: 11,
    color: DUOLINGO_COLORS.gray,
    fontWeight: '500',
  },
  editIcon: {
    fontSize: 12,
    marginLeft: 6,
  },
});

