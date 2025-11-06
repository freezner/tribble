import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PlaceWithDuration } from '../types';
import { DUOLINGO_COLORS } from '../constants';
import { MaterialIcons } from '@expo/vector-icons';

interface Props {
  place: PlaceWithDuration;
  index: number;
  onRemove: () => void;
  onEdit: () => void;
  onUpdateName?: (newName: string) => void;
}

export const PlaceCard: React.FC<Props> = ({
  place,
  index,
  onRemove,
  onEdit,
  onUpdateName,
}) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(place.name);

  const handleEditPress = () => {
    if (onUpdateName) {
      setIsEditing(true);
    } else {
      onEdit();
    }
  };

  const handleSave = () => {
    if (editedName.trim() === '') {
      Alert.alert(t('error'), t('placeNameRequired'));
      return;
    }
    
    if (onUpdateName) {
      onUpdateName(editedName.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedName(place.name);
    setIsEditing(false);
  };

  const handleRemove = () => {
    Alert.alert(
      t('placeDelete'),
      t('placeDeleteConfirm', { placeName: place.name }),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: onRemove,
        },
      ]
    );
  };

  const content = (
    <View style={styles.container}>
      {/* 순서 번호 */}
      <View style={styles.indexBadge}>
        <Text style={styles.indexText}>{index + 1}</Text>
      </View>

      {/* 장소 정보 */}
      <View style={styles.contentContainer}>
        {isEditing ? (
          <TextInput
            style={styles.editInput}
            value={editedName}
            onChangeText={setEditedName}
            placeholder="장소 이름을 입력하세요"
            autoFocus
            maxLength={50}
          />
        ) : (
          <Text style={styles.placeName} numberOfLines={1}>
            {place.name}
          </Text>
        )}
        <Text style={styles.placeAddress} numberOfLines={1}>
          {place.address}
        </Text>
      </View>

      {/* 편집 모드 버튼들 */}
      {isEditing ? (
        <>
          {/* 저장 버튼 */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>✓</Text>
          </TouchableOpacity>
          {/* 취소 버튼 */}
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>✕</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {/* 수정 버튼 */}
          <TouchableOpacity style={styles.editButton} onPress={handleEditPress}>
            <MaterialIcons
              name="edit"
              size={20}
              color={DUOLINGO_COLORS.gray}
            />
          </TouchableOpacity>
          {/* 삭제 버튼 */}
          <TouchableOpacity style={styles.removeButton} onPress={handleRemove}>
            <MaterialIcons
              name="delete"
              size={20}
              color={DUOLINGO_COLORS.gray}
            />
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  if (onEdit && !isEditing) {
    return (
      <TouchableOpacity onPress={onEdit} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: DUOLINGO_COLORS.blue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  indexText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  placeAddress: {
    fontSize: 12,
    color: DUOLINGO_COLORS.gray,
    marginBottom: 8,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  durationLabel: {
    fontSize: 14,
    color: DUOLINGO_COLORS.gray,
    marginRight: 6,
  },
  durationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: DUOLINGO_COLORS.green,
  },
  removeButton: {
    width: 25,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  editButton: {
    width: 25,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  editInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    borderWidth: 1,
    borderColor: DUOLINGO_COLORS.blue,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f8f9fa',
    marginBottom: 4,
  },
  saveButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: DUOLINGO_COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: DUOLINGO_COLORS.gray,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});


