/* ============================================================
 * 分享解析小工具 · 小红书 / 网易云音乐（单输入框自动识别平台）
 * 与 Web 项目（findYourNetEaseCloudMusic）解析逻辑保持同步：
 *   - 小红书：shareRedId 本地解码（Base64url + 固定密钥移位）、appuid 明文、
 *             user_profile 主页、web_share 网页版说明
 *   - 网易云：userid 明文、uct2（移动端 AES-ECB / PC 端 Salted EVP）、uct 旧版
 * 纯本地：不联网、无外部资源、无剪贴板 API
 * ============================================================ */
(function () {
  'use strict';

  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  var THEME = {
    xhs: { name: '小红书', color: '#FF2442', light: '#FFF0F2', btn: '#6D71E6' },
    netease: { name: '网易云音乐', color: '#D43C33', light: '#FDEFED', btn: '#6D71E6' }
  };

  var HISTORY_KEY = 'share_parser_history_v1';

  /* ============================================================
   * 基础工具
   * ============================================================ */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function nowLabel() {
    var dt = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return p(dt.getHours()) + ':' + p(dt.getMinutes());
  }

  function formatTime(sec) {
    if (!sec) return '';
    var d = new Date(Number(sec) * 1000);
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
      + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function toUnixSeconds(value) {
    if (value === null || value === undefined || value === '') return undefined;
    var parsed = Number(value);
    return isFinite(parsed) ? parsed : undefined;
  }

  // 兼容工具：不依赖 URL / URLSearchParams / closest 等较新 API

  // 解析绝对 http(s) URL 的组成部分（字符串级，老 WebView 也支持）
  function parseUrlParts(u) {
    var parts = { hostname: '', pathname: '', search: '', hash: '' };
    var rest = String(u || '');
    var scheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.exec(rest);
    if (scheme) rest = rest.slice(scheme[0].length);

    var h = rest.indexOf('#');
    if (h !== -1) { parts.hash = rest.slice(h); rest = rest.slice(0, h); }
    var q = rest.indexOf('?');
    if (q !== -1) { parts.search = rest.slice(q); rest = rest.slice(0, q); }

    var slash = rest.indexOf('/');
    if (slash === -1) { parts.hostname = rest; rest = ''; }
    else { parts.hostname = rest.slice(0, slash); rest = rest.slice(slash); }
    parts.pathname = rest;

    var at = parts.hostname.lastIndexOf('@');
    if (at !== -1) parts.hostname = parts.hostname.slice(at + 1);
    var colon = parts.hostname.indexOf(':');
    if (colon !== -1) parts.hostname = parts.hostname.slice(0, colon);
    parts.hostname = parts.hostname.toLowerCase();
    return parts;
  }

  function extractHost(u) {
    return parseUrlParts(u).hostname;
  }

  function closestTag(el, tagName) {
    while (el && el.nodeType === 1) {
      if (el.tagName === tagName) return el;
      el = el.parentNode;
    }
    return null;
  }

  function closestDataCopy(el) {
    while (el && el.nodeType === 1) {
      if (el.getAttribute && el.getAttribute('data-copy') !== null) return el;
      el = el.parentNode;
    }
    return null;
  }

  function selectText(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // 滚动到元素（部分环境无此 API，失败不影响主流程）
  function safeScroll(el) {
    try {
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) {}
  }

  // 生成「脱敏后的分享内容」：把原文里的链接替换成脱敏链接；原文没有链接时直接输出脱敏链接
  function buildCleanShareText(originalText, data) {
    var text = originalText || '';
    if (data.cleanUrl && data.targetUrl && text.indexOf(data.targetUrl) !== -1) {
      text = text.split(data.targetUrl).join(data.cleanUrl);
    } else if (data.cleanUrl) {
      text = data.cleanUrl;
    }
    return text;
  }

  function parseQuery(query) {
    var params = {};
    var normalized = query.charAt(0) === '?' ? query.slice(1) : query;
    var items = normalized.split('&');
    for (var i = 0; i < items.length; i++) {
      if (!items[i]) continue;
      var parts = items[i].split('=', 2);
      params[decodeComponent(parts[0])] = parts.length > 1 ? decodeComponent(parts[1]) : '';
    }
    return params;
  }

  function decodeComponent(value) {
    try { return decodeURIComponent(value); } catch (e) { return value; }
  }

  function getMergedSearchParams(input) {
    var params = {};
    var parts = parseUrlParts(input);
    var search = parseQuery(parts.search);
    for (var k in search) params[k] = search[k];
    if (parts.hash.indexOf('?') !== -1) {
      var hashQuery = parts.hash.split('?', 2)[1] || '';
      var hashParams = parseQuery('?' + hashQuery);
      for (var hk in hashParams) {
        if (!(hk in params)) params[hk] = hashParams[hk];
      }
    }
    return params;
  }

  /* ============================================================
   * Crypto 工具（crypto-js 组件由 index.html 按依赖顺序加载）
   * ============================================================ */

  function wordArrayToBytes(wa) {
    var bytes = [];
    for (var i = 0; i < wa.sigBytes; i++) {
      bytes.push((wa.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff);
    }
    return bytes;
  }

  function bytesToWordArray(bytes) {
    var words = [];
    for (var i = 0; i < bytes.length; i++) {
      words[i >>> 2] |= bytes[i] << (24 - (i % 4) * 8);
    }
    return CryptoJS.lib.WordArray.create(words, bytes.length);
  }

  function bytesToAscii(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return s;
  }

  function wordArrayToUtf8(wa) {
    var s = '';
    for (var i = 0; i < wa.sigBytes; i++) {
      s += String.fromCharCode((wa.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff);
    }
    return s;
  }

  // AES-ECB / PKCS7 解密（与 web 项目 lib/platforms/netease/decode.ts 一致）
  function decryptEcbPkcs7(ciphertext, keyText) {
    var key = CryptoJS.enc.Utf8.parse(keyText);
    var cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(ciphertext),
    });
    return CryptoJS.AES.decrypt(cipherParams, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    }).toString(CryptoJS.enc.Utf8).trim();
  }

  // OpenSSL EVP_BytesToKey（MD5 派生），PC 端 uct2 用
  function evpBytesToKey(password, salt, keyLength) {
    keyLength = keyLength || 32;
    var ivLength = 16;
    var result = [];
    var previous = [];
    while (result.length < keyLength + ivLength) {
      var digestInput = bytesToWordArray(previous.concat(password).concat(salt));
      previous = wordArrayToBytes(CryptoJS.MD5(digestInput));
      result = result.concat(previous);
    }
    return {
      key: bytesToWordArray(result.slice(0, keyLength)),
      iv: bytesToWordArray(result.slice(keyLength, keyLength + ivLength)),
    };
  }

  /* ============================================================
   * 小红书（与 web 项目 lib/platforms/xiaohongshu/* 同步）
   * ============================================================ */

  var XHS_SHARE_RED_ID_KEY = '262035496752980663974569';
  var XHS_HOME_PREFIX = 'https://www.xiaohongshu.com/user/profile/';
  var XHS_SHORT_HOSTS = ['xhslink.com', 'xhslink.cn'];
  var XHS_FULL_URL_PATTERN = /https?:\/\/(?:www\.)?xiaohongshu\.com\/[A-Za-z0-9_.~!$&'()*+,;=:@/?%-]*/g;
  var XHS_SHORT_URL_PATTERN = /https?:\/\/xhslink\.(?:com|cn)\/[A-Za-z0-9_./-]+/g;

  function isXhsHost(hostname) {
    return hostname === 'xiaohongshu.com' || hostname === 'www.xiaohongshu.com';
  }

  function isXhsShortHost(hostname) {
    return XHS_SHORT_HOSTS.indexOf(hostname) !== -1;
  }

  function findXhsUrl(input) {
    var trimmed = input.trim();
    var host = extractHost(trimmed);
    if (host && (isXhsHost(host) || isXhsShortHost(host))) return trimmed;

    var clean = function (raw) { return raw.replace(/[，。、；）)」』\]]+$/, ''); };
    var fullLinks = (trimmed.match(XHS_FULL_URL_PATTERN) || []).map(clean);
    var shortLinks = (trimmed.match(XHS_SHORT_URL_PATTERN) || []).map(clean);

    var seen = {};
    var all = fullLinks.concat(shortLinks);
    for (var i = 0; i < all.length; i++) {
      if (!seen[all[i]]) { seen[all[i]] = true; return all[i]; }
    }
    return null;
  }

  function parseXhsUrl(targetUrl) {
    var parts = parseUrlParts(targetUrl);
    var segments = parts.pathname.split('/').filter(Boolean);
    var noteId = null;
    var profileUserId = null;

    if (segments[0] === 'user') {
      profileUserId = segments[1] === 'profile' ? segments[2] || null : segments[1] || null;
    } else if (segments[0] === 'discovery' && segments[1] === 'item') {
      noteId = segments[2] || null;
    } else if (segments[0] === 'explore' || segments[0] === 'share') {
      noteId = segments[1] || null;
    }
    return { parts: parts, noteId: noteId, profileUserId: profileUserId };
  }

  function classifyXhsLink(parts, noteId, profileUserId) {
    if (profileUserId) return 'user_profile';
    var params = parseQuery(parts.search);
    if (params.shareRedId) return 'app_share_encrypted';
    if (params.appuid) return 'app_share_plain';
    if (noteId) return 'web_share';
    return 'other';
  }

  // shareRedId → 分享者用户 ID（纯本地，与 web 项目 decode.ts 一致）
  function decodeShareRedId(shareRedId) {
    try {
      var raw = wordArrayToUtf8(CryptoJS.enc.Base64url.parse(shareRedId));
      if (raw.length !== XHS_SHARE_RED_ID_KEY.length) return null;
      var userId = '';
      for (var i = 0; i < raw.length; i++) {
        userId += String.fromCharCode(raw.charCodeAt(i) - Number(XHS_SHARE_RED_ID_KEY[i]));
      }
      userId = userId.toLowerCase();
      return /^[0-9a-f]{24}$/.test(userId) ? userId : null;
    } catch (e) { return null; }
  }

  // 脱敏：抹掉分享者参数，其余原样保留（字符串级替换，保持原始编码）
  function stripXhsSharerParams(rawUrl) {
    var removed = [];
    var out = rawUrl.replace(/[?&](shareRedId|appuid)=[^&]*/g, function (match) {
      var key = match.replace(/^[?&]/, '').split('=', 1)[0];
      if (removed.indexOf(key) === -1) removed.push(key);
      return match.indexOf('?') === 0 ? '?' : '';
    });
    out = out.replace(/\?&/g, '?').replace(/[?&]$/, '');
    return { cleanUrl: out, removed: removed };
  }

  var XHS_LINK_TYPE_LABEL = {
    user_profile: '用户主页链接',
    app_share_encrypted: 'App 分享（加密 shareRedId）',
    app_share_plain: 'App 分享（明文 appuid）',
    web_share: '网页版分享',
    other: '其他链接'
  };

  // 附加信息：从分享文案里提取作者 / 标题
  function extractXhsTextMeta(text) {
    var author = '';
    var title = '';
    var a = text.match(/([^\s\n]{1,30})发布了一篇(?:小红书)?笔记/);
    if (a) author = a[1];
    else {
      var a2 = text.match(/(?:作者|博主)\s*[：:]\s*([^\s\n]{1,30})/);
      if (a2) author = a2[1];
    }
    var ti = text.match(/(?:标题|笔记标题)\s*[：:]\s*([^\n]{1,60})/);
    if (ti) {
      title = ti[1].trim();
    } else {
      var lines = text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(function (l) {
        return l && !/^https?:/i.test(l) && !/发布了一篇/.test(l) && !/^(复制本条信息|打开|来自|小红书)/.test(l);
      });
      for (var j = 0; j < lines.length; j++) {
        if (!/[\u4e00-\u9fa5]/.test(lines[j]) || lines[j].length <= 2) continue;
        var line = lines[j].replace(/https?:\/\/\S+/g, '').trim();
        line = line.replace(/^\d+\s+/, ''); // 去掉行首序号（如 "93 "）
        var br = line.match(/【([^】]{2,60})】/); // 网页分享标题在【】里
        if (br) { title = br[1]; break; }
        line = line.replace(/\s*😆[^😆\n]*😆\s*/g, ' ').replace(/\s{2,}/g, ' ').trim(); // 去掉 😆口令😆
        if (line) { title = line.slice(0, 60); break; }
      }
    }
    var type = '笔记';
    if (/视频/i.test(text) && !/图文/i.test(text)) type = '视频笔记';
    else if (/图文|图片/i.test(text)) type = '图文笔记';
    return { author: author, title: title, type: type };
  }

  function resolveXhs(text) {
    var found = findXhsUrl(text);
    if (!found) {
      return { ok: false, reason: '未识别到小红书链接，请确认复制内容完整。\n支持：\n· xhslink.com / xhslink.cn 口令短链\n· xiaohongshu.com 笔记长链（explore / discovery/item / share / user）' };
    }

    var targetUrl = found;
    var hostname = extractHost(targetUrl);

    var data = {
      platform: 'xhs',
      targetUrl: targetUrl,
      sourceType: isDirectUrlInput(text) ? 'full_url' : 'share_text'
    };

    // 短链：需联网跳转拿参数，容器内不可用
    if (isXhsShortHost(hostname)) {
      data.needsNetwork = true;
      data.needsNetworkReason = 'xhslink 口令短链需要联网跳转后才能拿到分享者参数，小工具内不联网。\n可换用 App 内「复制链接」得到的完整链接，或到网站版解析。';
      data.cleanText = text.trim();
      return { ok: true, data: data };
    }

    var parsed = parseXhsUrl(targetUrl);
    var parts = parsed.parts;
    var noteId = parsed.noteId;
    var profileUserId = parsed.profileUserId;
    var params = parseQuery(parts.search);
    var linkType = classifyXhsLink(parts, noteId, profileUserId);
    var meta = extractXhsTextMeta(text);

    data.noteId = noteId || undefined;
    data.linkType = linkType;
    data.linkTypeLabel = XHS_LINK_TYPE_LABEL[linkType] || linkType;
    var strippedXhs = stripXhsSharerParams(targetUrl);
    data.cleanUrl = strippedXhs.cleanUrl;
    if (strippedXhs.removed.length) data.removedParams = strippedXhs.removed;
    data.shareTime = toUnixSeconds(params.apptime);
    data.shareChannel = params.xhsshare || undefined;
    data.shareEventId = params.share_id || undefined;
    data.xsecToken = params.xsec_token || undefined;
    data.appVersion = params.app_version || undefined;
    data.author = meta.author || undefined;
    data.title = meta.title || undefined;
    data.type = meta.type;

    if (linkType === 'user_profile') {
      data.userId = profileUserId || undefined;
      data.source = 'user_profile';
      data.algorithm = '链接里直接带着';
    } else if (linkType === 'app_share_encrypted') {
      data.userId = decodeShareRedId(params.shareRedId || '') || undefined;
      data.source = 'shareRedId';
      data.algorithm = data.userId ? '从链接参数 shareRedId 解码出来的' : '链接里的分享者信息没法解析';
      if (!data.userId) data.noSharerReason = '链接里的 shareRedId 无法解析（可能不是这套算法编码的）';
    } else if (linkType === 'app_share_plain') {
      data.userId = params.appuid || undefined;
      data.source = 'appuid';
      data.algorithm = '链接里直接带着';
    } else if (linkType === 'web_share') {
      data.noSharerReason = '网页版/PC 分享链接不携带分享者信息（平台设计），只有 App 内分享的链接（shareRedId/appuid）才能解出分享者';
      data.source = 'web_share';
      data.algorithm = '网页版链接不携带分享者信息';
    } else {
      return { ok: false, reason: '这个链接暂时还解析不了' };
    }

    if (data.userId) data.profileUrl = XHS_HOME_PREFIX + data.userId;
    data.cleanText = buildCleanShareText(text, data);
    return { ok: true, data: data };
  }

  /* ============================================================
   * 网易云音乐（与 web 项目 lib/platforms/netease/* 同步）
   * ============================================================ */

  var LEGACY_UCT_KEY = 'y6oV5go8h5Vg31dSetYA3V1dZ2JGG3WF';
  var UCT2_KEY = 'JwDUI7QfKebyIhZwcWAJu1172eV2CgCD';
  var OPENSSL_SALTED_PREFIX = 'Salted__';
  var NETEASE_HOME_PREFIX = 'https://music.163.com/#/user/home?id=';
  var NETEASE_SHORT_HOST = '163cn.tv';
  var NETEASE_URL_PATTERN = /https?:\/\/(?:music\.163\.com|y\.music\.163\.com|163cn\.tv)\/[^\s，。、；：！？）)」』\]]*/;

  function findNeteaseUrl(input) {
    var trimmed = input.trim();
    var host = extractHost(trimmed);
    if (
      host === 'music.163.com' ||
      host === 'y.music.163.com' ||
      host === NETEASE_SHORT_HOST
    ) {
      return trimmed;
    }

    var match = trimmed.match(NETEASE_URL_PATTERN);
    if (!match) return null;
    return match[0].replace(/[，。、；）)」』\]]+$/, '');
  }

  function decodeLegacyUct(uct) {
    var userId = decryptEcbPkcs7(uct, LEGACY_UCT_KEY);
    if (!userId) return null;
    return { userId: userId, source: 'uct', algorithm: '从分享链接里找到' };
  }

  function isSaltedCiphertext(value) {
    try {
      var bytes = wordArrayToBytes(CryptoJS.enc.Base64.parse(value));
      return bytesToAscii(bytes.slice(0, OPENSSL_SALTED_PREFIX.length)) === OPENSSL_SALTED_PREFIX;
    } catch (e) { return false; }
  }

  function decodeMobileUct2(uct2) {
    var userId = decryptEcbPkcs7(uct2, UCT2_KEY);
    if (!userId) return null;
    return { userId: userId, source: 'uct2-mobile', algorithm: '从分享链接里找到' };
  }

  function decodePcUct2(uct2) {
    var encrypted = wordArrayToBytes(CryptoJS.enc.Base64.parse(uct2));
    if (bytesToAscii(encrypted.slice(0, OPENSSL_SALTED_PREFIX.length)) !== OPENSSL_SALTED_PREFIX) return null;
    var salt = encrypted.slice(8, 16);
    var ciphertext = bytesToWordArray(encrypted.slice(16));
    var password = wordArrayToBytes(CryptoJS.enc.Utf8.parse(UCT2_KEY));
    var derived = evpBytesToKey(password, salt);
    var plaintext = CryptoJS.AES.decrypt(
      CryptoJS.lib.CipherParams.create({ ciphertext: ciphertext }),
      derived.key,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 },
    );
    var userId = plaintext.toString(CryptoJS.enc.Utf8).trim();
    if (!userId) return null;
    return { userId: userId, source: 'uct2-pc', algorithm: '从分享链接里找到' };
  }

  function decodeUct2(uct2) {
    if (isSaltedCiphertext(uct2)) return decodePcUct2(uct2);
    return decodeMobileUct2(uct2);
  }

  // 脱敏：删掉 search 和 hash 里的分享者参数（userid/uct2/uct），内容 ID 保留
  // （字符串级处理，不依赖 URL / URLSearchParams，保持原始编码）
  var NETEASE_SHARER_KEYS = ['userid', 'uct2', 'uct'];

  function stripKeysFromQuery(query, removed) {
    var normalized = query.charAt(0) === '?' ? query.slice(1) : query;
    var kept = [];
    var items = normalized.split('&');
    for (var i = 0; i < items.length; i++) {
      if (!items[i]) continue;
      var key = items[i].split('=', 1)[0];
      if (NETEASE_SHARER_KEYS.indexOf(key) !== -1) {
        if (removed.indexOf(key) === -1) removed.push(key);
        continue;
      }
      kept.push(items[i]);
    }
    return kept.length ? '?' + kept.join('&') : '';
  }

  function stripNeteaseSharerParams(input) {
    var removed = [];
    var parts = parseUrlParts(input);
    var out = input;

    if (parts.search) {
      var idx = out.indexOf(parts.search);
      if (idx !== -1) {
        var newSearch = stripKeysFromQuery(parts.search, removed);
        out = out.slice(0, idx) + newSearch + out.slice(idx + parts.search.length);
      }
    }

    if (parts.hash && parts.hash.indexOf('?') !== -1) {
      var idx2 = out.indexOf(parts.hash);
      if (idx2 !== -1) {
        var hashParts = parts.hash.split('?', 2);
        var newHashQuery = stripKeysFromQuery('?' + hashParts[1], removed);
        var newHash = hashParts[0] + newHashQuery;
        out = out.slice(0, idx2) + newHash + out.slice(idx2 + parts.hash.length);
      }
    }

    return { cleanUrl: out, removed: removed };
  }

  // 内容类型 + 名称（从文案里提取）
  function extractNeteaseMeta(text, url) {
    var meta = { type: '', nameLine: '' };
    var patterns = [
      { type: '单曲', re: /\/song(?:\/media\/outer\/url)?(?:\?|$|\/)/ },
      { type: '歌单', re: /\/playlist(?:\?|$)/ },
      { type: '专辑', re: /\/album(?:\?|$)/ },
      { type: '电台', re: /\/djradio(?:\?|$)/ },
      { type: 'MV', re: /\/mv(?:\?|$)/ },
      { type: '歌手', re: /\/artist(?:\?|$)/ }
    ];
    for (var i = 0; i < patterns.length; i++) {
      if (patterns[i].re.test(url)) { meta.type = patterns[i].type; break; }
    }
    var tl = text.match(/分享(单曲|歌单|专辑|电台|主播电台)/);
    if (tl) meta.type = tl[1] === '主播电台' ? '电台' : tl[1];

    var nm = text.match(/([^\n《》]{1,40})\s*《([^》]{1,60})》/);
    if (nm) {
      var artist = nm[1].replace(/^[\s：:]+/, '').trim();
      meta.nameLine = artist + '《' + nm[2].trim() + '》';
    } else {
      var lines = text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
      for (var k = 0; k < lines.length; k++) {
        var clean = lines[k].replace(/https?:\/\/\S+/g, '').replace(/[（(].*?[)）]/g, '').trim();
        if (!clean || clean.length < 2) continue;
        if (/^分享/.test(clean) || /^\(?@网易云音乐/.test(clean)) continue;
        if (/^我分享了一首歌/.test(clean)) {
          var sp = clean.match(/[：:]\s*(.+)/);
          if (sp) {
            var dash = sp[1].match(/^\s*(.+?)\s*[-—–]\s*(.+?)\s*$/);
            meta.nameLine = dash ? dash[1].trim() + ' - ' + dash[2].trim() : sp[1].trim();
          }
          break;
        }
        meta.nameLine = clean.slice(0, 60);
        break;
      }
    }
    return meta;
  }

  function resolveNetease(text) {
    var found = findNeteaseUrl(text);
    if (!found) {
      return { ok: false, reason: '未识别到网易云音乐链接。\n支持 music.163.com / y.music.163.com：\n· /song 单曲\n· /playlist 歌单\n· /album 专辑\n· /djradio 电台\n· /mv MV' };
    }

    var targetUrl = found;
    var data = { platform: 'netease', targetUrl: targetUrl };

    var hostname = extractHost(targetUrl);

    // 163cn.tv 短链：需联网跳转，容器内不可用
    if (hostname === NETEASE_SHORT_HOST) {
      data.needsNetwork = true;
      data.needsNetworkReason = '163cn.tv 口令短链需要联网跳转后才能拿到分享者参数，小工具内不联网。\n可换用 App 内「复制链接」得到的完整链接，或到网站版解析。';
      data.cleanText = text.trim();
      return { ok: true, data: data };
    }

    var params = getMergedSearchParams(targetUrl);
    var pageId = params.id;
    var isUserHome = targetUrl.indexOf('/user/home') !== -1;
    if (pageId) data.noteId = pageId;

    if (isUserHome && pageId) {
      data.userId = pageId;
      data.source = 'userid';
      data.algorithm = '链接里直接带着';
      data.linkTypeLabel = '用户主页链接';
    } else if (params.userid) {
      data.userId = params.userid;
      data.source = 'userid';
      data.algorithm = '链接里直接带着';
    } else if (params.uct2) {
      var decoded2 = decodeUct2(params.uct2);
      if (decoded2) {
        data.userId = decoded2.userId;
        data.source = decoded2.source;
        data.algorithm = decoded2.algorithm;
        data.uctKind = decoded2.source === 'uct2-pc' ? 'PC 端 uct2（Salted AES-256）' : '移动端 uct2（AES-128）';
      } else {
        data.noSharerReason = '这条链接里没找到分享者信息（uct2 无法解析）';
      }
    } else if (params.uct) {
      var decoded1 = decodeLegacyUct(params.uct);
      if (decoded1) {
        data.userId = decoded1.userId;
        data.source = decoded1.source;
        data.algorithm = decoded1.algorithm;
        data.uctKind = '旧版 uct（AES-128）';
      } else {
        data.noSharerReason = '这条链接里没找到分享者信息（uct 无法解析）';
      }
    } else {
      data.noSharerReason = '这条链接里没找到分享者信息（链接不含 userid / uct2 / uct 分享者参数）';
      data.source = 'none';
      data.algorithm = '链接里没有分享者信息';
    }

    if (data.userId) data.profileUrl = NETEASE_HOME_PREFIX + data.userId;

    var meta = extractNeteaseMeta(text, targetUrl);
    data.type = meta.type || undefined;
    data.nameLine = meta.nameLine || undefined;

    var stripped = stripNeteaseSharerParams(targetUrl);
    data.cleanUrl = stripped.cleanUrl;
    data.removedParams = stripped.removed;
    if (!data.removedParams.length) data.removedParams = undefined;

    data.cleanText = buildCleanShareText(text, data);
    return { ok: true, data: data };
  }

  /* ============================================================
   * 平台自动识别（单输入框入口）
   * ============================================================ */

  function isDirectUrlInput(input) {
    return /^https?:\/\/\S+$/i.test(input.trim());
  }

  function resolveInput(text) {
    var trimmed = text.trim();
    if (!trimmed) {
      return { ok: false, reason: '请先粘贴分享内容' };
    }
    if (findNeteaseUrl(trimmed)) {
      return resolveNetease(trimmed);
    }
    if (findXhsUrl(trimmed)) {
      return resolveXhs(trimmed);
    }
    return {
      ok: false,
      reason: '未识别到小红书或网易云音乐的分享链接。\n支持：\n· 小红书：xhslink 短链 / xiaohongshu.com 笔记长链\n· 网易云：music.163.com 单曲 / 歌单 / 专辑 / 电台 / MV',
    };
  }

  /* ============================================================
   * 结果渲染（只有两个输出：分享者主页链接 / 脱敏后链接）
   * ============================================================ */

  function badgeHtml(platform, label) {
    var t = THEME[platform] || THEME.xhs;
    return '<span class="badge" style="background:' + t.light + ';color:' + t.color + '">' + esc(label) + '</span>';
  }

  function noticeBlockHtml(data) {
    if (data.needsNetwork) {
      return '<div class="notice notice-warn">📡 ' + esc(data.needsNetworkReason).replace(/\n/g, '<br>') + '</div>';
    }
    if (data.noSharerReason) {
      return '<div class="notice">ℹ️ ' + esc(data.noSharerReason).replace(/\n/g, '<br>') + '</div>';
    }
    return '';
  }

  // 输出 1：分享者主页链接 + 复制小按钮
  function outBlockProfile(data) {
    if (!data.userId || !data.profileUrl) return '';
    var t = THEME[data.platform] || THEME.xhs;
    return '<div class="out-block">'
      + '<div class="out-label">🔗 分享者主页在这</div>'
      + '<div class="out-content selectable" id="profile-url">' + esc(data.profileUrl) + '</div>'
      + '<button type="button" class="btn-sm" id="profile-btn">一键复制主页</button>'
      + '<div class="tip" id="profile-tip"></div>'
      + '</div>';
  }

  // 输出 2：脱敏后链接 + 复制大按钮
  function outBlockClean(data) {
    if (!data.cleanUrl && !data.targetUrl) return '';
    var label = '✨ 干净链接出炉啦';
    if (data.removedParams && data.removedParams.length) {
      label += '（已帮你抹掉 ' + esc(data.removedParams.join('、')) + '）';
    } else if (!data.needsNetwork) {
      label += '（这条本来就很干净）';
    }
    var t = THEME[data.platform] || THEME.xhs;
    return '<div class="out-block">'
      + '<div class="out-label">' + label + '</div>'
      + '<div class="out-content selectable" id="clean-text">' + esc(data.cleanUrl || data.cleanText || '') + '</div>'
      + '<button type="button" class="btn-big" id="clean-copy" style="background:' + (t.btn || t.color) + '">一键复制干净链接</button>'
      + '<div class="tip" id="clean-tip">点一下自动选中，长按「复制」就能发出去啦</div>'
      + '</div>';
  }

  function renderResult(d, fromHistory) {
    var box = $('#result');
    box.setAttribute('data-platform', d.platform);
    var headLabel = d.platform === 'xhs' ? '小红书' : '网易云音乐';
    var html = '<div class="result-head">' + badgeHtml(d.platform, headLabel)
      + '<span class="result-time">' + nowLabel() + '</span></div>';
    html += noticeBlockHtml(d);
    html += outBlockProfile(d);
    html += outBlockClean(d);
    box.innerHTML = html;
    box.hidden = false;
    safeScroll(box);

    if (!fromHistory) {
      var label;
      if (d.platform === 'xhs') {
        label = (d.title || d.userId || '小红书笔记') + (d.author ? ' · ' + d.author : '');
      } else {
        label = d.nameLine || d.userId || ('网易云 ' + (d.type || ''));
      }
      addHistory({ platform: d.platform, label: label, time: nowLabel(), d: d });
    }
  }

  /* ============================================================
   * 历史记录（localStorage）
   * ============================================================ */

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch (e) { return []; }
  }

  function saveHistory(list) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 10))); } catch (e) {}
  }

  function addHistory(item) {
    if (!item || !item.d) return;
    item.label = String(item.label || '').slice(0, 30);
    var list = loadHistory();
    list.unshift(item);
    saveHistory(list);
    renderHistory();
  }

  function renderHistory() {
    var list = loadHistory();
    var card = $('#history-card');
    if (!list.length) { card.hidden = true; return; }
    card.hidden = false;
    $('#history-count').textContent = '（' + list.length + '）';
    var box = $('#history-list');
    box.innerHTML = '';
    list.forEach(function (it) {
      var t = THEME[it.platform] || THEME.xhs;
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'hist-row';
      row.innerHTML = '<span class="hist-dot" style="background:' + t.color + '"></span>'
        + '<span class="hist-main">' + esc(it.label) + '</span>'
        + '<span class="hist-time">' + esc(it.time) + '</span>';
      row.addEventListener('click', function () { showHistoryItem(it); });
      box.appendChild(row);
    });
  }

  function showHistoryItem(it) {
    renderResult(it.d, true);
  }

  /* ============================================================
   * 交互绑定（全局事件委托：不依赖初始化顺序，任何环境下按钮都能响应）
   * ============================================================ */

  var SAMPLES = {
    'xhs-short': '48 一只小鹿🦌发布了一篇小红书笔记，快来看吧！ 😆 aB3cD5eF7gH9 😆 \nhttp://xhslink.com/a/AbCdEfGh，复制本条信息，打开【小红书】App查看精彩内容！',
    'xhs-sharered': '标题：周末去哪儿｜西湖边的宝藏咖啡店\n作者：一只小鹿🦌\nhttps://www.xiaohongshu.com/explore/64a1b2c3d4e5f60001234567?shareRedId=ODpDMUU3RzxKO0o3Tz4wNjY0Ozo4OjxA&xsec_token=ABcdEF12_ghIJklmnOpQrstUVwxYz',
    'xhs-long': '标题：周末去哪儿｜西湖边的宝藏咖啡店\n作者：一只小鹿🦌\nhttps://www.xiaohongshu.com/explore/64a1b2c3d4e5f60001234567?xsec_token=ABcdEF12_ghIJklmnOpQrstUVwxYz&xsec_source=pc_share',
    'net-song-uct2': '分享单曲\n周杰伦《晴天》 https://music.163.com/song?id=186016&uct2=698yG4AQprBoS8bc9nILjA== (@网易云音乐)',
    'net-playlist-uid': '分享歌单\n我的私藏歌单 https://music.163.com/playlist?id=2345678&userid=1234567890 (@网易云音乐)'
  };

  /* ============================================================
   * 吞链兽动画（GSAP 驱动；无 gsap 时降级 CSS 动画）
   * 遵循 gsap-core / gsap-timeline / gsap-performance skill：
   * 只动画 transform / opacity，循环用 yoyo 时间线，动作用 timeline 编排
   * ============================================================ */

  var idleTweens = [];

  function beastPart(beast, cls) { return beast.querySelector(cls); }

  function initBeastAnimation() {
    var beast = $('#beast');
    if (!beast) return;

    var gsap = window.gsap;
    if (!gsap) {
      // 降级：CSS 关键帧动画
      beast.classList.add('css-anim');
      return;
    }
    // 尊重系统减少动态效果设置
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    var body = beastPart(beast, '.beast-body');
    var shadow = beastPart(beast, '.beast-shadow');
    var mouth = beastPart(beast, '.beast-mouth');
    var armL = beastPart(beast, '.arm-l');
    var armR = beastPart(beast, '.arm-r');
    var eyes = beastPart(beast, '.beast-eye');

    // 缓慢轻呼吸（循环，幅度收敛）
    idleTweens.push(
      gsap.to(body, {
        y: -4, scaleY: 1.01, duration: 1.9, ease: 'sine.inOut',
        yoyo: true, repeat: -1, transformOrigin: '50% 100%',
      })
    );
    idleTweens.push(
      gsap.to(shadow, {
        scaleX: 0.88, opacity: 0.75, duration: 1.9, ease: 'sine.inOut',
        yoyo: true, repeat: -1, transformOrigin: '50% 50%',
      })
    );
    // 嘴巴轻微呼吸（循环）
    idleTweens.push(
      gsap.to(mouth, {
        scaleX: 0.92, scaleY: 0.92, duration: 1.9, ease: 'sine.inOut',
        yoyo: true, repeat: -1, transformOrigin: '50% 0%',
      })
    );
    // 手臂轻摆（循环）
    idleTweens.push(
      gsap.to(armL, { rotation: 14, y: -2, duration: 1.9, ease: 'sine.inOut', yoyo: true, repeat: -1 })
    );
    idleTweens.push(
      gsap.to(armR, { rotation: -14, y: -2, duration: 1.9, ease: 'sine.inOut', yoyo: true, repeat: -1 })
    );
    // 眨眼（间隔循环）
    idleTweens.push(
      gsap.timeline({ repeat: -1, repeatDelay: 3.4 })
        .to(eyes, { scaleY: 0.12, duration: 0.09, ease: 'power2.in', transformOrigin: '50% 50%' })
        .to(eyes, { scaleY: 1, duration: 0.12, ease: 'power2.out' })
    );
  }

  // 吞链动画：点「吞掉」时小怪兽吃链条，完成后回调
  function playEatAnimation(onDone) {
    var beast = $('#beast');
    var gsap = window.gsap;

    if (!beast || !gsap || !idleTweens.length) {
      // CSS 降级路径
      if (beast) {
        beast.classList.add('eating');
        setTimeout(function () {
          beast.classList.remove('eating');
          if (onDone) onDone();
        }, 780);
        return;
      }
      if (onDone) onDone();
      return;
    }

    var body = beastPart(beast, '.beast-body');
    var mouth = beastPart(beast, '.beast-mouth');
    var chain = beastPart(beast, '.beast-chain');
    var eyes = beastPart(beast, '.beast-eye');

    // 暂停常驻循环，避免属性打架；结束后恢复
    for (var i = 0; i < idleTweens.length; i++) idleTweens[i].pause();

    var tl = gsap.timeline({
      onComplete: function () {
        for (var j = 0; j < idleTweens.length; j++) idleTweens[j].resume();
        if (onDone) onDone();
      },
    });

    tl
      // 轻微蓄力 + 张嘴
      .to(body, { scaleY: 0.86, scaleX: 1.08, duration: 0.14, ease: 'power2.in', transformOrigin: '50% 100%' }, 0)
      .to(mouth, { scale: 1.4, duration: 0.14, ease: 'power2.in', transformOrigin: '50% 0%' }, 0)
      // 链条掉入嘴里
      .set(chain, { opacity: 1, y: -12, scale: 1 }, 0.08)
      .to(chain, { y: 66, duration: 0.24, ease: 'power2.in' }, 0.08)
      .to(chain, { scale: 0.3, opacity: 0, duration: 0.1, ease: 'power1.in' }, 0.34)
      // 闭眼 + 回落（去弹跳，干净利落）
      .to(eyes, { scaleY: 0.2, duration: 0.07, transformOrigin: '50% 50%' }, 0.4)
      .to(mouth, { scale: 0.75, duration: 0.12, ease: 'power2.out' }, 0.4)
      .to(body, { scaleY: 1, scaleX: 1, duration: 0.22, ease: 'back.out(1.4)' }, 0.4)
      .to(eyes, { scaleY: 1, duration: 0.08 }, 0.52)
      .to(mouth, { scale: 1, duration: 0.14, ease: 'power2.out' }, 0.52);
  }

  function doParse() {
    var box = $('#result');
    var text = $('#input').value.trim();
    if (!text) {
      box.innerHTML = '<div class="empty">先把链接丢进来，再点「吞掉」哦 🥺</div>';
      box.hidden = false;
      return;
    }
    playEatAnimation(function () {
      var r = resolveInput(text);
      if (!r.ok) {
        box.innerHTML = '<div class="empty">' + esc(r.reason).replace(/\n/g, '<br>') + '</div>';
        box.hidden = false;
        return;
      }
      renderResult(r.data);
    });
  }

  function doClear() {
    $('#input').value = '';
    $('#result').hidden = true;
  }

  function doCleanCopy() {
    var el = $('#clean-text');
    if (!el) return;
    selectText(el);
    el.classList.add('flash');
    var tip = $('#clean-tip');
    if (tip) tip.textContent = '✅ 已选中啦，长按「复制」就能发出去';
    setTimeout(function () { el.classList.remove('flash'); }, 800);
  }

  function doProfileSelect() {
    var el = $('#profile-url');
    if (!el) return;
    selectText(el);
    el.classList.add('flash');
  }

  // 统一按钮路由（含动态渲染出的按钮）
  function onDocClick(e) {
    var btn = closestTag(e.target, 'BUTTON');
    if (!btn) return;

    var sampleKey = btn.getAttribute && btn.getAttribute('data-sample');
    if (sampleKey) {
      var s = SAMPLES[sampleKey];
      if (s) $('#input').value = s;
      return;
    }

    switch (btn.id) {
      case 'parse-btn': doParse(); break;
      case 'clear-btn': doClear(); break;
      case 'clean-copy': doCleanCopy(); break;
      case 'profile-btn': doProfileSelect(); break;
      case 'history-clear': saveHistory([]); renderHistory(); break;
      default: break;
    }
  }

  // data-copy 链接点击 → 自动选中文本
  function onDocCopyClick(e) {
    var el = closestDataCopy(e.target);
    if (el) selectText(el);
  }

  function init() {
    try {
      var ok = $('#js-ok');
      if (ok) ok.hidden = false;
      initBeastAnimation();
      renderHistory();
    } catch (e) {}
  }

  // 全部用事件委托：即便某个初始化步骤失败，按钮依然可点
  document.addEventListener('click', onDocClick);
  document.addEventListener('click', onDocCopyClick);

  // 全局兜底：任何未捕获异常都在结果区显示，避免“点了没反应”
  window.addEventListener('error', function (e) {
    var box = $('#result');
    if (!box) return;
    box.innerHTML = '<div class="empty">😵 出错了：' + esc(e.message || '未知错误') + '</div>';
    box.hidden = false;
  });

  document.addEventListener('DOMContentLoaded', init);
})();
