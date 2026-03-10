# LX-Music-Mobile iOS 改造代码实现方案

## 一、核心改造概述

本项目是一个 React Native 音乐播放器，目前主要针对 Android 平台。为了实现 iOS 兼容，需要对以下方面进行改造：

1. **平台判断和分支逻辑**
2. **文件系统路径处理**
3. **权限请求机制**
4. **后台播放配置**
5. **通知/控制中心**
6. **UI 适配（状态栏、导航栏）**

---

## 二、跨平台工具函数设计

### 2.1 创建平台判断工具

**文件位置**: `/home/rehamalamoasi583/code/lx-music-mobile/src/utils/platform.ts` (新建)

```typescript
import { Platform, NativeModules } from 'react-native';

export const isAndroid = Platform.OS === 'android';
export const isIOS = Platform.OS === 'ios';

// 获取平台版本
export const getPlatformVersion = (): string => {
  if (isAndroid) {
    // @ts-expect-error Android specific
    return Platform.constants.Release as string;
  }
  return Platform.Version as string;
};

// 平台特定的条件执行
export const platformSelect = <T>(options: { android: T; ios: T; default?: T }): T => {
  if (isAndroid) return options.android;
  if (isIOS) return options.ios;
  return options.default ?? options.android;
};

// 仅在 Android 执行
export const androidOnly = <T>(fn: () => T): T | undefined => {
  if (isAndroid) return fn();
  return undefined;
};

// 仅在 iOS 执行
export const iosOnly = <T>(fn: () => T): T | undefined => {
  if (isIOS) return fn();
  return undefined;
};

// 检查 iOS 版本是否支持某功能
export const isIOSSupport = (minVersion: number): boolean => {
  if (!isIOS) return false;
  const version = parseInt(String(Platform.Version), 10);
  return version >= minVersion;
};

// 检查 Android 版本是否支持某功能
export const isAndroidSupport = (minVersion: number): boolean => {
  if (!isAndroid) return false;
  // @ts-expect-error Android specific
  const version = parseInt(Platform.constants.Release, 10);
  return version >= minVersion;
};
```

---

## 三、文件系统路径改造

### 3.1 改造现有 fs.ts 文件

**文件位置**: `/home/rehamalamoasi583/code/lx-music-mobile/src/utils/fs.ts`

