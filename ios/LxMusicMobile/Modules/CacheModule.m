//
//  CacheModule.m
//  LxMusicMobile
//

#import "CacheModule.h"

@implementation CacheModule

RCT_EXPORT_MODULE(CacheModule);

// 获取缓存目录大小
- (unsigned long long)getDirectorySize:(NSString *)path {
    unsigned long long size = 0;
    NSFileManager *fileManager = [NSFileManager defaultManager];
    NSDirectoryEnumerator *enumerator = [fileManager enumeratorAtPath:path];

    NSString *file;
    while ((file = [enumerator nextObject])) {
        NSString *filePath = [path stringByAppendingPathComponent:file];
        NSDictionary *attributes = [fileManager attributesOfItemAtPath:filePath error:nil];
        if (attributes) {
            size += [attributes fileSize];
        }
    }

    return size;
}

// getAppCacheSize - 获取应用缓存大小
RCT_EXPORT_METHOD(getAppCacheSize:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        unsigned long long fileSize = 0;

        // 获取Cache目录
        NSArray *cachePaths = NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES);
        NSString *cacheDir = [cachePaths firstObject];

        if (cacheDir) {
            fileSize += [self getDirectorySize:cacheDir];
        }

        // 获取临时目录
        NSString *tempDir = NSTemporaryDirectory();
        if (tempDir) {
            fileSize += [self getDirectorySize:tempDir];
        }

        resolve([NSString stringWithFormat:@"%llu", fileSize]);
    });
}

// 清除目录内容
- (void)clearDirectory:(NSString *)path {
    NSFileManager *fileManager = [NSFileManager defaultManager];
    NSDirectoryEnumerator *enumerator = [fileManager enumeratorAtPath:path];

    NSString *file;
    while ((file = [enumerator nextObject])) {
        NSString *filePath = [path stringByAppendingPathComponent:file];
        [fileManager removeItemAtPath:filePath error:nil];
    }
}

// clearAppCache - 清除应用缓存
RCT_EXPORT_METHOD(clearAppCache:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        // 清除Cache目录
        NSArray *cachePaths = NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES);
        NSString *cacheDir = [cachePaths firstObject];
        if (cacheDir) {
            [self clearDirectory:cacheDir];
        }

        // 清除临时目录
        NSString *tempDir = NSTemporaryDirectory();
        if (tempDir) {
            [self clearDirectory:tempDir];
        }

        // 清除WebView缓存
        [[NSURLCache sharedURLCache] removeAllCachedResponses];

        resolve(nil);
    });
}

@end
