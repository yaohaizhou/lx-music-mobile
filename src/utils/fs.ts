/**
 * 跨平台文件系统工具
 * 处理 iOS 和 Android 的文件路径差异
 */

import * as RNFS from 'react-native-fs';
import { isAndroid, isIOS, platformSelect } from './platform';

// Android 特有功能：react-native-file-system 仅在 Android 可用
// iOS 使用 react-native-fs (RNFS) 作为替代
interface FileSystemAndroidModule {
  Dirs: {
    CacheDir: string;
    DatabaseDir?: string;
    DocumentDir: string;
    MainBundleDir: string;
    SDCardDir: string;
  };
  FileSystem: {
    ls(path: string): Promise<{ name: string }[]>;
    unlink(path: string): Promise<boolean>;
    mkdir(path: string): Promise<unknown>;
    stat(path: string): Promise<{ size: number; lastModified: number; isFile: boolean; isDirectory: boolean }>;
    hash(path: string, algorithm?: string): Promise<string>;
    readFile(path: string, encoding?: string): Promise<string>;
    mv(source: string, target: string): Promise<boolean>;
    gzipFile(source: string, target: string): Promise<void>;
    unGzipFile(source: string, target: string): Promise<void>;
    gzipString(data: string, encoding?: string): Promise<string>;
    unGzipString(data: string, encoding?: string): Promise<string>;
    exists(path: string): Promise<boolean>;
    rename(source: string, name: string): Promise<boolean>;
    writeFile(path: string, data: string, encoding?: string): Promise<void>;
    appendFile(path: string, data: string, encoding?: string): Promise<void>;
  };
  AndroidScoped: {
    openDocumentTree(isPersist: boolean): Promise<{ path: string }>;
    openDocument(options: { mimeTypes?: string[]; extTypes?: string[]; multi?: boolean; toPath?: string; encoding?: string }): Promise<{ path: string } | { path: string }[]>;
    releasePersistableUriPermission(path: string): unknown;
    getPersistedUriPermissions(): Promise<string[]>;
  };
  getExternalStoragePaths(isRemovable?: boolean): Promise<string[]>;
}

let FileSystemAndroid: FileSystemAndroidModule | null = null;
if (isAndroid) {
  try {
    FileSystemAndroid = require('react-native-file-system');
  } catch (e) {
    console.warn('react-native-file-system not available on Android');
  }
}

// 类型导出（兼容）
export type FileType = 'file' | 'directory';

/**
 * 获取文件扩展名
 */
export const extname = (name: string): string =>
  name.lastIndexOf('.') > 0 ? name.substring(name.lastIndexOf('.') + 1) : '';

// ========== 平台特定的路径常量 ==========

/**
 * 临时目录（缓存）
 * Android: /data/data/<package>/cache
 * iOS: <App Sandbox>/Library/Caches
 */
export const temporaryDirectoryPath = RNFS.CachesDirectoryPath;

/**
 * 外部存储目录
 * Android: SD卡路径（可能为 null）
 * iOS: 空字符串（iOS 没有外部存储概念）
 */
export const externalStorageDirectoryPath = platformSelect({
  android: RNFS.ExternalStorageDirectoryPath ?? '',
  ios: '',
});

/**
 * 私有文档目录（应用沙盒）
 * Android: /data/data/<package>/files
 * iOS: <App Sandbox>/Documents
 */
export const privateStorageDirectoryPath = RNFS.DocumentDirectoryPath;

/**
 * iOS Library 目录
 * Android: 空字符串
 * iOS: <App Sandbox>/Library
 */
export const iosLibraryDirectoryPath = platformSelect({
  android: '',
  ios: RNFS.LibraryDirectoryPath ?? '',
});

/**
 * 音乐专用存储目录
 * Android: <DocumentDir>/Music
 * iOS: <LibraryDir>/Music（推荐）
 */
export const musicDirectoryPath = platformSelect({
  android: `${RNFS.DocumentDirectoryPath}/Music`,
  ios: `${RNFS.LibraryDirectoryPath ?? RNFS.DocumentDirectoryPath}/Music`,
});

/**
 * 下载目录
 * Android: <DocumentDir>/Downloads
 * iOS: <LibraryDir>/Downloads
 */
export const downloadsDirectoryPath = platformSelect({
  android: `${RNFS.DocumentDirectoryPath}/Downloads`,
  ios: `${RNFS.LibraryDirectoryPath ?? RNFS.DocumentDirectoryPath}/Downloads`,
});

// ========== Android 特有功能 ==========

/**
 * 获取外部存储路径列表
 * 仅 Android 支持
 */
