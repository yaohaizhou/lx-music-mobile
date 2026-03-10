//
//  CryptoModule.m
//  LxMusicMobile
//

#import "CryptoModule.h"
#import <CommonCrypto/CommonCryptor.h>
#import <CommonCrypto/CommonDigest.h>
#import <Security/Security.h>

@implementation CryptoModule

RCT_EXPORT_MODULE(CryptoModule);

// 生成RSA密钥对
RCT_EXPORT_METHOD(generateRsaKey:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        NSDictionary *keyPair = [self generateRSAKeyPair];
        if (keyPair) {
            resolve(keyPair);
        } else {
            reject(@"ERROR", @"Failed to generate RSA key pair", nil);
        }
    } @catch (NSException *exception) {
        reject(@"ERROR", exception.reason, nil);
    }
}

// RSA加密（异步）
RCT_EXPORT_METHOD(rsaEncrypt:(NSString *)text key:(NSString *)key padding:(NSString *)padding resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        NSString *result = [self rsaEncryptWithText:text key:key padding:padding];
        if (result) {
            resolve(result);
        } else {
            reject(@"ERROR", @"RSA encryption failed", nil);
        }
    } @catch (NSException *exception) {
        reject(@"ERROR", exception.reason, nil);
    }
}

// RSA解密（异步）
RCT_EXPORT_METHOD(rsaDecrypt:(NSString *)text key:(NSString *)key padding:(NSString *)padding resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        NSString *result = [self rsaDecryptWithText:text key:key padding:padding];
        if (result) {
            resolve(result);
        } else {
            reject(@"ERROR", @"RSA decryption failed", nil);
        }
    } @catch (NSException *exception) {
        reject(@"ERROR", exception.reason, nil);
    }
}

// RSA加密（同步）
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(rsaEncryptSync:(NSString *)text key:(NSString *)key padding:(NSString *)padding) {
    return [self rsaEncryptWithText:text key:key padding:padding];
}

// RSA解密（同步）
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(rsaDecryptSync:(NSString *)text key:(NSString *)key padding:(NSString *)padding) {
    return [self rsaDecryptWithText:text key:key padding:padding];
}

// AES加密（异步）
RCT_EXPORT_METHOD(aesEncrypt:(NSString *)text key:(NSString *)key iv:(NSString *)iv mode:(NSString *)mode resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        NSString *result = [self aesEncryptWithText:text key:key iv:iv mode:mode];
        resolve(result);
    } @catch (NSException *exception) {
        reject(@"ERROR", exception.reason, nil);
    }
}

// AES解密（异步）
RCT_EXPORT_METHOD(aesDecrypt:(NSString *)text key:(NSString *)key iv:(NSString *)iv mode:(NSString *)mode resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        NSString *result = [self aesDecryptWithText:text key:key iv:iv mode:mode];
        resolve(result);
    } @catch (NSException *exception) {
        reject(@"ERROR", exception.reason, nil);
    }
}

// AES加密（同步）
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(aesEncryptSync:(NSString *)text key:(NSString *)key iv:(NSString *)iv mode:(NSString *)mode) {
    return [self aesEncryptWithText:text key:key iv:iv mode:mode];
}

// AES解密（同步）
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(aesDecryptSync:(NSString *)text key:(NSString *)key iv:(NSString *)iv mode:(NSString *)mode) {
    return [self aesDecryptWithText:text key:key iv:iv mode:mode];
}

#pragma mark - RSA Implementation

