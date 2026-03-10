/**
 * 跨平台文件系统工具
 * 处理 iOS 和 Android 的文件路径差异
 */

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
export const temporaryDirectoryPath = Dirs.CacheDir;

/**
 * 外部存储目录
 * Android: SD卡路径（可能为 null）
 * iOS: 空字符串（iOS 没有外部存储概念）
 */
export const externalStorageDirectoryPath = platformSelect({
  android: Dirs.SDCardDir ?? '',
  ios: '',
});

/**
 * 私有文档目录（应用沙盒）
 * Android: /data/data/<package>/files
 * iOS: <App Sandbox>/Documents
 */
export const privateStorageDirectoryPath = Dirs.DocumentDir;

/**
 * iOS Library 目录
 * Android: 空字符串
 * iOS: <App Sandbox>/Library
 */
export const iosLibraryDirectoryPath = platformSelect({
  android: '',
  ios: (Dirs as any).LibraryDir ?? '',
});

/**
 * 音乐专用存储目录
 * Android: <DocumentDir>/Music
 * iOS: <LibraryDir>/Music（推荐）
 */
export const musicDirectoryPath = platformSelect({
  android: `${Dirs.DocumentDir}/Music`,
  ios: `${(Dirs as any).LibraryDir ?? Dirs.DocumentDir}/Music`,
});

/**
 * 下载目录
 * Android: <DocumentDir>/Downloads
 * iOS: <LibraryDir>/Downloads
 */
export const downloadsDirectoryPath = platformSelect({
  android: `${Dirs.DocumentDir}/Downloads`,
  ios: `${(Dirs as any).LibraryDir ?? Dirs.DocumentDir}/Downloads`,
});

// ========== Android 特有功能 ==========

/**
 * 获取外部存储路径列表
 * 仅 Android 支持
 */
export const getExternalStoragePaths = async (
  isRemovable?: boolean
): Promise<string[]> => {
  if (!isAndroid) return [];
  return _getExternalStoragePaths(isRemovable);
};

/**
 * 选择管理文件夹（SAF）
 * 仅 Android 支持
 */
export const selectManagedFolder = async (
  isPersist: boolean = false
): Promise<string | null> => {
  if (!isAndroid) {
    console.warn('selectManagedFolder is Android only');
    return null;
  }
  return AndroidScoped.openDocumentTree(isPersist);
};

/**
 * 选择文件（SAF）
 * 仅 Android 支持
 */
export const selectFile = async (
  options: OpenDocumentOptions
): Promise<string | null> => {
  if (!isAndroid) {
    console.warn('selectFile is Android only');
    return null;
  }
  return AndroidScoped.openDocument(options);
};

/**
 * 移除管理文件夹权限
 * 仅 Android 支持
 */
export const removeManagedFolder = async (path: string): Promise<void> => {
  if (!isAndroid) return;
  return AndroidScoped.releasePersistableUriPermission(path);
};

/**
 * 获取已授权的管理文件夹列表
 * 仅 Android 支持
 */
export const getManagedFolders = async (): Promise<string[]> => {
  if (!isAndroid) return [];
  return AndroidScoped.getPersistedUriPermissions();
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
export const readDir = async (path: string): Promise<string[]> =>
  FileSystem.ls(path);

/**
 * 删除文件或目录
 */
export const unlink = async (path: string): Promise<void> =>
  FileSystem.unlink(path);

/**
 * 创建目录
 */
export const mkdir = async (path: string): Promise<void> =>
  FileSystem.mkdir(path);

/**
 * 获取文件状态
 */
export const stat = async (path: string): Promise<{
  size: number;
  modificationTime: number;
  type: 'file' | 'directory';
}> => FileSystem.stat(path);

/**
 * 计算文件哈希
 */
export const hash = async (
  path: string,
  algorithm: HashAlgorithm
): Promise<string> => FileSystem.hash(path, algorithm);

/**
 * 读取文件内容
 */
export const readFile = async (
  path: string,
  encoding?: Encoding
): Promise<string> => FileSystem.readFile(path, encoding);

/**
 * 移动文件
 */
export const moveFile = async (
  fromPath: string,
  toPath: string
): Promise<void> => FileSystem.mv(fromPath, toPath);

/**
 * 压缩文件（Gzip）
 */
export const gzipFile = async (
  fromPath: string,
  toPath: string
): Promise<void> => FileSystem.gzipFile(fromPath, toPath);

/**
 * 解压文件（Gzip）
 */
export const unGzipFile = async (
  fromPath: string,
  toPath: string
): Promise<void> => FileSystem.unGzipFile(fromPath, toPath);

/**
 * 压缩字符串（Gzip）
 */
export const gzipString = async (
  data: string,
  encoding?: Encoding
): Promise<string> => FileSystem.gzipString(data, encoding);

/**
 * 解压字符串（Gzip）
 */
export const unGzipString = async (
  data: string,
  encoding?: Encoding
): Promise<string> => FileSystem.unGzipString(data, encoding);

/**
 * 检查文件是否存在
 */
export const existsFile = async (path: string): Promise<boolean> =>
  FileSystem.exists(path);

/**
 * 重命名文件
 */
export const rename = async (path: string, name: string): Promise<void> =>
  FileSystem.rename(path, name);

/**
 * 写入文件
 */
export const writeFile = async (
  path: string,
  data: string,
  encoding?: Encoding
): Promise<void> => FileSystem.writeFile(path, data, encoding);

/**
 * 追加写入文件
 */
export const appendFile = async (
  path: string,
  data: string,
  encoding?: Encoding
): Promise<void> => FileSystem.appendFile(path, data, encoding);

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
    android: `${Dirs.DocumentDir}/Downloads`,
    ios: `${(Dirs as any).LibraryDir ?? Dirs.DocumentDir}/Downloads`,
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
