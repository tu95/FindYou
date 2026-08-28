/* ============================================================
 * 分享解析小工具 · 小红书 / 网易云音乐
 * 纯本地解析：不联网、无外部资源、无剪贴板 API
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

  /* ---------- 基础工具 ---------- */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function cleanUrl(u) {
    return u.replace(/[),，。；;！!》】]+$/, '');
  }

  function extractUrls(text) {
    return (text.match(/https?:\/\/[^\s"'<>，。；;]+/gi) || []).map(cleanUrl);
  }

  function nowLabel() {
    var dt = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return p(dt.getHours()) + ':' + p(dt.getMinutes());
  }

  function selectText(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /* ---------- 小红书分享解析 ---------- */

  function parseXhs(text) {
    var d = { platform: 'xhs', type: '笔记', noteId: '', shortUrl: '', longUrl: '', xsecToken: '', author: '', title: '' };
    var found = false;
    var urls = extractUrls(text);
    for (var i = 0; i < urls.length; i++) {
      var m = urls[i].match(/xiaohongshu\.com\/(?:explore|discovery\/item)\/([0-9a-fA-F]{8,32})/);
      if (m) { found = true; d.noteId = m[1]; d.longUrl = urls[i]; continue; }
      if (/xhslink\.com\//.test(urls[i])) { found = true; d.shortUrl = urls[i]; }
    }
    if (!found) {
      return { ok: false, reason: '未识别到小红书链接，请确认复制内容完整。\n支持：\n· xhslink.com 口令短链\n· xiaohongshu.com/explore 或 /discovery/item 笔记长链' };
    }

    var tok = text.match(/xsec_token=([0-9A-Za-z_\-]+)/);
    if (tok) d.xsecToken = tok[1];

    var a = text.match(/([^\s\n]{1,30})发布了一篇(?:小红书)?笔记/);
    if (a) d.author = a[1];
    else {
      var a2 = text.match(/(?:作者|博主)\s*[：:]\s*([^\s\n]{1,30})/);
      if (a2) d.author = a2[1];
    }

    var ti = text.match(/(?:标题|笔记标题)\s*[：:]\s*([^\n]{1,60})/);
    if (ti) {
      d.title = ti[1].trim();
    } else {
      var lines = text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(function (l) {
        return l && !/^https?:/i.test(l) && !/发布了一篇/.test(l) && !/^(复制本条信息|打开|来自|小红书)/.test(l);
      });
      for (var j = 0; j < lines.length; j++) {
        if (/[\u4e00-\u9fa5]/.test(lines[j]) && lines[j].length > 2) { d.title = lines[j].slice(0, 60); break; }
      }
    }

    if (/视频/i.test(text) && !/图文/i.test(text)) d.type = '视频笔记';
    else if (/图文|图片/i.test(text)) d.type = '图文笔记';
    return { ok: true, data: d };
  }

  /* ---------- 网易云音乐分享解析 ---------- */

  function parseNetease(text) {
    var d = { platform: 'netease', type: '', id: '', url: '', name: '', artist: '', nameLine: '', raw: '' };
    var found = false;
    var patterns = [
      { type: '单曲', re: /music\.163\.com\/(?:#\/)?song(?:\/media\/outer\/url)?\?id=(\d+)/i },
      { type: '歌单', re: /music\.163\.com\/(?:#\/)?playlist\?id=(\d+)/i },
      { type: '专辑', re: /music\.163\.com\/(?:#\/)?album\?id=(\d+)/i },
      { type: '电台', re: /music\.163\.com\/(?:#\/)?djradio\?id=(\d+)/i },
      { type: 'MV', re: /music\.163\.com\/(?:#\/)?mv\?id=(\d+)/i },
      { type: '歌手', re: /music\.163\.com\/(?:#\/)?artist\?id=(\d+)/i }
    ];
    var urls = extractUrls(text);
    for (var i = 0; i < urls.length && !found; i++) {
      for (var j = 0; j < patterns.length; j++) {
        var m = urls[i].match(patterns[j].re);
        if (m) { found = true; d.type = patterns[j].type; d.id = m[1]; d.url = urls[i]; break; }
      }
    }
    if (!found) {
      var mpt = text.match(/#小程序:\/\/网易云音乐\/[^\s\n]+/);
      if (mpt) {
        return { ok: true, data: { platform: 'netease', type: '小程序口令', id: '', url: '', name: '', artist: '', nameLine: '', raw: mpt[0] } };
      }
      return { ok: false, reason: '未识别到网易云音乐链接。\n支持 music.163.com 的：\n· /song 单曲\n· /playlist 歌单\n· /album 专辑\n· /djradio 电台' };
    }

    var tl = text.match(/分享(单曲|歌单|专辑|电台|主播电台)/);
    if (tl) d.type = tl[1] === '主播电台' ? '电台' : tl[1];

    var nm = text.match(/([^\n《》]{1,40})\s*《([^》]{1,60})》/);
    if (nm) {
      d.artist = nm[1].replace(/^[\s：:]+/, '').trim();
      d.name = nm[2].trim();
      d.nameLine = d.artist + '《' + d.name + '》';
    } else {
      var lines = text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
      for (var k = 0; k < lines.length; k++) {
        var clean = lines[k]
          .replace(/https?:\/\/\S+/g, '')
          .replace(/[（(].*?[)）]/g, '')
          .trim();
        if (!clean || clean.length < 2) continue;
        if (/^分享/.test(clean) || /^\(?@网易云音乐/.test(clean)) continue;
        if (/^我分享了一首歌/.test(clean)) {
          var sp = clean.match(/[：:]\s*(.+)/);
          if (sp) {
            var dash = sp[1].match(/^\s*(.+?)\s*[-—–]\s*(.+?)\s*$/);
            if (dash) {
              d.name = dash[1].trim();
              d.artist = dash[2].trim();
              d.nameLine = d.name + ' - ' + d.artist;
            } else {
              d.name = sp[1].trim();
              d.nameLine = d.name;
            }
          }
          break;
        }
        d.name = clean.slice(0, 60);
        d.nameLine = d.name;
        break;
      }
    }
    return { ok: true, data: d };
  }

  /* ---------- 结果渲染 ---------- */

  function badgeHtml(platform, label) {
    var t = THEME[platform] || THEME.xhs;
    return '<span class="badge" style="background:' + t.light + ';color:' + t.color + '">' + esc(label) + '</span>';
  }

  function fieldHtml(label, valueHtml, selectable) {
    if (!valueHtml) return '';
    return '<div class="field"><div class="field-label">' + esc(label)
      + '</div><div class="field-value' + (selectable ? ' selectable' : '') + '">' + valueHtml + '</div></div>';
  }

  function renderXhs(d, fromHistory) {
    var box = $('#xhs-result');
    box.setAttribute('data-platform', 'xhs');
    var html = '<div class="result-head">' + badgeHtml('xhs', '小红书 · ' + d.type)
      + '<span class="result-time">' + nowLabel() + '</span></div>';
    html += fieldHtml('笔记ID', '<code>' + esc(d.noteId) + '</code>', true);
    if (d.author) html += fieldHtml('作者', esc(d.author), true);
    if (d.title) html += fieldHtml('标题', esc(d.title), true);
    if (d.longUrl) html += fieldHtml('笔记链接', '<span class="link" data-copy="' + esc(d.longUrl) + '">' + esc(d.longUrl) + '</span>', true);
    if (d.shortUrl) html += fieldHtml('口令短链', '<span class="link" data-copy="' + esc(d.shortUrl) + '">' + esc(d.shortUrl) + '</span>', true);
    if (d.xsecToken) html += fieldHtml('xsec_token', '<code>' + esc(d.xsecToken) + '</code>', true);
    html += '<div class="result-actions">'
      + '<button type="button" class="btn btn-xhs" id="xhs-open">在小红书打开</button>'
      + '<button type="button" class="btn btn-ghost" id="xhs-card">生成分享卡片</button>'
      + '</div>';
    html += '<div class="tip">点击链接自动选中文本，长按可「复制」；「在小红书打开」需在小红书容器内使用</div>';
    box.innerHTML = html;
    box.hidden = false;
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    var openBtn = $('#xhs-open');
    if (openBtn) openBtn.addEventListener('click', function () { openXhsNote(d); });
    $('#xhs-card').addEventListener('click', function () { makeCard('xhs', d); });
    if (!fromHistory) {
      addHistory({ platform: 'xhs', label: (d.title || '小红书笔记') + (d.author ? ' · ' + d.author : ''), time: nowLabel(), d: d });
    }
  }

  function renderNetease(d, fromHistory) {
    var box = $('#net-result');
    box.setAttribute('data-platform', 'netease');
    var html = '<div class="result-head">' + badgeHtml('netease', '网易云音乐 · ' + d.type)
      + '<span class="result-time">' + nowLabel() + '</span></div>';
    if (d.type === '小程序口令') {
      html += '<div class="field"><div class="field-label">口令</div><div class="field-value selectable">' + esc(d.raw) + '</div></div>';
      html += '<div class="tip">小程序口令无法离线解析：请先在微信中打开口令，再复制其中的 music.163.com 链接回来解析</div>';
    } else {
      html += fieldHtml('ID', '<code>' + esc(d.id) + '</code>', true);
      if (d.nameLine) html += fieldHtml(d.type === '单曲' ? '歌曲' : '名称', esc(d.nameLine), true);
      if (d.url) html += fieldHtml('链接', '<span class="link" data-copy="' + esc(d.url) + '">' + esc(d.url) + '</span>', true);
      html += '<div class="result-actions"><button type="button" class="btn btn-net" id="net-card">生成分享卡片</button></div>';
      html += '<div class="tip">点击链接自动选中文本，长按可「复制」，再到网易云音乐 App 内打开</div>';
    }
    box.innerHTML = html;
    box.hidden = false;
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    var cardBtn = $('#net-card');
    if (cardBtn) cardBtn.addEventListener('click', function () { makeCard('netease', d); });
    if (!fromHistory) {
      addHistory({ platform: 'netease', label: d.nameLine || d.raw || ('网易云音乐 ' + d.type), time: nowLabel(), d: d });
    }
  }

  /* ---------- 历史记录（localStorage） ---------- */

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
    switchTab(it.platform);
    if (it.platform === 'xhs') renderXhs(it.d, true);
    else renderNetease(it.d, true);
  }

  /* ---------- Native 能力（JSBridge，容器内可用） ---------- */

  function openXhsNote(d) {
    var mt = (window.xhs && window.xhs.miniTool) || null;
    if (!mt || !mt.openRedPage) {
      alert('当前环境不支持跳转，请复制笔记链接到小红书 App 打开');
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

  /* ---------- 分享卡片（Canvas 2D 生成） ---------- */

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
    var info;
    if (platform === 'xhs') {
      info = {
        main: d.title || '小红书笔记',
        sub: d.author ? '作者：' + d.author : '',
        idLabel: '笔记ID',
        id: d.noteId,
        link: d.longUrl || d.shortUrl || '',
        typeLabel: d.type
      };
    } else if (d.type === '小程序口令') {
      info = {
        main: '网易云音乐分享',
        sub: '小程序口令 · 请先在微信中打开',
        idLabel: '',
        id: '',
        link: d.raw,
        typeLabel: '小程序口令'
      };
    } else {
      info = {
        main: d.nameLine || '网易云音乐',
        sub: (d.type || '') + (d.id ? ' · ID ' + d.id : ''),
        idLabel: 'ID',
        id: d.id,
        link: d.url || '',
        typeLabel: d.type
      };
    }
    currentCardUrl = drawShareCard(platform, info);
    var img = $('#card-img');
    img.src = currentCardUrl;
    $('#card-preview').hidden = false;
    $('#card-preview').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---------- 交互绑定 ---------- */

  function switchTab(name) {
    $('#tabs').setAttribute('data-active', name);
    $$('.tab').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-tab') === name);
    });
    $('#panel-xhs').hidden = name !== 'xhs';
    $('#panel-netease').hidden = name !== 'netease';
  }

  var SAMPLES = {
    'xhs-short': '48 一只小鹿🦌发布了一篇小红书笔记，快来看吧！ 😆 aB3cD5eF7gH9 😆 \nhttp://xhslink.com/a/AbCdEfGh，复制本条信息，打开【小红书】App查看精彩内容！',
    'xhs-long': '标题：周末去哪儿｜西湖边的宝藏咖啡店\n作者：一只小鹿🦌\nhttps://www.xiaohongshu.com/explore/64a1b2c3d4e5f60001234567?xsec_token=ABcdEF12_ghIJklmnOpQrstUVwxYz&xsec_source=pc_share',
    'net-song': '分享单曲\n周杰伦《晴天》 https://music.163.com/song?id=186016&userid=123456 (@网易云音乐)',
    'net-playlist': '分享歌单\n我的私藏歌单 https://music.163.com/playlist?id=2345678&userid=123456 (@网易云音乐)'
  };

  function init() {
    $$('.tab').forEach(function (b) {
      b.addEventListener('click', function () { switchTab(b.getAttribute('data-tab')); });
    });

    $('#xhs-parse').addEventListener('click', function () {
      var text = $('#xhs-input').value.trim();
      if (!text) { alert('请先粘贴小红书分享内容'); return; }
      var r = parseXhs(text);
      if (!r.ok) {
        $('#xhs-result').innerHTML = '<div class="empty">' + esc(r.reason).replace(/\n/g, '<br>') + '</div>';
        $('#xhs-result').hidden = false;
        return;
      }
      renderXhs(r.data);
    });
    $('#xhs-clear').addEventListener('click', function () {
      $('#xhs-input').value = '';
      $('#xhs-result').hidden = true;
    });

    $('#net-parse').addEventListener('click', function () {
      var text = $('#net-input').value.trim();
      if (!text) { alert('请先粘贴网易云音乐分享内容'); return; }
      var r = parseNetease(text);
      if (!r.ok) {
        $('#net-result').innerHTML = '<div class="empty">' + esc(r.reason).replace(/\n/g, '<br>') + '</div>';
        $('#net-result').hidden = false;
        return;
      }
      renderNetease(r.data);
    });
    $('#net-clear').addEventListener('click', function () {
      $('#net-input').value = '';
      $('#net-result').hidden = true;
    });

    $$('.chip').forEach(function (c) {
      c.addEventListener('click', function () {
        var key = c.getAttribute('data-sample');
        var s = SAMPLES[key];
        if (!s) return;
        if (key.indexOf('xhs') === 0) { $('#xhs-input').value = s; switchTab('xhs'); }
        else { $('#net-input').value = s; switchTab('netease'); }
      });
    });

    document.addEventListener('click', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('[data-copy]') : null;
      if (el) selectText(el);
    });

    $('#history-clear').addEventListener('click', function () {
      saveHistory([]);
      renderHistory();
    });

    $('#card-save').addEventListener('click', saveCardToAlbum);

    renderHistory();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
