/**
 * 平台判断工具
 * 提供统一的 iOS/Android 平台判断和条件执行函数
 */

import { Platform, NativeModules } from 'react-native';

export const isAndroid = Platform.OS === 'android';
export const isIOS = Platform.OS === 'ios';

/**
 * 获取平台版本号
 * Android: 返回系统版本号（如 "13"）
 * iOS: 返回系统版本号（如 "16"）
 */
export const getPlatformVersion = (): string => {
  if (isAndroid) {
    // @ts-expect-error Android specific constant
    return Platform.constants?.Release as string || '0';
  }
  return String(Platform.Version);
};

/**
 * 平台选择器
 * 根据平台自动选择对应的值
 * @example
 * const padding = platformSelect({
 *   android: 16,
 *   ios: 20,
 *   default: 16
 * });
 */
export const platformSelect = <T>(options: {
  android: T;
  ios: T;
  default?: T;
}): T => {
  if (isAndroid) return options.android;
  if (isIOS) return options.ios;
  return options.default ?? options.android;
};

/**
 * 平台执行器
 * 根据平台执行对应函数
 * @example
 * platformRun({
 *   android: () => { Android 特有逻辑 },
 *   ios: () => { iOS 特有逻辑 }
 * });
 */
export const platformRun = <T>(options: {
  android?: () => T;
  ios?: () => T;
  default?: () => T;
}): T | undefined => {
  if (isAndroid && options.android) {
    return options.android();
  }
  if (isIOS && options.ios) {
    return options.ios();
  }
  if (options.default) {
    return options.default();
  }
  return undefined;
};

/**
 * 仅在 Android 执行
 */
export const androidOnly = <T>(fn: () => T): T | undefined => {
  if (isAndroid) return fn();
  return undefined;
};

/**
 * 仅在 iOS 执行
 */
export const iosOnly = <T>(fn: () => T): T | undefined => {
  if (isIOS) return fn();
  return undefined;
};

/**
 * 检查 iOS 版本是否满足最低要求
 */
export const isIOSSupport = (minVersion: number): boolean => {
  if (!isIOS) return false;
  const version = parseInt(String(Platform.Version), 10);
  return version >= minVersion;
};

/**
 * 检查 Android 版本是否满足最低要求
 */
export const isAndroidSupport = (minVersion: number): boolean => {
  if (!isAndroid) return false;
  // @ts-expect-error Android specific
  const version = parseInt(Platform.constants?.Release || '0', 10);
  return version >= minVersion;
};

/**
 * 获取设备类型
 */
export const getDeviceType = (): 'phone' | 'tablet' | 'unknown' => {
  const { PlatformConstants } = NativeModules;

  if (isAndroid) {
    // Android 可以通过屏幕尺寸判断
    return 'phone';
  }

  if (isIOS) {
    // iOS 可以通过 UIUserInterfaceIdiom 判断
    const userInterfaceIdiom = PlatformConstants?.interfaceIdiom;
    if (userInterfaceIdiom === 'pad') return 'tablet';
    if (userInterfaceIdiom === 'phone') return 'phone';
  }

  return 'unknown';
};

/**
 * 检查是否为 iPad
 */
export const isIPad = (): boolean => {
  return isIOS && getDeviceType() === 'tablet';
};

/**
 * 检查是否为刘海屏设备
 */
export const hasNotch = (): boolean => {
  if (isAndroid) {
    // Android 需要通过原生模块获取
    return false;
  }
  if (isIOS) {
    // iPhone X 及以上机型
    const model = NativeModules.PlatformConstants?.model || '';
    return ['iPhone X', 'iPhone 11', 'iPhone 12', 'iPhone 13', 'iPhone 14', 'iPhone 15'].some(
      prefix => model.startsWith(prefix)
    );
  }
  return false;
};