```typescript
import RNFS from 'react-native-fs';
import {
  Dirs,
  FileSystem,
  AndroidScoped,
  type OpenDocumentOptions,
  type Encoding,
  type HashAlgorithm,
  getExternalStoragePaths as _getExternalStoragePaths,
} from 'react-native-file-system';
import { isAndroid, isIOS, platformSelect } from './platform';

export type { FileType } from 'react-native-file-system';

export const extname = (name: string) =>
  name.lastIndexOf('.') > 0 ? name.substring(name.lastIndexOf('.') + 1) : '';

// ========== 路径常量 ==========
// 临时目录（缓存）
export const temporaryDirectoryPath = Dirs.CacheDir;

// 外部存储（Android: SD卡，iOS: 不使用）
export const externalStorageDirectoryPath = platformSelect({
  android: Dirs.SDCardDir ?? '',
  ios: '', // iOS 没有外部存储概念
});

// 私有文档目录（应用沙盒）
export const privateStorageDirectoryPath = Dirs.DocumentDir;

// iOS 特定的目录
export const iosLibraryDirectoryPath = platformSelect({
  android: '',
  ios: Dirs.LibraryDir ?? '',
});

// iOS 音乐专用目录
export const musicDirectoryPath = platformSelect({
  android: `${Dirs.DocumentDir}/Music`,
  ios: `${Dirs.LibraryDir}/Music`, // iOS 推荐存放在 Library 下
});

// ========== Android 特有功能 ==========
export const getExternalStoragePaths = async (isRemovable?: boolean) => {
  if (!isAndroid) return [];
  return _getExternalStoragePaths(isRemovable);
};

export const selectManagedFolder = async (isPersist: boolean = false) => {
  if (!isAndroid) {
    console.warn('selectManagedFolder is Android only');
    return null;
  }
  return AndroidScoped.openDocumentTree(isPersist);
};

export const selectFile = async (options: OpenDocumentOptions) => {
  if (!isAndroid) {
    console.warn('selectFile is Android only');
    return null;
  }
  return AndroidScoped.openDocument(options);
};

export const removeManagedFolder = async (path: string) => {
  if (!isAndroid) return;
  return AndroidScoped.releasePersistableUriPermission(path);
};

export const getManagedFolders = async () => {
  if (!isAndroid) return [];
  return AndroidScoped.getPersistedUriPermissions();
};

export const getPersistedUriList = async () => {
  if (!isAndroid) return [];
  return AndroidScoped.getPersistedUriPermissions();
};

// ========== 通用文件操作 ==========
export const readDir = async (path: string) => FileSystem.ls(path);

export const unlink = async (path: string) => FileSystem.unlink(path);

export const mkdir = async (path: string) => FileSystem.mkdir(path);

export const stat = async (path: string) => FileSystem.stat(path);

export const hash = async (path: string, algorithm: HashAlgorithm) =>
  FileSystem.hash(path, algorithm);

export const readFile = async (path: string, encoding?: Encoding) =>
  FileSystem.readFile(path, encoding);

export const moveFile = async (fromPath: string, toPath: string) =>
  FileSystem.mv(fromPath, toPath);

export const gzipFile = async (fromPath: string, toPath: string) =>
  FileSystem.gzipFile(fromPath, toPath);

export const unGzipFile = async (fromPath: string, toPath: string) =>
  FileSystem.unGzipFile(fromPath, toPath);

export const gzipString = async (data: string, encoding?: Encoding) =>
  FileSystem.gzipString(data, encoding);

export const unGzipString = async (data: string, encoding?: Encoding) =>
  FileSystem.unGzipString(data, encoding);

export const existsFile = async (path: string) => FileSystem.exists(path);

export const rename = async (path: string, name: string) =>
  FileSystem.rename(path, name);

export const writeFile = async (path: string, data: string, encoding?: Encoding) =>
  FileSystem.writeFile(path, data, encoding);

export const appendFile = async (path: string, data: string, encoding?: Encoding) =>
  FileSystem.appendFile(path, data, encoding);

// ========== iOS 文件选择器 ==========
export const selectFileIOS = async (options?: {
  types?: string[]; // 如 ['public.audio', 'public.movie']
}): Promise<string | null> => {
  if (!isIOS) return null;
  // 需要使用原生模块或第三方库如 react-native-document-picker
  // 这里预留接口
  console.warn('selectFileIOS: 需要实现原生模块或使用 react-native-document-picker');
  return null;
};

// ========== 文件下载 ==========
export const downloadFile = (
  url: string,
  path: string,
  options: Omit<RNFS.DownloadFileOptions, 'fromUrl' | 'toFile'> = {}
) => {
  const defaultHeaders = platformSelect({
    android: {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 10; Pixel 3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Mobile Safari/537.36',
    },
    ios: {
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    },
  });

  if (!options.headers) {
    options.headers = defaultHeaders;
  }

  return RNFS.downloadFile({
    fromUrl: url,
    toFile: path,
    ...options,
  });
};

export const stopDownload = (jobId: number) => {
  RNFS.stopDownload(jobId);
};

// ========== 路径工具函数 ==========

// 将路径转换为平台特定的 file:// URL
export const toFileUrl = (path: string): string => {
  if (path.startsWith('file://')) return path;
  return `file://${path}`;
};

