import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 언어 리소스
const resources = {
  ko: {
    translation: {
      // 공통
      home: '홈',
      settings: '설정',
      save: '저장',
      cancel: '취소',
      delete: '삭제',
      edit: '수정',
      error: '오류',
      placeDelete: '장소 삭제',
      share: '공유',
      back: '뒤로',
      saveInProgress: '저장 중...',
      newTrip: '새 여행',
      number: '개',
      alert: '알림',
      noPlacesToSave: '저장할 장소가 없습니다. 먼저 장소를 추가해주세요.',
      saveComplete: '저장 완료',
      tripSavedSuccess: '"{{tripName}}" 여정이 저장되었습니다!',
      saveError: '저장 중 문제가 발생했습니다.',
      creatingTrip: '여행을 생성하는 중...',
      calculatingTravelTime: '이동 시간 계산 중...',
      startPlanningTrip: '장소를 추가해서 여행 계획을 시작하세요!',
      placeAdded: '장소 추가',
      placeAddedSuccess: '{{placeName}}이(가) 추가되었습니다!',
      tripSaveComplete: '여행 저장 완료',
      saveFailed: '저장 실패',
      shareFailed: '공유 실패',
      hours: '시간',
      minutes: '분',
      
      // 여행 관련
      tripName: '여행 이름',
      addPlace: '장소 추가',
      placeName: '장소 이름',
      placeAddress: '장소 주소',
      stayDuration: '체류 시간',
      travelTime: '이동 시간',
      totalTime: '총 소요 시간',
      availableTime: '가용 시간',
      remainingTime: '남은 시간',
      overTime: '시간 초과',
      
      // 교통 수단
      transportMode: '교통 수단',
      driving: '자동차',
      walking: '도보',
      transit: '대중교통',
      bicycling: '자전거',
      
      // 메시지
      noPlacesToShare: '공유할 장소가 없습니다.',
      placeDeleteConfirm: '{{placeName}}을 경로에서 삭제하시겠습니까?',
      placeNameRequired: '장소 이름을 입력해주세요.',
      saveTripSuccess: '여행이 저장되었습니다.',
      saveTripError: '여행 저장에 실패했습니다.',
      searchPlace: '장소를 검색하세요...',

      // 홈
      savedTripTitle: '저장된 여행',
      noSavedTrips: '저장된 여행이 없습니다.',
      noSavedTripsDescription: '하단 중앙의 + 버튼을 눌러\n새로운 여행을 시작하세요!',
      savedTripCount: '개 장소',
      
      // 설정
      language: '언어',
      selectLanguage: '언어 선택',
      korean: '한국어',
      english: '영어',
      japanese: '일본어',
      chinese: '중국어',
      deleteAllTrips: '모든 여행 삭제',
      deleteAllTripsConfirm: '{{count}}개의 저장된 여행이 모두 삭제됩니다.\n계속하시겠습니까?',
      complete: '완료',
      allTripsDeleted: '모든 여행이 삭제되었습니다.',
      appInfo: '앱 정보',
      appName: 'Tribble',
      appVersion: '버전',
      appDescription: '여행 시간을 계획하는 똑똑한 플래너',
      savedTripList: '저장된 여행 목록',
      savedTripListDescription: '저장된 여행 목록을 관리할 수 있습니다.',
      savedTripListConfirm: '저장된 여행 목록을 삭제하시겠습니까?',
      savedTripListComplete: '저장된 여행 목록이 삭제되었습니다.',
      savedTripListError: '저장된 여행 목록 삭제에 실패했습니다.',
      savedTripListCancel: '취소',
      savedTripListDelete: '삭제',
      savedTripListDeleteConfirm: '저장된 여행 목록을 삭제하시겠습니까?',
      resetTravelTime: '이동 시간이 재계산되었습니다!',
    }
  },
  en: {
    translation: {
      // Common
      home: 'Home',
      settings: 'Settings',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      error: 'Error',
      placeDelete: 'Delete Place',
      share: 'Share',
      back: 'Back',
      saveInProgress: 'Saving...',
      newTrip: 'New Trip',
      number: '',
      alert: 'Alert',
      noPlacesToSave: 'No places to save. Please add places first.',
      saveComplete: 'Save Complete',
      tripSavedSuccess: 'Trip "{{tripName}}" has been saved!',
      saveError: 'An error occurred while saving.',
      creatingTrip: 'Creating trip...',
      calculatingTravelTime: 'Calculating travel time...',
      startPlanningTrip: 'Add places to start planning your trip!',
      placeAdded: 'Place Added',
      placeAddedSuccess: '{{placeName}} has been added!',
      tripSaveComplete: 'Trip Save Complete',
      saveFailed: 'Save Failed',
      shareFailed: 'Share Failed',
      hours: 'h',
      minutes: 'm',
      
      // Trip related
      tripName: 'Trip Name',
      addPlace: 'Add Place',
      placeName: 'Place Name',
      placeAddress: 'Place Address',
      stayDuration: 'Stay Duration',
      travelTime: 'Travel Time',
      totalTime: 'Total Time',
      availableTime: 'Available Time',
      remainingTime: 'Remaining Time',
      overTime: 'Over Time',
      
      // Transport modes
      transportMode: 'Transport Mode',
      driving: 'Car',
      walking: 'Walking',
      transit: 'Public Transit',
      bicycling: 'Bicycle',
      
      // Messages
      noPlacesToShare: 'No places to share.',
      placeDeleteConfirm: 'Delete {{placeName}} from the route?',
      placeNameRequired: 'Please enter a place name.',
      saveTripSuccess: 'Trip saved successfully.',
      saveTripError: 'Failed to save trip.',
      searchPlace: 'Search for a place...',

      // Home
      savedTripTitle: 'Saved Trip',
      noSavedTrips: 'No saved trips.',
      noSavedTripsDescription: 'Click the + button in the center to start a new trip.',
      savedTripCount: 'places',
      
      // Settings
      language: 'Language',
      selectLanguage: 'Select Language',
      korean: 'Korean',
      english: 'English',
      japanese: 'Japanese',
      chinese: 'Chinese',
      deleteAllTrips: 'Delete All Trips',
      deleteAllTripsConfirm: 'All saved trips will be deleted.\nContinue?',
      complete: 'Complete',
      allTripsDeleted: 'All trips have been deleted.',
      appInfo: 'App Info',
      appName: 'Tribble',
      appVersion: 'Version',
      appDescription: 'Smart planner for trip time planning',
      savedTripList: 'Saved Trip List',
      savedTripListDescription: 'You can manage the saved trip list.',
      savedTripListConfirm: 'Delete the saved trip list?',
      savedTripListComplete: 'The saved trip list has been deleted.',
      savedTripListError: 'Failed to delete the saved trip list.',
      savedTripListCancel: 'Cancel',
      savedTripListDelete: 'Delete',
      savedTripListDeleteConfirm: 'Delete the saved trip list?',
      resetTravelTime: 'Travel time has been recalculated!',
    }
  },
  ja: {
    translation: {
      // 共通
      home: 'ホーム',
      settings: '設定',
      save: '保存',
      cancel: 'キャンセル',
      delete: '削除',
      edit: '編集',
      error: 'エラー',
      placeDelete: '場所を削除',
      share: '共有',
      back: '戻る',
      saveInProgress: '保存中...',
      newTrip: '新しい旅行',
      number: '',
      alert: 'アラート',
      noPlacesToSave: '保存する場所がありません。まず場所を追加してください。',
      saveComplete: '保存完了',
      tripSavedSuccess: '旅行「{{tripName}}」が保存されました！',
      saveError: '保存中に問題が発生しました。',
      creatingTrip: '旅行を作成中...',
      calculatingTravelTime: '移動時間を計算中...',
      startPlanningTrip: '場所を追加して旅行計画を始めましょう！',
      placeAdded: '場所追加',
      placeAddedSuccess: '{{placeName}}が追加されました！',
      tripSaveComplete: '旅行保存完了',
      saveFailed: '保存失敗',
      shareFailed: '共有失敗',
      hours: '時間',
      minutes: '分',
      
      // 旅行関連
      tripName: '旅行名',
      addPlace: '場所を追加',
      placeName: '場所名',
      placeAddress: '場所の住所',
      stayDuration: '滞在時間',
      travelTime: '移動時間',
      totalTime: '総所要時間',
      availableTime: '利用可能時間',
      remainingTime: '残り時間',
      overTime: '時間超過',
      
      // 交通手段
      transportMode: '交通手段',
      driving: '車',
      walking: '徒歩',
      transit: '公共交通',
      bicycling: '自転車',
      
      // メッセージ
      noPlacesToShare: '共有する場所がありません。',
      placeDeleteConfirm: '{{placeName}}をルートから削除しますか？',
      placeNameRequired: '場所名を入力してください。',
      saveTripSuccess: '旅行が保存されました。',
      saveTripError: '旅行の保存に失敗しました。',
      searchPlace: '場所を検索...',

      // Home
      savedTripTitle: '保存された旅行',
      noSavedTrips: '保存された旅行がありません。',
      noSavedTripsDescription: '中央の+ボタンをクリックして新しい旅行を開始してください。',
      savedTripCount: '場所',
      
      // 設定
      language: '言語',
      selectLanguage: '言語を選択',
      korean: '韓国語',
      english: '英語',
      japanese: '日本語',
      chinese: '中国語',
      deleteAllTrips: 'すべての旅行を削除',
      deleteAllTripsConfirm: '保存された{{count}}件の旅行がすべて削除されます。\n続行しますか？',
      complete: '完了',
      allTripsDeleted: 'すべての旅行が削除されました。',
      appInfo: 'アプリ情報',
      appName: 'Tribble',
      appVersion: 'バージョン',
      appDescription: '旅行時間を計画するスマートなプランナー',
      savedTripList: '保存された旅行リスト',
      savedTripListDescription: '保存された旅行リストを管理できます。',
      savedTripListConfirm: '保存された旅行リストを削除しますか？',
      savedTripListComplete: '保存された旅行リストが削除されました。',
      savedTripListError: '保存された旅行リストの削除に失敗しました。',
      savedTripListCancel: 'キャンセル',
      savedTripListDelete: '削除',
      savedTripListDeleteConfirm: '保存された旅行リストを削除しますか？',
      resetTravelTime: '移動時間が再計算されました！',
    }
  },
  zh: {
    translation: {
      // 通用
      home: '首页',
      settings: '设置',
      save: '保存',
      cancel: '取消',
      delete: '删除',
      edit: '编辑',
      error: '错误',
      placeDelete: '删除地点',
      share: '分享',
      back: '返回',
      saveInProgress: '保存中...',
      newTrip: '新旅行',
      number: '',
      alert: '提醒',
      noPlacesToSave: '没有要保存的地点。请先添加地点。',
      saveComplete: '保存完成',
      tripSavedSuccess: '旅行"{{tripName}}"已保存！',
      saveError: '保存时出现问题。',
      creatingTrip: '正在创建旅行...',
      calculatingTravelTime: '正在计算旅行时间...',
      startPlanningTrip: '添加地点开始规划您的旅行！',
      placeAdded: '地点添加',
      placeAddedSuccess: '{{placeName}}已添加！',
      tripSaveComplete: '旅行保存完成',
      saveFailed: '保存失败',
      shareFailed: '分享失败',
      hours: '小时',
      minutes: '分钟',
      
      // 旅行相关
      tripName: '旅行名称',
      addPlace: '添加地点',
      placeName: '地点名称',
      placeAddress: '地点地址',
      stayDuration: '停留时间',
      travelTime: '旅行时间',
      totalTime: '总时间',
      availableTime: '可用时间',
      remainingTime: '剩余时间',
      overTime: '超时',
      
      // 交通方式
      transportMode: '交通方式',
      driving: '汽车',
      walking: '步行',
      transit: '公共交通',
      bicycling: '自行车',
      
      // 消息
      noPlacesToShare: '没有可分享的地点。',
      placeDeleteConfirm: '从路线中删除{{placeName}}吗？',
      placeNameRequired: '请输入地点名称。',
      saveTripSuccess: '旅行已保存。',
      saveTripError: '保存旅行失败。',
      searchPlace: '地点を検索...',
      
      // Home
      savedTripTitle: '保存的旅行',
      noSavedTrips: '没有保存的旅行。',
      noSavedTripsDescription: '点击中心位置的+按钮开始新的旅行。',
      savedTripCount: '地点',
      
      // 设置
      language: '语言',
      selectLanguage: '选择语言',
      korean: '韩语',
      english: '英语',
      japanese: '日语',
      chinese: '中文',
      deleteAllTrips: '删除所有旅行',
      deleteAllTripsConfirm: '所有{{count}}个保存的旅行将被删除。\n继续吗？',
      complete: '完成',
      allTripsDeleted: '所有旅行已删除。',
      appInfo: '应用信息',
      appName: 'Tribble',
      appVersion: '版本',
      appDescription: '智能旅行时间规划器',
      savedTripList: '保存的旅行列表',
      savedTripListDescription: '您可以管理保存的旅行列表。',
      savedTripListConfirm: '删除保存的旅行列表吗？',
      savedTripListComplete: '保存的旅行列表已删除。',
      savedTripListError: '删除保存的旅行列表失败。',
      savedTripListCancel: '取消',
      savedTripListDelete: '删除',
      savedTripListDeleteConfirm: '删除保存的旅行列表吗？',
      resetTravelTime: '旅行时间已重新计算！',
    }
  }
};

// 언어 감지 및 저장
const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    // 먼저 기본 언어를 반환
    callback('ko');
    
    // 그 다음 AsyncStorage에서 언어를 확인하고 필요시 변경
    try {
      const savedLanguage = await AsyncStorage.getItem('user-language');
      if (savedLanguage && savedLanguage !== 'ko') {
        callback(savedLanguage);
      }
    } catch (error) {
      console.error('언어 감지 오류:', error);
    }
  },
  init: () => {},
  cacheUserLanguage: async (lng: string) => {
    try {
      await AsyncStorage.setItem('user-language', lng);
    } catch (error) {
      console.error('언어 저장 오류:', error);
    }
  }
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ko',
    debug: __DEV__,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
