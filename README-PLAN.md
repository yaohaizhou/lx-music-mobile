# LX-Music-Mobile Android转iOS项目改造计划

## 项目概述
- **项目名称**: lx-music-mobile（洛雪音乐助手移动版）
- **当前版本**: 1.8.1
- **技术栈**: React Native 0.73.11
- **目标**: 将Android为主的RN应用改造为完全支持iOS的版本
- **预估工期**: 12-17周

---

## 背景与目标

### 为什么需要iOS改造
项目目前README明确说明**无计划支持iOS**，但随着用户群体扩大和跨平台需求增加，iOS支持将显著提升应用覆盖范围。

### 核心挑战
1. **5个Android原生模块**需iOS重写
2. **桌面悬浮歌词**功能iOS不支持，需重新设计
3. **QuickJS脚本引擎**需iOS移植或使用替代方案
4. **文件系统**依赖仅Android支持

---

## Phase 1: 基础环境搭建（第1-2周）

### 1.1 iOS项目配置完善

**修改文件**: `ios/LxMusicMobile/Info.plist`

需添加的权限:
```xml
<!-- 后台音频播放 -->
<key>UIBackgroundModes</key>
<array>
    <string>audio</string>
    <string>fetch</string>
</array>

<!-- 网络权限 -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>

<!-- 本地网络（WiFi同步） -->
<key>NSLocalNetworkUsageDescription</key>
<string>需要访问本地网络以获取WIFI IP地址</string>

<!-- 通知权限 -->
<key>NSUserNotificationUsageDescription</key>
<string>需要通知权限以显示播放控制</string>
```

### 1.2 依赖库替换

```bash
# 添加跨平台依赖
npm install react-native-simple-toast
npm install react-native-permissions
npm install react-native-safe-area-context
npm install react-native-device-info
```

**Podfile更新**:
```ruby
platform :ios, '13.0'

# 添加QuickJS依赖（可选）
pod 'quickjs-ios', :git => 'https://github.com/lywhut/quickjs-ios.git'
```

---

## Phase 2: 原生模块实现（第3-8周）

### 2.1 CryptoModule（第3周）

**新建文件**:
- `ios/LxMusicMobile/Modules/CryptoModule.h`
- `ios/LxMusicMobile/Modules/CryptoModule.m`

**核心技术**: iOS CommonCrypto框架
- RSA使用Security.framework
- AES使用CommonCryptor
- 支持Sync/Async两种调用方式

**关键代码结构**:
```objc
RCT_EXPORT_METHOD(aesEncrypt:(NSString *)text key:(NSString *)key iv:(NSString *)iv mode:(NSString *)mode resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(rsaEncryptSync:(NSString *)text key:(NSString *)key padding:(NSString *)padding)
```

### 2.2 CacheModule（第3周）

**新建文件**:
- `ios/LxMusicMobile/Modules/CacheModule.h`
- `ios/LxMusicMobile/Modules/CacheModule.m`

**核心技术**: Foundation框架
- 缓存路径: `NSCachesDirectory`
- 递归计算文件夹大小
- 异步清除操作

### 2.3 UtilsModule（第4周）

**新建文件**:
- `ios/LxMusicMobile/Modules/UtilsModule.h`
- `ios/LxMusicMobile/Modules/UtilsModule.m`

| Android方法 | iOS实现 | 说明 |
|-------------|---------|------|
| exitApp | `exit(0)`或忽略 | iOS不推荐强制退出 |
| getSupportedAbis | `uname()`获取架构 | 返回@["arm64"] |
| installApk | reject错误 | iOS不支持 |
| screenkeepAwake | `idleTimerDisabled` | 屏幕常亮 |
| getWIFIIPV4Address | `getifaddrs()` | 获取WiFi IP |
| getDeviceName | `UIDevice.name` | 设备名称 |
| isNotificationsEnabled | `UNUserNotificationCenter` | 通知权限检查 |
| shareText | `UIActivityViewController` | 系统分享 |
| isIgnoringBatteryOptimization | 返回@YES | iOS无此概念 |

### 2.4 UserApiModule（第5-6周）

**新建文件**:
- `ios/LxMusicMobile/Modules/UserApiModule.h`
- `ios/LxMusicMobile/Modules/UserApiModule.m`

**技术方案选择**:
- 方案A: JavaScriptCore（推荐，系统内置）
- 方案B: QuickJS iOS绑定（保持与Android一致）

**核心实现**:
```objc
@property (nonatomic, strong) JSContext *jsContext;

// 注入原生桥接函数
self.jsContext[@"__lx_native_call__"] = ^(NSString *key, NSString *action, NSString *data) {
    // 处理原生调用
};
```

### 2.5 LyricModule（第7-8周）

**问题**: iOS不支持悬浮窗

**替代方案**（选择A+C组合）:

**方案A: Live Activity（iOS 16.1+）**
```swift
import ActivityKit

@available(iOS 16.1, *)
struct LyricWidgetAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var currentLine: String
        var nextLine: String
        var progress: Double
    }
}
```

**方案C: Now Playing Info（全版本）**
```objc
MPNowPlayingInfoCenter *center = [MPNowPlayingInfoCenter defaultCenter];
center.nowPlayingInfo = @{
    MPMediaItemPropertyTitle: currentLyric,
    MPMediaItemPropertyArtist: @"LX Music"
};
```

---

## Phase 3: JS层适配（第9-10周）

