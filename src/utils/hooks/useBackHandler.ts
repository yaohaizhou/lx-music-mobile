import { useEffect } from 'react'
import { BackHandler, Platform } from 'react-native'

export function useBackHandler(handler: () => boolean) {
  useEffect(() => {
    // iOS不支持硬件返回键
    if (Platform.OS !== 'android') return

    BackHandler.addEventListener('hardwareBackPress', handler)

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handler)
    }
  }, [handler])
}
