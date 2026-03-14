import { NativeModules, NativeEventEmitter, Platform } from 'react-native'

const { LyricModule } = NativeModules

const isIOS = Platform.OS === 'ios'
const safeCall = (fn: any, fallback: any = undefined) => {
  if (isIOS) return async () => fallback
  if (typeof fn !== 'function') return async () => fallback
  return fn
}

// 省略了前面不需要关心的静态变量...
const getAlpha = (num: number) => num / 100
const getTextSize = (num: number) => num / 10

export const setSendLyricTextEvent = safeCall(LyricModule?.setSendLyricTextEvent)
export const showDesktopLyricView = safeCall(LyricModule?.showDesktopLyric)
export const hideDesktopLyricView = safeCall(LyricModule?.hideDesktopLyric)
export const play = safeCall(LyricModule?.play)
export const pause = safeCall(LyricModule?.pause)
export const setLyric = safeCall(LyricModule?.setLyric)
export const setPlaybackRate = safeCall(LyricModule?.setPlaybackRate)
export const toggleTranslation = safeCall(LyricModule?.toggleTranslation)
export const toggleRoma = safeCall(LyricModule?.toggleRoma)
export const toggleLock = safeCall(LyricModule?.toggleLock)
export const setColor = safeCall(LyricModule?.setColor)
export const setAlpha = safeCall(LyricModule?.setAlpha)
export const setTextSize = safeCall(LyricModule?.setTextSize)
export const setShowToggleAnima = safeCall(LyricModule?.setShowToggleAnima)
export const setSingleLine = safeCall(LyricModule?.setSingleLine)
export const setPosition = safeCall(LyricModule?.setPosition)
export const setMaxLineNum = safeCall(LyricModule?.setMaxLineNum)
export const setWidth = safeCall(LyricModule?.setWidth)
export const setLyricTextPosition = safeCall(LyricModule?.setLyricTextPosition)
export const checkOverlayPermission = safeCall(LyricModule?.checkOverlayPermission, false)
export const openOverlayPermissionActivity = safeCall(LyricModule?.openOverlayPermissionActivity)

export const onPositionChange = (handler: (position: { x: number, y: number }) => void): () => void => {
  if (isIOS || !LyricModule) return () => {}
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const eventEmitter = new NativeEventEmitter(LyricModule)
  const eventListener = eventEmitter.addListener('set-position', event => {
    handler(event as { x: number, y: number })
  })
  return () => { eventListener.remove() }
}

export const onLyricLinePlay = (handler: (lineInfo: { text: string, extendedLyrics: string[] }) => void): () => void => {
  if (isIOS || !LyricModule) return () => {}
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const eventEmitter = new NativeEventEmitter(LyricModule)
  const eventListener = eventEmitter.addListener('lyric-line-play', event => {
    handler(event as { text: string, extendedLyrics: string[] })
  })
  return () => { eventListener.remove() }
}