// 从 file:// URL 提取路径
export const fromFileUrl = (url: string): string => {
  return url.replace(/^file:\/\//, '');
};

// 获取适合当前平台的存储路径
export const getDefaultStoragePath = (): string => {
  return platformSelect({
    android: `${Dirs.DocumentDir}/Downloads`,
    ios: `${Dirs.LibraryDir}/Downloads`, // iOS 推荐使用 Library 目录
  });
};
```

---

## 四、权限请求系统改造

### 4.1 创建统一的权限管理模块

**文件位置**: `/home/rehamalamoasi583/code/lx-music-mobile/src/utils/permissions.ts` (新建)

```typescript
import { Platform, PermissionsAndroid, type Permission } from 'react-native';
import { isAndroid, isIOS } from './platform';

// 权限类型定义
export type PermissionType =
  | 'storage' // 存储权限
  | 'microphone' // 麦克风权限（音频录制）
  | 'mediaLibrary' // 媒体库访问（iOS）
  | 'notifications' // 通知权限
  | 'backgroundAudio'; // 后台音频（iOS 专用）

// 权限状态
export type PermissionStatus = 'granted' | 'denied' | 'never_ask_again' | 'unknown';

// iOS 权限映射（需要在 Info.plist 中配置）
const IOS_PERMISSIONS: Record<PermissionType, string | null> = {
  storage: null, // iOS 不需要存储权限，使用沙盒
  microphone: 'NSMicrophoneUsageDescription',
  mediaLibrary: 'NSAppleMusicUsageDescription',
  notifications: 'UNAuthorizationOptions',
  backgroundAudio: 'UIBackgroundModes',
};

// Android 权限映射
const ANDROID_PERMISSIONS: Record<PermissionType, Permission | Permission[] | null> = {
  storage: [
    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
  ],
  microphone: PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  mediaLibrary: null, // Android 不需要专门的媒体库权限
  notifications: PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS, // Android 13+
  backgroundAudio: null, // Android 通过 Service 实现
};

/**
 * 检查权限
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
  return 'unknown';
};

/**
 * 请求权限
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
  return 'unknown';
};

// ========== Android 权限处理 ==========
const checkAndroidPermission = async (
  type: PermissionType
): Promise<PermissionStatus> => {
  const permission = ANDROID_PERMISSIONS[type];
  if (!permission) return 'granted'; // 不需要权限

  const permissions = Array.isArray(permission) ? permission : [permission];

  try {
    const results = await Promise.all(
      permissions.map((p) => PermissionsAndroid.check(p))
    );

    if (results.every((r) => r)) return 'granted';
    if (results.some((r) => !r)) return 'denied';
    return 'unknown';
  } catch {
    return 'unknown';
  }
};

const requestAndroidPermission = async (
  type: PermissionType
): Promise<PermissionStatus> => {
  const permission = ANDROID_PERMISSIONS[type];
  if (!permission) return 'granted';

  const permissions = Array.isArray(permission) ? permission : [permission];

  try {
    const results = await PermissionsAndroid.requestMultiple(permissions);
    const values = Object.values(results);

    if (values.every((r) => r === PermissionsAndroid.RESULTS.GRANTED)) {
      return 'granted';
    }

    if (values.some((r) => r === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)) {
      return 'never_ask_again';
    }

    return 'denied';
  } catch {
    return 'denied';
  }
};

// ========== iOS 权限处理 ==========
// iOS 权限需要使用原生模块或第三方库
// 这里提供接口定义，实际实现需要依赖原生代码或权限库

const checkIOSPermission = async (type: PermissionType): Promise<PermissionStatus> => {
  // 某些权限在 iOS 上不需要显式检查
  if (type === 'storage') return 'granted';
  if (type === 'backgroundAudio') return 'granted'; // 通过 Info.plist 配置

  // 其他权限需要使用原生模块
  // 例如: react-native-permissions
  console.warn(`checkIOSPermission(${type}): 需要集成权限管理库`);
  return 'unknown';
};

const requestIOSPermission = async (type: PermissionType): Promise<PermissionStatus> => {
  if (type === 'storage') return 'granted';
  if (type === 'backgroundAudio') return 'granted';

  console.warn(`requestIOSPermission(${type}): 需要集成权限管理库`);
  return 'unknown';
};

/**
 * 批量请求多个权限
 */
export const requestMultiplePermissions = async (
  types: PermissionType[]
): Promise<Record<PermissionType, PermissionStatus>> => {
  const results: Partial<Record<PermissionType, PermissionStatus>> = {};

  for (const type of types) {
    results[type] = await requestPermission(type);
  }

  return results as Record<PermissionType, PermissionStatus>;
};

/**
 * 检查是否所有权限都已获得
 */
export const hasAllPermissions = async (types: PermissionType[]): Promise<boolean> => {
  const results = await Promise.all(types.map((t) => checkPermission(t)));
  return results.every((r) => r === 'granted');
};
```

### 4.2 改造现有 tools.ts 中的权限函数

**修改位置**: `/home/rehamalamoasi583/code/lx-music-mobile/src/utils/tools.ts`

```typescript
// 修改现有的权限相关函数，使用平台判断

import { isAndroid, isIOS, platformSelect } from './platform';
import {
  checkPermission,
  requestPermission,
  type PermissionStatus,
} from './permissions';

// 替换现有的 checkStoragePermissions
export const checkStoragePermissions = async (): Promise<boolean> => {
  if (isIOS) return true; // iOS 不需要存储权限
  const status = await checkPermission('storage');
  return status === 'granted';
};

// 替换现有的 requestStoragePermission
export const requestStoragePermission = async (): Promise<boolean | null> => {
  if (isIOS) return true;

  const isGranted = await checkStoragePermissions();
  if (isGranted) return true;

  const status = await requestPermission('storage');

  if (status === 'granted') return true;
  if (status === 'never_ask_again') return null;
  return false;
};

// 改造 toast 函数以支持 iOS
export const toast = (
  message: string,
  duration: 'long' | 'short' = 'short',
  position: 'top' | 'center' | 'bottom' = 'bottom'
) => {
  if (isAndroid) {
    // 保持现有 Android 实现
    let _duration;
    switch (duration) {
      case 'long':
        _duration = ToastAndroid.LONG;
        break;
      case 'short':
      default:
        _duration = ToastAndroid.SHORT;
        break;
    }
    let _position;
    let offset: number;
    switch (position) {
      case 'top':
        _position = ToastAndroid.TOP;
        offset = 120;
        break;
      case 'center':
        _position = ToastAndroid.CENTER;
        offset = 0;
        break;
      case 'bottom':
      default:
        _position = ToastAndroid.BOTTOM;
        offset = 120;
        break;
    }
    ToastAndroid.showWithGravityAndOffset(message, _duration, _position, 0, offset);
  } else {
    // iOS 使用 Alert 或第三方 toast 库
    // 推荐使用 @redux-react-native-toast 或 react-native-toast-message
    Alert.alert('', message, [{ text: 'OK' }], { cancelable: true });
  }
};

// 改造 exitApp 函数
export const exitApp = () => {
  if (isAndroid) {
    BackHandler.exitApp();
  }
  // iOS 不支持程序化退出应用
  console.warn('exitApp is not supported on iOS');
};
```

---

## 五、原生模块适配

### 5.1 改造 UtilsModule 调用

**文件位置**: `/home/rehamalamoasi583/code/lx-music-mobile/src/utils/nativeModules/utils.ts`

```typescript
import { AppState, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { isAndroid, isIOS } from '@/utils/platform';

const { UtilsModule } = NativeModules;

// ========== 通用功能 ==========
export const exitApp = () => {
  if (isAndroid && UtilsModule?.exitApp) {
    UtilsModule.exitApp();
  }
  // iOS 不支持程序化退出
};

export const getSupportedAbis = (): string[] => {
  if (isAndroid && UtilsModule?.getSupportedAbis) {
    return UtilsModule.getSupportedAbis();
  }
  // iOS 返回架构信息
  if (isIOS) {
    // 可以通过其他方式获取，如 react-native-device-info
    return ['arm64']; // 现代 iOS 设备主要是 arm64
  }
  return [];
};

// ========== Android 特有功能 ==========
export const installApk = (filePath: string, fileProviderAuthority: string) => {
  if (!isAndroid) {
    console.warn('installApk is Android only');
    return;
  }
  if (UtilsModule?.installApk) {
    UtilsModule.installApk(filePath, fileProviderAuthority);
  }
};

// ========== 屏幕常亮 ==========
export const screenkeepAwake = () => {
  if (global.lx.isScreenKeepAwake) return;
  global.lx.isScreenKeepAwake = true;
  if (isAndroid && UtilsModule?.screenkeepAwake) {
    UtilsModule.screenkeepAwake();
  }
  // iOS 需要使用原生模块或第三方库如 react-native-keep-awake
};

export const screenUnkeepAwake = () => {
  if (!global.lx.isScreenKeepAwake) return;
  global.lx.isScreenKeepAwake = false;
  if (isAndroid && UtilsModule?.screenUnkeepAwake) {
    UtilsModule.screenUnkeepAwake();
  }
};

// ========== 网络和设备信息 ==========
export const getWIFIIPV4Address = (): Promise<string> => {
  if (isAndroid && UtilsModule?.getWIFIIPV4Address) {
    return UtilsModule.getWIFIIPV4Address();
  }
  // iOS 需要使用原生模块或网络库
  return Promise.resolve('127.0.0.1');
};

export const getDeviceName = async (): Promise<string> => {
  if (isAndroid && UtilsModule?.getDeviceName) {
    const deviceName = await UtilsModule.getDeviceName();
    return deviceName || 'Unknown';
  }
  // iOS 可以使用 react-native-device-info
  return Promise.resolve('iOS Device');
};

// ========== 通知权限 ==========
export const isNotificationsEnabled = (): Promise<boolean> => {
  if (isAndroid && UtilsModule?.isNotificationsEnabled) {
    return UtilsModule.isNotificationsEnabled();
  }
  // iOS 需要使用原生模块检查通知权限
  return Promise.resolve(true);
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    let subscription = AppState.addEventListener('change', (state) => {
      if (state != 'active') return;
      subscription.remove();
      setTimeout(() => {
        void isNotificationsEnabled().then(resolve);
      }, 1000);
    });

    if (isAndroid && UtilsModule?.openNotificationPermissionActivity) {
      UtilsModule.openNotificationPermissionActivity().then((result: boolean) => {
        if (result) return;
        subscription.remove();
        resolve(false);
      });
    } else {
      // iOS 使用原生权限请求
      subscription.remove();
      resolve(true);
    }
  });
};

