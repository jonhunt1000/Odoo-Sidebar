// TekStore Odoo Sidebar + Lock Overlay v8.2.21
;(function () {
  if (window.__TS_SIDEBAR_LOADED__) return;
  window.__TS_SIDEBAR_LOADED__ = true;

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

  const PRE_ID = 'ts-prelock-cover';
  const pre = document.createElement('div');
  pre.id = PRE_ID;
  pre.style.cssText = 'position:fixed;inset:0;background:#6C4D66;z-index:2147483646;display:block;user-select:none;touch-action:none;';
  document.documentElement.appendChild(pre);

  const HOST = location.host;
  const PATH = location.pathname;
  const IS_PROD    = /(^|\.)odoo\.tek\.store$/.test(HOST);
  const IS_STAGING = /(^|\.)staging-odoo\.tek\.store$/.test(HOST);
  const IS_LOGIN   = /^\/web\/(login|signup|reset_password)/.test(PATH);

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

    const style = document.createElement('style');
    style.textContent = String.raw`
      :root{
        --ts-purple: rgb(108,77,102); --ts-purple-2: rgb(98,67,92);
        --ts-dark-1:#171617; --ts-dark-2:#0f0f10;
        --ts-row-h:22px; --ts-radius:12px;
        --ts-sidebar-w:192px; --ts-collapsed-w:56px;
        --ts-border:rgba(255,255,255,.12); --ts-surfA:rgba(255,255,255,.08);
        --ts-icon-left:16px; --ts-link-indent:24px;
        --ts-dot-left: calc(var(--ts-link-indent) - 6px);
      }
      #extension-side-bar{position:fixed;top:0;left:0;height:100vh;width:var(--ts-sidebar-w);
        background:linear-gradient(180deg,var(--ts-purple-2),var(--ts-purple)); color:#fff;display:flex;flex-direction:column;overflow:hidden;
        border-right:1px solid rgba(0,0,0,.25);box-shadow:4px 0 22px rgba(43,18,43,.15);transition:width .18s ease;z-index:900;
        font-family: var(--o-font-family, Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans"); font-size:13px; line-height:1.2;}
      #extension-side-bar.dark-mode{background:linear-gradient(180deg,var(--ts-dark-1),var(--ts-dark-2))!important;color:#e9e9ea!important;}
      #extension-side-bar.collapsed{width:var(--ts-collapsed-w)!important;}

      #sidebar-search-wrap{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:8px;
        background:linear-gradient(180deg,var(--ts-purple-2),var(--ts-purple-2));padding:6px 8px 4px; min-height:38px;}
      #extension-side-bar.dark-mode #sidebar-search-wrap{background:linear-gradient(180deg,var(--ts-dark-1),var(--ts-dark-1));}
      #extension-side-bar.collapsed #sidebar-search-wrap{visibility:hidden;pointer-events:none;}

      #sidebar-search{flex:1;height:28px;border:none;border-radius:10px;padding:0 10px;background:rgba(255,255,255,.16);color:#fff;outline:none;box-shadow:inset 0 0 0 1px var(--ts-border);font-size:13px;}
      #search-hint{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:12px;color:#fff;opacity:.95;pointer-events:none;white-space:nowrap;max-width:calc(var(--ts-sidebar-w) - 80px);overflow:hidden;text-overflow:ellipsis;}
      #sidebar-back{height:28px;width:28px;border:none;border-radius:10px;background:rgba(255,255,255,.16);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;}
      #sidebar-back .material-icons-outlined{font-size:18px;line-height:18px;}

      #extension-side-bar-nav-wrap{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;overflow:hidden;}
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

      #extension-side-bar.collapsed .cat{padding:0;margin:6px 0;}
      #extension-side-bar.collapsed .cat-hd{justify-content:center;padding:0;}
      #extension-side-bar.collapsed .cat-name,#extension-side-bar.collapsed .cat-caret,#extension-side-bar.collapsed .cat-items{display:none!important;}
      #extension-side-bar.collapsed .pill:not(#sidebar-collapse-toggle){display:none;} #extension-side-bar.collapsed #sidebar-version{display:none;} #extension-side-bar.collapsed #sidebar-dark-moon{display:none;}

      /* Popover: purple by default, dark when sidebar is dark */
      #cat-pop{position:fixed;left:var(--ts-collapsed-w);top:0;min-width:220px;
        background:linear-gradient(180deg,var(--ts-purple-2),var(--ts-purple));
        color:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.28),0 0 0 1px rgba(255,255,255,.10);
        display:none;flex-direction:column;overflow:hidden;z-index:2000;transform-origin:12px top;opacity:0;transform:scale(.98);
        transition:opacity .14s ease,transform .14s ease;font-family: var(--o-font-family, Inter, system-ui, -apple-system, "Segoe UI", Roboto);font-size:14px;}
      #extension-side-bar.dark-mode ~ #cat-pop{background:linear-gradient(180deg,var(--ts-dark-1),var(--ts-dark-2));}
      #cat-pop.show{display:flex;opacity:1;transform:scale(1);} #cat-pop .pop-title{padding:8px 12px 4px 12px;font-size:14px;font-weight:600;letter-spacing:.01em;opacity:.95;}
      #cat-pop .pop-list a{display:block;height:28px;line-height:28px;padding:0 12px;margin:2px 8px;border-radius:8px;color:#fff;text-decoration:none;font-size:14px;}
      #cat-pop .pop-list a:hover{background:rgba(255,255,255,.12);}

      #extension-side-bar-footer{flex:0 0 auto;display:flex;align-items:center;height:36px;padding:0 8px;border-top:1px solid rgba(0,0,0,.25);}
      .pill{height:28px;width:28px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:rgba(255,255,255,.16);cursor:pointer;border:none;}
      .pill .material-icons-outlined{font-size:20px;color:#fff;}
      #sidebar-version{font-size:12px;opacity:.8;text-decoration:none;color:inherit;display:inline-flex;align-items:center;}
      .ts-flex{flex:1 1 auto;}

      /* Lock overlay theme (extra CSS still present, but we also set inline styles below) */
      #ts-lock-title{color:#fff;font-size:20px;margin-bottom:4px;opacity:.95}
      #ts-lock-user{color:#fff;font-size:13px;margin-bottom:8px;opacity:.9}
      #ts-keypad{display:grid;grid-template-columns:repeat(3,64px);gap:8px;margin:8px 0 6px;}
      .ts-key{height:52px;border-radius:10px;background:rgba(255,255,255,.15);color:#fff;font-size:22px;border:none;cursor:pointer;}
      .ts-key:active{transform:scale(.98)}
      #ts-lock-msg{color:#fff;min-height:18px;font-size:13px;margin-top:4px;opacity:.85}
      #ts-switch-user{margin-top:8px;border:none;border-radius:10px;padding:8px 12px;background:rgba(255,255,255,.2);color:#fff;cursor:pointer}
      #ts-switch-user:hover{background:rgba(255,255,255,.3)}
    `;
    document.head.appendChild(style);

    // ---------- DOM ----------
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

    const pop = Object.assign(document.createElement('div'), { id:'cat-pop' });
    const popTitle = Object.assign(document.createElement('div'), { className:'pop-title' });
    const popList = Object.assign(document.createElement('div'), { className:'pop-list' });
    pop.append(popTitle, popList);

    // footer
    const footer = Object.assign(document.createElement('div'), { id:'extension-side-bar-footer' });
    const ver = Object.assign(document.createElement('a'), { id:'sidebar-version', href:'/odoo/settings', title:'TekStore Settings' });
    ver.textContent = 'v8.2.21';
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
    document.body.append(sidebar, pop);

    const url = (p) => `https://${HOST}${p}`;
    const cleanPath = (u) => (u || '').replace(/[?#].*$/, '').replace(/\/+$/, '') || '/';
    function isVisible(el){
      if (!el || !(el instanceof Element)) return false;
      if (el.offsetParent === null) return false;
      const cat = el.closest('.cat'); if (cat && !cat.classList.contains('open')) return false;
      return getComputedStyle(el).display !== 'none';
    }

    // ---------- NAV ----------
    const CATS = [
      ['quick','Quick Access','widgets'],
      ['appt','Appointments','event'],
      ['sales','Sales','supervisor_account'],
      ['work','Workshop','build'],
      ['inv','Inventory','inventory_2'],
      ['purch','Purchasing','store'],
      ['ws','Workspace','workspaces'],
      ['acct','Accounts','account_balance_wallet'],
    ];
    const ITEMS = {
      quick: [['POS','point_of_sale','/odoo/point-of-sale'],['Discuss','forum','/odoo/discuss'],['KPI Dashboard','dashboard','/odoo/dashboards?dashboard_id=27']],
      // swap: Create first, then Booked
      appt: [['Create','add_circle','/odoo/appointments'],['Booked','event_available','/odoo/appointments/5/action-417?view_type=list']],
      sales: [['Customers','groups','/odoo/customers'],['CRM','manage_accounts','/odoo/crm'],['Quotes','request_quote','/odoo/sales'],['Sales Orders','shopping_bag','/odoo/orders'],['Invoices','receipt_long','/odoo/customer-invoices']],
      // swap: Buybacks above Refurbs
      work: [['Repairs','build_circle','/odoo/action-1503'],['Buybacks','autorenew','/odoo/action-1527'],['Refurbs','architecture','/odoo/action-1519'],['Loan Devices','important_devices','/odoo/action-1529']],
      inv: [['Products','category','/odoo/products'],['RMAs','undo','/odoo/action-1518'],['Replenishment','sync_alt','/odoo/replenishment'],['Serial Search','checklist','/odoo/lots'],['Receipts In','arrow_forward','/odoo/receipts'],['Deliveries Out','arrow_back','/odoo/deliveries']],
      purch: [['Vendors','store','/odoo/vendors'],['RFQ','description','/odoo/purchase'],['Purchase Orders','shopping_cart','/odoo/purchase-orders'],['Bills','monetization_on','/odoo/vendor-bills']],
      ws: [['Projects','account_tree','/odoo/project'],['Knowledge','menu_book','/odoo/knowledge'],['Training','school','/slides/tekstore-odoo-training-1'],['Documents','folder_open','/odoo/documents'],['Expenses','payments','/odoo/expenses'],['Time Off','today','/odoo/time-off']],
      acct: [['Dashboard','currency_pound','/odoo/accounting']],
    };

    const catNodes = {};
    const mkLink = (catName) => ([label,icon,href]) => {
      const a = document.createElement('a');
      a.className = 'ts-nav-link'; a.href = url(href); a.title = `${catName} › ${label}`;
      const i = document.createElement('span'); i.className='material-icons-outlined'; i.textContent=icon;
      const s = document.createElement('span'); s.className='sidebar-label'; s.textContent=label;
      a.append(i,s); return a;
    };

    CATS.forEach(([key,name,mi])=>{
      const cat = document.createElement('div'); cat.className = 'cat'; cat.dataset.key = key;
      if (key === 'quick') cat.classList.add('quick');
      const hd = document.createElement('div'); hd.className = 'cat-hd'; hd.title = name; hd.tabIndex = 0;
      const ic = document.createElement('div'); ic.className = 'cat-icon material-icons-outlined'; ic.textContent = mi;
      const nm = document.createElement('div'); nm.className = 'cat-name'; nm.textContent = name;
      const caret = document.createElement('div'); caret.className = 'cat-caret material-icons-outlined'; caret.textContent='expand_more';
      hd.append(ic,nm,caret);

      const items = document.createElement('div'); items.className = 'cat-items';
      (ITEMS[key]||[]).map(mkLink(name)).forEach(a=>items.appendChild(a));

      cat.append(hd, items); navInner.appendChild(cat);
      catNodes[key] = {cat, hd, items, name};
    });

    // Collapsed popover
    const popTimer = { id:0 };
    function showPopFor(key){
      if (!sidebar.classList.contains('collapsed')) return;
      const n = catNodes[key]; if (!n) return;
      popTitle.textContent = n.name; popList.innerHTML = '';
      n.items.querySelectorAll('a').forEach(a=>{
        const row = document.createElement('a'); row.href = a.href;
        row.textContent = a.querySelector('.sidebar-label')?.textContent || '';
        popList.appendChild(row);
      });
      const r = n.hd.getBoundingClientRect();
      pop.style.top = Math.max(10, Math.min(window.innerHeight - 260, r.top)) + 'px';
      pop.style.left = (r.right + 8) + 'px';
      pop.classList.add('show');
    }
    function hidePopSoon(){
      clearTimeout(popTimer.id);
      popTimer.id = setTimeout(()=>{ if (!sidebar.matches(':hover') && !pop.matches(':hover')) pop.classList.remove('show'); }, 120);
    }
    Object.values(catNodes).forEach(n=>{ n.hd.addEventListener('mouseenter', ()=>{ if (sidebar.classList.contains('collapsed')) showPopFor(n.cat.dataset.key); }); });
    sidebar.addEventListener('mouseleave', hidePopSoon); pop.addEventListener('mouseleave', hidePopSoon);

    // state & dot
    const STATE_MAP_KEY = 'ts_cat_state_v2';
    function loadCatState(){ try{ const raw=localStorage.getItem(STATE_MAP_KEY); if(raw) return JSON.parse(raw)||{}; }catch{} const def={}; CATS.forEach(([k])=>def[k]=true); return def; }
    function saveCatState(map){ try{ localStorage.setItem(STATE_MAP_KEY, JSON.stringify(map)); }catch{} }
    let catState = loadCatState();
    function applyCatState(){ Object.entries(catNodes).forEach(([k,n])=>{ const open=k==='quick'?true:!!catState[k]; n.cat.classList.toggle('open', open); }); positionDot(); }
    applyCatState();
    Object.entries(catNodes).forEach(([key,n])=>{
      n.hd.addEventListener('click', ()=>{ if (key==='quick') return; catState[key]=!catState[key]; saveCatState(catState); applyCatState(); });
      n.hd.addEventListener('keydown',(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); n.hd.click(); }});
    });
    catNodes.quick?.hd.addEventListener('dblclick',(e)=>{ e.preventDefault(); e.stopPropagation(); const anyClosed=CATS.some(([k])=>k!=='quick'&&!catState[k]); CATS.forEach(([k])=>{ if(k!=='quick') catState[k]=anyClosed; }); saveCatState(catState); applyCatState(); });

    function offsetTopWithin(el, ancestor){ let y=0,n=el; while(n&&n!==ancestor){ y+=n.offsetTop||0; n=n.offsetParent; } return y; }
    function computeActiveLink(){
      const cur = cleanPath(location.pathname); let tgt=null;
      navScroll.querySelectorAll('.ts-nav-link').forEach(a=>{ const link=cleanPath(new URL(a.href, location.origin).pathname); if(!tgt&&(cur===link||cur.startsWith(link+'/'))) tgt=a; });
      return (tgt && isVisible(tgt)) ? tgt : null;
    }
    function positionDot(){
      const tgt = computeActiveLink();
      if (!tgt){ dot.style.display='none'; return; }
      const y = offsetTopWithin(tgt, navInner) + (tgt.offsetHeight - 8)/2;
      dot.style.transform = `translateY(${y}px)`; dot.style.display = 'block';
    }
    const scheduleDot = ()=>requestAnimationFrame(positionDot);
    window.addEventListener('popstate', scheduleDot, { passive:true });
    window.addEventListener('hashchange', scheduleDot, { passive:true });
    window.addEventListener('resize', scheduleDot, { passive:true });
    navScroll.addEventListener('scroll', scheduleDot, { passive:true });
    document.body.addEventListener('click', scheduleDot, { capture:true, passive:true });
    new MutationObserver(scheduleDot).observe(document.querySelector('.o_action_manager') || document.body, { childList:true, subtree:true });
    const ro1 = new ResizeObserver(scheduleDot); ro1.observe(sidebar);
    const ro2 = new ResizeObserver(scheduleDot); ro2.observe(navInner);

    // layout offsets
    const EXP = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ts-sidebar-w')) || 192;
    const COL = 56;
    ['.o_main_content','.o_content','.o_web_client','#wrapwrap','.o_control_panel','.o_action_manager','header.o_main_navbar']
      .forEach(sel => document.querySelectorAll(sel).forEach(el => { el.style.left=''; el.style.paddingLeft=''; el.style.marginLeft=''; }));
    const header  = document.querySelector('header.o_main_navbar');
    const control = document.querySelector('.o_control_panel');
    const manager = document.querySelector('.o_action_manager');
    function pad(collapsed){
      const s = (collapsed ? COL : EXP) + 'px';
      document.body.style.paddingLeft = s;
      if (header)  header.style.left         = s;
      if (control) control.style.paddingLeft = s;
      if (manager) manager.style.paddingLeft = s;
      window.dispatchEvent(new Event('resize'));
    }

    const wasCol = localStorage.getItem('sidebarCollapsed')==='true';
    const wasDark= localStorage.getItem('sidebarDarkMode')==='on';
    sidebar.classList.toggle('collapsed', wasCol);
    sidebar.classList.toggle('dark-mode', wasDark);
    document.body.classList.toggle('o_dark_theme', wasDark);
    pad(wasCol);
    scheduleDot();

    const setCollapseIcon = (c)=>{ collapse.firstElementChild.textContent = c ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'; };
    setCollapseIcon(wasCol);

    function beginSidebarTransition(){ sidebar.classList.add('animating'); }
    function endSidebarTransition(){ sidebar.classList.remove('animating'); scheduleDot(); }
    sidebar.addEventListener('transitionend', (e)=>{
      if (e.target===sidebar && e.propertyName==='width'){
        let i=0; const raf = ()=>{ positionDot(); if (++i<8) requestAnimationFrame(raf); };
        requestAnimationFrame(raf); endSidebarTransition();
      }
    });

    collapse.addEventListener('click', () => {
      beginSidebarTransition();
      const c = sidebar.classList.toggle('collapsed');
      localStorage.setItem('sidebarCollapsed', String(c));
      pad(c); setCollapseIcon(c);
      let t=0; const tick=()=>{ positionDot(); if((t+=40)<320) setTimeout(tick,40); }; tick();
      setTimeout(endSidebarTransition, 280);
    });

    moon.addEventListener('click', () => {
      const d = sidebar.classList.toggle('dark-mode');
      document.body.classList.toggle('o_dark_theme', d);
      localStorage.setItem('sidebarDarkMode', d?'on':'off');
    });

    // Back button (reliable)
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

    // Search + user name
    function applySearch(q){
      const needle = String(q||'').trim().toLowerCase();
      if (!needle){
        Object.values(catNodes).forEach(n=>{
          n.cat.style.display = '';
          n.items.querySelectorAll('a').forEach(a=>a.style.display='flex');
        });
        applyCatState(); return;
      }
      Object.values(catNodes).forEach(n=>{
        n.cat.classList.add('open'); let any=false;
        n.items.querySelectorAll('a').forEach(a=>{
          const t=(a.querySelector('.sidebar-label')?.textContent||'').toLowerCase();
          const hit = t.includes(needle); a.style.display = hit?'flex':'none'; if (hit) any=true;
        });
        n.cat.style.display = any ? '' : 'none';
      });
      dot.style.display='none';
    }
    const hideHint = ()=>{ searchHint.style.display='none'; };
    searchInput.addEventListener('focus', hideHint);
    searchInput.addEventListener('mousedown', hideHint);
    searchInput.addEventListener('input', ()=>{ hideHint(); applySearch(searchInput.value); });
    searchInput.addEventListener('blur',  ()=>{ if (!searchInput.value) searchHint.style.display='block'; });

    // Name fetch + robust fallback from UI
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

    // ---------- LOCK OVERLAY (inline-styled to prevent regressions) ----------
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

    const DEFAULT_TIMEOUT_SEC = 300;
    let activityThrottle = 0;
    const now = ()=>Date.now();
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

    setInterval(()=>{ if (!isLockedLocal && (Date.now()-lastActivity>=DEFAULT_TIMEOUT_SEC*1000)) lockNowGlobal(); },1000);
    document.addEventListener('keydown',(e)=>{ if(e.ctrlKey&&e.altKey&&e.code==='KeyL'){ e.preventDefault(); lockNowGlobal(); } }, {capture:true});
    lockBtn.addEventListener('click', lockNowGlobal);

    function handleHardwareKey(e){
      if (overlay.style.display!=='flex') return;
      const key = e.key;
      if (/^\d$/.test(key)){ pinInput.value+=key; pinInput.dispatchEvent(new Event('input')); e.preventDefault(); e.stopPropagation(); ensureFocus(); return; }
      if (key==='Backspace' || key==='Delete'){ pinInput.value=String(pinInput.value||'').slice(0,-1); pinInput.dispatchEvent(new Event('input')); e.preventDefault(); e.stopPropagation(); ensureFocus(); return; }
      if (key==='Enter' || key==='NumpadEnter'){ submitPIN(); e.preventDefault(); e.stopPropagation(); ensureFocus(); return; }
      if (key.length===1 && /\S/.test(key)){ e.preventDefault(); }
    }
    window.addEventListener('keydown', handleHardwareKey, {capture:true});

    let verifyTimer=null, lastQuery=0;
    const MIN_DIGITS_FOR_AUTO = 3;
    pinInput.addEventListener('input',()=>{
      msg.textContent='';
      if(verifyTimer) clearTimeout(verifyTimer);
      const val=String(pinInput.value||'').trim();
      if(!/^\d{1,12}$/.test(val) || val.length<MIN_DIGITS_FOR_AUTO) return;
      const my=++lastQuery;
      verifyTimer=setTimeout(async()=>{ if(my!==lastQuery) return; const ok=await verifyPin(val); if(my!==lastQuery) return; if(ok) await hideOverlay(); },130);
    });

    async function submitPIN(){
      const pin=String(pinInput.value||'').trim();
      if(!/^\d{1,12}$/.test(pin)){ msg.textContent='Invalid PIN.'; return; }
      const ok=await verifyPin(pin);
      if(ok) await hideOverlay(); else msg.textContent='Invalid PIN.';
    }
    async function verifyPin(pin){
      try{
        const res=await fetch('/tek_lock/verify_pin',{method:'POST',headers:{'Content-Type':'application/json'},body: JSON.stringify({pin})});
        if(!res.ok) return false;
        const data=await res.json();
        return !!(data&&data.ok);
      } catch { return false; }
    }
  });
})();
