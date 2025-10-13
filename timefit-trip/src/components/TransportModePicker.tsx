import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { TransportMode } from '../types';
import { TRANSPORT_MODES, DUOLINGO_COLORS } from '../constants';

interface Props {
  visible: boolean;
  selectedMode: TransportMode;
  onSelect: (mode: TransportMode) => void;
  onClose: () => void;
  destinationName?: string;
}

export const TransportModePicker: React.FC<Props> = ({
  visible,
  selectedMode,
  onSelect,
  onClose,
  destinationName,
}) => {
  const handleSelect = (mode: TransportMode) => {
    onSelect(mode);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>이동 수단 선택</Text>
            {destinationName && (
              <Text style={styles.subtitle}>→ {destinationName}</Text>
            )}
          </View>

          <View style={styles.optionsContainer}>
            {TRANSPORT_MODES.map((transport) => {
              const isSelected = transport.value === selectedMode;
              return (
                <TouchableOpacity
                  key={transport.value}
                  style={[
                    styles.option,
                    isSelected && styles.optionSelected,
                  ]}
                  onPress={() => handleSelect(transport.value)}
                >
                  <Text style={styles.optionIcon}>{transport.icon}</Text>
                  <Text
                    style={[
                      styles.optionLabel,
                      isSelected && styles.optionLabelSelected,
                    ]}
                  >
                    {transport.label}
                  </Text>
                  {isSelected && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: DUOLINGO_COLORS.gray,
  },
  optionsContainer: {
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: DUOLINGO_COLORS.lightGray,
    marginBottom: 8,
  },
  optionSelected: {
    backgroundColor: DUOLINGO_COLORS.green,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  optionLabelSelected: {
    color: '#fff',
  },
  checkmark: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
  },
  closeButton: {
    backgroundColor: DUOLINGO_COLORS.lightGray,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});