// ========== 分享功能 ==========
export const shareText = async (
  shareTitle: string,
  title: string,
  text: string
): Promise<void> => {
  if (isAndroid && UtilsModule?.shareText) {
    UtilsModule.shareText(shareTitle, title, text);
    return;
  }
  // iOS 使用 Share API 或 react-native-share
  const Share = require('react-native').Share;
  await Share.share({
    title: shareTitle,
    message: text,
  });
};

// ========== 系统语言 ==========
export const getSystemLocales = async (): Promise<string> => {
  if (isAndroid && UtilsModule?.getSystemLocales) {
    return UtilsModule.getSystemLocales();
  }
  // iOS 获取系统语言
  const { SettingsManager } = NativeModules;
  const locale =
    SettingsManager?.settings?.AppleLocale ||
    SettingsManager?.settings?.AppleLanguages?.[0] ||
    'zh-CN';
  return Promise.resolve(locale.substring(0, 5).toLowerCase());
};

// ========== 屏幕状态监听 ==========
export const onScreenStateChange = (
  handler: (state: 'ON' | 'OFF') => void
): (() => void) => {
  if (!isAndroid || !UtilsModule) {
    return () => {};
  }
  const eventEmitter = new NativeEventEmitter(UtilsModule);
  const eventListener = eventEmitter.addListener('screen-state', (event) => {
    handler(event.state as 'ON' | 'OFF');
  });

  return () => {
    eventListener.remove();
  };
};

