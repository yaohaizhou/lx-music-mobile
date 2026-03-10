/**
 * 统一的权限管理模块
 * 处理 iOS 和 Android 的权限差异
 */

import {
  Platform,
  PermissionsAndroid,
  type Permission,
} from 'react-native';
import { isAndroid, isIOS } from './platform';

// 权限类型定义
export type PermissionType =
  | 'storage'           // 存储权限 (Android)
  | 'readStorage'       // 读取存储 (Android)
  | 'writeStorage'      // 写入存储 (Android)
  | 'microphone'        // 麦克风权限
  | 'mediaLibrary'      // 媒体库访问 (iOS)
  | 'photoLibrary'      // 相册访问 (iOS)
  | 'notifications'     // 通知权限
  | 'backgroundAudio'   // 后台音频 (iOS 配置)
  | 'network'           // 网络状态
  | 'bluetooth';        // 蓝牙权限

// 权限状态
export type PermissionStatus = 'granted' | 'denied' | 'never_ask_again' | 'unavailable';

// Android 权限映射
const ANDROID_PERMISSION_MAP: Record<PermissionType, Permission | Permission[] | null> = {
  storage: [
    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
  ],
  readStorage: PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
  writeStorage: PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
  microphone: PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  mediaLibrary: null,  // Android 不需要专门的媒体库权限
  photoLibrary: PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
  notifications: PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS, // Android 13+
  backgroundAudio: null,  // Android 通过 Service 实现
  network: null,
  bluetooth: PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
};

// iOS Info.plist key 映射（用于文档参考）
const IOS_PERMISSION_DESCRIPTIONS: Record<PermissionType, string | null> = {
  storage: null,  // iOS 不需要存储权限
  readStorage: null,
  writeStorage: null,
  microphone: 'NSMicrophoneUsageDescription',
  mediaLibrary: 'NSAppleMusicUsageDescription',
  photoLibrary: 'NSPhotoLibraryUsageDescription',
  notifications: 'UNAuthorizationOptions',
  backgroundAudio: 'UIBackgroundModes',
  network: null,
  bluetooth: 'NSBluetoothAlwaysUsageDescription',
};

/**
 * 检查权限
 * @param type - 权限类型
 * @returns 权限状态
 */
export const checkPermission = async (
  type: PermissionType
): Promise<PermissionStatus> => {
  if (isAndroid) {
    return checkAndroidPermission(type);
  }
  if (isIOS) {
    return checkIOSPermission(type);
  }
  return 'unavailable';
};

/**
 * 请求权限
 * @param type - 权限类型
 * @returns 权限状态
 */
export const requestPermission = async (
  type: PermissionType
): Promise<PermissionStatus> => {
  if (isAndroid) {
    return requestAndroidPermission(type);
  }
  if (isIOS) {
    return requestIOSPermission(type);
  }
  return 'unavailable';
};

/**
 * 批量检查权限
 * @param types - 权限类型数组
 * @returns 权限状态映射
 */
export const checkMultiplePermissions = async (
  types: PermissionType[]
): Promise<Record<PermissionType, PermissionStatus>> => {
  const results = {} as Record<PermissionType, PermissionStatus>;

  for (const type of types) {
    results[type] = await checkPermission(type);
  }

  return results;
};

/**
 * 批量请求权限
 * @param types - 权限类型数组
 * @returns 权限状态映射
 */
export const requestMultiplePermissions = async (
  types: PermissionType[]
): Promise<Record<PermissionType, PermissionStatus>> => {
  const results = {} as Record<PermissionType, PermissionStatus>;

  for (const type of types) {
    results[type] = await requestPermission(type);
  }

  return results;
};

/**
 * 检查是否所有权限都已获得
 * @param types - 权限类型数组
 * @returns 是否全部获得
 */
export const hasAllPermissions = async (
  types: PermissionType[]
): Promise<boolean> => {
  const results = await checkMultiplePermissions(types);
  return Object.values(results).every((status) => status === 'granted');
};

