// 催眠APP 脚本：仅提供主界面手机图标，点击打开前端界面
// 前端地址：脚本变量「催眠APP前端URL」或由粘贴加载器设置的 window.__催眠APP前端URL
/// <reference path="./shims.d.ts" />
import { createScriptIdDiv } from '@/util/script';

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

$(() => {
  const $container = createScriptIdDiv();
  $container.css({ position: 'fixed', bottom: '16px', right: '16px', zIndex: 99998, pointerEvents: 'none' });
  $container.find('*').css('pointerEvents', 'auto');
  const $btn = $('<button>')
    .attr({ type: 'button', title: '打开催眠APP' })
    .css({
      width: '44px',
      height: '44px',
      borderRadius: '12px',
      border: 'none',
      background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
      color: '#fff',
      cursor: 'pointer',
      boxShadow: '0 4px 14px rgba(124,58,237,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
    })
    .html(
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
    )
    .on('click', () => {
      const frontendUrl = getHypnosisAppFrontendUrl();
      if (!frontendUrl) {
        const msg = '未配置前端地址：请在脚本变量中设置 催眠APP前端URL，或使用带前端URL的粘贴加载器';
        console.warn('[催眠APP脚本]', msg);
        if (typeof toastr !== 'undefined' && toastr.warning) toastr.warning(msg);
        else if (typeof alert !== 'undefined') alert(msg);
        return;
      }
      const overlayId = `hypnosis_app_overlay_${getScriptId()}`;
      if ($(`#${overlayId}`).length) {
        $(`#${overlayId}`).remove();
        return;
      }
      const $overlay = $('<div>')
        .attr('id', overlayId)
        .css({
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          boxSizing: 'border-box',
        })
        .on('click', e => {
          if (e.target === e.currentTarget) $overlay.remove();
        });
      const $frameWrap = $('<div>')
        .css({
          width: '100%',
          maxWidth: '420px',
          height: '90%',
          maxHeight: '800px',
          borderRadius: '16px',
          overflow: 'hidden',
          background: '#0f0f0f',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          position: 'relative',
        })
        .on('click', e => e.stopPropagation());
      const $close = $('<button>')
        .attr({ type: 'button', title: '关闭' })
        .css({
          position: 'absolute',
          top: '8px',
          right: '8px',
          zIndex: 10,
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          border: 'none',
          background: 'rgba(255,255,255,0.15)',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '18px',
          lineHeight: 1,
        })
        .text('×')
        .on('click', () => $overlay.remove());
      const $iframe = $('<iframe>')
        .attr({ src: frontendUrl, title: '催眠APP' })
        .css({ width: '100%', height: '100%', border: 'none', display: 'block', minHeight: '500px' });
      $frameWrap.append($close).append($iframe);
      $overlay.append($frameWrap);
      $('body').append($overlay);
    });
  $container.append($btn);
  $('body').append($container);
});