// ========== 窗口尺寸 ==========
export const getWindowSize = async (): Promise<{ width: number; height: number }> => {
  if (isAndroid && UtilsModule?.getWindowSize) {
    return UtilsModule.getWindowSize();
  }
  // iOS 使用 Dimensions API
  const { Dimensions } = require('react-native');
  const { width, height } = Dimensions.get('window');
  return { width, height };
};

export const onWindowSizeChange = (
  handler: (size: { width: number; height: number }) => void
): (() => void) => {
  if (isAndroid && UtilsModule?.listenWindowSizeChanged) {
    UtilsModule.listenWindowSizeChanged();
    const eventEmitter = new NativeEventEmitter(UtilsModule);
    const eventListener = eventEmitter.addListener('screen-size-changed', (event) => {
      handler(event as { width: number; height: number });
    });

    return () => {
      eventListener.remove();
    };
  }

  // iOS 使用 Dimensions API
  const { Dimensions } = require('react-native');
  const subscription = Dimensions.addEventListener('change', ({ window }) => {
    handler({ width: window.width, height: window.height });
  });

  return () => subscription.remove();
};

// ========== 电池优化（Android 特有） ==========
export const isIgnoringBatteryOptimization = async (): Promise<boolean> => {
  if (!isAndroid || !UtilsModule?.isIgnoringBatteryOptimization) {
    return true; // iOS 不需要此检查
  }
  return UtilsModule.isIgnoringBatteryOptimization();
};

export const requestIgnoreBatteryOptimization = async (): Promise<boolean> => {
  if (!isAndroid) return true;

  return new Promise<boolean>((resolve) => {
    let subscription = AppState.addEventListener('change', (state) => {
      if (state != 'active') return;
      subscription.remove();
      setTimeout(() => {
        void isIgnoringBatteryOptimization().then(resolve);
      }, 1000);
    });

    if (UtilsModule?.requestIgnoreBatteryOptimization) {
      UtilsModule.requestIgnoreBatteryOptimization().then((result: boolean) => {
        if (result) return;
        subscription.remove();
        resolve(false);
      });
    } else {
      subscription.remove();
      resolve(true);
    }
  });
};
```

---

## 六、播放器后台播放配置

### 6.1 iOS Info.plist 配置

**文件位置**: `/home/rehamalamoasi583/code/lx-music-mobile/ios/LxMusicMobile/Info.plist`

需要在现有配置基础上添加：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <!-- 现有配置保持不变 -->

  <!-- 后台播放模式 -->
  <key>UIBackgroundModes</key>
  <array>
    <string>audio</string>
    <string>fetch</string>
  </array>

  <!-- 音频权限描述 -->
  <key>NSMicrophoneUsageDescription</key>
  <string>此应用需要访问麦克风以支持音频录制功能</string>

  <!-- 媒体库权限描述 -->
  <key>NSAppleMusicUsageDescription</key>
  <string>此应用需要访问您的媒体库以播放本地音乐</string>

  <!-- 通知权限描述 -->
  <key>UNUserNotificationCenter</key>
  <dict>
    <key>UNAuthorizationOptions</key>
    <array>
      <string>alert</string>
      <string>badge</string>
      <string>sound</string>
    </array>
  </dict>

  <!-- 网络配置（已存在但需要确保配置正确） -->
  <key>NSAppTransportSecurity</key>
  <dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    <key>NSAllowsLocalNetworking</key>
    <true/>
  </dict>

  <!-- iOS 13+ Scene 配置 -->
  <key>UIApplicationSceneManifest</key>
  <dict>
    <key>UIApplicationSupportsMultipleScenes</key>
    <false/>
    <key>UISceneConfigurations</key>
    <dict>
      <key>UIWindowSceneSessionRoleApplication</key>
      <array>
        <dict>
          <key>UISceneConfigurationName</key>
          <string>Default Configuration</string>
          <key>UISceneDelegateClassName</key>
          <string>$(PRODUCT_MODULE_NAME).SceneDelegate</string>
        </dict>
      </array>
    </dict>
  </dict>
</dict>
</plist>
```

