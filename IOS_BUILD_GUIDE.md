# LX Music Mobile iOS 构建指南

## 构建环境要求

- **操作系统**: macOS 12.0 或更高版本
- **Xcode**: 14.0 或更高版本 (需要安装Command Line Tools)
- **CocoaPods**: 最新版本
- **Node.js**: 18.0 或更高版本
- **Apple Developer账号**: 需要有效的开发者账号（$99/年）来签名和打包

---

## 第一步：环境准备

### 1.1 安装 Xcode
从 App Store 下载并安装 Xcode：
```bash
# 或者使用命令行安装
xcode-select --install
```

### 1.2 安装 CocoaPods
```bash
sudo gem install cocoapods
```

### 1.3 验证安装
```bash
xcodebuild -version
pod --version
```

---

## 第二步：项目配置

### 2.1 克隆或复制项目到 macOS
将代码复制到 macOS 环境：
```bash
# 如果是从其他机器复制
scp -r user@linux-host:/path/to/lx-music-mobile ./

# 或者使用 git
git clone <repository-url>
cd lx-music-mobile
```

### 2.2 安装 Node.js 依赖
```bash
npm install
```

### 2.3 安装 iOS 依赖
```bash
cd ios
pod install --repo-update
cd ..
```

---

## 第三步：Xcode 项目配置

### 3.1 打开 Xcode 项目
```bash
open ios/LxMusicMobile.xcworkspace
```

### 3.2 配置签名 (Signing & Capabilities)

1. 在 Xcode 中，选择 **LxMusicMobile** 项目
2. 选择 **TARGETS** → **LxMusicMobile**
3. 点击 **Signing & Capabilities**
4. 勾选 **Automatically manage signing**
5. 选择你的 **Team**（需要有效的 Apple Developer 账号）

### 3.3 配置 Bundle Identifier
确保 Bundle Identifier 是唯一的，例如：
```
cn.toside.music.mobile
```

### 3.4 配置版本号
在 **General** → **Identity** 中设置：
- **Version**: 1.8.1
- **Build**: 1

---

## 第四步：构建和测试

### 4.1 在模拟器中测试
```bash
# 列出可用的模拟器
xcrun simctl list devices

# 运行 iOS 模拟器测试
npx react-native run-ios

# 或者指定模拟器
npx react-native run-ios --simulator="iPhone 15 Pro"
```

### 4.2 在真机中测试
1. 连接 iPhone 到 Mac
2. 在 Xcode 中选择你的设备
3. 点击运行按钮

---

## 第五步：生成 IPA 文件

### 5.1 使用 Xcode 打包 (推荐)

1. 在 Xcode 中，选择 **Generic iOS Device** 或连接的真机
2. 菜单栏选择 **Product** → **Archive**
3. 等待构建完成，自动打开 Organizer
4. 在 Organizer 中：
   - 选择刚创建的 Archive
   - 点击 **Distribute App**
   - 选择 **Ad Hoc** (用于测试) 或 **App Store** (用于上架)
   - 选择 **Export**
   - 选择正确的签名证书
   - 选择导出位置，保存 IPA 文件

### 5.2 使用命令行打包

```bash
# 清理构建
cd ios
xcodebuild clean -workspace LxMusicMobile.xcworkspace -scheme LxMusicMobile

# 构建 Archive
xcodebuild archive \
  -workspace LxMusicMobile.xcworkspace \
  -scheme LxMusicMobile \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -archivePath build/LxMusicMobile.xcarchive

# 导出 IPA
xcodebuild -exportArchive \
  -archivePath build/LxMusicMobile.xcarchive \
  -exportPath build \
  -exportOptionsPlist exportOptions.plist
```

### 5.3 exportOptions.plist 示例
创建 `ios/exportOptions.plist` 文件：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>ad-hoc</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
    <key>provisioningProfiles</key>
    <dict>
        <key>cn.toside.music.mobile</key>
        <string>YOUR_PROVISIONING_PROFILE</string>
    </dict>
</dict>
</plist>
```

---

## 第六步：安装 IPA 到 iPhone

### 6.1 使用 Apple Configurator 2
1. 从 App Store 安装 Apple Configurator 2
2. 连接 iPhone
3. 双击设备 → **Apps** → **+** → 选择 IPA 文件

### 6.2 使用命令行 (ideviceinstaller)
```bash
# 安装 ideviceinstaller
brew install ideviceinstaller

# 安装 IPA
ideviceinstaller -i build/LxMusicMobile.ipa
```

### 6.3 使用 TestFlight
1. 将 IPA 上传到 App Store Connect
2. 使用 TestFlight 进行内部测试

---

## 第七步：故障排除

### 7.1 Pod 安装失败
```bash
# 清理 Pod 缓存
pod cache clean --all
rm -rf ios/Pods ios/Podfile.lock
pod install --repo-update
```

### 7.2 签名错误
- 确保 Apple Developer 账号有效
- 检查 Bundle Identifier 是否唯一
- 在 Keychain Access 中验证证书

### 7.3 编译错误
```bash
# 清理并重建
cd ios
rm -rf build
xcodebuild clean
# 然后重新 Archive
```

### 7.4 Metro 打包失败
```bash
# 清除缓存
npx react-native start --reset-cache
# 或者
npm start -- --reset-cache
```

---

## 第八步：App Store 上架 (可选)

### 8.1 准备材料
- App 图标 (1024x1024)
- 截图 (6.7", 6.5", 5.5", iPad)
- 应用描述
- 隐私政策 URL
- 联系信息

### 8.2 上传 App Store
1. 在 Xcode 中选择 **Product** → **Archive**
2. Organizer 中点击 **Distribute App**
3. 选择 **App Store Connect**
4. 选择 **Upload**
5. 登录 App Store Connect
6. 等待处理完成

---

## 完成的 iOS 适配工作

以下工作已在代码层面完成，无需手动处理：

1. ✅ **Info.plist 配置**: 后台音频、网络权限、通知权限
2. ✅ **Podfile 更新**: 设置 iOS 13.0 最低版本
3. ✅ **原生模块实现**:
   - UtilsModule: 设备信息、WiFi IP、分享、屏幕常亮等
   - CacheModule: 缓存大小计算和清理
   - CryptoModule: RSA/AES 加密解密
   - UserApiModule: JavaScriptCore 脚本执行
   - LyricModule: Now Playing 歌词显示（替代桌面歌词）
4. ✅ **JS 层适配**:
   - Toast 跨平台适配
   - 权限检查适配
   - BackHandler 适配
   - exitApp 适配
5. ✅ **AppDelegate 更新**: 音频会话配置和远程控制支持

---

## 重要提示

1. **Apple Developer 账号**: 需要支付 $99/年才能签名和发布
2. **设备 UDID**: 如果是 Ad Hoc 分发，需要添加测试设备的 UDID
3. **证书有效期**: 分发证书通常有效期为一年，需要定期更新
4. **App Store 审核**: 音乐类应用可能面临严格审核，确保遵守相关政策

---

## 联系支持

如果遇到问题：
- React Native iOS 文档: https://reactnative.dev/docs/integration-with-existing-apps
- Apple Developer 论坛: https://developer.apple.com/forums/
