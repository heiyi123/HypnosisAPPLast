// 催眠APP 脚本：仅提供主界面手机图标，点击打开前端界面
// 把下面引号里的地址改成你的前端页面 URL，粘贴到酒馆后即可用（无需再配脚本变量）
/// <reference path="./shims.d.ts" />
import { createScriptIdDiv } from '@/util/script';

/** 直接写在这里。用 .load() 拉取 HTML，故可用 jsDelivr 的 index.html 链接（如 https://testingcf.jsdelivr.net/gh/用户/仓库/dist/催眠APP前端/index.html），无需 GitHub Pages */
const HYPNOSIS_APP_FRONTEND_URL = 'REPLACE_WITH_YOUR_FRONTEND_URL';

type WinWithUrl = Window & { __催眠APP前端URL?: string };

function readFrontendUrlFromWin(w: WinWithUrl | null | undefined): string {
  try {
    const url =
      w && typeof (w as unknown as { __催眠APP前端URL?: string }).__催眠APP前端URL === 'string'
        ? (w as unknown as { __催眠APP前端URL: string }).__催眠APP前端URL.trim()
        : '';
    return url || '';
  } catch {
    return '';
  }
}

function getHypnosisAppFrontendUrl(): string {
  const fromConst = typeof HYPNOSIS_APP_FRONTEND_URL === 'string' ? HYPNOSIS_APP_FRONTEND_URL.trim() : '';
  if (fromConst && fromConst !== 'REPLACE_WITH_YOUR_FRONTEND_URL') return fromConst;
  try {
    const w = typeof window !== 'undefined' ? window : null;
    const cand = [w, w?.parent, w?.top].filter(Boolean);
    for (const win of cand) {
      const url = readFrontendUrlFromWin(win as WinWithUrl);
      if (url) return url;
    }
  } catch {
    // ignore
  }
  try {
    const vars = getVariables({ type: 'script', script_id: getScriptId() }) as Record<string, unknown> | undefined;
    const url = typeof vars?.催眠APP前端URL === 'string' ? vars.催眠APP前端URL.trim() : '';
    if (url) return url;
  } catch {
    // ignore
  }
  try {
    const scriptEl = document.currentScript as HTMLScriptElement | null;
    const src = scriptEl?.src ?? '';
    if (src) {
      const base = src.replace(/\/[^/]*$/, '');
      return `${base.replace(/\/催眠APP脚本\/?$/, '')}/催眠APP前端/index.html`;
    }
  } catch {
    // ignore
  }
  return '';
}

const OVERLAY_ID = 'hypnosis_app_overlay';

const PHONE_WIDTH = 420;
const PHONE_HEIGHT = 700;

