import { Dimensions, StatusBar, Platform } from 'react-native'
import { getWindowSize as getWindowSizeRaw } from './nativeModules/utils'

export type SizeHandler = (size: { width: number, height: number }) => void
export const getWindowSize = async() => {
  return getWindowSizeRaw().then((size) => {
    // 【关键修复】iOS系统的 Dimensions 获取到的已经是逻辑点（pt），无需除以 scale。强行除以反而会把屏幕无限缩小。
    if (Platform.OS === 'ios') return size;

    const scale = Dimensions.get('window').scale
    size.width = size.width / scale
    size.height = size.height / scale
    return size
  })
}

export const windowSizeTools = {
  size: {
    width: 0,
    height: 0,
  },
  listeners: [] as SizeHandler[],
  getSize() {
    return this.size
  },
  onSizeChanged(handler: SizeHandler) {
    this.listeners.push(handler)

    return () => {
      this.listeners.splice(this.listeners.indexOf(handler), 1)
    }
  },
  async init() {
    const size = await getWindowSize()
    if (size.width) {
      this.size = size
    } else {
      const window = Dimensions.get('window')
      this.size = {
        width: Math.round(window.width),
        height: Math.round(window.height) + (StatusBar.currentHeight ?? 0),
      }
    }
    return size
  },
  setWindowSize(width: number, height: number) {
    this.size = {
      width: Math.round(width),
      height: Math.round(height),
    }
    for (const handler of this.listeners) handler(this.size)
  },
}
