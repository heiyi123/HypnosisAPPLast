// 催眠APP 脚本：仅提供主界面手机图标，点击打开前端界面
// 把下面引号里的地址改成你的前端页面 URL，粘贴到酒馆后即可用（无需再配脚本变量）
/// <reference path="./shims.d.ts" />
import { createScriptIdDiv } from '@/util/script';

/** 直接写在这里，粘贴到酒馆后若需改地址只需改这一处 */
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
    const overlay = targetDoc.createElement('div');
    overlay.id = OVERLAY_ID;
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '99999',
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      boxSizing: 'border-box',
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.remove();
    });
    const frameWrap = targetDoc.createElement('div');
    Object.assign(frameWrap.style, {
      width: '100%',
      maxWidth: '420px',
      height: '90%',
      maxHeight: '800px',
      borderRadius: '16px',
      overflow: 'hidden',
      background: '#0f0f0f',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      position: 'relative',
    });
    frameWrap.addEventListener('click', e => e.stopPropagation());
    const closeBtn = targetDoc.createElement('button');
    closeBtn.type = 'button';
    closeBtn.title = '关闭';
    Object.assign(closeBtn.style, {
      position: 'absolute',
      top: '8px',
      right: '8px',
      zIndex: '10',
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
    closeBtn.addEventListener('click', () => overlay.remove());
    const iframe = targetDoc.createElement('iframe');
    iframe.src = frontendUrl;
    iframe.title = '催眠APP';
    Object.assign(iframe.style, {
      width: '100%',
      height: '100%',
      border: 'none',
      display: 'block',
      minHeight: '500px',
    });
    frameWrap.appendChild(closeBtn);
    frameWrap.appendChild(iframe);
    overlay.appendChild(frameWrap);
    targetDoc.body.appendChild(overlay);
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
