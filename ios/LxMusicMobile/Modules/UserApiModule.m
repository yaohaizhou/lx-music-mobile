//
//  UserApiModule.m
//  LxMusicMobile
//

#import "UserApiModule.h"

@interface UserApiModule ()
@property (nonatomic, strong) JSContext *jsContext;
@property (nonatomic, strong) NSDictionary *scriptInfo;
@property (nonatomic, strong) dispatch_queue_t jsQueue;
@end

@implementation UserApiModule

RCT_EXPORT_MODULE(UserApiModule);

- (instancetype)init {
    self = [super init];
    if (self) {
        _jsQueue = dispatch_queue_create("com.lxmusic.jsqueue", DISPATCH_QUEUE_SERIAL);
    }
    return self;
}

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

- (NSArray<NSString *> *)supportedEvents {
    return @[@"Action", @"Log", @"Status", @"Error"];
}

// loadScript - 加载并执行脚本
RCT_EXPORT_METHOD(loadScript:(NSDictionary *)data) {
    dispatch_async(self.jsQueue, ^{
        @try {
            // 如果已有上下文，先销毁
            if (self.jsContext) {
                [self destroy];
            }

            self.scriptInfo = data;

            // 创建新的JS上下文
            self.jsContext = [[JSContext alloc] init];

            // 设置错误处理
            [self.jsContext setExceptionHandler:^(JSContext *context, JSValue *exception) {
                NSString *errorMsg = [NSString stringWithFormat:@"JavaScript Error: %@", exception];
                NSLog(@"%@", errorMsg);
                [self sendEvent:@"Error" data:@{@"message": errorMsg}];
            }];

            // 注入原生调用函数
            [self setupNativeBridge];

            // 加载脚本
            NSString *script = data[@"script"];
            if (script) {
                [self.jsContext evaluateScript:script];

                // 调用初始化
                JSValue *initFunc = self.jsContext[@"init"];
                if ([initFunc isObject]) {
                    [initFunc callWithArguments:@[]];
                }
            }

        } @catch (NSException *exception) {
            NSLog(@"Error loading script: %@", exception);
            [self sendEvent:@"Error" data:@{@"message": exception.reason}];
        }
    });
}

// sendAction - 发送动作到JS环境
RCT_EXPORT_METHOD(sendAction:(NSString *)action info:(NSString *)info resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(self.jsQueue, ^{
        @try {
            JSValue *handleActionFunc = self.jsContext[@"handleAction"];
            if ([handleActionFunc isObject]) {
                JSValue *result = [handleActionFunc callWithArguments:@[action ?: @"", info ?: @""]];
                resolve(@YES);
            } else {
                resolve(@NO);
            }
        } @catch (NSException *exception) {
            NSLog(@"Error sending action: %@", exception);
            reject(@"ERROR", exception.reason, nil);
        }
    });
}

// destroy - 销毁JS环境
RCT_EXPORT_METHOD(destroy) {
    dispatch_async(self.jsQueue, ^{
        if (self.jsContext) {
            // 调用清理函数
            JSValue *destroyFunc = self.jsContext[@"destroy"];
            if ([destroyFunc isObject]) {
                [destroyFunc callWithArguments:@[]];
            }

            self.jsContext = nil;
            self.scriptInfo = nil;
        }
    });
}

// 设置原生桥接
- (void)setupNativeBridge {
    __weak typeof(self) weakSelf = self;

    // HTTP请求桥接
    self.jsContext[@"__lx_native_http__"] = ^(NSString *url, NSString *method, NSString *body, JSValue *headers, JSValue *callback) {
        [weakSelf handleHttpRequest:url method:method body:body headers:headers callback:callback];
    };

    // 日志桥接
    self.jsContext[@"__lx_native_log__"] = ^(NSString *level, NSString *message) {
        [weakSelf sendEvent:@"Log" data:@{@"level": level, @"message": message}];
    };

    // 状态更新桥接
    self.jsContext[@"__lx_native_status__"] = ^(NSString *status, JSValue *data) {
        NSDictionary *dataDict = [data toDictionary];
        [weakSelf sendEvent:@"Status" data:@{@"status": status, @"data": dataDict ?: @{}}];
    };

    // 动作请求桥接
    self.jsContext[@"__lx_native_action__"] = ^(NSString *action, JSValue *data) {
        NSDictionary *dataDict = [data toDictionary];
        [weakSelf sendEvent:@"Action" data:@{@"action": action, @"data": dataDict ?: @{}}];
    };
}

// 处理HTTP请求
- (void)handleHttpRequest:(NSString *)url
                   method:(NSString *)method
                     body:(NSString *)body
                  headers:(JSValue *)headers
                 callback:(JSValue *)callback {

    if (!url) return;

    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:[NSURL URLWithString:url]];
    request.HTTPMethod = method ?: @"GET";

    if (body) {
        request.HTTPBody = [body dataUsingEncoding:NSUTF8StringEncoding];
    }

    // 设置headers
    NSDictionary *headersDict = [headers toDictionary];
    if (headersDict) {
        [headersDict enumerateKeysAndObjectsUsingBlock:^(id key, id obj, BOOL *stop) {
            [request setValue:obj forHTTPHeaderField:key];
        }];
    }

    NSURLSession *session = [NSURLSession sharedSession];
    NSURLSessionDataTask *task = [session dataTaskWithRequest:request
                                            completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        dispatch_async(self.jsQueue, ^{
            NSMutableDictionary *result = [@{} mutableCopy];

            if (error) {
                result[@"error"] = error.localizedDescription;
            } else {
                NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse *)response;
                result[@"statusCode"] = @(httpResponse.statusCode);
                result[@"body"] = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];

                // 转换headers
                NSMutableDictionary *responseHeaders = [@{} mutableCopy];
                [httpResponse.allHeaderFields enumerateKeysAndObjectsUsingBlock:^(id key, id obj, BOOL *stop) {
                    responseHeaders[key] = obj;
                }];
                result[@"headers"] = responseHeaders;
            }

            // 调用JS回调
            if ([callback isObject]) {
                [callback callWithArguments:@[result]];
            }
        });
    }];

    [task resume];
}

// 发送事件到React Native
- (void)sendEvent:(NSString *)eventName data:(NSDictionary *)data {
    dispatch_async(dispatch_get_main_queue(), ^{
        [self sendEventWithName:eventName body:data];
    });
}

@end
