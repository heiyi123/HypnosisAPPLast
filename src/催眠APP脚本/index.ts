// 催眠APP 脚本：仅提供主界面手机图标，点击打开前端界面。请挂在「角色卡脚本」下使用。
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

    const dragBar = targetDoc.createElement('div');
    Object.assign(dragBar.style, {
      height: '20px',
      minHeight: '20px',
      flexShrink: 0,
      background: 'rgba(0,0,0,0.4)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      cursor: 'grab',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      userSelect: 'none',
    });
    const grip = targetDoc.createElement('div');
    Object.assign(grip.style, {
      width: '28px',
      height: '4px',
      borderRadius: '2px',
      background: 'rgba(255,255,255,0.25)',
    });
    dragBar.appendChild(grip);

    const closeBtn = targetDoc.createElement('button');
    closeBtn.type = 'button';
    closeBtn.title = '关闭';
    Object.assign(closeBtn.style, {
      position: 'absolute',
      top: '4px',
      right: '6px',
      zIndex: 10,
      width: '24px',
      height: '24px',
      borderRadius: '6px',
      border: 'none',
      background: 'rgba(255,255,255,0.1)',
      color: 'rgba(255,255,255,0.8)',
      cursor: 'pointer',
      fontSize: '14px',
      lineHeight: '1',
    });
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => floatWrap.remove());

    const frameWrap = targetDoc.createElement('div');
    Object.assign(frameWrap.style, {
      flex: '1',
      minHeight: '0',
      position: 'relative',
    });

    const iframe = targetDoc.createElement('iframe');
    iframe.title = '催眠APP';
    Object.assign(iframe.style, {
      width: '100%',
      height: '100%',
      border: 'none',
      display: 'block',
      position: 'absolute',
      inset: '0',
      background: '#0f0f0f',
    });
    frameWrap.appendChild(iframe);

    Object.assign(floatWrap.style, {
      display: 'flex',
      flexDirection: 'column',
    });
    floatWrap.appendChild(dragBar);
    floatWrap.appendChild(frameWrap);
    floatWrap.appendChild(closeBtn);
    targetDoc.body.appendChild(floatWrap);

    let dragStart: { x: number; y: number; left: number; top: number } | null = null;
    const onMove = (e: MouseEvent) => {
      if (!dragStart) return;
      const L = Math.max(0, dragStart.left + e.clientX - dragStart.x);
      const T = Math.max(0, dragStart.top + e.clientY - dragStart.y);
      floatWrap.style.left = L + 'px';
      floatWrap.style.top = T + 'px';
    };
    const onUp = () => {
      dragStart = null;
      targetDoc.removeEventListener('mousemove', onMove);
      targetDoc.removeEventListener('mouseup', onUp);
      dragBar.style.cursor = 'grab';
    };
    dragBar.addEventListener('mousedown', (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest?.('button')) return;
      e.preventDefault();
      dragStart = {
        x: e.clientX,
        y: e.clientY,
        left: parseFloat(floatWrap.style.left) || initialLeft,
        top: parseFloat(floatWrap.style.top) || initialTop,
      };
      targetDoc.addEventListener('mousemove', onMove);
      targetDoc.addEventListener('mouseup', onUp);
      dragBar.style.cursor = 'grabbing';
    });

    // 前端在独立 iframe 中运行，需从本脚本所在窗口（角色卡上下文）注入酒馆 API
    const injectApisIntoFrontend = () => {
      try {
        const win = iframe.contentWindow as Window & Record<string, unknown> | null;
        if (!win) return;
        const raw = (window as any);
        const s = (raw.getVariables ? raw : raw.parent ?? raw.top ?? raw) as Record<string, unknown>;
        if (typeof s.getVariables === 'function') win.getVariables = s.getVariables;
        if (typeof s.replaceVariables === 'function') win.replaceVariables = s.replaceVariables;
        if (typeof s.updateVariablesWith === 'function') win.updateVariablesWith = s.updateVariablesWith;
        if (typeof s.getCurrentMessageId === 'function') win.getCurrentMessageId = s.getCurrentMessageId;
        if (typeof s.getCurrentCharacterName === 'function') win.getCurrentCharacterName = s.getCurrentCharacterName;
        if (typeof s.Mvu !== 'undefined') win.Mvu = s.Mvu;
        if (typeof s.eventOn === 'function') win.eventOn = s.eventOn;
        if (typeof s.tavern_events !== 'undefined') win.tavern_events = s.tavern_events;
        if (typeof s.waitGlobalInitialized === 'function') win.waitGlobalInitialized = s.waitGlobalInitialized;
        if (typeof (window as any).$ !== 'undefined') (win as any).$ = (window as any).$;
      } catch (err) {
        console.warn('[催眠APP脚本] 向前端注入 API 失败', err);
      }
    };

    const baseUrl = frontendUrl.replace(/\/[^/]*$/, '/');
    iframe.addEventListener('load', injectApisIntoFrontend);
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
    '<button type="button" title="打开催眠APP" style="width:44px;height:44px;border-radius:12px;border:none;background:linear-gradient(135deg,#7c3aed 0%,#db2777 100%);color:#fff;cursor:pointer;box-shadow:0 4px 14px rgba(124,58,237,0.4);display:flex;align-items:center;justify-content:center;padding:0"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg></button>';
  const $btn = $(btnHtml).on('click', openFrontend);

  const $sendBar = $('#send_but').parent();
  if ($sendBar.length) {
    $sendBar.prepend($btn);
  } else {
    const $container = createScriptIdDiv();
    $container.css({ position: 'fixed', bottom: '16px', right: '16px', zIndex: 99998, pointerEvents: 'none' });
    $container.find('*').css('pointerEvents', 'auto');
    $container.append($btn);
    $('body').append($container);
  }
});