### 6.2 AppDelegate 改造

**文件位置**: `/home/rehamalamoasi583/code/lx-music-mobile/ios/LxMusicMobile/AppDelegate.mm`

```objc
#import "AppDelegate.h"
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import <React/RCTBridge.h>
#import <AVFoundation/AVFoundation.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // 配置音频会话以支持后台播放
  NSError *error = nil;
  AVAudioSession *audioSession = [AVAudioSession sharedInstance];

  // 设置音频类别为播放，并允许后台播放
  [audioSession setCategory:AVAudioSessionCategoryPlayback
                withOptions:AVAudioSessionCategoryOptionAllowAirPlay
                      error:&error];

  if (error) {
    NSLog(@"Error setting audio session category: %@", error.localizedDescription);
  }

  // 激活音频会话
  [audioSession setActive:YES error:&error];
  if (error) {
    NSLog(@"Error activating audio session: %@", error.localizedDescription);
  }

  self.moduleName = @"LxMusicMobile";

  // 启用新架构（如果适用）
  self.initialProps = @{};

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

// 处理远程控制事件（控制中心）
- (void)remoteControlReceivedWithEvent:(UIEvent *)event {
  // 事件处理将由 react-native-track-player 处理
  [super remoteControlReceivedWithEvent:event];
}

// 后台获取
- (void)application:(UIApplication *)application performFetchWithCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler
{
  completionHandler(UIBackgroundFetchResultNoData);
}

// 处理音频中断
- (void)applicationDidBecomeActive:(UIApplication *)application {
  // 重新激活音频会话
  [[AVAudioSession sharedInstance] setActive:YES error:nil];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
```

---

## 七、UI 适配改造

### 7.1 状态栏组件改造

**文件位置**: `/home/rehamalamoasi583/code/lx-music-mobile/src/components/common/StatusBar.tsx`

```typescript
import { useTheme } from '@/store/theme/hook';
import {
  StatusBar as RNStatusBar,
  Platform,
  View,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { isIOS } from '@/utils/platform';

const StatusBar = function () {
  const theme = useTheme();
  const statusBarStyle = theme.isDark ? 'light-content' : 'dark-content';

  if (isIOS) {
    // iOS 使用 SafeAreaView 处理刘海屏
    return (
      <>
        <RNStatusBar
          barStyle={statusBarStyle}
          translucent={true}
          backgroundColor="transparent"
        />
        <SafeAreaView
          style={[
            styles.safeArea,
            { backgroundColor: theme['c-content-background'] },
          ]}
        />
      </>
    );
  }

  // Android 保持现有实现
  return (
    <RNStatusBar
      backgroundColor="rgba(0,0,0,0)"
      barStyle={statusBarStyle}
      translucent={true}
    />
  );
};

const styles = StyleSheet.create({
  safeArea: {
    height: isIOS ? 44 : 0, // iPhone X+ 刘海高度
  },
});

StatusBar.currentHeight = RNStatusBar.currentHeight ?? (isIOS ? 44 : 0);
StatusBar.setBarStyle = RNStatusBar.setBarStyle;

export default StatusBar;
```

### 7.2 返回按钮处理改造

**文件位置**: `/home/rehamalamoasi583/code/lx-music-mobile/src/utils/hooks/useBackHandler.ts`

```typescript
import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';
import { isAndroid } from '@/utils/platform';

export function useBackHandler(handler: () => boolean) {
  useEffect(() => {
    // iOS 没有物理返回键，不需要监听
    if (!isAndroid) return;

    BackHandler.addEventListener('hardwareBackPress', handler);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handler);
    };
  }, [handler]);
}

// iOS 专用：处理手势返回
export function useIOSBackGesture(handler: () => boolean) {
  useEffect(() => {
    if (isAndroid) return;

    // 在 iOS 上，可以通过 Navigation 组件处理手势返回
    // 或使用 react-native-navigation 的事件监听

    return () => {
      // 清理逻辑
    };
  }, [handler]);
}
```

### 7.3 导航栏适配

**文件位置**: `/home/rehamalamoasi583/code/lx-music-mobile/src/navigation/utils.ts`

