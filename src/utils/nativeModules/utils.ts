import { AppState, NativeEventEmitter, NativeModules, Platform, Dimensions } from 'react-native'

const { UtilsModule } = NativeModules

export const exitApp = Platform.OS === 'ios' ? () => { console.log('exitApp is not supported on iOS') } : UtilsModule.exitApp

export const getSupportedAbis = Platform.OS === 'ios' ? () => [] : UtilsModule.getSupportedAbis

export const installApk = Platform.OS === 'ios' ? () => {} : (filePath: string, fileProviderAuthority: string) => UtilsModule.installApk(filePath, fileProviderAuthority)


export const screenkeepAwake = () => {
  if (global.lx.isScreenKeepAwake) return
  global.lx.isScreenKeepAwake = true
  if (Platform.OS === 'ios') return // iOS暂时未实现，忽略
  UtilsModule.screenkeepAwake()
}
export const screenUnkeepAwake = () => {
  if (!global.lx.isScreenKeepAwake) return
  global.lx.isScreenKeepAwake = false
  if (Platform.OS === 'ios') return // iOS暂时未实现，忽略
  UtilsModule.screenUnkeepAwake()
}

export const getWIFIIPV4Address = Platform.OS === 'ios' ? async () => '127.0.0.1' : UtilsModule.getWIFIIPV4Address as () => Promise<string>

export const getDeviceName = async(): Promise<string> => {
  if (Platform.OS === 'ios') return 'iPhone'
  return UtilsModule.getDeviceName().then((deviceName: string) => deviceName || 'Unknown')
}

export const isNotificationsEnabled = Platform.OS === 'ios' ? async () => true : UtilsModule.isNotificationsEnabled as () => Promise<boolean>

export const requestNotificationPermission = async() => new Promise<boolean>((resolve) => {
  if (Platform.OS === 'ios') {
    resolve(true)
    return
  }
  let subscription = AppState.addEventListener('change', (state) => {
    if (state != 'active') return
    subscription.remove()
    setTimeout(() => {
      void isNotificationsEnabled().then(resolve)
    }, 1000)
  })
  UtilsModule.openNotificationPermissionActivity().then((result: boolean) => {
    if (result) return
    subscription.remove()
    resolve(false)
  })
})

export const shareText = async(shareTitle: string, title: string, text: string): Promise<void> => {
  if (Platform.OS === 'ios') return;
  UtilsModule.shareText(shareTitle, title, text)
}

export const getSystemLocales = async(): Promise<string> => {
  if (Platform.OS === 'ios') return 'zh-CN'
  return UtilsModule.getSystemLocales()
}

export const onScreenStateChange = (handler: (state: 'ON' | 'OFF') => void): () => void => {
  if (Platform.OS === 'ios') return () => {}
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const eventEmitter = new NativeEventEmitter(UtilsModule)
  const eventListener = eventEmitter.addListener('screen-state', event => {
    handler(event.state as 'ON' | 'OFF')
  })
  return () => { eventListener.remove() }
}

export const getWindowSize = async(): Promise<{ width: number, height: number }> => {
  if (Platform.OS === 'ios') {
    const { width, height } = Dimensions.get('window')
    return { width, height }
  }
  return UtilsModule.getWindowSize()
}

export const onWindowSizeChange = (handler: (size: { width: number, height: number }) => void): () => void => {
  if (Platform.OS === 'ios') {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      handler({ width: window.width, height: window.height })
    })

    // 主动触发一次首屏加载事件，打破 React Native Navigation 的界面尺寸死锁红线！
    setTimeout(() => {
       const initialSize = Dimensions.get('window')
       handler({ width: initialSize.width, height: initialSize.height })
    }, 100)

    return () => { subscription.remove() }
  }

  UtilsModule.listenWindowSizeChanged()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const eventEmitter = new NativeEventEmitter(UtilsModule)
  const eventListener = eventEmitter.addListener('screen-size-changed', event => {
    handler(event as { width: number, height: number })
  })

  return () => { eventListener.remove() }
}

export const isIgnoringBatteryOptimization = async(): Promise<boolean> => {
  if (Platform.OS === 'ios') return true
  return UtilsModule.isIgnoringBatteryOptimization()
}

export const requestIgnoreBatteryOptimization = async() => new Promise<boolean>((resolve) => {
  if (Platform.OS === 'ios') {
     resolve(true)
     return
  }
  let subscription = AppState.addEventListener('change', (state) => {
    if (state != 'active') return
    subscription.remove()
    setTimeout(() => {
      void isIgnoringBatteryOptimization().then(resolve)
    }, 1000)
  })
  UtilsModule.requestIgnoreBatteryOptimization().then((result: boolean) => {
    if (result) return
    subscription.remove()
    resolve(false)
  })
})