function openFrontend() {
  try {
    const frontendUrl = getHypnosisAppFrontendUrl();
    if (!frontendUrl) {
      const msg = '未配置前端地址：请把脚本里的 REPLACE_WITH_YOUR_FRONTEND_URL 改成你的前端页面地址';
      console.warn('[催眠APP脚本]', msg);
      if (typeof toastr !== 'undefined' && toastr.warning) toastr.warning(msg);
      else if (typeof alert !== 'undefined') alert(msg);
      return;
    }
    const targetDoc = window.top && window.top.document ? window.top.document : document;
    const existing = targetDoc.getElementById(OVERLAY_ID);
    if (existing) {
      existing.remove();
      return;
    }

    const win = targetDoc.defaultView || window;
    const initialLeft = Math.max(20, (win.innerWidth - PHONE_WIDTH) / 2);
    const initialTop = Math.max(20, (win.innerHeight - PHONE_HEIGHT) / 2);

    const floatWrap = targetDoc.createElement('div');
    floatWrap.id = OVERLAY_ID;
    Object.assign(floatWrap.style, {
      position: 'fixed',
      left: initialLeft + 'px',
      top: initialTop + 'px',
      width: PHONE_WIDTH + 'px',
      height: PHONE_HEIGHT + 'px',
      zIndex: '99999',
      borderRadius: '16px',
      overflow: 'hidden',
      background: '#0f0f0f',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    });

    const frameWrap = targetDoc.createElement('div');
    Object.assign(frameWrap.style, {
      position: 'absolute',
      inset: '0',
    });

    const iframe = targetDoc.createElement('iframe');
    iframe.title = '催眠APP';
    Object.assign(iframe.style, {
      width: '100%',
      height: '100%',
      border: 'none',
      display: 'block',
      background: '#0f0f0f',
    });
    frameWrap.appendChild(iframe);

    const overlay = targetDoc.createElement('div');
    Object.assign(overlay.style, {
      position: 'absolute',
      inset: '0',
      cursor: 'grab',
      zIndex: 1,
    });

    const closeBtn = targetDoc.createElement('button');
    closeBtn.type = 'button';
    closeBtn.title = '关闭';
    Object.assign(closeBtn.style, {
      position: 'absolute',
      top: '8px',
      right: '8px',
      zIndex: 2,
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      border: 'none',
      background: 'rgba(255,255,255,0.15)',
      color: '#fff',
      cursor: 'pointer',
      fontSize: '18px',
      lineHeight: '1',
    });
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => floatWrap.remove());

    floatWrap.appendChild(frameWrap);
    floatWrap.appendChild(overlay);
    floatWrap.appendChild(closeBtn);
    targetDoc.body.appendChild(floatWrap);

    let dragStart: { x: number; y: number; left: number; top: number } | null = null;
    let didDrag = false;

    const onMove = (e: MouseEvent) => {
      if (!dragStart) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) didDrag = true;
      const L = Math.max(0, dragStart.left + dx);
      const T = Math.max(0, dragStart.top + dy);
      floatWrap.style.left = L + 'px';
      floatWrap.style.top = T + 'px';
    };
    const onUp = (e: MouseEvent) => {
      if (!didDrag && dragStart && iframe.contentDocument) {
        const rect = floatWrap.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const el = iframe.contentDocument.elementFromPoint(x, y);
        if (el) {
          el.dispatchEvent(
            new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: iframe.contentWindow ?? undefined,
              clientX: x,
              clientY: y,
            }),
          );
        }
      }
      dragStart = null;
      didDrag = false;
      targetDoc.removeEventListener('mousemove', onMove);
      targetDoc.removeEventListener('mouseup', onUp);
      overlay.style.cursor = 'grab';
    };
    overlay.addEventListener('mousedown', (e: MouseEvent) => {
      e.preventDefault();
      dragStart = {
        x: e.clientX,
        y: e.clientY,
        left: parseFloat(floatWrap.style.left) || initialLeft,
        top: parseFloat(floatWrap.style.top) || initialTop,
      };
      didDrag = false;
      targetDoc.addEventListener('mousemove', onMove);
      targetDoc.addEventListener('mouseup', onUp);
      overlay.style.cursor = 'grabbing';
    });

    const baseUrl = frontendUrl.replace(/\/[^/]*$/, '/');
    fetch(frontendUrl)
      .then(r => r.text())
      .then(html => {
        const baseTag = '<base href="' + baseUrl + '">';
        const withBase = /<head(\s[^>]*)?>/i.test(html)
          ? html.replace(/<head(\s[^>]*)?>/i, '<head$1>' + baseTag)
          : html.replace(/<body(\s[^>]*)?>/i, '<body$1>' + baseTag);
        iframe.srcdoc = withBase;
      })
      .catch(err => {
        console.error('[催眠APP脚本] 拉取前端 HTML 失败', err);
        if (typeof toastr !== 'undefined' && toastr.error) toastr.error('加载前端失败，请检查地址或网络');
      });
  } catch (err) {
    console.error('[催眠APP脚本] 打开前端失败', err);
    if (typeof alert !== 'undefined') alert('催眠APP脚本报错: ' + (err instanceof Error ? err.message : String(err)));
  }
}

$(() => {
  const btnHtml =
    '<button type="button" title="打开催眠APP（可拖动图标到任意位置）" style="width:44px;height:44px;border-radius:12px;border:none;background:linear-gradient(135deg,#7c3aed 0%,#db2777 100%);color:#fff;cursor:grab;box-shadow:0 4px 14px rgba(124,58,237,0.4);display:flex;align-items:center;justify-content:center;padding:0"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg></button>';
  const $btn = $(btnHtml);

  const iconSize = 44;
  const defaultLeft = Math.max(0, (typeof window !== 'undefined' ? window.innerWidth : 800) - 16 - iconSize);
  const defaultTop = Math.max(0, (typeof window !== 'undefined' ? window.innerHeight : 600) - 100 - iconSize);

  const $wrapper = createScriptIdDiv();
  $wrapper.css({
    position: 'fixed',
    left: defaultLeft + 'px',
    top: defaultTop + 'px',
    width: iconSize + 'px',
    height: iconSize + 'px',
    zIndex: 99998,
    cursor: 'grab',
  });

  let dragStart: { x: number; y: number; left: number; top: number } | null = null;
  const move = (e: JQuery.MouseMoveEvent) => {
    if (!dragStart) return;
    const L = Math.max(0, dragStart.left + e.clientX - dragStart.x);
    const T = Math.max(0, dragStart.top + e.clientY - dragStart.y);
    $wrapper.css({ left: L + 'px', top: T + 'px' });
  };
  const up = (e: JQuery.MouseUpEvent) => {
    if (!dragStart) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const moved = Math.abs(dx) + Math.abs(dy) < 5;
    dragStart = null;
    $(document).off('mousemove', move).off('mouseup', up);
    $btn.css('cursor', 'grab');
    if (moved) openFrontend();
  };

  // 直接在按钮上监听拖动，避免某些环境下 target.closest 失效导致无法拖动/点击
  $btn.on('mousedown', (e: JQuery.MouseDownEvent) => {
    e.preventDefault();
    dragStart = {
      x: e.clientX,
      y: e.clientY,
      left: parseFloat($wrapper.css('left')) || defaultLeft,
      top: parseFloat($wrapper.css('top')) || defaultTop,
    };
    $(document).on('mousemove', move).on('mouseup', up);
    $btn.css('cursor', 'grabbing');
  });

  $wrapper.append($btn);
  $('body').append($wrapper);
});
