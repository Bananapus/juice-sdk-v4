/** Themed through custom properties so a Tailwind app and a plain-CSS app both look native. */
export const connectModalCss = `
.jb-connect{--jb-connect-bg:#fff;--jb-connect-fg:#1a1a1a;--jb-connect-muted:#6b6b6b;--jb-connect-line:#dcdcdc;--jb-connect-accent:#1a1a1a;--jb-connect-accent-fg:#fff;--jb-connect-radius:16px;--jb-connect-tile:44px;--jb-connect-font:inherit;--jb-connect-backdrop:rgba(0,0,0,.45);--jb-connect-width:440px;
  box-sizing:border-box;width:min(var(--jb-connect-width),calc(100vw - 24px));max-height:calc(100dvh - 32px);padding:32px;margin:auto;border:1px solid var(--jb-connect-line);border-radius:var(--jb-connect-radius);background:var(--jb-connect-bg);color:var(--jb-connect-fg);font:16px/1.4 var(--jb-connect-font);overscroll-behavior:contain}
.jb-connect::backdrop{background:var(--jb-connect-backdrop)}
.jb-connect *{box-sizing:border-box}
.jb-connect h2{margin:0 0 20px;font-size:28px;font-weight:600;line-height:1.1}
.jb-connect button{font:inherit;color:inherit;cursor:pointer}
.jb-connect button:disabled{cursor:default;opacity:.55}
.jb-connect .jb-connect-primary{display:block;width:100%;min-height:50px;padding:14px 20px;border:0;border-radius:calc(var(--jb-connect-radius) / 2);background:var(--jb-connect-accent);color:var(--jb-connect-accent-fg);font-weight:600}
.jb-connect .jb-connect-powered{margin:8px 0 0;font-size:13px;color:var(--jb-connect-muted);text-align:center}
.jb-connect .jb-connect-divider{margin:24px 0 10px;font-size:13px;color:var(--jb-connect-muted)}
.jb-connect .jb-connect-tiles{display:flex;gap:10px;min-height:var(--jb-connect-tile);padding:4px;margin:-4px;overflow-x:auto}
.jb-connect .jb-connect-tile{display:grid;place-items:center;flex:0 0 var(--jb-connect-tile);width:var(--jb-connect-tile);height:var(--jb-connect-tile);padding:8px;border:1px solid var(--jb-connect-line);border-radius:9px;background:var(--jb-connect-bg)}
.jb-connect .jb-connect-tile img,.jb-connect .jb-connect-tile svg{width:22px;height:22px;object-fit:contain}
.jb-connect .jb-connect-tile span{font-size:12px;font-weight:600;line-height:1}
.jb-connect .jb-connect-status,.jb-connect .jb-connect-error{margin:16px 0 0;font-size:13px}
.jb-connect .jb-connect-status{color:var(--jb-connect-muted)}
.jb-connect .jb-connect-error{padding:12px 15px;border-left:3px solid #c8755e;background:#fae9e4;color:#873b2e;overflow-wrap:anywhere}
.jb-connect .jb-connect-handoff{margin-top:16px}
.jb-connect .jb-connect-footer{display:flex;align-items:baseline;justify-content:flex-end;gap:16px;margin-top:20px}
.jb-connect .jb-connect-text{min-height:40px;padding:8px 0;border:0;background:none;font-size:14px;text-decoration:underline;text-underline-offset:3px}
@media (max-width:540px){.jb-connect{padding:24px 20px}.jb-connect h2{font-size:24px}}
`;
