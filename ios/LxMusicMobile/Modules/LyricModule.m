//
//  LyricModule.m
//  LxMusicMobile
//

#import "LyricModule.h"
#import <MediaPlayer/MediaPlayer.h>

@interface LyricModule ()
@property (nonatomic, strong) NSString *currentLyric;
@property (nonatomic, strong) NSString *translation;
@property (nonatomic, strong) NSString *romaLyric;
@property (nonatomic, assign) float playbackRate;
@property (nonatomic, assign) BOOL isShowTranslation;
@property (nonatomic, assign) BOOL isShowRoma;
@property (nonatomic, assign) BOOL isPlaying;
@property (nonatomic, assign) int currentTime;
@property (nonatomic, strong) NSTimer *lyricTimer;
@property (nonatomic, assign) BOOL sendLyricTextEvent;
@end

@implementation LyricModule

RCT_EXPORT_MODULE(LyricModule);

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

- (NSArray<NSString *> *)supportedEvents {
    return @[@"LyricText"];
}

// showDesktopLyric - iOS不支持桌面歌词，使用Now Playing替代
RCT_EXPORT_METHOD(showDesktopLyric:(NSDictionary *)data resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        // 设置Now Playing信息
        [self setupNowPlayingInfo];
        resolve(nil);
    });
}

// hideDesktopLyric
RCT_EXPORT_METHOD(hideDesktopLyric:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        MPNowPlayingInfoCenter *center = [MPNowPlayingInfoCenter defaultCenter];
        center.nowPlayingInfo = @{};
        resolve(nil);
    });
}

// setSendLyricTextEvent
RCT_EXPORT_METHOD(setSendLyricTextEvent:(BOOL)isSend resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    self.sendLyricTextEvent = isSend;
    resolve(nil);
}

// setLyric
RCT_EXPORT_METHOD(setLyric:(NSString *)lyric translation:(NSString *)translation romaLyric:(NSString *)romaLyric resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    self.currentLyric = lyric;
    self.translation = translation;
    self.romaLyric = romaLyric;
    [self updateNowPlayingInfo];
    resolve(nil);
}

// setPlaybackRate
RCT_EXPORT_METHOD(setPlaybackRate:(float)rate resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    self.playbackRate = rate;
    resolve(nil);
}

// toggleTranslation
RCT_EXPORT_METHOD(toggleTranslation:(BOOL)isShow resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    self.isShowTranslation = isShow;
    resolve(nil);
}

// toggleRoma
RCT_EXPORT_METHOD(toggleRoma:(BOOL)isShow resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    self.isShowRoma = isShow;
    resolve(nil);
}

// play
RCT_EXPORT_METHOD(play:(int)time resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    self.currentTime = time;
    self.isPlaying = YES;
    [self startLyricTimer];
    resolve(nil);
}

// pause
RCT_EXPORT_METHOD(pause:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    self.isPlaying = NO;
    [self stopLyricTimer];
    resolve(nil);
}

// toggleLock
RCT_EXPORT_METHOD(toggleLock:(BOOL)isLock resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    // iOS不支持锁定歌词窗口
    resolve(nil);
}

// setColor
RCT_EXPORT_METHOD(setColor:(NSString *)unplayColor playedColor:(NSString *)playedColor shadowColor:(NSString *)shadowColor resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    // iOS Now Playing不显示颜色
    resolve(nil);
}

// setAlpha
RCT_EXPORT_METHOD(setAlpha:(float)alpha resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    // iOS不支持透明度设置
    resolve(nil);
}

// setTextSize
RCT_EXPORT_METHOD(setTextSize:(float)size resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    // iOS不支持字体大小设置
    resolve(nil);
}

// setMaxLineNum
RCT_EXPORT_METHOD(setMaxLineNum:(int)maxLineNum resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    // iOS不支持行数设置
    resolve(nil);
}

// setSingleLine
RCT_EXPORT_METHOD(setSingleLine:(BOOL)singleLine resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    // iOS不支持单行设置
    resolve(nil);
}

// setShowToggleAnima
RCT_EXPORT_METHOD(setShowToggleAnima:(BOOL)showToggleAnima resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    // iOS不支持动画设置
    resolve(nil);
}

// setWidth
RCT_EXPORT_METHOD(setWidth:(int)width resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    // iOS不支持宽度设置
    resolve(nil);
}

// setLyricTextPosition
RCT_EXPORT_METHOD(setLyricTextPosition:(NSString *)positionX positionY:(NSString *)positionY resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    // iOS不支持位置设置
    resolve(nil);
}

// checkOverlayPermission - iOS不支持悬浮窗权限检查
RCT_EXPORT_METHOD(checkOverlayPermission:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    // iOS不需要悬浮窗权限
    resolve(nil);
}

// openOverlayPermissionActivity - iOS不需要打开权限Activity
RCT_EXPORT_METHOD(openOverlayPermissionActivity:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    // iOS不需要打开权限设置
    resolve(nil);
}

#pragma mark - Private Methods

- (void)setupNowPlayingInfo {
    MPNowPlayingInfoCenter *center = [MPNowPlayingInfoCenter defaultCenter];

    NSMutableDictionary *nowPlayingInfo = [@{} mutableCopy];

    // 设置歌词作为标题
    NSString *lyricText = self.currentLyric;
    if (self.isShowTranslation && self.translation && self.translation.length > 0) {
        lyricText = [NSString stringWithFormat:@"%@\n%@", lyricText ?: @"", self.translation];
    }
    if (self.isShowRoma && self.romaLyric && self.romaLyric.length > 0) {
        lyricText = [NSString stringWithFormat:@"%@\n%@", lyricText ?: @"", self.romaLyric];
    }

    nowPlayingInfo[MPMediaItemPropertyTitle] = lyricText ?: @"LX Music";
    nowPlayingInfo[MPMediaItemPropertyArtist] = @"LX Music";

    center.nowPlayingInfo = nowPlayingInfo;
}

- (void)updateNowPlayingInfo {
    [self setupNowPlayingInfo];
}

- (void)startLyricTimer {
    [self stopLyricTimer];
    self.lyricTimer = [NSTimer scheduledTimerWithTimeInterval:0.5
                                                        target:self
                                                      selector:@selector(onLyricTimer:)
                                                      userInfo:nil
                                                       repeats:YES];
}

- (void)stopLyricTimer {
    if (self.lyricTimer) {
        [self.lyricTimer invalidate];
        self.lyricTimer = nil;
    }
}

- (void)onLyricTimer:(NSTimer *)timer {
    if (self.sendLyricTextEvent && self.currentLyric) {
        [self sendEventWithName:@"LyricText" body:@{@"text": self.currentLyric}];
    }
}

@end