- (NSDictionary *)generateRSAKeyPair {
    int keySize = 2048;

    // 生成公钥和私钥
    SecKeyRef publicKey = NULL;
    SecKeyRef privateKey = NULL;

    NSDictionary *keyAttributes = @{
        (id)kSecAttrKeyType: (id)kSecAttrKeyTypeRSA,
        (id)kSecAttrKeySizeInBits: @(keySize)
    };

    CFErrorRef error = NULL;
    privateKey = SecKeyCreateRandomKey((__bridge CFDictionaryRef)keyAttributes, &error);

    if (!privateKey) {
        NSLog(@"Error generating private key: %@", (__bridge_transfer NSError *)error);
        return nil;
    }

    publicKey = SecKeyCopyPublicKey(privateKey);

    if (!publicKey) {
        CFRelease(privateKey);
        return nil;
    }

    // 获取公钥数据
    NSData *publicKeyData = (__bridge_transfer NSData *)SecKeyCopyExternalRepresentation(publicKey, NULL);
    NSData *privateKeyData = (__bridge_transfer NSData *)SecKeyCopyExternalRepresentation(privateKey, NULL);

    // Base64编码
    NSString *publicKeyBase64 = [publicKeyData base64EncodedStringWithOptions:0];
    NSString *privateKeyBase64 = [privateKeyData base64EncodedStringWithOptions:0];

    CFRelease(publicKey);
    CFRelease(privateKey);

    return @{
        @"publicKey": publicKeyBase64,
        @"privateKey": privateKeyBase64
    };
}

- (NSString *)rsaEncryptWithText:(NSString *)text key:(NSString *)key padding:(NSString *)padding {
    if (!text || !key) return nil;

    NSData *keyData = [[NSData alloc] initWithBase64EncodedString:key options:0];
    if (!keyData) return nil;

    // 创建SecKeyRef
    NSDictionary *keyAttributes = @{
        (id)kSecAttrKeyType: (id)kSecAttrKeyTypeRSA,
        (id)kSecAttrKeyClass: (id)kSecAttrKeyClassPublic,
        (id)kSecAttrKeySizeInBits: @(2048)
    };

    CFErrorRef error = NULL;
    SecKeyRef publicKey = SecKeyCreateWithData((__bridge CFDataRef)keyData,
                                               (__bridge CFDictionaryRef)keyAttributes,
                                               &error);

    if (!publicKey) {
        NSLog(@"Error creating public key: %@", (__bridge_transfer NSError *)error);
        return nil;
    }

    NSData *dataToEncrypt = [text dataUsingEncoding:NSUTF8StringEncoding];
    CFDataRef encryptedData = SecKeyCreateEncryptedData(publicKey,
                                                        kSecKeyAlgorithmRSAEncryptionPKCS1,
                                                        (__bridge CFDataRef)dataToEncrypt,
                                                        &error);

    CFRelease(publicKey);

    if (!encryptedData) {
        NSLog(@"Error encrypting: %@", (__bridge_transfer NSError *)error);
        return nil;
    }

    NSData *encryptedNSData = (__bridge_transfer NSData *)encryptedData;
    return [encryptedNSData base64EncodedStringWithOptions:0];
}

- (NSString *)rsaDecryptWithText:(NSString *)text key:(NSString *)key padding:(NSString *)padding {
    if (!text || !key) return nil;

    NSData *keyData = [[NSData alloc] initWithBase64EncodedString:key options:0];
    NSData *dataToDecrypt = [[NSData alloc] initWithBase64EncodedString:text options:0];

    if (!keyData || !dataToDecrypt) return nil;

    // 创建SecKeyRef
    NSDictionary *keyAttributes = @{
        (id)kSecAttrKeyType: (id)kSecAttrKeyTypeRSA,
        (id)kSecAttrKeyClass: (id)kSecAttrKeyClassPrivate,
        (id)kSecAttrKeySizeInBits: @(2048)
    };

    CFErrorRef error = NULL;
    SecKeyRef privateKey = SecKeyCreateWithData((__bridge CFDataRef)keyData,
                                                (__bridge CFDictionaryRef)keyAttributes,
                                                &error);

    if (!privateKey) {
        NSLog(@"Error creating private key: %@", (__bridge_transfer NSError *)error);
        return nil;
    }

    CFDataRef decryptedData = SecKeyCreateDecryptedData(privateKey,
                                                        kSecKeyAlgorithmRSAEncryptionPKCS1,
                                                        (__bridge CFDataRef)dataToDecrypt,
                                                        &error);

    CFRelease(privateKey);

    if (!decryptedData) {
        NSLog(@"Error decrypting: %@", (__bridge_transfer NSError *)error);
        return nil;
    }

    NSData *decryptedNSData = (__bridge_transfer NSData *)decryptedData;
    return [[NSString alloc] initWithData:decryptedNSData encoding:NSUTF8StringEncoding];
}