export const getExternalStoragePaths = async (
  isRemovable?: boolean
): Promise<string[]> => {
  if (!isAndroid || !FileSystemAndroid) return [];
  return FileSystemAndroid.getExternalStoragePaths(isRemovable);
};

/**
 * 选择管理文件夹（SAF）
 * 仅 Android 支持
 */
export const selectManagedFolder = async (
  isPersist: boolean = false
): Promise<string | null> => {
  if (!isAndroid || !FileSystemAndroid) {
    console.warn('selectManagedFolder is Android only');
    return null;
  }
  const result = await FileSystemAndroid.AndroidScoped.openDocumentTree(isPersist);
  // react-native-file-system 返回的是包含 path 属性的对象
  return result?.path ?? null;
};

/**
 * 选择文件（SAF）
 * 仅 Android 支持
 */
export const selectFile = async (
  options: { mimeTypes?: string[]; extTypes?: string[]; multi?: boolean; toPath?: string; encoding?: string }
): Promise<string | string[] | null> => {
  if (!isAndroid || !FileSystemAndroid) {
    console.warn('selectFile is Android only');
    return null;
  }
  const result = await FileSystemAndroid.AndroidScoped.openDocument(options);
  // react-native-file-system 返回的是 FileType 对象或对象数组
  if (Array.isArray(result)) {
    return result.map(item => item.path);
  }
  return result?.path ?? null;
};

/**
 * 移除管理文件夹权限
 * 仅 Android 支持
 */
export const removeManagedFolder = async (path: string): Promise<void> => {
  if (!isAndroid || !FileSystemAndroid) return;
  await FileSystemAndroid.AndroidScoped.releasePersistableUriPermission(path);
};

/**
 * 获取已授权的管理文件夹列表
 * 仅 Android 支持
 */
export const getManagedFolders = async (): Promise<string[]> => {
  if (!isAndroid || !FileSystemAndroid) return [];
  return FileSystemAndroid.AndroidScoped.getPersistedUriPermissions();
};

/**
 * 获取持久化 URI 列表
 * 仅 Android 支持
 * @deprecated 请使用 getManagedFolders
 */
export const getPersistedUriList = getManagedFolders;

// ========== 通用文件操作 ==========

/**
 * 读取目录内容
 */
export const readDir = async (path: string): Promise<string[]> => {
  const result = await RNFS.readDir(path);
  return result.map(item => item.name);
};

/**
 * 删除文件或目录
 */
export const unlink = async (path: string): Promise<void> => {
  await RNFS.unlink(path);
};

/**
 * 创建目录
 */
export const mkdir = async (path: string): Promise<void> => {
  await RNFS.mkdir(path, { NSURLIsExcludedFromBackupKey: true });
};

/**
 * 获取文件状态
 */
export const stat = async (path: string): Promise<{
  size: number;
  modificationTime: number;
  type: 'file' | 'directory';
}> => {
  const result = await RNFS.stat(path);
  return {
    size: Number(result.size),
    modificationTime: Number(result.mtime),
    type: result.isDirectory() ? 'directory' : 'file',
  };
};

/**
 * 计算文件哈希 (MD5)
 * 注意：react-native-fs 只支持 MD5
 */
export const hash = async (
  path: string,
  algorithm: 'md5' | 'sha1' | 'sha256' = 'md5'
): Promise<string> => {
  // RNFS 只支持 MD5，如果需要其他算法需要在原生端实现
  if (algorithm !== 'md5') {
    console.warn(`RNFS only supports md5 hash, requested: ${algorithm}`);
  }
  return RNFS.hash(path, 'md5');
};

/**
 * 读取文件内容
 */
export const readFile = async (
  path: string,
  encoding?: 'utf8' | 'base64' | 'ascii'
): Promise<string> => {
  return RNFS.readFile(path, encoding ?? 'utf8');
};

/**
 * 移动文件
 */
export const moveFile = async (
  fromPath: string,
  toPath: string
): Promise<void> => {
  await RNFS.moveFile(fromPath, toPath);
};

/**
 * 压缩文件（Gzip）
 * 注意：RNFS 不直接支持 gzip，需要使用原生模块或其他库
 */
export const gzipFile = async (
  fromPath: string,
  toPath: string
): Promise<void> => {
  // 如果 Android 上有 react-native-file-system，使用它
  if (isAndroid && FileSystemAndroid) {
    return FileSystemAndroid.FileSystem.gzipFile(fromPath, toPath);
  }
  throw new Error('gzipFile is not supported on iOS. Use a gzip library like pako or react-native-zip-archive.');
};

/**
 * 解压文件（Gzip）
 * 注意：RNFS 不直接支持 gzip
 */
