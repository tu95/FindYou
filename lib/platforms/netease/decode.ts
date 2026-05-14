import CryptoJS from "crypto-js";
import { ResolveError } from "@/lib/errors";
import { LEGACY_UCT_KEY, OPENSSL_SALTED_PREFIX, UCT2_KEY } from "./constants";
import type { ResolveSource } from "../types";

interface DecodePayload {
  userId: string;
  source: ResolveSource;
  algorithm: string;
}

function wordArrayToBytes(wordArray: CryptoJS.lib.WordArray) {
  const bytes: number[] = [];

  for (let index = 0; index < wordArray.sigBytes; index += 1) {
    bytes.push((wordArray.words[index >>> 2] >>> (24 - (index % 4) * 8)) & 0xff);
  }

  return bytes;
}

function bytesToWordArray(bytes: number[]) {
  const words: number[] = [];

  bytes.forEach((byte, index) => {
    words[index >>> 2] |= byte << (24 - (index % 4) * 8);
  });

  return CryptoJS.lib.WordArray.create(words, bytes.length);
}

function bytesToAscii(bytes: number[]) {
  return bytes.map((byte) => String.fromCharCode(byte)).join("");
}

function decryptEcbPkcs7(ciphertext: string, keyText: string) {
  const key = CryptoJS.enc.Utf8.parse(keyText);
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: CryptoJS.enc.Base64.parse(ciphertext),
  });
  const plaintext = CryptoJS.AES.decrypt(cipherParams, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });

  return plaintext.toString(CryptoJS.enc.Utf8).trim();
}

function evpBytesToKey(password: number[], salt: number[], keyLength = 32, ivLength = 16) {
  const result: number[] = [];
  let previous: number[] = [];

  while (result.length < keyLength + ivLength) {
    const digestInput = bytesToWordArray([...previous, ...password, ...salt]);
    previous = wordArrayToBytes(CryptoJS.MD5(digestInput));
    result.push(...previous);
  }

  return {
    key: bytesToWordArray(result.slice(0, keyLength)),
    iv: bytesToWordArray(result.slice(keyLength, keyLength + ivLength)),
  };
}

export function decodeLegacyUct(uct: string): DecodePayload {
  const userId = decryptEcbPkcs7(uct, LEGACY_UCT_KEY);

  if (!userId) {
    throw new ResolveError("这条链接里没找到分享者信息");
  }

  return {
    userId,
    source: "uct",
    algorithm: "从分享链接里找到",
  };
}

export function isSaltedCiphertext(value: string) {
  const bytes = wordArrayToBytes(CryptoJS.enc.Base64.parse(value));
  const prefix = bytesToAscii(bytes.slice(0, OPENSSL_SALTED_PREFIX.length));

  return prefix === OPENSSL_SALTED_PREFIX;
}

export function decodeMobileUct2(uct2: string): DecodePayload {
  const userId = decryptEcbPkcs7(uct2, UCT2_KEY);

  if (!userId) {
    throw new ResolveError("这条链接里没找到分享者信息");
  }

  return {
    userId,
    source: "uct2-mobile",
    algorithm: "从分享链接里找到",
  };
}

export function decodePcUct2(uct2: string): DecodePayload {
  const encrypted = wordArrayToBytes(CryptoJS.enc.Base64.parse(uct2));
  const prefix = bytesToAscii(encrypted.slice(0, OPENSSL_SALTED_PREFIX.length));

  if (prefix !== OPENSSL_SALTED_PREFIX) {
    throw new ResolveError("这条链接里没找到分享者信息");
  }

  const salt = encrypted.slice(8, 16);
  const ciphertext = bytesToWordArray(encrypted.slice(16));
  const password = wordArrayToBytes(CryptoJS.enc.Utf8.parse(UCT2_KEY));
  const { key } = evpBytesToKey(password, salt);
  const plaintext = CryptoJS.AES.decrypt(
    CryptoJS.lib.CipherParams.create({ ciphertext }),
    key,
    {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    },
  );
  const userId = plaintext.toString(CryptoJS.enc.Utf8).trim();

  if (!userId) {
    throw new ResolveError("这条链接里没找到分享者信息");
  }

  return {
    userId,
    source: "uct2-pc",
    algorithm: "从分享链接里找到",
  };
}

export function decodeUct2(uct2: string): DecodePayload {
  if (isSaltedCiphertext(uct2)) {
    return decodePcUct2(uct2);
  }

  return decodeMobileUct2(uct2);
}
