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
    xhs: { name: '小红书', color: '#FF2442', dark: '#C9182F', light: '#FFF0F2' },
    netease: { name: '网易云音乐', color: '#D43C33', dark: '#A82E27', light: '#FDEFED' }
  };

  var HISTORY_KEY = 'share_parser_history_v1';
  var currentCardUrl = '';
  var lastData = null;

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
    return Number.isFinite(parsed) ? parsed : undefined;
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
    try {
      var url = new URL(input);
      var search = parseQuery(url.search);
      for (var k in search) params[k] = search[k];
      if (url.hash.indexOf('?') !== -1) {
        var hashQuery = url.hash.split('?', 2)[1] || '';
        var hashParams = parseQuery('?' + hashQuery);
        for (var hk in hashParams) {
          if (!(hk in params)) params[hk] = hashParams[hk];
        }
      }
    } catch (e) {}
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
    try {
      var url = new URL(trimmed);
      if (isXhsHost(url.hostname) || isXhsShortHost(url.hostname)) return url.toString();
      return null;
    } catch (e) {}

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
    var url = new URL(targetUrl);
    var segments = url.pathname.split('/').filter(Boolean);
    var noteId = null;
    var profileUserId = null;

    if (segments[0] === 'user') {
      profileUserId = segments[1] === 'profile' ? segments[2] || null : segments[1] || null;
    } else if (segments[0] === 'discovery' && segments[1] === 'item') {
      noteId = segments[2] || null;
    } else if (segments[0] === 'explore' || segments[0] === 'share') {
      noteId = segments[1] || null;
    }
    return { url: url, noteId: noteId, profileUserId: profileUserId };
  }

  function classifyXhsLink(url, noteId, profileUserId) {
    if (profileUserId) return 'user_profile';
    var params = url.searchParams;
    if (params.get('shareRedId')) return 'app_share_encrypted';
    if (params.get('appuid')) return 'app_share_plain';
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
    var out = rawUrl.replace(/[?&](shareRedId|appuid)=[^&]*/g, function (match) {
      return match.indexOf('?') === 0 ? '?' : '';
    });
    return out.replace(/\?&/g, '?').replace(/[?&]$/, '');
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
    var hostname = '';
    try { hostname = new URL(targetUrl).hostname; } catch (e) {}

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
    var url = parsed.url;
    var noteId = parsed.noteId;
    var profileUserId = parsed.profileUserId;
    var params = url.searchParams;
    var linkType = classifyXhsLink(url, noteId, profileUserId);
    var meta = extractXhsTextMeta(text);

    data.noteId = noteId || undefined;
    data.linkType = linkType;
    data.linkTypeLabel = XHS_LINK_TYPE_LABEL[linkType] || linkType;
    data.cleanUrl = stripXhsSharerParams(targetUrl);
    data.shareTime = toUnixSeconds(params.get('apptime'));
    data.shareChannel = params.get('xhsshare') || undefined;
    data.shareEventId = params.get('share_id') || undefined;
    data.xsecToken = params.get('xsec_token') || undefined;
    data.appVersion = params.get('app_version') || undefined;
    data.author = meta.author || undefined;
    data.title = meta.title || undefined;
    data.type = meta.type;

    if (linkType === 'user_profile') {
      data.userId = profileUserId || undefined;
      data.source = 'user_profile';
      data.algorithm = '链接里直接带着';
    } else if (linkType === 'app_share_encrypted') {
      data.userId = decodeShareRedId(params.get('shareRedId') || '') || undefined;
      data.source = 'shareRedId';
      data.algorithm = data.userId ? '从链接参数 shareRedId 解码出来的' : '链接里的分享者信息没法解析';
      if (!data.userId) data.noSharerReason = '链接里的 shareRedId 无法解析（可能不是这套算法编码的）';
    } else if (linkType === 'app_share_plain') {
      data.userId = params.get('appuid') || undefined;
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
    try {
      var url = new URL(trimmed);
      if (
        url.hostname === 'music.163.com' ||
        url.hostname === 'y.music.163.com' ||
        url.hostname === NETEASE_SHORT_HOST
      ) {
        return url.toString();
      }
      return null;
    } catch (e) {}

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
  function stripNeteaseSharerParams(input) {
    var removed = [];
    var url;
    try { url = new URL(input); } catch (e) { return { cleanUrl: input, removed: removed }; }

    var search = new URLSearchParams(url.search);
    ['userid', 'uct2', 'uct'].forEach(function (key) {
      if (search.has(key)) { search.delete(key); removed.push(key); }
    });
    url.search = search.toString();

    if (url.hash.indexOf('?') !== -1) {
      var hashParts = url.hash.split('?', 2);
      var hashParams = new URLSearchParams(hashParts[1] || '');
      var hashChanged = false;
      ['userid', 'uct2', 'uct'].forEach(function (key) {
        if (hashParams.has(key)) { hashParams.delete(key); removed.push(key); hashChanged = true; }
      });
      if (hashChanged) url.hash = hashParts[0] + '?' + hashParams.toString();
    }
    return { cleanUrl: url.toString(), removed: removed };
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

    var hostname = '';
    try { hostname = new URL(targetUrl).hostname; } catch (e) {}

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
    try { new URL(input.trim()); return true; } catch (e) { return false; }
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
   * 结果渲染
   * ============================================================ */

  function badgeHtml(platform, label) {
    var t = THEME[platform] || THEME.xhs;
    return '<span class="badge" style="background:' + t.light + ';color:' + t.color + '">' + esc(label) + '</span>';
  }

  function fieldHtml(label, valueHtml, selectable) {
    if (!valueHtml) return '';
    return '<div class="field"><div class="field-label">' + esc(label)
      + '</div><div class="field-value' + (selectable ? ' selectable' : '') + '">' + valueHtml + '</div></div>';
  }

  function linkHtml(url, platform) {
    return '<span class="link" data-copy="' + esc(url) + '">' + esc(url) + '</span>';
  }

  function sharerBlockHtml(data) {
    if (!data.userId) return '';
    var html = '<div class="sharer-box">';
    html += '<div class="sharer-label">分享者 ID</div>';
    html += '<div class="sharer-id selectable">' + esc(data.userId) + '</div>';
    if (data.profileUrl) {
      html += '<div class="sharer-home-row">';
      html += '<span class="sharer-url selectable" id="profile-url">' + esc(data.profileUrl) + '</span>';
      html += '<button type="button" class="btn-sm" id="profile-btn">分享者主页</button>';
      html += '</div>';
    }
    if (data.algorithm) html += '<div class="sharer-algo">' + esc(data.algorithm) + '</div>';
    html += '</div>';
    return html;
  }

  // 核心输出 2：脱敏后的分享内容 + 大按钮（容器无剪贴板 API，点击后选中文本引导长按复制）
  function cleanCopyBlockHtml(data) {
    if (!data.cleanUrl && !data.targetUrl) return '';
    var label = '脱敏后的分享内容';
    if (data.removedParams && data.removedParams.length) {
      label += '（已抹 ' + esc(data.removedParams.join('、')) + '）';
    } else if (!data.needsNetwork) {
      label += '（未发现分享者参数）';
    }
    var t = THEME[data.platform] || THEME.xhs;
    var html = '<div class="clean-box">';
    html += '<div class="clean-label">' + label + '</div>';
    html += '<div class="clean-content selectable" id="clean-text">' + esc(data.cleanText || '') + '</div>';
    html += '<button type="button" class="btn-big" id="clean-copy" style="background:' + t.color + '">复制脱敏后的分享内容</button>';
    html += '<div class="tip" id="clean-tip">点击按钮自动选中下方内容，长按选择「复制」即可转发</div>';
    html += '</div>';
    return html;
  }

  function metaRowsHtml(data) {
    var html = '';
    if (data.linkTypeLabel) html += fieldHtml('链接类型', esc(data.linkTypeLabel));
    if (data.noteId) html += fieldHtml('内容 ID', '<code>' + esc(data.noteId) + '</code>', true);
    if (data.xsecToken) html += fieldHtml('xsec_token', '<code>' + esc(data.xsecToken) + '</code>', true);
    if (data.shareTime) html += fieldHtml('分享时间', esc(formatTime(data.shareTime)), true);
    if (data.shareChannel) html += fieldHtml('分享渠道', esc(data.shareChannel), true);
    if (data.shareEventId) html += fieldHtml('分享事件', esc(data.shareEventId), true);
    if (data.appVersion) html += fieldHtml('App 版本', esc(data.appVersion), true);
    if (data.uctKind) html += fieldHtml('加密方式', esc(data.uctKind));
    return html;
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

  function renderResult(d, fromHistory) {
    var box = $('#result');
    box.setAttribute('data-platform', d.platform);
    var headLabel;
    if (d.platform === 'xhs') {
      headLabel = '小红书 · ' + (d.type || d.linkTypeLabel || '笔记');
    } else {
      headLabel = '网易云音乐' + (d.type ? ' · ' + d.type : '');
    }
    var html = '<div class="result-head">' + badgeHtml(d.platform, headLabel)
      + '<span class="result-time">' + nowLabel() + '</span></div>';
    html += noticeBlockHtml(d);
    html += sharerBlockHtml(d);
    html += cleanCopyBlockHtml(d);
    if (d.platform === 'xhs') {
      if (d.author) html += fieldHtml('作者', esc(d.author), true);
      if (d.title) html += fieldHtml('标题', esc(d.title), true);
    } else {
      if (d.nameLine) html += fieldHtml(d.type === '单曲' ? '歌曲' : '名称', esc(d.nameLine), true);
    }
    if (d.targetUrl) html += fieldHtml('原链接', linkHtml(d.targetUrl, d.platform), true);
    html += metaRowsHtml(d);
    html += '<div class="result-actions">'
      + (d.platform === 'xhs' ? '<button type="button" class="btn btn-xhs" id="open-btn">在小红书打开</button>' : '')
      + '<button type="button" class="btn btn-ghost" id="card-btn">生成分享卡片</button>'
      + '</div>';
    html += '<div class="tip">点击链接自动选中文本，长按可「复制」</div>';
    box.innerHTML = html;
    box.hidden = false;
    safeScroll(box);

    var openBtn = $('#open-btn');
    if (openBtn) openBtn.addEventListener('click', function () { openXhsNote(d); });
    $('#card-btn').addEventListener('click', function () { makeCard(d.platform, d); });
    wireCleanCopy();

    if (!fromHistory) {
      var label;
      if (d.platform === 'xhs') {
        label = (d.title || d.userId || '小红书笔记') + (d.author ? ' · ' + d.author : '');
      } else {
        label = d.nameLine || d.userId || ('网易云 ' + (d.type || ''));
      }
      addHistory({ platform: d.platform, label: label, time: nowLabel(), d: d });
    }
    lastData = d;
  }

  function wireCleanCopy() {
    var btn = $('#clean-copy');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var el = $('#clean-text');
      if (!el) return;
      selectText(el);
      el.classList.add('flash');
      var tip = $('#clean-tip');
      if (tip) tip.textContent = '✅ 已选中上方内容，长按选择「复制」即可转发';
      setTimeout(function () { el.classList.remove('flash'); }, 800);
    });
    var profileBtn = $('#profile-btn');
    if (profileBtn) {
      profileBtn.addEventListener('click', function () {
        var el = $('#profile-url');
        if (!el) return;
        selectText(el);
        el.classList.add('flash');
      });
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
   * Native 能力（JSBridge，容器内可用）
   * ============================================================ */

  function openXhsNote(d) {
    var mt = (window.xhs && window.xhs.miniTool) || null;
    if (!mt || !mt.openRedPage) {
      alert('当前环境不支持跳转，请复制笔记链接到小红书 App 打开');
      return;
    }
    if (!d.noteId) {
      alert('该链接没有笔记 ID，无法跳转');
      return;
    }
    mt.openRedPage({ type: 'note', params: { id: d.noteId } }).then(function () {}, function (err) {
      alert('跳转失败：' + ((err && err.errMsg) || '当前容器不支持该跳转类型'));
    });
  }

  function saveCardToAlbum() {
    if (!currentCardUrl) return;
    var mt = (window.xhs && window.xhs.miniTool) || null;
    if (!mt || !mt.writeTempFile || !mt.saveImageToPhotosAlbum) {
      alert('当前环境不支持保存到相册，可长按预览图手动保存');
      return;
    }
    mt.writeTempFile({ data: currentCardUrl }).then(function (res) {
      return mt.saveImageToPhotosAlbum({ filePath: res.filePath });
    }).then(function () {
      alert('已保存到相册');
    }).catch(function (err) {
      alert('保存失败：' + ((err && err.errMsg) || '未知错误'));
    });
  }

  /* ============================================================
   * 分享卡片（Canvas 2D 生成）
   * ============================================================ */

  function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    var lines = [];
    var line = '';
    var rest = '';
    var i;
    for (i = 0; i < text.length; i++) {
      var test = line + text[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = text[i];
        if (lines.length === maxLines) { rest = text.slice(i + 1); break; }
      } else {
        line = test;
      }
    }
    if (lines.length < maxLines && line) lines.push(line);
    if (rest) lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1) + '…';
    for (var k = 0; k < lines.length; k++) ctx.fillText(lines[k], x, y + k * lineHeight);
    return lines.length;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawShareCard(platform, info) {
    var W = 750, H = 1080;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    var t = THEME[platform] || THEME.xhs;

    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, t.color);
    g.addColorStop(1, t.dark);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';

    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = 'bold 36px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(t.name + ' · 分享解析', W / 2, 116);

    if (info.typeLabel) {
      ctx.font = '26px "PingFang SC", "Microsoft YaHei", sans-serif';
      var tw = ctx.measureText(info.typeLabel).width + 56;
      roundRect(ctx, W / 2 - tw / 2, 158, tw, 58, 29);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(info.typeLabel, W / 2, 197);
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px "PingFang SC", "Microsoft YaHei", sans-serif';
    var mainLines = wrapText(ctx, info.main, W / 2, 330, W - 140, 70, 3);

    var y = 330 + mainLines * 70 + 36;
    if (info.sub) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '32px "PingFang SC", "Microsoft YaHei", sans-serif';
      var subLines = wrapText(ctx, info.sub, W / 2, y, W - 140, 46, 2);
      y += subLines * 46 + 20;
    } else {
      y += 20;
    }

    if (info.sharerLine) {
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.font = 'bold 34px "PingFang SC", "Microsoft YaHei", sans-serif';
      var sharerLines = wrapText(ctx, info.sharerLine, W / 2, Math.max(y + 40, 700), W - 140, 48, 2);
      y = Math.max(y + 40, 700) + sharerLines * 48 + 20;
    }

    if (info.id) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 34px "SF Mono", Menlo, Consolas, monospace';
      ctx.fillText(info.idLabel + ' ' + info.id, W / 2, 880);
    }
    if (info.link) {
      ctx.fillStyle = 'rgba(255,255,255,0.78)';
      ctx.font = '26px "SF Mono", Menlo, Consolas, "PingFang SC", monospace';
      wrapText(ctx, info.link, W / 2, 940, W - 120, 38, 2);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '24px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('小红书小工具 · 分享解析', W / 2, H - 64);

    return cv.toDataURL('image/png');
  }

  function makeCard(platform, d) {
    var sharerLine = d.userId ? '分享者：' + d.userId : '';
    var info;
    if (platform === 'xhs') {
      info = {
        main: d.title || (d.userId ? '小红书笔记' : '小红书网页分享'),
        sub: d.author ? '作者：' + d.author : '',
        idLabel: '笔记ID',
        id: d.noteId || '',
        link: d.cleanUrl || d.targetUrl || '',
        typeLabel: d.type || d.linkTypeLabel || '笔记',
        sharerLine: sharerLine
      };
    } else {
      info = {
        main: d.nameLine || '网易云音乐',
        sub: d.type || '',
        idLabel: d.type === '单曲' ? '歌曲' : '内容',
        id: d.noteId || '',
        link: d.cleanUrl || d.targetUrl || '',
        typeLabel: d.type || '分享',
        sharerLine: sharerLine
      };
    }
    currentCardUrl = drawShareCard(platform, info);
    var img = $('#card-img');
    img.src = currentCardUrl;
    $('#card-preview').hidden = false;
    safeScroll($('#card-preview'));
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

  function doParse() {
    var box = $('#result');
    var text = $('#input').value.trim();
    if (!text) {
      box.innerHTML = '<div class="empty">请先在上方粘贴小红书或网易云音乐的分享内容，再点「解析」</div>';
      box.hidden = false;
      return;
    }
    var r = resolveInput(text);
    if (!r.ok) {
      box.innerHTML = '<div class="empty">' + esc(r.reason).replace(/\n/g, '<br>') + '</div>';
      box.hidden = false;
      return;
    }
    renderResult(r.data);
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
    if (tip) tip.textContent = '✅ 已选中上方内容，长按选择「复制」即可转发';
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
    var t = e.target;
    var btn = t && t.closest ? t.closest('button') : null;
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
      case 'open-btn': if (lastData) openXhsNote(lastData); break;
      case 'card-btn': if (lastData) makeCard(lastData.platform, lastData); break;
      case 'card-save': saveCardToAlbum(); break;
      case 'history-clear': saveHistory([]); renderHistory(); break;
      default: break;
    }
  }

  // data-copy 链接点击 → 自动选中文本
  function onDocCopyClick(e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-copy]') : null;
    if (el) selectText(el);
  }

  function init() {
    try {
      var ok = $('#js-ok');
      if (ok) ok.hidden = false;
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
