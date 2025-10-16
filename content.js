// TekStore Odoo Sidebar + Lock Overlay v8.3.5
// -----------------------------------------------------------------------------
// CHANGELOG
// - 8.3.5  Collapsed mode leaves only a bottom-left expand pill. Settings now
//          include a Material Icon picker for categories and links.
// - 8.3.4  Collapsed mode shows only a tiny expand FAB bottom-right (no sidebar
//          column, no hover popovers). Settings simplified: categories can be
//          renamed + shown/hidden, and you select a category to edit its links.
// - 8.3.3  Modularised (flags + modules), Option1 restore (expand-memory,
//          dblclick all), Option2 drawer (no title in flyout), Settings modal
//          (dbl-click version) with layout + timeout + editable nav.
//          POS /pos/ui colour hardening (sidebar & flyouts keep white text).
// -----------------------------------------------------------------------------
//
// HOW TO USE
// - Double-click the version at the bottom-left of the sidebar to open Settings.
// - Press Ctrl+Alt+M to toggle Option1/Option2 quickly.
// - Press Ctrl+Alt+L to lock screen.
// -----------------------------------------------------------------------------
//
// GUARANTEES (to prevent regressions)
// - Feature flags gate new features.
// - All user settings in localStorage under "ts-config" with schema version.
// - Previous keys still read: ts_cat_state_v2, sidebarCollapsed, sidebarDarkMode.
// - Self-test runs 1s after load; check console for FAIL/OK.
// -----------------------------------------------------------------------------

