//
//  UtilsModule.m
//  LxMusicMobile
//

#import "UtilsModule.h"
#import <UIKit/UIKit.h>
#import <sys/utsname.h>
#import <ifaddrs.h>
#import <net/if.h>
#import <netdb.h>

@implementation UtilsModule

RCT_EXPORT_MODULE(UtilsModule);

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

- (NSArray<NSString *> *)supportedEvents {
    return @["SCREEN_STATE"];
}

// exitApp - iOS不支持强制退出，使用abort
RCT_EXPORT_METHOD(exitApp) {
    // iOS不推荐使用exit(0)，但为了满足接口一致性，这里调用abort
    // 实际应用应该由用户手动关闭
    dispatch_async(dispatch_get_main_queue(), ^{
        abort();
    });
}

// getSupportedAbis - 获取支持的架构
RCT_EXPORT_METHOD(getSupportedAbis:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    struct utsname systemInfo;
    uname(&systemInfo);
    NSString *machine = [NSString stringWithCString:systemInfo.machine encoding:NSUTF8StringEncoding];

    NSArray *abis = @[@"arm64"];
    resolve(abis);
}

// installApk - iOS不支持安装APK
RCT_EXPORT_METHOD(installApk:(NSString *)filePath fileProviderAuthority:(NSString *)fileProviderAuthority resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    reject(@"ERROR", @"iOS does not support APK installation", nil);
}

// screenkeepAwake - 保持屏幕常亮
RCT_EXPORT_METHOD(screenkeepAwake) {
    dispatch_async(dispatch_get_main_queue(), ^{
        [UIApplication sharedApplication].idleTimerDisabled = YES;
    });
}

// screenUnkeepAwake - 取消屏幕常亮
RCT_EXPORT_METHOD(screenUnkeepAwake) {
    dispatch_async(dispatch_get_main_queue(), ^{
        [UIApplication sharedApplication].idleTimerDisabled = NO;
    });
}

// getWIFIIPV4Address - 获取WiFi IP地址
RCT_EXPORT_METHOD(getWIFIIPV4Address:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        NSString *address = @"0.0.0.0";
        struct ifaddrs *interfaces = NULL;
        struct ifaddrs *temp_addr = NULL;
        int success = 0;

        success = getifaddrs(&interfaces);
        if (success == 0) {
            temp_addr = interfaces;
            while(temp_addr != NULL) {
                if(temp_addr->ifa_addr->sa_family == AF_INET) {
                    // Check if interface is en0 which is the wifi connection on an iPhone
                    if([[NSString stringWithUTF8String:temp_addr->ifa_name] isEqualToString:@"en0"]) {
                        address = [NSString stringWithUTF8String:inet_ntoa(((struct sockaddr_in *)temp_addr->ifa_addr)->sin_addr)];
                    }
                }
                temp_addr = temp_addr->ifa_next;
            }
        }

        freeifaddrs(interfaces);
        resolve(address);
    });
}

// getDeviceName - 获取设备名称
RCT_EXPORT_METHOD(getDeviceName:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    struct utsname systemInfo;
    uname(&systemInfo);
    NSString *machine = [NSString stringWithCString:systemInfo.machine encoding:NSUTF8StringEncoding];

    // Map machine identifier to device name
    NSString *deviceName = [self deviceNameFromMachine:machine];
    resolve(deviceName);
}