```typescript
import { Platform, StatusBar } from 'react-native';
import { isAndroid, isIOS } from '@/utils/platform';

export const getStatusBarStyle = (isDark: boolean): 'light' | 'dark' => {
  return isDark ? 'light' : 'dark';
};

// 获取安全区域高度
export const getSafeAreaInsets = () => {
  if (isIOS) {
    return {
      top: 44, // 刘海高度
      bottom: 34, // Home 指示器高度
      left: 0,
      right: 0,
    };
  }

  return {
    top: StatusBar.currentHeight ?? 24,
    bottom: 0,
    left: 0,
    right: 0,
  };
};

// 导航栏高度
export const getNavigationBarHeight = () => {
  if (isIOS) return 44; // iOS 标准导航栏高度
  return 56; // Android 标准高度
};
```

---

## 八、播放列表元数据更新改造

### 8.1 改造播放列表工具

**文件位置**: `/home/rehamalamoasi583/code/lx-music-mobile/src/plugins/player/playList.ts`

关键改造点：元数据更新需要处理 iOS 和 Android 的差异

```typescript
// 在 updateMetaData 函数中添加平台判断
import { isAndroid, isIOS } from '@/utils/platform';

export const updateMetaData = async (
  musicInfo: LX.Music.MusicInfo | LX.Download.ListItem,
  isPlaying: boolean
) => {
  // 现有逻辑保持不变
  // ...

  // 平台特定的元数据处理
  if (isIOS) {
    // iOS 使用 MPNowPlayingInfoCenter 更新控制中心
    // react-native-track-player 会自动处理大部分逻辑
    // 但需要确保 artwork 图片格式正确
    const trackInfo = await getTrackInfo(musicInfo);

    // iOS 对 artwork 大小有限制，建议处理图片尺寸
    if (trackInfo.artwork && typeof trackInfo.artwork === 'string') {
      // 确保 artwork URL 格式正确
      trackInfo.artwork = trackInfo.artwork.startsWith('http')
        ? trackInfo.artwork
        : `file://${trackInfo.artwork}`;
    }

    await TrackPlayer.updateMetadataForTrack(currentTrackIndex, trackInfo);
  } else {
    // Android 现有逻辑
    const trackInfo = await getTrackInfo(musicInfo);
    await TrackPlayer.updateMetadataForTrack(currentTrackIndex, trackInfo);
  }
};
```

---

## 九、窗口尺寸工具改造

### 9.1 改造 windowSizeTools

**文件位置**: `/home/rehamalamoasi583/code/lx-music-mobile/src/utils/windowSizeTools.ts`

```typescript
import { Dimensions, StatusBar, Platform, NativeModules } from 'react-native';
import { getWindowSize as getWindowSizeRaw } from './nativeModules/utils';
import { isAndroid, isIOS, platformSelect } from './platform';

export type SizeHandler = (size: { width: number; height: number }) => void;

export const getWindowSize = async () => {
  // iOS 使用 Dimensions API
  if (isIOS) {
    const window = Dimensions.get('window');
    const screen = Dimensions.get('screen');
    return {
      width: Math.round(window.width),
      height: Math.round(window.height),
    };
  }

  // Android 使用原生模块
  return getWindowSizeRaw().then((size) => {
    const scale = Dimensions.get('window').scale;
    size.width = size.width / scale;
    size.height = size.height / scale;
    return size;
  });
};

export const windowSizeTools = {
  size: {
    width: 0,
    height: 0,
  },
  listeners: [] as SizeHandler[],

  getSize() {
    return this.size;
  },

  onSizeChanged(handler: SizeHandler) {
    this.listeners.push(handler);
    return () => {
      const index = this.listeners.indexOf(handler);
      if (index > -1) this.listeners.splice(index, 1);
    };
  },

  async init() {
    let size;

    if (isIOS) {
      // iOS 直接使用 Dimensions
      const window = Dimensions.get('window');
      size = {
        width: Math.round(window.width),
        height: Math.round(window.height),
      };
    } else {
      // Android 使用原生模块
      size = await getWindowSize();
    }

    if (size.width) {
      this.size = size;
    } else {
      const window = Dimensions.get('window');
      this.size = {
        width: Math.round(window.width),
        height: Math.round(window.height) + (StatusBar.currentHeight ?? 0),
      };
    }

    return this.size;
  },

  setWindowSize(width: number, height: number) {
    this.size = {
      width: Math.round(width),
      height: Math.round(height),
    };
    for (const handler of this.listeners) handler(this.size);
  },
};