#pragma mark - AES Implementation

- (NSString *)aesEncryptWithText:(NSString *)text key:(NSString *)key iv:(NSString *)iv mode:(NSString *)mode {
    if (!text || !key || !iv) return nil;

    NSData *data = [text dataUsingEncoding:NSUTF8StringEncoding];
    NSData *keyData = [key dataUsingEncoding:NSUTF8StringEncoding];
    NSData *ivData = [iv dataUsingEncoding:NSUTF8StringEncoding];

    // 确保密钥长度正确（16、24或32字节）
    NSUInteger keyLength = [keyData length];
    if (keyLength != 16 && keyLength != 24 && keyLength != 32) {
        return nil;
    }

    // 确定算法
    CCAlgorithm algorithm = kCCAlgorithmAES;
    CCOptions options = kCCOptionPKCS7Padding;

    // 如果是ECB模式，不需要IV
    BOOL isECB = [mode isEqualToString:@"ECB"];
    if (isECB) {
        options |= kCCOptionECBMode;
    }

    size_t bufferSize = [data length] + kCCBlockSizeAES128;
    void *buffer = malloc(bufferSize);
    size_t numBytesEncrypted = 0;

    CCCryptorStatus cryptStatus = CCCrypt(kCCEncrypt,
                                          algorithm,
                                          options,
                                          [keyData bytes],
                                          keyLength,
                                          isECB ? NULL : [ivData bytes],
                                          [data bytes],
                                          [data length],
                                          buffer,
                                          bufferSize,
                                          &numBytesEncrypted);

    if (cryptStatus == kCCSuccess) {
        NSData *encryptedData = [NSData dataWithBytesNoCopy:buffer length:numBytesEncrypted];
        return [encryptedData base64EncodedStringWithOptions:0];
    }

    free(buffer);
    return nil;
}

- (NSString *)aesDecryptWithText:(NSString *)text key:(NSString *)key iv:(NSString *)iv mode:(NSString *)mode {
    if (!text || !key || !iv) return nil;

    NSData *data = [[NSData alloc] initWithBase64EncodedString:text options:0];
    NSData *keyData = [key dataUsingEncoding:NSUTF8StringEncoding];
    NSData *ivData = [iv dataUsingEncoding:NSUTF8StringEncoding];

    // 确保密钥长度正确
    NSUInteger keyLength = [keyData length];
    if (keyLength != 16 && keyLength != 24 && keyLength != 32) {
        return nil;
    }

    // 确定算法和选项
    CCAlgorithm algorithm = kCCAlgorithmAES;
    CCOptions options = kCCOptionPKCS7Padding;

    // 如果是ECB模式，不需要IV
    BOOL isECB = [mode isEqualToString:@"ECB"];
    if (isECB) {
        options |= kCCOptionECBMode;
    }

    size_t bufferSize = [data length] + kCCBlockSizeAES128;
    void *buffer = malloc(bufferSize);
    size_t numBytesDecrypted = 0;

    CCCryptorStatus cryptStatus = CCCrypt(kCCDecrypt,
                                          algorithm,
                                          options,
                                          [keyData bytes],
                                          keyLength,
                                          isECB ? NULL : [ivData bytes],
                                          [data bytes],
                                          [data length],
                                          buffer,
                                          bufferSize,
                                          &numBytesDecrypted);

    if (cryptStatus == kCCSuccess) {
        NSData *decryptedData = [NSData dataWithBytesNoCopy:buffer length:numBytesDecrypted];
        return [[NSString alloc] initWithData:decryptedData encoding:NSUTF8StringEncoding];
    }

    free(buffer);
    return nil;
}

@end
