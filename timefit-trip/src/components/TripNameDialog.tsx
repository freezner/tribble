import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { DUOLINGO_COLORS } from '../constants';

interface Props {
  visible: boolean;
  initialName?: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}

export const TripNameDialog: React.FC<Props> = ({
  visible,
  initialName = '',
  onSave,
  onCancel,
}) => {
  const [tripName, setTripName] = useState(initialName);

  const handleSave = () => {
    if (tripName.trim()) {
      onSave(tripName.trim());
      setTripName('');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>여정 이름</Text>
          <Text style={styles.subtitle}>이 여정의 이름을 입력하세요</Text>

          <TextInput
            style={styles.input}
            placeholder="예: 서울 당일치기 여행"
            value={tripName}
            onChangeText={setTripName}
            autoFocus
            onSubmitEditing={handleSave}
            returnKeyType="done"
          />

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                !tripName.trim() && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!tripName.trim()}
            >
              <Text style={styles.saveButtonText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: DUOLINGO_COLORS.gray,
    marginBottom: 20,
  },
  input: {
    borderWidth: 2,
    borderColor: DUOLINGO_COLORS.lightGray,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#F8F9FA',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: DUOLINGO_COLORS.lightGray,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    backgroundColor: DUOLINGO_COLORS.green,
  },
  saveButtonDisabled: {
    backgroundColor: DUOLINGO_COLORS.gray,
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