// 监听尺寸变化
if (isIOS) {
  Dimensions.addEventListener('change', ({ window }) => {
    windowSizeTools.setWindowSize(window.width, window.height);
  });
}
```

---

## 十、第三方依赖检查与适配

### 10.1 需要检查的依赖

| 依赖名称 | Android 支持 | iOS 支持 | 备注 |
|---------|-------------|---------|------|
| react-native-track-player | 是 | 是 | 需要 iOS 原生配置 |
| react-native-file-system | 是 | 是 | API 有差异 |
| react-native-fs | 是 | 是 | 需要注意路径格式 |
| react-native-navigation | 是 | 是 | 需要 iOS 原生配置 |
| react-native-background-timer | 是 | 是 | 需要测试 |
| @react-native-async-storage/async-storage | 是 | 是 | 完全支持 |
| react-native-vector-icons | 是 | 是 | 需要字体配置 |
| @react-native-clipboard/clipboard | 是 | 是 | 完全支持 |
| react-native-exception-handler | 是 | 有限 | iOS 不支持某些功能 |
| react-native-local-media-metadata | 是 | 需验证 | 可能需要替代方案 |

### 10.2 Podfile 更新

**文件位置**: `/home/rehamalamoasi583/code/lx-music-mobile/ios/Podfile`

```ruby
# Resolve react_native_pods.rb with node to allow for hoisting
require Pod::Executable.execute_command('node', ['-p',
  'require.resolve(
    "react-native/scripts/react_native_pods.rb",
    {paths: [process.argv[1]]},
  )', __dir__]).strip

platform :ios, min_ios_version_supported
prepare_react_native_project!

# 如果使用 use_frameworks，需要配置
# linkage = ENV['USE_FRAMEWORKS']
# if linkage != nil
#   Pod::UI.puts "Configuring Pod with #{linkage}ally linked Frameworks".green
#   use_frameworks! :linkage => linkage.to_sym
# end

target 'LxMusicMobile' do
  config = use_native_modules!

  use_react_native!(
    :path => config[:reactNativePath],
    :app_path => "#{Pod::Config.instance.installation_root}/.."
  )

  target 'LxMusicMobileTests' do
    inherit! :complete
  end

  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false
    )

    # iOS 14+ 需要配置
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
      end
    end
  end
end
```

---

## 十一、实施步骤

### Phase 1: 基础改造
1. 创建 `platform.ts` 平台判断工具
2. 创建 `permissions.ts` 权限管理模块
3. 改造 `fs.ts` 文件系统模块
4. 改造 `tools.ts` 中的平台相关函数

### Phase 2: 原生模块适配
1. 改造 `nativeModules/utils.ts`
2. 添加 iOS 原生模块实现（如需要）
3. 更新 `Info.plist` 配置
4. 更新 `AppDelegate.mm`

### Phase 3: UI 适配
1. 改造 `StatusBar` 组件
2. 改造 `useBackHandler` Hook
3. 改造 `windowSizeTools`
4. 测试导航和布局

### Phase 4: 播放器适配
1. 验证 `react-native-track-player` iOS 配置
2. 测试后台播放
3. 测试控制中心集成
4. 测试音频焦点处理

### Phase 5: 测试与优化
1. 真机测试
2. 性能优化
3. 修复发现的问题

---

## 十二、关键注意事项

### 12.1 文件路径
- iOS 使用应用沙盒，路径格式为 `file:///var/mobile/...`
- Android 可能需要处理 `content://` URI
- 使用 `toFileUrl()` 和 `fromFileUrl()` 工具函数处理路径

### 12.2 权限差异
- iOS 不需要存储权限（沙盒机制）
- iOS 需要麦克风权限描述（即使不使用）
- iOS 通知权限需要显式请求

### 12.3 后台播放
- iOS 必须在 Info.plist 中声明 `audio` 后台模式
- 必须配置 `AVAudioSession`
- 后台播放时锁屏控制需要 `MPNowPlayingInfoCenter`

### 12.4 UI 差异
- iOS 没有物理返回键
- iOS 使用 SafeArea 处理刘海屏
- iOS 状态栏高度固定为 44（刘海机型）

---

## 十三、推荐添加的依赖

```json
{
  "dependencies": {
    "react-native-device-info": "^10.0.0",
    "react-native-permissions": "^4.0.0"
  }
}
```

- `react-native-device-info`: 获取设备信息
- `react-native-permissions`: 统一权限管理

---

## 十四、调试技巧

### iOS 模拟器调试
```bash
cd /home/rehamalamoasi583/code/lx-music-mobile/ios
pod install
# 使用 Xcode 打开 LxMusicMobile.xcworkspace 进行调试
```

### 常见 iOS 问题
1. **音频不播放**: 检查 `AVAudioSession` 配置
2. **后台播放停止**: 检查 `UIBackgroundModes` 配置
3. **路径访问失败**: 确保使用正确的沙盒路径
4. **图片不显示**: 检查 `file://` 前缀