### 3.1 工具函数修改

**文件**: `src/utils/tools.ts`

**替换ToastAndroid**:
```typescript
import Toast from 'react-native-simple-toast';

export const toast = (message: string, duration: 'long' | 'short' = 'short') => {
  Toast.show(message, duration === 'long' ? Toast.LONG : Toast.SHORT);
};
```

**替换PermissionsAndroid**:
```typescript
import { check, PERMISSIONS, RESULTS } from 'react-native-permissions';

export const checkStoragePermissions = async () => {
  if (isIOS) return true; // iOS不需要存储权限
  const result = await check(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
  return result === RESULTS.GRANTED;
};
```

**替换exitApp**:
```typescript
import RNExitApp from 'react-native-exit-app';

export const exitApp = () => {
  if (isAndroid) {
    BackHandler.exitApp();
  } else {
    RNExitApp.exitApp();
  }
};
```

### 3.2 BackHandler适配

**文件**: `src/utils/hooks/useBackHandler.ts`

```typescript
export function useBackHandler(handler: () => boolean) {
  useEffect(() => {
    if (Platform.OS !== 'android') return; // iOS不支持
    BackHandler.addEventListener('hardwareBackPress', handler);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handler);
    };
  }, [handler]);
}
```

### 3.3 SafeArea适配

**文件**: `src/components/PageContent.tsx`

```typescript
import { SafeAreaView } from 'react-native-safe-area-context';

export const PageContent = ({ children }) => (
  <SafeAreaView style={{ flex: 1 }}>
    {children}
  </SafeAreaView>
);
```

---

## Phase 4: UI/UX适配（第11-12周）

### 4.1 组件替换

| Android组件 | iOS替代 | 文件 |
|------------|---------|------|
| DrawerLayoutAndroid | react-native-drawer-layout | `src/components/common/DrawerLayoutFixed.tsx` |

### 4.2 iOS风格调整
- 导航栏: iOS风格返回按钮
- 状态栏: 适配刘海屏
- 按钮: iOS按压效果
- 字体: 使用系统San Francisco字体

---

## Phase 5: 测试发布（第13-14周）

### 5.1 测试清单
- [ ] 音频播放/暂停/跳转
- [ ] 后台播放
- [ ] 控制中心和锁屏控制
- [ ] AirPods控制
- [ ] 来电中断恢复
- [ ] 暗黑模式切换
- [ ] iPhone/iPad适配

### 5.2 App Store准备
- App Icon（各尺寸）
- 截图（iPhone 6.7", 6.5", 5.5"）
- 隐私政策
- PrivacyInfo.xcprivacy

---

## 关键文件清单

### 需创建的iOS原生文件
```
ios/LxMusicMobile/Modules/
├── UtilsModule.h/m
├── CryptoModule.h/m
├── CacheModule.h/m
├── LyricModule.h/m
├── UserApiModule.h/m
└── LyricWidget/
    ├── LyricWidget.swift
    └── LyricWidgetBundle.swift
```

### 需修改的JS文件
```
src/
├── utils/
│   ├── tools.ts (Toast, 权限, exitApp)
│   ├── fs.ts (文件选择)
│   ├── permissions.ts (权限系统)
│   └── hooks/useBackHandler.ts
├── components/
│   ├── common/DrawerLayoutFixed.tsx
│   └── PageContent.tsx
└── screens/
    └── */Header.tsx
```

---

## 实施路线图

```
Week 1-2:   Phase 1 - 环境搭建
            ├── Info.plist配置
            ├── Podfile更新
            └── 依赖安装

Week 3:     Phase 2 - CryptoModule + CacheModule
            ├── 加密模块实现
            └── 缓存模块实现

Week 4:     Phase 2 - UtilsModule
            └── 工具函数模块实现

Week 5-6:   Phase 2 - UserApiModule
            ├── JavaScriptCore集成
            └── JS桥接函数实现

Week 7-8:   Phase 2 - LyricModule
            ├── Now Playing实现
            └── Live Activity实现（可选）

Week 9-10:  Phase 3 - JS层适配
            ├── 工具函数修改
            └── SafeArea适配

Week 11-12: Phase 4 - UI/UX适配
            ├── 组件替换
            └── iOS风格调整

Week 13-14: Phase 5 - 测试发布
            ├── 功能测试
            └── App Store准备
```

---

## 风险与应对策略

| 风险 | 影响 | 应对策略 |
|------|------|----------|
| 桌面歌词无法实现 | 高 | 使用Live Activity + Now Playing替代 |
| QuickJS移植困难 | 中 | 改用JavaScriptCore |
| App Store审核被拒 | 高 | 避免下载功能，定位为"音乐搜索工具" |
| 文件系统差异 | 中 | 统一抽象层，沙盒路径处理 |

---

## 下一步行动

1. ✅ 完成项目分析和计划设计
2. 申请Apple Developer账号 ($99/年)
3. 创建iOS Bundle Identifier
4. 配置开发证书和Provisioning Profile
5. 开始Phase 1实施

---

## 参考资源

- [React Native iOS官方文档](https://reactnative.dev/docs/next/integration-with-existing-apps)
- [iOS CommonCrypto文档](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man3/Common%20Crypto.3.html)
- [JavaScriptCore框架](https://developer.apple.com/documentation/javascriptcore)
- [Live Activity开发指南](https://developer.apple.com/documentation/activitykit)
