import { temporaryDirectoryPath, readDir, unlink, extname } from '@/utils/fs'
import { isAndroid } from '@/utils/platform'

// react-native-local-media-metadata 仅支持 Android
const LocalMediaModule = isAndroid ? require('react-native-local-media-metadata') : null

// 导出类型定义
type MusicMetadata = {
  type: 'mp3' | 'flac' | 'ogg' | 'wav'
  bitrate: string
  interval: number
  size: number
  ext: 'mp3' | 'flac' | 'ogg' | 'wav'
  albumName: string
  singer: string
  name: string
}

type MusicMetadataFull = MusicMetadata & {
  lyric: string
}

// 导出函数（iOS 上返回空实现）
export const readMetadata = async (filePath: string): Promise<MusicMetadata | null> => {
  if (!isAndroid) {
    console.warn('readMetadata is not supported on iOS')
    return null
  }
  return LocalMediaModule?.readMetadata?.(filePath) ?? null
}

export const writeMetadata = async (filePath: string, metadata: Partial<MusicMetadata>): Promise<void> => {
  if (!isAndroid) {
    console.warn('writeMetadata is not supported on iOS')
    return
  }
  return LocalMediaModule?.writeMetadata?.(filePath, metadata)
}

export const writePic = async (filePath: string, picPath: string): Promise<void> => {
  if (!isAndroid) {
    console.warn('writePic is not supported on iOS')
    return
  }
  return LocalMediaModule?.writePic?.(filePath, picPath)
}

export const readLyric = async (filePath: string): Promise<string> => {
  if (!isAndroid) {
    console.warn('readLyric is not supported on iOS')
    return ''
  }
  return LocalMediaModule?.readLyric?.(filePath) ?? ''
}

export const writeLyric = async (filePath: string, lyric: string): Promise<void> => {
  if (!isAndroid) {
    console.warn('writeLyric is not supported on iOS')
    return
  }
  return LocalMediaModule?.writeLyric?.(filePath, lyric)
}

export type { MusicMetadata, MusicMetadataFull }

const _readPic = isAndroid ? LocalMediaModule?.readPic : null

let cleared = false
const picCachePath = temporaryDirectoryPath + '/local-media-metadata'

export const scanAudioFiles = async(dirPath: string) => {
  const files = await readDir(dirPath)
  return files.filter(file => {
    if (file.mimeType?.startsWith('audio/')) return true
    if (extname(file?.name ?? '') === 'ogg') return true
    return false
  }).map(file => file)
}

const clearPicCache = async() => {
  await unlink(picCachePath)
  cleared = true
}

export const readPic = async(dirPath: string): Promise<string> => {
  if (!cleared) await clearPicCache()
  return _readPic(dirPath, picCachePath)
}

// export interface MusicMetadata {
//   type: 'mp3' | 'flac' | 'ogg' | 'wav'
//   bitrate: string
//   interval: number
//   size: number
//   ext: 'mp3' | 'flac' | 'ogg' | 'wav'
//   albumName: string
//   singer: string
//   name: string
// }
// export const readMetadata = async(filePath: string): Promise<MusicMetadata | null> => {
//   return LocalMediaModule.readMetadata(filePath)
// }

// export const readPic = async(filePath: string): Promise<string> => {
//   return LocalMediaModule.readPic(filePath)
// }

// export const readLyric = async(filePath: string): Promise<string> => {
//   return LocalMediaModule.readLyric(filePath)
// }