- (NSString *)deviceNameFromMachine:(NSString *)machine {
    NSDictionary *deviceNames = @{
        @"iPhone1,1": @"iPhone",
        @"iPhone1,2": @"iPhone 3G",
        @"iPhone2,1": @"iPhone 3GS",
        @"iPhone3,1": @"iPhone 4",
        @"iPhone4,1": @"iPhone 4S",
        @"iPhone5,1": @"iPhone 5",
        @"iPhone5,2": @"iPhone 5",
        @"iPhone5,3": @"iPhone 5c",
        @"iPhone5,4": @"iPhone 5c",
        @"iPhone6,1": @"iPhone 5s",
        @"iPhone6,2": @"iPhone 5s",
        @"iPhone7,2": @"iPhone 6",
        @"iPhone7,1": @"iPhone 6 Plus",
        @"iPhone8,1": @"iPhone 6s",
        @"iPhone8,2": @"iPhone 6s Plus",
        @"iPhone9,1": @"iPhone 7",
        @"iPhone9,3": @"iPhone 7",
        @"iPhone9,2": @"iPhone 7 Plus",
        @"iPhone9,4": @"iPhone 7 Plus",
        @"iPhone10,1": @"iPhone 8",
        @"iPhone10,4": @"iPhone 8",
        @"iPhone10,2": @"iPhone 8 Plus",
        @"iPhone10,5": @"iPhone 8 Plus",
        @"iPhone10,3": @"iPhone X",
        @"iPhone10,6": @"iPhone X",
        @"iPhone11,2": @"iPhone XS",
        @"iPhone11,4": @"iPhone XS Max",
        @"iPhone11,6": @"iPhone XS Max",
        @"iPhone11,8": @"iPhone XR",
        @"iPhone12,1": @"iPhone 11",
        @"iPhone12,3": @"iPhone 11 Pro",
        @"iPhone12,5": @"iPhone 11 Pro Max",
        @"iPhone12,8": @"iPhone SE (2nd generation)",
        @"iPhone13,1": @"iPhone 12 mini",
        @"iPhone13,2": @"iPhone 12",
        @"iPhone13,3": @"iPhone 12 Pro",
        @"iPhone13,4": @"iPhone 12 Pro Max",
        @"iPhone14,4": @"iPhone 13 mini",
        @"iPhone14,5": @"iPhone 13",
        @"iPhone14,2": @"iPhone 13 Pro",
        @"iPhone14,3": @"iPhone 13 Pro Max",
        @"iPhone14,6": @"iPhone SE (3rd generation)",
        @"iPhone14,7": @"iPhone 14",
        @"iPhone14,8": @"iPhone 14 Plus",
        @"iPhone15,2": @"iPhone 14 Pro",
        @"iPhone15,3": @"iPhone 14 Pro Max",
        @"iPhone15,4": @"iPhone 15",
        @"iPhone15,5": @"iPhone 15 Plus",
        @"iPhone16,1": @"iPhone 15 Pro",
        @"iPhone16,2": @"iPhone 15 Pro Max",
        @"i386": @"Simulator",
        @"x86_64": @"Simulator",
        @"arm64": @"Simulator",
    };

    NSString *name = deviceNames[machine];
    if (name) {
        return name;
    }
    return machine;
}

// isNotificationsEnabled - 检查通知是否启用
RCT_EXPORT_METHOD(isNotificationsEnabled:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        [[UNUserNotificationCenter currentNotificationCenter] getNotificationSettingsWithCompletionHandler:^(UNNotificationSettings *settings) {
            BOOL enabled = (settings.authorizationStatus == UNAuthorizationStatusAuthorized);
            resolve(@(enabled));
        }];
    });
}

// openNotificationPermissionActivity - iOS不需要打开特定Activity
RCT_EXPORT_METHOD(openNotificationPermissionActivity:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    // iOS不需要单独打开通知设置Activity，返回YES表示成功
    resolve(@YES);
}

// shareText - 分享文本
RCT_EXPORT_METHOD(shareText:(NSString *)shareTitle title:(NSString *)title text:(NSString *)text) {
    dispatch_async(dispatch_get_main_queue(), ^{
        NSString *shareContent = text;
        if (title && title.length > 0) {
            shareContent = [NSString stringWithFormat:@"%@\n%@", title, text];
        }

        NSArray *itemsToShare = @[shareContent];
        UIActivityViewController *activityVC = [[UIActivityViewController alloc] initWithActivityItems:itemsToShare applicationActivities:nil];

        // Present the activity view controller
        UIViewController *rootViewController = [UIApplication sharedApplication].keyWindow.rootViewController;
        [rootViewController presentViewController:activityVC animated:YES completion:nil];
    });
}

// getSystemLocales - 获取系统语言
RCT_EXPORT_METHOD(getSystemLocales:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    NSLocale *locale = [NSLocale currentLocale];
    NSString *languageCode = [locale objectForKey:NSLocaleLanguageCode];
    NSString *countryCode = [locale objectForKey:NSLocaleCountryCode];

    NSString *localeStr;
    if (countryCode && countryCode.length > 0) {
        localeStr = [NSString stringWithFormat:@"%@_%@", [languageCode lowercaseString], [countryCode lowercaseString]];
    } else {
        localeStr = [languageCode lowercaseString];
    }

    resolve(localeStr);
}

// getWindowSize - 获取窗口大小
RCT_EXPORT_METHOD(getWindowSize:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        CGRect screenBounds = [[UIScreen mainScreen] bounds];
        CGFloat scale = [[UIScreen mainScreen] scale];
        CGFloat width = screenBounds.size.width * scale;
        CGFloat height = screenBounds.size.height * scale;

        NSDictionary *sizeDict = @{
            @"width": @(width),
            @"height": @(height)
        };
        resolve(sizeDict);
    });
}

// isIgnoringBatteryOptimization - iOS没有这个概念，返回YES
RCT_EXPORT_METHOD(isIgnoringBatteryOptimization:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    resolve(@YES);
}

// requestIgnoreBatteryOptimization - iOS不需要，返回YES
RCT_EXPORT_METHOD(requestIgnoreBatteryOptimization:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    resolve(@YES);
}

@end