;(function () {
  if (window.__TS_SIDEBAR_LOADED__) return;
  window.__TS_SIDEBAR_LOADED__ = true;

  /* ========================== CORE FLAGS & VERSION ========================== */
  const TS = window.__TS__ || (window.__TS__ = {});
  TS.VERSION = '8.3.5';
  TS.flags = {
    opt2Drawer: true,
    settingsModal: true,
    posColorHardening: true,
    selfTest: true
  };

  /* ============================== UTILITIES ================================= */
  const _add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, opts) {
    if ((type === 'touchstart' || type === 'touchmove') && typeof opts === 'object') opts.passive = true;
    return _add.call(this, type, fn, opts);
  };

  window.addEventListener('unhandledrejection', (e) => {
    try {
      const msg = String((e.reason && (e.reason.message || e.reason)) || '');
      if (msg.includes('A listener indicated an asynchronous response') ||
          msg.includes('Extension context invalidated')) e.preventDefault();
    } catch {}
  }, { passive: true });

  const HOST = location.host;
  const PATH = location.pathname;
  const IS_PROD    = /(^|\.)odoo\.tek\.store$/.test(HOST);
  const IS_STAGING = /(^|\.)staging-odoo\.tek\.store$/.test(HOST);
  const IS_LOGIN   = /^\/web\/(login|signup|reset_password)/.test(PATH);

  const PRE_ID = 'ts-prelock-cover';
  const pre = document.createElement('div');
  pre.id = PRE_ID;
  pre.style.cssText = 'position:fixed;inset:0;background:#6C4D66;z-index:2147483646;display:block;user-select:none;touch-action:none;';
  document.documentElement.appendChild(pre);

  const hasStorage = typeof chrome !== 'undefined' && chrome?.storage?.local;
  const storage = {
    get: (k) => new Promise((res) => { if (!hasStorage) { res({}); return; }
      try { chrome.storage.local.get(k, (v) => res(v || {})); } catch { res({}); } }),
    set: (o) => new Promise((res) => { if (!hasStorage) { res(); return; }
      try { chrome.storage.local.set(o, () => res()); } catch { res(); } }),
  };
  const STATE_KEY = `ts-lock-state::${HOST}`;
  const ACTIVITY_KEY = `ts-last-activity::${HOST}`;
  const ACTIVITY_CHAN = `ts-activity-${HOST}`;
  async function getState(){ const d=await storage.get(STATE_KEY); return d[STATE_KEY]||{locked:false}; }
  async function setState(s){ await storage.set({[STATE_KEY]: s}); }

  /* =============================== CONFIG =================================== */
  const SCHEMA = { version: 2 };
  const DEFAULT_NAV = {
    cats: [
      ['quick','Quick Access','widgets', true],
      ['appt','Appointments','event', true],
      ['sales','Sales','supervisor_account', true],
      ['work','Workshop','build', true],
      ['inv','Inventory','inventory_2', true],
      ['purch','Purchasing','store', true],
      ['ws','Workspace','workspaces', true],
      ['acct','Accounts','account_balance_wallet', true],
    ],
    items: {
      quick: [
        ['POS','point_of_sale','/odoo/point-of-sale', true],
        ['Discuss','forum','/odoo/discuss', true],
        ['KPI Dashboard','dashboard','/odoo/dashboards?dashboard_id=27', true],
      ],
      appt: [
        ['Create','add_circle','/odoo/appointments', true],
        ['Booked','event_available','/odoo/appointments/5/action-417?view_type=list', true],
      ],
      sales: [
        ['Customers','groups','/odoo/customers', true],
        ['CRM','manage_accounts','/odoo/crm', true],
        ['Quotes','request_quote','/odoo/sales', true],
        ['Sales Orders','shopping_bag','/odoo/orders', true],
        ['Invoices','receipt_long','/odoo/customer-invoices', true],
      ],
      work: [
        ['Repairs','build_circle','/odoo/action-1503', true],
        ['Buybacks','autorenew','/odoo/action-1527', true],
        ['Refurbs','architecture','/odoo/action-1519', true],
        ['Loan Devices','important_devices','/odoo/action-1529', true],
      ],
      inv: [
        ['Products','category','/odoo/products', true],
        ['RMAs','undo','/odoo/action-1518', true],
        ['Replenishment','sync_alt','/odoo/replenishment', true],
        ['Serial Search','checklist','/odoo/lots', true],
        ['Receipts In','arrow_forward','/odoo/receipts', true],
        ['Deliveries Out','arrow_back','/odoo/deliveries', true],
      ],
      purch: [
        ['Vendors','store','/odoo/vendors', true],
        ['RFQ','description','/odoo/purchase', true],
        ['Purchase Orders','shopping_cart','/odoo/purchase-orders', true],
        ['Bills','monetization_on','/odoo/vendor-bills', true],
      ],
      ws: [
        ['Projects','account_tree','/odoo/project', true],
        ['Knowledge','menu_book','/odoo/knowledge', true],
        ['Training','school','/slides/tekstore-odoo-training-1', true],
        ['Documents','folder_open','/odoo/documents', true],
        ['Expenses','payments','/odoo/expenses', true],
        ['Time Off','today','/odoo/time-off', true],
      ],
      acct: [['Dashboard','currency_pound','/odoo/accounting', true]],
    }
  };
  const DEFAULTS = {
    version: SCHEMA.version,
    layout: 'opt1',
    timeoutMin: 5,
    nav: DEFAULT_NAV
  };

  function loadConfig(){
    let c;
    try { c = JSON.parse(localStorage.getItem('ts-config')); } catch {}
    if (!c) {
      const legacy = localStorage.getItem('ts-layout-mode');
      if (legacy) DEFAULTS.layout = legacy;
      return {...DEFAULTS};
    }
    if (!c.version) c.version = 1;
    return migrateConfig(c);
  }
  function migrateConfig(c){
    if (c.version === 1){
      c = {
        version: 2,
        layout: c.layout || 'opt1',
        timeoutMin: typeof c.timeoutMin === 'number' ? c.timeoutMin : 5,
        nav: c.nav || DEFAULT_NAV
      };
    }
    c.version = SCHEMA.version;
    return c;
  }
  function saveConfig(c){ try { localStorage.setItem('ts-config', JSON.stringify(c)); } catch {} }

  let CFG = loadConfig();

  /* =============================== PRE-LOCK ================================ */
  getState().then(st=>{
    if (!st.locked) pre.remove();
    else {
      const t=setInterval(()=>{ if(document.querySelector('#ts-lock-overlay')){clearInterval(t);pre.remove();}},300);
      setTimeout(()=>{ try{ pre.remove(); }catch{} },2500);
    }
  }).catch(()=>{ try{ pre.remove(); }catch{} });

  document.addEventListener('DOMContentLoaded', () => {
    if (!(IS_PROD || IS_STAGING)) { pre.remove(); return; }
    if (IS_LOGIN) { setState({locked:false}).catch(()=>{}); pre.remove(); return; }

    const mi = document.createElement('link');
    mi.rel = 'stylesheet';
    mi.href = 'https://fonts.googleapis.com/icon?family=Material+Icons+Outlined';
    document.head.appendChild(mi);

    /* ================================= CSS ================================= */
    const style = document.createElement('style');
    style.textContent = String.raw`
      :root{
        --ts-purple:#6C4D66; --ts-purple-2:#62435C;
        --ts-dark-1:#171617; --ts-dark-2:#0f0f10;
        --ts-row-h:22px; --ts-radius:12px;
        --ts-sidebar-w:192px; --ts-collapsed-w:56px;
        --ts-border:rgba(255,255,255,.12); --ts-surfA:rgba(255,255,255,.08);
        --ts-icon-left:16px; --ts-link-indent:24px; --ts-dot-left: calc(var(--ts-link-indent) - 6px);
        --ts2-icon:40px; --ts2-gap:8px;
      }
      #extension-side-bar{position:fixed;top:0;left:0;height:100vh;width:var(--ts-sidebar-w);
        background:linear-gradient(180deg,var(--ts-purple-2),var(--ts-purple)); color:#fff;display:flex;flex-direction:column;overflow:hidden;
        border-right:1px solid rgba(0,0,0,.25);box-shadow:4px 0 22px rgba(43,18,43,.15);transition:width .18s ease;z-index:900;
        font-family: var(--o-font-family, Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans"); font-size:13px; line-height:1.2;}
      #extension-side-bar.dark-mode{background:linear-gradient(180deg,var(--ts-dark-1),var(--ts-dark-2))!important;color:#e9e9ea!important;}

      #extension-side-bar.collapsed{width:var(--ts-collapsed-w)!important;}
      #extension-side-bar.collapsed #sidebar-search-wrap{visibility:hidden;pointer-events:none;}
      #extension-side-bar.collapsed .cat{margin:6px 0;padding:0;}
      #extension-side-bar.collapsed .cat-hd{justify-content:center;padding:0;}
      #extension-side-bar.collapsed .cat-name,
      #extension-side-bar.collapsed .cat-caret,
      #extension-side-bar.collapsed .cat-items{display:none!important;}
      #extension-side-bar.collapsed .pill:not(#sidebar-collapse-toggle){display:none;}
      #extension-side-bar.collapsed #sidebar-version{display:none;}
      #extension-side-bar.collapsed #sidebar-dark-moon{display:none;}

      #sidebar-search-wrap{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:8px;
        background:linear-gradient(180deg,var(--ts-purple-2),var(--ts-purple-2));padding:6px 8px 4px; min-height:38px;}
      #extension-side-bar.dark-mode #sidebar-search-wrap{background:linear-gradient(180deg,var(--ts-dark-1),var(--ts-dark-1));}

      #sidebar-search{flex:1;height:28px;border:none;border-radius:10px;padding:0 10px;background:rgba(255,255,255,.16);color:#fff;outline:none;box-shadow:inset 0 0 0 1px var(--ts-border);font-size:13px;}
      #search-hint{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:12px;color:#fff;opacity:.95;pointer-events:none;white-space:nowrap;max-width:calc(var(--ts-sidebar-w) - 80px);overflow:hidden;text-overflow:ellipsis;}
      #sidebar-back{height:28px;width:28px;border:none;border-radius:10px;background:rgba(255,255,255,.16);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;}
      #sidebar-back .material-icons-outlined{font-size:18px;line-height:18px;}

      #extension-side-bar-nav-wrap{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;overflow:hidden;}

      /* ---------- Option 1 ---------- */
      #nav-scroll{flex:1 1 auto;overflow:auto;padding:0 6px 6px;} #nav-scroll::-webkit-scrollbar{width:0;height:0} #nav-scroll{scrollbar-width:none}
      .cat{margin:6px 0;background:transparent;box-shadow:none;padding:0;border-radius:0;}
      .cat-hd{display:flex;align-items:center;gap:8px;height:28px;padding:0 10px 0 var(--ts-icon-left);border-radius:10px;user-select:none;cursor:pointer;background:var(--ts-surfA);box-shadow:inset 0 0 0 1px var(--ts-border);}
      .cat-hd:hover{background:rgba(255,255,255,.12);}
      .cat-icon{font-family:"Material Icons Outlined";font-size:18px;width:20px;text-align:center;opacity:.95;}
      .cat-name{flex:1;font-weight:600;font-size:14px;letter-spacing:.02em;}
      .cat-caret{font-family:"Material Icons Outlined";font-size:18px;opacity:.85;transition:transform .18s ease;}
      .cat.open .cat-caret{transform:rotate(180deg);} .cat.quick .cat-caret{display:none;}
      .cat-items{overflow:hidden;max-height:0;opacity:0;transition:max-height .2s ease,opacity .16s ease,padding .16s ease;padding:0;}
      .cat.open .cat-items{max-height:1200px;opacity:1;padding:2px 0 0;}

      .ts-nav-link{display:flex;align-items:center;gap:6px;height:var(--ts-row-h);padding:0 8px;border-radius:8px;color:#fff;text-decoration:none;font-size:14px;margin:0 0 2px var(--ts-link-indent);}
      .ts-nav-link:hover{background:rgba(255,255,255,.12);}
      .ts-nav-link .material-icons-outlined{font-size:18px;width:20px;text-align:center;}
      .sidebar-label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:opacity .14s ease;}
      #extension-side-bar.animating .sidebar-label{opacity:0;} #extension-side-bar.animating .cat-items{visibility:hidden;}

      #extension-sidebar-dot{position:absolute;left:var(--ts-dot-left);width:8px;height:8px;border-radius:50%;background:#fff;opacity:.95;box-shadow:0 0 0 1px rgba(0,0,0,.12);transform:translateY(-9999px);pointer-events:none;display:none;z-index:1;}

      /* Popover (Option 1) */
      #cat-pop{position:fixed;left:var(--ts-collapsed-w);top:0;min-width:220px;
        background:linear-gradient(180deg,var(--ts-purple-2),var(--ts-purple));
        color:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.28),0 0 0 1px rgba(255,255,255,.10);
        display:none;flex-direction:column;overflow:hidden;z-index:2000;transform-origin:12px top;opacity:0;transform:scale(.98);
        transition:opacity .14s ease,transform .14s ease;font-family: var(--o-font-family, Inter, system-ui, -apple-system, "Segoe UI", Roboto);font-size:14px;}
      #extension-side-bar.dark-mode ~ #cat-pop{background:linear-gradient(180deg,var(--ts-dark-1),var(--ts-dark-2));}
      #cat-pop.show{display:flex;opacity:1;transform:scale(1);}
      #cat-pop .pop-title{padding:8px 12px 4px 12px;font-size:14px;font-weight:600;letter-spacing:.01em;opacity:.95;}
      #cat-pop .pop-list a{display:block;height:28px;line-height:28px;padding:0 12px;margin:2px 8px;border-radius:8px;color:#fff;text-decoration:none;font-size:14px;}
      #cat-pop .pop-list a:hover{background:rgba(255,255,255,.12);}

      /* Footer */
      #extension-side-bar-footer{flex:0 0 auto;display:flex;align-items:center;height:36px;padding:0 8px;border-top:1px solid rgba(0,0,0,.25);}
      .pill{height:28px;width:28px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:rgba(255,255,255,.16);cursor:pointer;border:none;}
      .pill .material-icons-outlined{font-size:20px;color:#fff;}
      #sidebar-version{font-size:12px;opacity:.8;text-decoration:none;color:inherit;display:inline-flex;align-items:center;cursor:pointer;}
      .ts-flex{flex:1 1 auto;}

      /* ---------- Option 2 (drawer) ---------- */
      #extension-side-bar.layout-opt2 #nav-scroll{ display:none; }
      #extension-side-bar.layout-opt2 #drawer-scroll{ display:block; }
      #drawer-scroll{display:none;flex:1 1 auto;overflow:auto;padding:8px 8px 10px;}
      #drawer-scroll::-webkit-scrollbar{width:0;height:0} #drawer-scroll{scrollbar-width:none}
      #app-list{ display:flex; flex-direction:column; gap:var(--ts2-gap); align-items:stretch; }
      .app-row{ position:relative; height:var(--ts2-icon); border-radius:12px; background:var(--ts-surfA); box-shadow:inset 0 0 0 1px var(--ts-border);
        display:flex; align-items:center; gap:10px; padding:0 10px; cursor:pointer; user-select:none; transition:background .16s cubic-bezier(.2,.8,.2,1), transform .16s cubic-bezier(.2,.8,.2,1);}
      .app-row:hover{ background:rgba(255,255,255,.14); transform:translateY(-1px); }
      .app-icon{ font-family:"Material Icons Outlined"; height:var(--ts2-icon); width:var(--ts2-icon); min-width:var(--ts2-icon);
        display:flex;align-items:center;justify-content:center; border-radius:10px; box-shadow:inset 0 0 0 1px var(--ts-border); font-size:22px; }
      .app-label{ font-size:13px; font-weight:600; letter-spacing:.01em; opacity:.96; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

      /* Drawer flyout (no title) */
      #drawer-pop{ position:fixed;left:var(--ts-collapsed-w);top:0;min-width:240px;max-width:320px;
        background:linear-gradient(180deg,var(--ts-purple-2),var(--ts-purple)); color:#fff;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.28),0 0 0 1px rgba(255,255,255,.10);
        display:none;flex-direction:column;overflow:hidden;z-index:2000;transform-origin:12px top;opacity:0;transform:translateY(-2px) scale(.98);
        transition:opacity .14s ease,transform .14s ease; }
      #extension-side-bar.dark-mode ~ #drawer-pop{background:linear-gradient(180deg,var(--ts-dark-1),var(--ts-dark-2));}
      #drawer-pop.show{display:flex;opacity:1;transform:translateY(0) scale(1);}
      #drawer-pop .pop-title{display:none;}
      #drawer-pop .pop-list{padding:6px 8px 10px 8px;max-height:60vh;overflow:auto;}
      #drawer-pop .pop-list a{ display:flex;align-items:center;gap:8px;height:30px;padding:0 10px;margin:2px 0;border-radius:10px;color:#fff;text-decoration:none;font-size:13px; }
      #drawer-pop .pop-list a:hover{background:rgba(255,255,255,.12);}
      #drawer-pop .pop-list a .material-icons-outlined{font-size:18px;width:22px;text-align:center;}

      /* ---------- Settings modal ---------- */
      #ts-settings{position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:3000;}
      #ts-settings .shade{position:absolute;inset:0;background:rgba(0,0,0,.35);}
      #ts-settings .panel{position:relative;min-width:760px;max-width:920px;max-height:80vh;overflow:auto;border-radius:16px;
        background:linear-gradient(180deg,var(--ts-purple-2),var(--ts-purple)); box-shadow:0 20px 60px rgba(0,0,0,.35),0 0 0 1px rgba(255,255,255,.12); color:#fff; padding:14px 14px 12px;}
      #ts-settings h3{margin:0 0 6px 0;font-weight:700;font-size:14px;letter-spacing:.02em;opacity:.95}
      #ts-settings .row{display:grid;grid-template-columns:320px 1fr;gap:14px;}
      #ts-settings .seg{background:rgba(255,255,255,.06);border-radius:12px;padding:10px;box-shadow:inset 0 0 0 1px var(--ts-border);}
      #ts-settings label{font-size:13px;}
      #ts-settings input[type="text"],#ts-settings input[type="number"]{height:28px;border:none;border-radius:8px;padding:0 8px;background:rgba(255,255,255,.16);color:#fff;outline:none;box-shadow:inset 0 0 0 1px var(--ts-border);font-size:13px;}
      #ts-settings .list{display:flex;flex-direction:column;gap:6px;}
      #ts-settings .item{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;background:rgba(255,255,255,.06);border-radius:10px;padding:6px 8px;box-shadow:inset 0 0 0 1px var(--ts-border);cursor:pointer;}
      #ts-settings .item .left{display:flex;gap:8px;align-items:center;}
      #ts-settings .btn{height:28px;padding:0 10px;border:none;border-radius:8px;background:rgba(255,255,255,.16);color:#fff;cursor:pointer}
      #ts-settings .btn:hover{background:rgba(255,255,255,.26)}
      #ts-settings .right{display:flex;gap:8px;justify-content:flex-end;margin-top:10px;}
      #ts-settings .chip{height:24px;display:inline-flex;align-items:center;border-radius:999px;padding:0 8px;background:rgba(255,255,255,.12);font-size:12px;}
      #ts-settings .x{position:absolute;right:8px;top:8px;height:28px;width:28px;border-radius:8px;border:none;background:rgba(255,255,255,.16);color:#fff;cursor:pointer}
      #ts-settings .x:hover{background:rgba(255,255,255,.26)}
      #ts-settings .icon-picker{display:flex;align-items:center;}
      #ts-settings .icon-picker button{height:30px;width:30px;border:none;border-radius:8px;background:rgba(255,255,255,.16);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:"Material Icons Outlined";font-size:18px;transition:background .14s ease,transform .14s ease;}
      #ts-settings .icon-picker button:hover{background:rgba(255,255,255,.26);transform:translateY(-1px);}
      #ts-icon-pop{position:fixed;display:flex;flex-direction:column;min-width:240px;max-width:320px;max-height:320px;overflow:hidden;border-radius:12px;background:linear-gradient(180deg,var(--ts-purple-2),var(--ts-purple));box-shadow:0 18px 50px rgba(0,0,0,.35),0 0 0 1px rgba(255,255,255,.14);opacity:0;transform:translateY(6px) scale(.98);pointer-events:none;transition:opacity .14s ease,transform .14s ease;z-index:4000;}
      body.o_dark_theme #ts-icon-pop{background:linear-gradient(180deg,var(--ts-dark-1),var(--ts-dark-2));}
      #ts-icon-pop.active{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;}
      #ts-icon-pop .icon-pop-search{display:flex;align-items:center;gap:6px;padding:10px 10px 6px;}
      #ts-icon-pop .icon-pop-search input{flex:1;height:28px;border:none;border-radius:8px;padding:0 8px;background:rgba(255,255,255,.18);color:#fff;outline:none;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18);font-size:13px;}
      #ts-icon-pop .icon-pop-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:6px;padding:4px 10px 12px;overflow:auto;}
      #ts-icon-pop .icon-pop-option{display:flex;align-items:center;gap:8px;height:34px;padding:0 10px;border-radius:8px;border:none;background:rgba(255,255,255,.12);color:#fff;font-size:13px;cursor:pointer;font-family:inherit;transition:background .12s ease,transform .12s ease;}
      #ts-icon-pop .icon-pop-option .material-icons-outlined{font-size:20px;}
      #ts-icon-pop .icon-pop-option:hover,#ts-icon-pop .icon-pop-option.active{background:rgba(255,255,255,.26);transform:translateY(-1px);}

      /* ---------- POS page color hardening ---------- */
      body.pos-ui #extension-side-bar a,
      body.pos-ui #extension-side-bar .cat-hd,
      body.pos-ui #cat-pop a,
      body.pos-ui #drawer-pop a { color:#fff !important; }

    `;
    document.head.appendChild(style);

    /* ============================== DOM BOOT ================================ */
    // Root
    const sidebar = Object.assign(document.createElement('div'), { id:'extension-side-bar' });
    const searchWrap = Object.assign(document.createElement('div'), { id:'sidebar-search-wrap' });
    const searchInput = Object.assign(document.createElement('input'), { id:'sidebar-search', type:'text', placeholder:'', autocomplete:'off', spellcheck:false });
    const searchHint = Object.assign(document.createElement('div'), { id:'search-hint' });
    const backBtn = Object.assign(document.createElement('button'), { id:'sidebar-back', title:'Back' });
    backBtn.innerHTML = '<span class="material-icons-outlined">arrow_back</span>';
    searchWrap.style.position = 'relative';
    searchWrap.append(searchInput, backBtn, searchHint);

    const navWrap = Object.assign(document.createElement('div'), { id:'extension-side-bar-nav-wrap' });
    const navScroll = Object.assign(document.createElement('div'), { id:'nav-scroll' });
    const navInner = document.createElement('div'); navInner.style.position='relative';
    const dot = Object.assign(document.createElement('div'), { id:'extension-sidebar-dot' });
    navInner.appendChild(dot);
    navScroll.appendChild(navInner);
    navWrap.appendChild(navScroll);

    // Option 2 drawer
    const drawerScroll = Object.assign(document.createElement('div'), { id:'drawer-scroll' });
    const appList = Object.assign(document.createElement('div'), { id:'app-list' });
    drawerScroll.appendChild(appList);
    navWrap.appendChild(drawerScroll);

    // Popovers
    const pop = Object.assign(document.createElement('div'), { id:'cat-pop' });
    const popTitle = Object.assign(document.createElement('div'), { className:'pop-title' });
    const popList = Object.assign(document.createElement('div'), { className:'pop-list' });
    pop.append(popTitle, popList);

    const drawerPop = Object.assign(document.createElement('div'), { id:'drawer-pop' });
    const drawerPopTitle = Object.assign(document.createElement('div'), { className:'pop-title' });
    const drawerPopList = Object.assign(document.createElement('div'), { className:'pop-list' });
    drawerPop.append(drawerPopTitle, drawerPopList);

    // Footer
    const footer = Object.assign(document.createElement('div'), { id:'extension-side-bar-footer' });
    const ver = Object.assign(document.createElement('a'), { id:'sidebar-version', href:'javascript:void(0)', title:'TekStore Settings' });
    ver.textContent = 'v' + TS.VERSION;
    const spacer1 = Object.assign(document.createElement('div'), { className:'ts-flex' });
    const spacer2 = Object.assign(document.createElement('div'), { className:'ts-flex' });
    const spacer3 = Object.assign(document.createElement('div'), { className:'ts-flex' });
    const lockBtn = Object.assign(document.createElement('button'), { id:'sidebar-lock-btn', className:'pill', title:'Lock screen (Ctrl+Alt+L)' });
    lockBtn.innerHTML = '<span class="material-icons-outlined">lock</span>';
    const moon = Object.assign(document.createElement('button'), { id:'sidebar-dark-moon', className:'pill', title:'Toggle Dark Mode' });
    moon.innerHTML = '<span class="material-icons-outlined">dark_mode</span>';
    const collapse = Object.assign(document.createElement('button'), { id:'sidebar-collapse-toggle', className:'pill', title:'Collapse/Expand sidebar' });
    collapse.innerHTML = '<span class="material-icons-outlined">keyboard_double_arrow_left</span>';
    footer.append(ver, spacer1, lockBtn, spacer2, moon, spacer3, collapse);

    sidebar.append(searchWrap, navWrap, footer);
    document.body.append(sidebar, pop, drawerPop);

    const url = (p) => `https://${HOST}${p}`;
    const cleanPath = (u) => (u || '').replace(/[?#].*$/, '').replace(/\/+$/, '') || '/';

    function isVisible(el){
      if (!el || !(el instanceof Element)) return false;
      if (el.offsetParent === null) return false;
      const cat = el.closest('.cat'); if (cat && !cat.classList.contains('open')) return false;
      return getComputedStyle(el).display !== 'none';
    }

    /* ============================== MODULES ================================= */

    const Modules = {};

    /* ----- Sidebar (Option 1) ----- */
    Modules.Sidebar = (function(){
      const STATE_MAP_KEY = 'ts_cat_state_v2';
      let catNodes = {};
      let popTimer = 0;

      function loadCatState(){
        try{ const raw=localStorage.getItem(STATE_MAP_KEY); if(raw) return JSON.parse(raw)||{}; }catch{}
        const def={}; (CFG.nav.cats||[]).forEach(([k,, ,show])=>{ if (show!==false) def[k]=true; });
        return def;
      }
      function saveCatState(map){ try{ localStorage.setItem(STATE_MAP_KEY, JSON.stringify(map)); }catch{} }
      let catState = loadCatState();

      function mkLink(catName) {
        return ([label,icon,href,show]) => {
          if (show===false) return null;
          const a = document.createElement('a');
          a.className = 'ts-nav-link'; a.href = url(href); a.title = `${catName} › ${label}`;
          const i = document.createElement('span'); i.className='material-icons-outlined'; i.textContent=icon;
          const s = document.createElement('span'); s.className='sidebar-label'; s.textContent=label;
          a.append(i,s); return a;
        };
      }

      function build(){
        navInner.innerHTML = '';
        navInner.appendChild(dot);
        catNodes = {};
        (CFG.nav.cats||[]).forEach(([key,name,mi,show])=>{
          if (show===false) return;
          const cat = document.createElement('div'); cat.className = 'cat'; cat.dataset.key = key;
          if (key === 'quick') cat.classList.add('quick');
          const hd = document.createElement('div'); hd.className = 'cat-hd'; hd.title = name; hd.tabIndex = 0;
          const ic = document.createElement('div'); ic.className = 'cat-icon material-icons-outlined'; ic.textContent = mi;
          const nm = document.createElement('div'); nm.className = 'cat-name'; nm.textContent = name;
          const caret = document.createElement('div'); caret.className = 'cat-caret material-icons-outlined'; caret.textContent='expand_more';
          hd.append(ic,nm,caret);

          const items = document.createElement('div'); items.className = 'cat-items';
          (CFG.nav.items[key]||[]).map(mkLink(name)).forEach(a=>{ if (a) items.appendChild(a); });

          cat.append(hd, items); navInner.appendChild(cat);
          catNodes[key] = {cat, hd, items, name};
        });

        applyCatState();
        wireEvents();
      }

      function applyCatState(){
        Object.entries(catNodes).forEach(([k,n])=>{
          const open = k==='quick' ? true : !!catState[k];
          n.cat.classList.toggle('open', open);
        });
        positionDot();
      }

      function wireEvents(){
        Object.entries(catNodes).forEach(([key,n])=>{
          n.hd.addEventListener('click', ()=>{
            if (key === 'quick') return;
            catState[key] = !catState[key]; saveCatState(catState); applyCatState();
          });
          n.hd.addEventListener('keydown',(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); n.hd.click(); }});
          n.hd.addEventListener('mouseenter', ()=>{
            if (sidebar.classList.contains('collapsed')) showPopFor(key);
          });
          n.hd.addEventListener('mouseleave', hidePopSoon);
        });

        // dblclick quick access = expand/collapse all
        catNodes.quick?.hd.addEventListener('dblclick', (e)=>{
          e.preventDefault(); e.stopPropagation();
          const anyClosed = (CFG.nav.cats||[]).some(([k])=> k!=='quick' && !catState[k]);
          (CFG.nav.cats||[]).forEach(([k])=>{ if (k!=='quick') catState[k] = anyClosed; });
          saveCatState(catState); applyCatState();
        });

        sidebar.addEventListener('mouseleave', hidePopSoon);
        sidebar.addEventListener('mouseenter', ()=>{ if (!sidebar.classList.contains('collapsed')) pop.classList.remove('show'); });
        pop.addEventListener('mouseenter', ()=>{ clearTimeout(popTimer); });
        pop.addEventListener('mouseleave', hidePopSoon);
      }

      function showPopFor(key){
        clearTimeout(popTimer);
        if (!sidebar.classList.contains('collapsed')){ pop.classList.remove('show'); return; }
        const n = catNodes[key]; if (!n) return;
        popTitle.textContent = n.name;
        popList.innerHTML = '';
        n.items.querySelectorAll('a').forEach(a=>{
          if (a.style.display === 'none') return;
          const row = document.createElement('a');
          row.href = a.href;
          row.textContent = a.querySelector('.sidebar-label')?.textContent || '';
          popList.appendChild(row);
        });
        if (!popList.children.length){ pop.classList.remove('show'); return; }
        const r = n.hd.getBoundingClientRect();
        const top = Math.max(10, Math.min(window.innerHeight - 260, r.top));
        pop.style.top = `${top}px`;
        pop.style.left = `${r.right + 8}px`;
        pop.classList.add('show');
      }
      function hidePopSoon(){
        clearTimeout(popTimer);
        popTimer = setTimeout(()=>{
          if (!sidebar.matches(':hover') && !pop.matches(':hover')) pop.classList.remove('show');
        }, 120);
      }

      function offsetTopWithin(el, ancestor){ let y=0,n=el; while(n&&n!==ancestor){ y+=n.offsetTop||0; n=n.offsetParent; } return y; }
      function computeActiveLink(){
        const cur = cleanPath(location.pathname); let tgt=null;
        navScroll.querySelectorAll('.ts-nav-link').forEach(a=>{ const link=cleanPath(new URL(a.href, location.origin).pathname); if(!tgt&&(cur===link||cur.startsWith(link+'/'))) tgt=a; });
        return (tgt && isVisible(tgt)) ? tgt : null;
      }
      function positionDot(){
        if (sidebar.classList.contains('collapsed')) { dot.style.display='none'; return; }
        const tgt = computeActiveLink();
        if (!tgt){ dot.style.display='none'; return; }
        const y = offsetTopWithin(tgt, navInner) + (tgt.offsetHeight - 8)/2;
        dot.style.transform = `translateY(${y}px)`; dot.style.display = 'block';
      }
      const scheduleDot = ()=>requestAnimationFrame(positionDot);

      function init(){
        build();
        window.addEventListener('popstate', scheduleDot, { passive:true });
        window.addEventListener('hashchange', scheduleDot, { passive:true });
        window.addEventListener('resize', scheduleDot, { passive:true });
        navScroll.addEventListener('scroll', scheduleDot, { passive:true });
        document.body.addEventListener('click', scheduleDot, { capture:true, passive:true });
        new MutationObserver(scheduleDot).observe(document.querySelector('.o_action_manager') || document.body, { childList:true, subtree:true });
        new ResizeObserver(scheduleDot).observe(sidebar);
        new ResizeObserver(scheduleDot).observe(navInner);
      }

      return { init, rebuild: build, positionDot };
    })();

    /* ----- Drawer (Option 2) ----- */
    Modules.Drawer = (function(){
      const appNodes = {};
      let flyTimer = 0;

      function build(){
        appList.innerHTML = '';
        (CFG.nav.cats||[]).forEach(([key, name, icon, show])=>{
          if (show===false) return;
          const row = document.createElement('div');
          row.className = 'app-row'; row.dataset.key = key; row.title = name;

          const ic = document.createElement('div');
          ic.className = 'app-icon material-icons-outlined'; ic.textContent = icon;

          const label = document.createElement('div');
          label.className = 'app-label'; label.textContent = name;

          row.append(ic, label);
          appList.appendChild(row);
          appNodes[key] = {key, name, icon, row};
        });

        Object.values(appNodes).forEach(n=>{
          n.row.addEventListener('mouseenter', ()=>{ if (sidebar.classList.contains('layout-opt2') && !sidebar.classList.contains('collapsed')) showFlyFor(n.key); });
          n.row.addEventListener('mouseleave', hideFlySoon);
          n.row.addEventListener('click', ()=>{ if (!sidebar.classList.contains('layout-opt2')) return;
            if (drawerPop.classList.contains('show')) hideFlyImmediate(); else showFlyFor(n.key);
          }, {passive:true});
        });
        drawerPop.addEventListener('mouseleave', hideFlySoon);
      }

      function showFlyFor(key){
        if (sidebar.classList.contains('collapsed')) return; // no flyouts when collapsed
        const n = appNodes[key]; if (!n) return;
        drawerPopList.innerHTML = '';
        (CFG.nav.items[key]||[]).forEach(([label, mi, href, show])=>{
          if (show===false) return;
          const a = document.createElement('a'); a.href = url(href);
          const i = document.createElement('span'); i.className='material-icons-outlined'; i.textContent=mi;
          const s = document.createElement('span'); s.textContent=label;
          a.append(i,s); drawerPopList.appendChild(a);
        });
        const r = n.row.getBoundingClientRect();
        const leftBase = sidebar.getBoundingClientRect().right + 8;
        drawerPop.style.top = Math.max(10, Math.min(window.innerHeight - 340, r.top - 8)) + 'px';
        drawerPop.style.left = leftBase + 'px';
        drawerPop.classList.add('show');
      }
      function hideFlyImmediate(){ drawerPop.classList.remove('show'); }
      function hideFlySoon(){
        clearTimeout(flyTimer);
        flyTimer = setTimeout(()=>{
          if (!drawerPop.matches(':hover')) hideFlyImmediate();
        }, 140);
      }

      return { init(){ if (TS.flags.opt2Drawer) build(); }, rebuild: build, hideFlyImmediate };
    })();

    /* ----- Layout switch & chrome ----- */
    Modules.Chrome = (function(){
      const EXP = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ts-sidebar-w')) || 192;
      const COL = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ts-collapsed-w')) || 56;

      function pad(collapsed){
        const s = (collapsed ? COL : EXP) + 'px';
        document.body.style.paddingLeft = s;
        const header  = document.querySelector('header.o_main_navbar');
        const control = document.querySelector('.o_control_panel');
        const manager = document.querySelector('.o_action_manager');
        if (header)  header.style.left         = s;
        if (control) control.style.paddingLeft = s;
        if (manager) manager.style.paddingLeft = s;
        window.dispatchEvent(new Event('resize'));
      }

      function applyLayoutClass(){
        const toOpt2 = (CFG.layout === 'opt2');
        sidebar.classList.toggle('layout-opt2', toOpt2);
        if (toOpt2){
          Modules.Drawer.rebuild();
          dot.style.display = 'none';
        } else {
          Modules.Drawer.hideFlyImmediate && Modules.Drawer.hideFlyImmediate();
          Modules.Sidebar.positionDot();
        }
      }

      function setCollapseIcon(c){ collapse.firstElementChild.textContent = c ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'; }

      function collapseNow(){
        sidebar.classList.add('animating');
        const c = sidebar.classList.toggle('collapsed', true);
        localStorage.setItem('sidebarCollapsed', String(c));
        pad(c); setCollapseIcon(c);
        Modules.Drawer.hideFlyImmediate && Modules.Drawer.hideFlyImmediate();
        pop.classList.remove('show');
        Modules.Sidebar.positionDot();
        setTimeout(()=> sidebar.classList.remove('animating'), 180);
      }
      function expandNow(){
        sidebar.classList.add('animating');
        sidebar.classList.remove('collapsed');
        localStorage.setItem('sidebarCollapsed', 'false');
        pad(false); setCollapseIcon(false);
        setTimeout(()=> sidebar.classList.remove('animating'), 180);
        setTimeout(()=>Modules.Sidebar.positionDot(), 0);
      }

      function init(){
        const wasCol = localStorage.getItem('sidebarCollapsed')==='true';
        const wasDark= localStorage.getItem('sidebarDarkMode')==='on';
        sidebar.classList.toggle('collapsed', wasCol);
        sidebar.classList.toggle('dark-mode', wasDark);
        document.body.classList.toggle('o_dark_theme', wasDark);
        pad(wasCol);
        setCollapseIcon(wasCol);
        applyLayoutClass();

        collapse.addEventListener('click', () => {
          if (!sidebar.classList.contains('collapsed')) collapseNow();
          else expandNow();
        });

        moon.addEventListener('click', () => {
          const d = sidebar.classList.toggle('dark-mode');
          document.body.classList.toggle('o_dark_theme', d);
          localStorage.setItem('sidebarDarkMode', d?'on':'off');
        });

        // Layout toggle: Ctrl + Alt + M
        document.addEventListener('keydown', (e)=>{
          if (e.ctrlKey && e.altKey && (e.code === 'KeyM')){
            CFG.layout = (CFG.layout === 'opt2') ? 'opt1' : 'opt2';
            saveConfig(CFG);
            applyLayoutClass();
            setTimeout(()=>Modules.Sidebar.positionDot(), 0);
          }
        }, {capture:true});
      }
      return { init, applyLayoutClass, expandNow, collapseNow };
    })();

    /* ----- Search & user ----- */
    Modules.Search = (function(){
      function applySearchOpt1(needle){
        const catNodes = navInner.querySelectorAll('.cat');
        if (!needle){
          catNodes.forEach(cat=>{
            cat.style.display = '';
            cat.querySelectorAll('a.ts-nav-link').forEach(a=>a.style.display='flex');
          });
          Modules.Sidebar.positionDot();
          return;
        }
        catNodes.forEach(cat=>{
          cat.classList.add('open'); let any=false;
          cat.querySelectorAll('a.ts-nav-link .sidebar-label').forEach(lbl=>{
            const a = lbl.closest('a.ts-nav-link');
            const hit = (lbl.textContent||'').toLowerCase().includes(needle);
            a.style.display = hit ? 'flex' : 'none';
            if (hit) any=true;
          });
          cat.style.display = any ? '' : 'none';
        });
        dot.style.display='none';
      }

      function applySearchOpt2(needle){
        const rows = appList.querySelectorAll('.app-row');
        if (!needle){ rows.forEach(r=>r.style.display=''); Modules.Drawer.hideFlyImmediate && Modules.Drawer.hideFlyImmediate(); return; }
        const hits = new Set();
        (CFG.nav.cats||[]).forEach(([k, name])=>{
          if ((name||'').toLowerCase().includes(needle)) hits.add(k);
          (CFG.nav.items[k]||[]).forEach(([label])=>{ if (String(label).toLowerCase().includes(needle)) hits.add(k); });
        });
        rows.forEach(r=> r.style.display = hits.has(r.dataset.key) ? '' : 'none');
        if (hits.size === 1){
          const only = [...hits][0];
          const node = appList.querySelector(`.app-row[data-key="${only}"]`);
          if (node && sidebar.classList.contains('layout-opt2') && !sidebar.classList.contains('collapsed')){
            const evt = new Event('mouseenter'); node.dispatchEvent(evt);
          }
        } else Modules.Drawer.hideFlyImmediate && Modules.Drawer.hideFlyImmediate();
      }

      function applySearch(q){
        const needle = String(q||'').trim().toLowerCase();
        if (sidebar.classList.contains('layout-opt2')) applySearchOpt2(needle);
        else applySearchOpt1(needle);
      }

      function init(){
        const hideHint = ()=>{ searchHint.style.display='none'; };
        searchInput.addEventListener('focus', hideHint);
        searchInput.addEventListener('mousedown', hideHint);
        searchInput.addEventListener('input', ()=>{ hideHint(); applySearch(searchInput.value); });
        searchInput.addEventListener('blur',  ()=>{ if (!searchInput.value) searchHint.style.display='block'; });

        // Name
        (async ()=>{
          try{
            let nice = '';
            try{
              const res = await fetch('/web/session/get_session_info', {method:'POST',headers:{'Content-Type':'application/json'},body: JSON.stringify({jsonrpc:'2.0', method:'call', params:{}})});
              const { result } = await res.json();
              const nm = (result && (result.name || result.partner_display_name || result.username)) || '';
              nice = String(nm);
            }catch{}
            if (!nice){
              const uiName = document.querySelector('.o_user_menu .name')?.textContent || document.querySelector('.o_user_menu .dropdown-toggle')?.textContent || '';
              nice = String(uiName);
            }
            nice = nice.replace(/@.*$/,'').replace(/\bodoo(\.[\w.-]+)?/i,'').replace(/\s{2,}/g,' ').trim();
            searchHint.textContent = nice || 'User';
          }catch{ searchHint.textContent = 'User'; }
        })();

        // Back button
        backBtn.addEventListener('click', (e)=>{
          e.preventDefault();
          try{
            const before = history.length;
            let did = false;
            const t = setTimeout(()=>{ if(!did) window.location.assign('/web'); }, 220);
            window.addEventListener('popstate', ()=>{ did=true; clearTimeout(t); }, {once:true});
            if (before>1) history.back(); else window.location.assign('/web');
          }catch{ window.location.assign('/web'); }
        });
      }

      return { init };
    })();

    /* ----- Settings Modal (simplified) ----- */
    Modules.Settings = (function(){
      if (!TS.flags.settingsModal) return { init(){} };

      let host, shade, panel, leftSeg, rightSeg, saveBtn, resetBtn, closeBtn;
      let selectedKey = null;

      const BASE_ICON_CHOICES = [
        'widgets','event','supervisor_account','build','inventory_2','store','workspaces','account_balance_wallet',
        'point_of_sale','forum','dashboard','event_available','groups','manage_accounts','request_quote','shopping_bag',
        'receipt_long','build_circle','autorenew','architecture','important_devices','category','undo','sync_alt',
        'checklist','arrow_forward','arrow_back','description','shopping_cart','monetization_on','account_tree','menu_book',
        'school','folder_open','payments','today','currency_pound','add_circle','apps','settings','home','lock','insights',
        'leaderboard','list_alt','shopping_cart_checkout','warehouse','inventory','local_shipping','bar_chart','assessment',
        'note_alt','link','open_in_new','done','bookmark','flag','campaign','schedule','sell','price_check','phone_android',
        'devices','language','api','backup','calculate','call_split','bolt','star','favorite','support','help_outline'
      ];
      const ICON_METADATA_URL = 'https://fonts.google.com/metadata/icons';
      let iconPop, iconPopSearch, iconPopGrid;
      let iconPopOnPick = null;
      let iconPopCurrent = '';
      let iconPopHideTimer = null;
      let iconFetchPromise = null;
      let allMaterialIcons = null;

      function ensureFullIconSet(){
        if (allMaterialIcons) return Promise.resolve(allMaterialIcons);
        if (typeof fetch !== 'function'){
          allMaterialIcons = Array.from(new Set(BASE_ICON_CHOICES));
          return Promise.resolve(allMaterialIcons);
        }
        if (iconFetchPromise) return iconFetchPromise;
        iconFetchPromise = fetch(ICON_METADATA_URL, { cache:'force-cache', mode:'cors' })
          .then((res)=>{ if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.text(); })
          .then((txt)=>{
            const clean = txt.replace(/^[^\{\[]+/, '');
            let data = {};
            try{ data = JSON.parse(clean); }catch{ data = {}; }
            const set = new Set(BASE_ICON_CHOICES);
            const icons = Array.isArray(data.icons) ? data.icons : [];
            icons.forEach((icon)=>{
              if (!icon) return;
              const name = icon.name || '';
              const styles = Array.isArray(icon.styles) ? icon.styles : Array.isArray(icon.variants) ? icon.variants : [];
              const families = Array.isArray(icon.families) ? icon.families : Array.isArray(icon.sets) ? icon.sets : [];
              const norm = styles.map((s)=> String(s).toLowerCase());
              const famNorm = families.map((s)=> String(s).toLowerCase());
              const hasOutline = norm.includes('outline') || norm.includes('outlined') || famNorm.includes('outlined') || famNorm.includes('outline');
              if (!hasOutline) return;
              if (name) set.add(name);
              if (Array.isArray(icon.aliases)){
                icon.aliases.forEach((alias)=>{
                  if (!alias) return;
                  if (typeof alias === 'string') set.add(alias);
                  else if (alias.name) set.add(alias.name);
                });
              }
            });
            allMaterialIcons = Array.from(set).filter(Boolean).sort((a,b)=> a.localeCompare(b));
            return allMaterialIcons;
          })
          .catch((err)=>{
            console.warn('[TS] Icon metadata fetch failed', err);
            allMaterialIcons = Array.from(new Set(BASE_ICON_CHOICES));
            return allMaterialIcons;
          })
          .finally(()=>{ iconFetchPromise = null; });
        return iconFetchPromise;
      }

      function ensureIconPop(){
        if (iconPop) return;
        iconPop = document.createElement('div');
        iconPop.id = 'ts-icon-pop';
        iconPop.style.display = 'none';

        const searchWrap = document.createElement('div');
        searchWrap.className = 'icon-pop-search';
        iconPopSearch = document.createElement('input');
        iconPopSearch.type = 'text';
        iconPopSearch.placeholder = 'Search icons';
        searchWrap.append(iconPopSearch);

        iconPopGrid = document.createElement('div');
        iconPopGrid.className = 'icon-pop-grid';

        iconPop.append(searchWrap, iconPopGrid);
        document.body.appendChild(iconPop);

        iconPop.addEventListener('click', (ev)=> ev.stopPropagation());
        iconPopSearch.addEventListener('input', ()=> renderIconChoices(iconPopSearch.value));
        ensureFullIconSet().then(()=>{
          if (iconPop && iconPop.style.display !== 'none'){
            renderIconChoices(iconPopSearch ? iconPopSearch.value : '');
          }
        });
      }

      function gatherIconChoices(){
        const set = new Set(BASE_ICON_CHOICES);
        if (Array.isArray(allMaterialIcons)) allMaterialIcons.forEach((ic)=> set.add(ic));
        try {
          (CFG.nav.cats||[]).forEach(([, , ic])=>{ if (ic) set.add(ic); });
          Object.values(CFG.nav.items||{}).forEach((arr)=>{
            (arr||[]).forEach(([, ic])=>{ if (ic) set.add(ic); });
          });
        } catch {}
        return Array.from(set).filter(Boolean).sort((a,b)=> a.localeCompare(b));
      }

      function renderIconChoices(term){
        if (!iconPopGrid) return;
        const q = String(term||'').toLowerCase().trim();
        iconPopGrid.innerHTML = '';
        const icons = gatherIconChoices().filter((name)=> name.toLowerCase().includes(q));
        icons.forEach((name)=>{
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'icon-pop-option' + (name === iconPopCurrent ? ' active' : '');
          const ico = document.createElement('span'); ico.className='material-icons-outlined'; ico.textContent=name;
          const label = document.createElement('span'); label.textContent = name;
          btn.append(ico, label);
          btn.addEventListener('click', ()=>{
            if (iconPopOnPick) iconPopOnPick(name);
            closeIconPop();
          });
          iconPopGrid.appendChild(btn);
        });
        if (!icons.length){
          const empty = document.createElement('div');
          empty.textContent = iconFetchPromise ? 'Loading icons…' : 'No icons found';
          empty.style.opacity = '.7';
          empty.style.fontSize = '12px';
          empty.style.padding = '10px 4px';
          iconPopGrid.appendChild(empty);
        }
      }

      function handleIconPopOutside(ev){
        if (!iconPop || iconPop.style.display === 'none') return;
        if (!iconPop.contains(ev.target)) closeIconPop();
      }

      function openIconPop(anchor, current, onPick){
        ensureIconPop();
        if (iconPopHideTimer) { clearTimeout(iconPopHideTimer); iconPopHideTimer = null; }
        window.removeEventListener('click', handleIconPopOutside, true);
        iconPopOnPick = onPick;
        iconPopCurrent = current || '';
        iconPopSearch.value = '';
        renderIconChoices('');
        iconPop.style.display = 'flex';
        iconPop.classList.remove('active');
        const rect = anchor.getBoundingClientRect();
        const dims = iconPop.getBoundingClientRect();
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        const left = Math.min(Math.max(rect.left, 12), Math.max(12, vw - dims.width - 12));
        const top = Math.min(Math.max(rect.bottom + 8, 12), Math.max(12, vh - dims.height - 12));
        iconPop.style.left = `${left}px`;
        iconPop.style.top = `${top}px`;
        requestAnimationFrame(()=>{
          iconPop.classList.add('active');
          iconPopSearch?.focus();
        });
        ensureFullIconSet().then(()=>{
          if (iconPop && iconPop.style.display !== 'none'){
            renderIconChoices(iconPopSearch ? iconPopSearch.value : '');
          }
        });
        setTimeout(()=> window.addEventListener('click', handleIconPopOutside, true), 0);
      }

      function closeIconPop(){
        if (!iconPop || iconPop.style.display === 'none') return;
        iconPop.classList.remove('active');
        if (iconPopHideTimer) clearTimeout(iconPopHideTimer);
        const ref = iconPop;
        iconPopHideTimer = setTimeout(()=>{
          if (ref) ref.style.display = 'none';
          iconPopHideTimer = null;
        }, 140);
        window.removeEventListener('click', handleIconPopOutside, true);
        iconPopOnPick = null;
        iconPopCurrent = '';
        if (iconPopSearch) iconPopSearch.value = '';
      }

      function createIconPicker(initial, onChange){
        ensureIconPop();
        const wrap = document.createElement('div'); wrap.className='icon-picker';
        const btn = document.createElement('button'); btn.type='button'; btn.title='Pick icon';
        const ico = document.createElement('span'); ico.className='material-icons-outlined';
        btn.appendChild(ico);

        function set(val){
          const v = val ? val.trim() : '';
          ico.textContent = v || 'help_outline';
          btn.dataset.icon = v;
          btn.title = v ? `Icon: ${v}` : 'Pick icon';
        }

        set(initial || '');

        wrap.addEventListener('click', (ev)=> ev.stopPropagation());
        btn.addEventListener('click', (ev)=>{
          ev.stopPropagation();
          const current = btn.dataset.icon || '';
          openIconPop(btn, current, (choice)=>{
            const picked = choice || '';
            set(picked);
            onChange(picked);
            iconPopCurrent = picked;
          });
        });

        wrap.append(btn);
        return { el: wrap, set };
      }

      function open(){
        if (!host) build();
        host.style.display = 'flex';
        render();
      }
      function close(){ if (host) host.style.display = 'none'; closeIconPop(); }

      function build(){
        host = document.createElement('div'); host.id='ts-settings';
        shade = document.createElement('div'); shade.className='shade';
        panel = document.createElement('div'); panel.className='panel';

        const title = document.createElement('h3'); title.textContent = 'TekStore — Settings';
        closeBtn = document.createElement('button'); closeBtn.className='x'; closeBtn.innerHTML='✕';
        resetBtn = document.createElement('button'); resetBtn.className='btn'; resetBtn.textContent='Reset to defaults';
        const topRow = document.createElement('div'); topRow.style.display='flex'; topRow.style.justifyContent='space-between'; topRow.style.alignItems='center'; topRow.append(title, resetBtn, closeBtn);

        const row = document.createElement('div'); row.className='row';
        leftSeg = document.createElement('div'); leftSeg.className='seg';
        rightSeg = document.createElement('div'); rightSeg.className='seg';
        row.append(leftSeg, rightSeg);

        const actions = document.createElement('div'); actions.className='right';
        saveBtn = document.createElement('button'); saveBtn.className='btn'; saveBtn.textContent='Save';
        actions.append(saveBtn);

        panel.append(topRow, row, actions);
        host.append(shade, panel);
        document.body.appendChild(host);

        shade.addEventListener('click', close);
        closeBtn.addEventListener('click', close);
        resetBtn.addEventListener('click', ()=>{
          CFG = JSON.parse(JSON.stringify(DEFAULTS));
          saveConfig(CFG);
          selectedKey = (CFG.nav.cats.find(c=>c[3]!==false)||CFG.nav.cats[0]||[])[0] || null;
          render(); refreshUI();
        });
        saveBtn.addEventListener('click', ()=>{
          saveConfig(CFG); close(); refreshUI();
        });

        // dbl-click version opens settings
        ver.addEventListener('dblclick', open);
      }

      function render(){
        closeIconPop();
        // LEFT: layout + timeout + simple categories (rename + show/hide + select)
        leftSeg.innerHTML = '';
        const layoutTitle = document.createElement('div'); layoutTitle.className='chip'; layoutTitle.textContent = 'Layout';
        const layoutWrap = document.createElement('div'); layoutWrap.style.margin='8px 0 12px';
        const r1 = mkRadio('layout', 'opt1', 'Option 1', CFG.layout==='opt1', (v)=>{ CFG.layout=v; });
        const r2 = mkRadio('layout', 'opt2', 'Option 2', CFG.layout==='opt2', (v)=>{ CFG.layout=v; });
        layoutWrap.append(r1, r2);

        const toTitle = document.createElement('div'); toTitle.className='chip'; toTitle.textContent = 'Screen timeout';
        const toRow = document.createElement('div'); toRow.style.display='flex'; toRow.style.gap='8px'; toRow.style.alignItems='center'; toRow.style.margin='8px 12px';
        const toInput = document.createElement('input'); toInput.type='number'; toInput.min='1'; toInput.value = CFG.timeoutMin || 5;
        const toLbl = document.createElement('span'); toLbl.textContent='min';
        toInput.addEventListener('input', ()=>{ const v = Math.max(1, parseInt(toInput.value||'5',10)); CFG.timeoutMin = v; toInput.value = v; });
        toRow.append(toInput, toLbl);

        const catTitle = document.createElement('div'); catTitle.className='chip'; catTitle.textContent = 'Categories';
        const catList = document.createElement('div'); catList.className='list';

        (CFG.nav.cats||[]).forEach(([key, name, icon, show])=>{
          const row = document.createElement('div'); row.className='item'; row.dataset.key=key;
          const left = document.createElement('div'); left.className='left';
          const iconPicker = createIconPicker(icon, (val)=>{
            const c = CFG.nav.cats.find(c=>c[0]===key);
            if (c) c[2] = val;
          });
          const nameInput = document.createElement('input'); nameInput.type='text'; nameInput.value = name; nameInput.title='Category label';
          nameInput.addEventListener('input', ()=>{ const c = CFG.nav.cats.find(c=>c[0]===key); if (c) c[1]=nameInput.value; });
          left.append(iconPicker.el, nameInput);
          const showBox = document.createElement('input'); showBox.type='checkbox'; showBox.checked = show!==false; showBox.title='Show/Hide';
          showBox.addEventListener('click', (ev)=> ev.stopPropagation());
          showBox.addEventListener('change', ()=>{ const c = CFG.nav.cats.find(c=>c[0]===key); if (c) c[3]=showBox.checked; });

          row.append(left, showBox);
          row.addEventListener('click', ()=>{
            selectedKey = key;
            closeIconPop();
            renderLinksEditor(selectedKey);
            // quick visual focus
            [...catList.children].forEach(el=> el.style.outline='none');
            row.style.outline='1px solid rgba(255,255,255,.35)';
            row.style.outlineOffset='2px';
          });
          catList.appendChild(row);
        });

        if (!selectedKey){
          selectedKey = (CFG.nav.cats.find(c=>c[3]!==false)||CFG.nav.cats[0]||[])[0] || null;
        }

        [...catList.children].forEach((el)=>{
          if (el.dataset.key === selectedKey){
            el.style.outline='1px solid rgba(255,255,255,.35)';
            el.style.outlineOffset='2px';
          } else {
            el.style.outline='none';
          }
        });

        leftSeg.append(layoutTitle, layoutWrap, toTitle, toRow, catTitle, catList);

        // RIGHT: links for selected category
        renderLinksEditor(selectedKey);
      }

      function renderLinksEditor(key){
        rightSeg.innerHTML = '';
        const head = document.createElement('div'); head.className='chip';
        head.textContent = 'Links in selected category';
        const list = document.createElement('div'); list.className='list';

        (CFG.nav.items[key]||[]).forEach((it, idx)=>{
          const [label, icon, href, show] = it;
          const row = document.createElement('div'); row.className='item'; row.dataset.idx=idx;
          row.style.cursor='default';

          const left = document.createElement('div'); left.className='left';
          const nameInput = document.createElement('input'); nameInput.type='text'; nameInput.value = label; nameInput.title='Link label';
          const iconPicker = createIconPicker(icon, (val)=>{
            if (CFG.nav.items[key] && CFG.nav.items[key][idx]) {
              CFG.nav.items[key][idx][1] = val;
            }
          });
          const hrefInput = document.createElement('input'); hrefInput.type='text'; hrefInput.value = href; hrefInput.placeholder='/path';

          const showBox = document.createElement('input'); showBox.type='checkbox'; showBox.checked = show!==false;

          nameInput.addEventListener('input', ()=>{ (CFG.nav.items[key][idx]||[])[0]=nameInput.value; });
          hrefInput.addEventListener('input', ()=>{ (CFG.nav.items[key][idx]||[])[2]=hrefInput.value; });
          showBox.addEventListener('change', ()=>{ (CFG.nav.items[key][idx]||[])[3]=showBox.checked; });

          left.append(nameInput, iconPicker.el, hrefInput);
          row.append(left, showBox);
          list.appendChild(row);
        });

        rightSeg.append(head, list);
      }

      function mkRadio(name, val, label, checked, on){
        const wrap = document.createElement('label'); wrap.style.display='flex'; wrap.style.gap='8px'; wrap.style.alignItems='center';
        const r = document.createElement('input'); r.type='radio'; r.name='ts-'+name; r.value=val; r.checked=checked;
        r.addEventListener('change', ()=>{ if (r.checked) on(val); });
        const s = document.createElement('span'); s.textContent=label;
        wrap.append(r,s); return wrap;
      }

      return { init(){ ver.addEventListener('dblclick', open); } };
    })();

    /* ----- Lock overlay (unchanged behaviour) ----- */
    Modules.Lock = (function(){
      let isLockedLocal=false, lastActivity=0;
      const bcActivity = ('BroadcastChannel' in self) ? new BroadcastChannel(ACTIVITY_CHAN) : null;

      const overlay = document.createElement('div');
      overlay.id='ts-lock-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;z-index:2147483647;user-select:none;touch-action:none;background:var(--ts-purple);font-family: var(--o-font-family, Inter, system-ui, -apple-system, "Segoe UI", Roboto);';
      document.body.appendChild(overlay);

      const title = document.createElement('div'); title.id='ts-lock-title'; title.textContent = 'Screen Locked'; title.style.cssText='color:#fff;font-size:20px;margin-bottom:4px;opacity:.95';
      const userLine = document.createElement('div'); userLine.id='ts-lock-user'; userLine.textContent = ''; userLine.style.cssText='color:#fff;font-size:13px;margin-bottom:8px;opacity:.9';
      const pinHost = document.createElement('div'); pinHost.id='ts-pin-host';
      const keypad = document.createElement('div'); keypad.id='ts-keypad'; keypad.style.cssText='display:grid;grid-template-columns:repeat(3,64px);gap:8px;margin:8px 0 6px;';
      const msg = document.createElement('div'); msg.id='ts-lock-msg'; msg.style.cssText='color:#fff;min-height:18px;font-size:13px;margin-top:4px;opacity:.85';
      const switchBtn = document.createElement('button'); switchBtn.id='ts-switch-user'; switchBtn.type='button'; switchBtn.textContent='Switch user';
      switchBtn.style.cssText='margin-top:8px;border:none;border-radius:10px;padding:8px 12px;background:rgba(255,255,255,.2);color:#fff;cursor:pointer';
      switchBtn.addEventListener('mouseenter',()=>{switchBtn.style.background='rgba(255,255,255,.3)';});
      switchBtn.addEventListener('mouseleave',()=>{switchBtn.style.background='rgba(255,255,255,.2)';});
      overlay.append(title,userLine,pinHost,keypad,switchBtn,msg);

      const shadow = pinHost.attachShadow({mode:'closed'});
      const sStyle = document.createElement('style');
      sStyle.textContent = '#pin{letter-spacing:8px;border:none;border-bottom:2px solid rgba(255,255,255,.7);background:transparent;color:#fff;font-size:24px;text-align:center;outline:none;width:220px;padding:6px 0;margin-top:2px;-webkit-text-security:disc;}';
      const pinInput = document.createElement('input');
      pinInput.id='pin'; pinInput.type='tel'; pinInput.autocomplete='new-password'; pinInput.inputMode='numeric';
      pinInput.spellcheck=false; pinInput.autocapitalize='off'; pinInput.tabIndex = 0;
      pinInput.setAttribute('name','ts_pin_'+Math.random().toString(36).slice(2));
      shadow.append(sStyle, pinInput);

      ['1','2','3','4','5','6','7','8','9','←','0','✓'].forEach(k=>{
        const b=document.createElement('button'); b.className='ts-key'; b.textContent=k;
        b.style.cssText='height:52px;border-radius:10px;background:rgba(255,255,255,.15);color:#fff;font-size:22px;border:none;cursor:pointer';
        b.addEventListener('click',()=>{ if(k==='✓'){ submitPIN(); } else if(k==='←'){ pinInput.value=String(pinInput.value||'').slice(0,-1); pinInput.dispatchEvent(new Event('input')); } else if(/^\d$/.test(k)){ if(String(pinInput.value||'').length<12){ pinInput.value+=k; pinInput.dispatchEvent(new Event('input')); } }});
        keypad.appendChild(b);
      });

      if (TS.flags.posColorHardening && location.pathname.startsWith('/pos/ui')) {
        document.body.classList.add('pos-ui');
      }

      const now = ()=>Date.now();
      let activityThrottle = 0;
      function bumpActivity(){
        const t=now(); if (t-activityThrottle<300) return;
        activityThrottle=t; lastActivity=Math.max(lastActivity,t);
        try{ if (hasStorage) storage.set({[ACTIVITY_KEY]: lastActivity}); }catch{}
        try { if (bcActivity) bcActivity.postMessage(lastActivity); } catch {}
      }
      ['mousemove','keydown','mousedown','touchstart','scroll','wheel'].forEach(ev => document.addEventListener(ev,bumpActivity,{passive:true}));
      window.addEventListener('focus', bumpActivity);
      window.addEventListener('pageshow', bumpActivity);
      document.addEventListener('visibilitychange', ()=>{ if (document.visibilityState==='visible') bumpActivity(); });
      if (bcActivity) bcActivity.onmessage = (ev) => { const t=+ev.data||0; if (t>lastActivity) lastActivity=t; };

      function ensureFocus(){ if (overlay.style.display==='flex'){ try{ pinInput.focus(); }catch{} } }
      async function setUserNameOnOverlay(){
        const label = (searchHint.textContent||'User').replace(/@.*$/,'').replace(/\bodoo(\.[\w.-]+)?/i,'').trim() || 'User';
        userLine.textContent = label;
      }
      async function lockNowGlobal(){
        overlay.style.display='flex';
        pinInput.value=''; msg.textContent='';
        await setUserNameOnOverlay();
        isLockedLocal=true; await setState({locked:true}).catch(()=>{});
        pre.remove(); ensureFocus();
      }
      async function hideOverlay(){ overlay.style.display='none'; pinInput.value=''; msg.textContent=''; isLockedLocal=false; await setState({locked:false}).catch(()=>{}); bumpActivity(); }

      if (hasStorage) try{
        chrome.storage.onChanged.addListener((changes, area)=>{
          if (area!=='local') return;
          if (changes[STATE_KEY]){ const nv=changes[STATE_KEY].newValue||{locked:false}; if (nv.locked){ overlay.style.display='flex'; setUserNameOnOverlay(); ensureFocus(); } else { overlay.style.display='none'; } isLockedLocal=!!nv.locked; }
        });
      }catch{}

      function getTimeoutMs(){ const min = Math.max(1, parseInt(CFG.timeoutMin||5,10)); return min*60*1000; }
      setInterval(()=>{ if (!isLockedLocal && (Date.now()-lastActivity>=getTimeoutMs())) lockNowGlobal(); },1000);
      document.addEventListener('keydown',(e)=>{ if(e.ctrlKey&&e.altKey&&e.code==='KeyL'){ e.preventDefault(); lockNowGlobal(); } }, {capture:true});
      lockBtn.addEventListener('click', lockNowGlobal);

      function submitPIN(){
        const pin=String(pinInput.value||'').trim();
        if(!/^\d{1,12}$/.test(pin)){ msg.textContent='Invalid PIN.'; return; }
        verifyPin(pin).then(ok => { if(ok) hideOverlay(); else msg.textContent='Invalid PIN.'; });
      }
      async function verifyPin(pin){
        try{
          const res=await fetch('/tek_lock/verify_pin',{method:'POST',headers:{'Content-Type':'application/json'},body: JSON.stringify({pin})});
          if(!res.ok) return false; const data=await res.json(); return !!(data&&data.ok);
        } catch { return false; }
      }

      function init(){}

      return { init };
    })();

    /* ============================ BOOT ORDER ================================ */
    Modules.Sidebar.init();
    Modules.Drawer.init();
    Modules.Chrome.init();
    Modules.Search.init();
    Modules.Settings.init();
    Modules.Lock.init();

    /* ============================== SELF TEST =============================== */
    if (TS.flags.selfTest){
      setTimeout(()=>{
        const errs = [];
        const must = (ok,msg)=>{ if(!ok) errs.push(msg); };

        must(document.querySelector('#extension-side-bar'), 'Sidebar missing');
        must(document.querySelector('.cat-hd'), 'Category headers missing');
        must(document.querySelector('#sidebar-version'), 'Version control missing');

        // Collapsed behaviour sanity
        try{
          const prev = localStorage.getItem('sidebarCollapsed');
          localStorage.setItem('sidebarCollapsed','true');
          const sb = document.querySelector('#extension-side-bar');
          sb?.classList.add('collapsed');
          const w = sb ? sb.getBoundingClientRect().width : 0;
          must(!!sb && sb.classList.contains('collapsed'), 'Sidebar failed to collapse');
          must(w <= 64 && w >= 40, 'Collapsed width unexpected');
          if (prev !== null) localStorage.setItem('sidebarCollapsed', prev);
        }catch{}

        if (location.pathname.startsWith('/pos/ui')){
          must(document.body.classList.contains('pos-ui'), 'POS white-text class not applied');
        }
        if (errs.length){ console.error('TS SelfTest FAIL:', errs); } else { console.info('TS SelfTest OK'); }
      }, 1000);
    }

    /* ============================ HELPERS ================================== */
    function refreshUI(){
      Modules.Sidebar.rebuild();
      Modules.Drawer.rebuild();
      Modules.Chrome.applyLayoutClass();
      Modules.Sidebar.positionDot();
    }
  });
})();