export const unGzipFile = async (
  fromPath: string,
  toPath: string
): Promise<void> => {
  // 如果 Android 上有 react-native-file-system，使用它
  if (isAndroid && FileSystemAndroid) {
    return FileSystemAndroid.FileSystem.unGzipFile(fromPath, toPath);
  }
  throw new Error('unGzipFile is not supported on iOS. Use a gzip library like pako or react-native-zip-archive.');
};

/**
 * 压缩字符串（Gzip）
 * 注意：RNFS 不直接支持 gzip
 */
export const gzipString = async (
  data: string,
  encoding?: 'utf8' | 'base64'
): Promise<string> => {
  // 如果 Android 上有 react-native-file-system，使用它
  if (isAndroid && FileSystemAndroid) {
    return FileSystemAndroid.FileSystem.gzipString(data, encoding);
  }
  throw new Error('gzipString is not supported on iOS. Use a gzip library like pako.');
};

/**
 * 解压字符串（Gzip）
 * 注意：RNFS 不直接支持 gzip
 */
export const unGzipString = async (
  data: string,
  encoding?: 'utf8' | 'base64'
): Promise<string> => {
  // 如果 Android 上有 react-native-file-system，使用它
  if (isAndroid && FileSystemAndroid) {
    return FileSystemAndroid.FileSystem.unGzipString(data, encoding);
  }
  throw new Error('unGzipString is not supported on iOS. Use a gzip library like pako.');
};

/**
 * 检查文件是否存在
 */
export const existsFile = async (path: string): Promise<boolean> => {
  return RNFS.exists(path);
};

/**
 * 重命名文件
 */
export const rename = async (path: string, name: string): Promise<void> => {
  const parentPath = path.substring(0, path.lastIndexOf('/') + 1);
  const newPath = parentPath + name;
  await RNFS.moveFile(path, newPath);
};

/**
 * 写入文件
 */
export const writeFile = async (
  path: string,
  data: string,
  encoding?: 'utf8' | 'base64' | 'ascii'
): Promise<void> => {
  await RNFS.writeFile(path, data, encoding ?? 'utf8');
};

/**
 * 追加写入文件
 */
export const appendFile = async (
  path: string,
  data: string,
  encoding?: 'utf8' | 'base64' | 'ascii'
): Promise<void> => {
  await RNFS.appendFile(path, data, encoding ?? 'utf8');
};

// ========== 下载功能 ==========

/**
 * 下载文件
 * 自动根据平台设置合适的 User-Agent
 */
export const downloadFile = (
  url: string,
  path: string,
  options: Omit<RNFS.DownloadFileOptions, 'fromUrl' | 'toFile'> = {}
): { jobId: number; promise: Promise<RNFS.DownloadResult> } => {
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

  const headers = options.headers || defaultHeaders;

  return RNFS.downloadFile({
    fromUrl: url,
    toFile: path,
    ...options,
    headers,
  });
};

/**
 * 停止下载
 */
export const stopDownload = (jobId: number): void => {
  RNFS.stopDownload(jobId);
};

// ========== 路径工具函数 ==========

/**
 * 将路径转换为 file:// URL
 */
export const toFileUrl = (path: string): string => {
  if (path.startsWith('file://')) return path;
  return `file://${path}`;
};

/**
 * 从 file:// URL 提取实际路径
 */
export const fromFileUrl = (url: string): string => {
  return url.replace(/^file:\/\//, '');
};

/**
 * 获取适合当前平台的默认存储路径
 */
export const getDefaultStoragePath = (): string => {
  return platformSelect({
    android: `${RNFS.DocumentDirectoryPath}/Downloads`,
    ios: `${RNFS.LibraryDirectoryPath ?? RNFS.DocumentDirectoryPath}/Downloads`,
  });
};

/**
 * 获取缓存目录
 */
export const getCacheDirectory = (): string => {
  return temporaryDirectoryPath;
};

/**
 * 清理缓存目录
 */
export const clearCache = async (): Promise<void> => {
  const cacheDir = temporaryDirectoryPath;
  const items = await readDir(cacheDir);
  for (const item of items) {
    const fullPath = `${cacheDir}/${item}`;
    await unlink(fullPath);
  }
};

/**
 * 获取应用可持久化存储的总大小
 */
export const getTotalSize = async (): Promise<number> => {
  try {
    const cacheSize = await RNFS.getFSInfo();
    return cacheSize.totalSpace;
  } catch {
    return 0;
  }
};

/**
 * 获取可用空间
 */
export const getFreeSpace = async (): Promise<number> => {
  try {
    const info = await RNFS.getFSInfo();
    return info.freeSpace;
  } catch {
    return 0;
  }
};