/**
 * 检查是否有任何权限被拒绝
 * @param types - 权限类型数组
 * @returns 是否有被拒绝的权限
 */
export const hasDeniedPermissions = async (
  types: PermissionType[]
): Promise<boolean> => {
  const results = await checkMultiplePermissions(types);
  return Object.values(results).some(
    (status) => status === 'denied' || status === 'never_ask_again'
  );
};

// ============ Android 私有方法 ============

const checkAndroidPermission = async (
  type: PermissionType
): Promise<PermissionStatus> => {
  const permission = ANDROID_PERMISSION_MAP[type];

  // 不需要权限
  if (!permission) {
    return 'granted';
  }

  const permissions = Array.isArray(permission) ? permission : [permission];

  try {
    const results = await Promise.all(
      permissions.map((p) => PermissionsAndroid.check(p))
    );

    if (results.every((r) => r)) {
      return 'granted';
    }
    if (results.some((r) => !r)) {
      return 'denied';
    }
    return 'unavailable';
  } catch (error) {
    console.error('Error checking Android permission:', error);
    return 'unavailable';
  }
};

const requestAndroidPermission = async (
  type: PermissionType
): Promise<PermissionStatus> => {
  const permission = ANDROID_PERMISSION_MAP[type];

  if (!permission) {
    return 'granted';
  }

  const permissions = Array.isArray(permission) ? permission : [permission];

  try {
    const results = await PermissionsAndroid.requestMultiple(permissions);
    const values = Object.values(results);

    // 所有权限都已授权
    if (values.every((r) => r === PermissionsAndroid.RESULTS.GRANTED)) {
      return 'granted';
    }

    // 某些权限被拒绝且不再询问
    if (values.some((r) => r === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)) {
      return 'never_ask_again';
    }

    return 'denied';
  } catch (error) {
    console.error('Error requesting Android permission:', error);
    return 'unavailable';
  }
};

// ============ iOS 私有方法 ============

// iOS 权限检查需要使用原生模块或第三方库
// 这里提供基础实现框架

const checkIOSPermission = async (
  type: PermissionType
): Promise<PermissionStatus> => {
  // 某些权限在 iOS 上不需要显式检查
  const autoGrantedPermissions: PermissionType[] = [
    'storage',
    'readStorage',
    'writeStorage',
    'backgroundAudio',
  ];

  if (autoGrantedPermissions.includes(type)) {
    return 'granted';
  }

  // 其他权限需要使用原生模块或 react-native-permissions
  // 这里返回 unknown，实际项目中应该调用原生模块
  console.warn(
    `checkIOSPermission(${type}): ` +
    `需要在 Info.plist 中配置 ${IOS_PERMISSION_DESCRIPTIONS[type]} ` +
    `并使用权限管理库检查状态`
  );

  // 建议集成 react-native-permissions 后实现
  return 'unavailable';
};

const requestIOSPermission = async (
  type: PermissionType
): Promise<PermissionStatus> => {
  const autoGrantedPermissions: PermissionType[] = [
    'storage',
    'readStorage',
    'writeStorage',
    'backgroundAudio',
  ];

  if (autoGrantedPermissions.includes(type)) {
    return 'granted';
  }

  console.warn(
    `requestIOSPermission(${type}): ` +
    `需要使用 react-native-permissions 或其他权限库请求权限`
  );

  return 'unavailable';
};

/**
 * 获取权限的 Info.plist 配置键
 * 用于开发时检查配置
 */
export const getIOSPermissionConfigKey = (
  type: PermissionType
): string | null => {
  return IOS_PERMISSION_DESCRIPTIONS[type];
};

/**
 * 检查权限是否需要在 Info.plist 中配置
 */
export const requiresIOSPermissionDescription = (
  type: PermissionType
): boolean => {
  return IOS_PERMISSION_DESCRIPTIONS[type] !== null;
};
