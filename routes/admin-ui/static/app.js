(() => {
  'use strict';

  // ---------------------------------------------------------------
  // auth / shell
  // ---------------------------------------------------------------
  async function requireSession() {
    const res = await fetch('/api/admin-ui/me', { credentials: 'same-origin' });
    if (!res.ok) { window.location.href = '/admin-ui/login'; return null; }
    return res.json();
  }

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/admin-ui/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.href = '/admin-ui/login';
  });

  document.getElementById('reloadServerBtn').addEventListener('click', async () => {
    if (!confirm('Run reload script on server? This may restart services.')) return;
    const btn = document.getElementById('reloadServerBtn');
    btn.disabled = true; btn.textContent = 'Reloading…';
    try {
      const res = await fetch('/api/admin-ui/reload', { method: 'POST', credentials: 'same-origin' });
      const j = await res.json();
      alert(res.ok ? 'Reload executed:\n' + (j.output || '') : 'Reload failed: ' + (j.error || ''));
    } catch (e) {
      alert('Reload request failed: ' + e.message);
    } finally {
      btn.disabled = false; btn.textContent = 'Reload server';
    }
  });

  const tabs = ['logs', 'stats', 'bans', 'keys', 'routes','webhooks'];
  const loaders = {
    logs: loadLogs,
    stats: loadStats,
    bans: loadBans,
    keys: loadKeys,
    routes: loadRoutes,
    webhooks: loadWebhooksTab,
  };

  document.querySelectorAll('.nav-item[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });

  function showTab(name) {
    tabs.forEach((t) => {
      document.getElementById(`tab-${t}`).classList.toggle('active', t === name);
    });
    document.querySelectorAll('.nav-item[data-tab]').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === name);
    });
    loaders[name] && loaders[name]();
  }

  // ---------------------------------------------------------------
  // LOGS
  // ---------------------------------------------------------------
  let allLogs = [];

  function extractMethod(line) {
    const m = line.match(/\b(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b/);
    return m ? m[1] : 'OTHER';
  }

  function extractStatus(line) {
    const m = line.match(/response:\s*(\d{3})/);
    return m ? m[1] : null;
  }

  function statusClass(code) {
    if (!code) return 'status-unknown';
    const digit = code[0];
    if (digit === '2') return 'status-2xx';
    if (digit === '3') return 'status-3xx';
    if (digit === '4') return 'status-4xx';
    if (digit === '5') return 'status-5xx';
    return 'status-unknown';
  }

  function renderLogs(lines) {
    const area = document.getElementById('logsArea');
    if (!lines.length) { area.innerHTML = '<div class="empty">No logs match your filters.</div>'; return; }
    area.innerHTML = lines.map((line) => {
      const status = extractStatus(line);
      const isAdmin = line.toLowerCase().includes('admin');
      let escaped = line.replace(/</g, '&lt;');
      escaped = escaped.replace(/\b(GET|POST|PUT|DELETE|PATCH)\b/, (mm) => `<span class="m-${mm}">${mm}</span>`);
      if (status) {
        escaped = escaped.replace(/response:\s*\d{3}/, (mm) => `<span class="status-chip ${statusClass(status)}">${mm}</span>`);
      }
      return `
        <div class="log-line ${statusClass(status)}${isAdmin ? ' admin' : ''}">
          <span class="log-status-bar"></span>
          <span class="log-text">${escaped}</span>
        </div>`;
    }).join('');
  }

  function filterAndSortLogs() {
    const search = document.getElementById('logSearch').value.toLowerCase();
    const selectedMethods = Array.from(document.querySelectorAll('input[name="methodFilter"]:checked')).map((c) => c.value);
    const selectedStatuses = Array.from(document.querySelectorAll('input[name="statusFilter"]:checked')).map((c) => c.value);
    const sortBy = document.getElementById('sortBy').value;

    let filtered = allLogs.filter((line) => {
      if (search && !line.toLowerCase().includes(search)) return false;
      if (selectedMethods.length && !selectedMethods.includes(extractMethod(line))) return false;
      if (selectedStatuses.length && !selectedStatuses.includes(extractStatus(line) || 'unknown')) return false;
      return true;
    });

    if (sortBy === 'oldest') filtered = filtered.slice().reverse();
    else if (sortBy === 'method') filtered = filtered.slice().sort((a, b) => extractMethod(a).localeCompare(extractMethod(b)));

    renderLogs(filtered);
  }

  async function loadLogs() {
    const n = Number(document.getElementById('logCount').value) || 200;
    const area = document.getElementById('logsArea');
    area.innerHTML = '<div class="empty">Loading…</div>';
    try {
      const res = await fetch(`/api/admin-ui/logs?n=${n}`, { credentials: 'same-origin' });
      const j = await res.json();
      if (!res.ok) { area.innerHTML = `<div class="empty">${j.error || 'Failed to load'}</div>`; return; }

      allLogs = (j.logs || []).slice().reverse();

      const methods = new Set(allLogs.map(extractMethod));
      const methodBox = document.getElementById('methodFilters');
      methodBox.innerHTML = Array.from(methods).sort().map((m) => `
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted)">
          <input type="checkbox" name="methodFilter" value="${m}" checked/> ${m}
        </label>`).join('');
      methodBox.querySelectorAll('input').forEach((cb) => cb.addEventListener('change', filterAndSortLogs));

      const statuses = new Set(allLogs.map((l) => extractStatus(l) || 'unknown'));
      const statusBox = document.getElementById('statusFilters');
      const sortedStatuses = Array.from(statuses).sort();
      statusBox.innerHTML = sortedStatuses.map((s) => `
        <label class="status-filter-label ${statusClass(s === 'unknown' ? null : s)}">
          <input type="checkbox" name="statusFilter" value="${s}" checked/> ${s}
        </label>`).join('');
      statusBox.querySelectorAll('input').forEach((cb) => cb.addEventListener('change', filterAndSortLogs));

      filterAndSortLogs();
    } catch (e) {
      area.innerHTML = `<div class="empty">${e.message}</div>`;
    }
  }

  document.getElementById('reloadLogsBtn').addEventListener('click', loadLogs);
  document.getElementById('logSearch').addEventListener('input', filterAndSortLogs);
  document.getElementById('sortBy').addEventListener('change', filterAndSortLogs);

  // ---------------------------------------------------------------
  // STATS
  // ---------------------------------------------------------------
  async function loadStats() {
    const grid = document.getElementById('statsGrid');
    try {
      const res = await fetch('/api/admin-ui/stats', { credentials: 'same-origin' });
      const j = await res.json();
      if (!res.ok) { grid.innerHTML = `<div class="empty">${j.error || 'Failed to load'}</div>`; return; }

      const perDay = j.perDay || {};
      const days = Object.keys(perDay).length || 1;
      const total = j.total || 0;
      const values = Object.values(perDay);
      const avg = (total / days).toFixed(2);
      const max = values.length ? Math.max(...values) : 0;
      const todayKey = new Date().toISOString().slice(0, 10);
      const today = perDay[todayKey] || 0;

      const cards = [
        ['Total requests', total],
        ['Days recorded', days],
        ['Avg / day', avg],
        ['Max / day', max],
        ['Requests (today)', today],
      ];
      grid.innerHTML = cards.map(([label, value]) => `
        <div class="stat-card"><div class="value">${value}</div><div class="label">${label}</div></div>
      `).join('');
    } catch (e) {
      grid.innerHTML = `<div class="empty">${e.message}</div>`;
    }
  }

  // ---------------------------------------------------------------
  // BANS
  // ---------------------------------------------------------------
  async function loadBans() {
    const ul = document.getElementById('bansList');
    const res = await fetch('/api/admin-ui/bans', { credentials: 'same-origin' });
    const j = await res.json();
    const bans = j.bans || {};
    const ips = Object.keys(bans);
    if (!ips.length) { ul.innerHTML = '<div class="empty">No banned IPs.</div>'; return; }
    ul.innerHTML = ips.map((ip) => `
      <li class="list-item">
        <div><div class="mono">${ip}</div><div class="meta">${bans[ip].reason || ''}</div></div>
        <button class="btn btn-sm btn-danger" data-ip="${ip}">Unban</button>
      </li>
    `).join('');
    ul.querySelectorAll('button[data-ip]').forEach((btn) => btn.addEventListener('click', async () => {
      await fetch(`/api/admin-ui/bans?ip=${encodeURIComponent(btn.dataset.ip)}`, { method: 'DELETE', credentials: 'same-origin' });
      loadBans();
    }));
  }

  document.getElementById('banBtn').addEventListener('click', async () => {
    const ip = document.getElementById('banIp').value.trim();
    const reason = document.getElementById('banReason').value.trim();
    if (!ip) return;
    await fetch('/api/admin-ui/bans', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, reason }),
    });
    document.getElementById('banIp').value = '';
    document.getElementById('banReason').value = '';
    loadBans();
  });

  // ---------------------------------------------------------------
  // KEYS
  // ---------------------------------------------------------------
  async function loadKeys() {
    const ul = document.getElementById('keysList');
    const res = await fetch('/api/admin-ui/keys', { credentials: 'same-origin' });
    const j = await res.json();
    if (!res.ok) { ul.innerHTML = `<div class="empty">${j.error || 'Failed to load'}</div>`; return; }
    const keys = j.keys || [];
    if (!keys.length) { ul.innerHTML = '<div class="empty">No API keys found.</div>'; return; }
    ul.innerHTML = keys.map((k) => `
      <li class="list-item">
        <div><div>${k.name}</div><div class="meta mono">${k.masked || 'no-key'} ${k.perm ? '· ' + k.perm : ''}</div></div>
        <button class="btn btn-sm ${k.valid ? 'btn-danger' : ''}" data-key="${k.id || k.name}" ${!k.valid ? 'disabled' : ''}>
          ${k.valid ? 'Deactivate' : 'Inactive'}
        </button>
      </li>
    `).join('');
    ul.querySelectorAll('button[data-key]').forEach((btn) => btn.addEventListener('click', async () => {
      if (!confirm('Deactivate this API key?')) return;
      await fetch('/api/admin-ui/keys/deactivate', {
        method: 'PUT', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: btn.dataset.key }),
      });
      loadKeys();
    }));
  }

  // ---------------------------------------------------------------
  // ROUTES EXPLORER
  // ---------------------------------------------------------------
  let openApiSpec = null;
  let flatRoutes = [];
  let activeRoute = null;
  let routesSessionToken = null;
  let routesSessionExpires = 0;

  async function getRoutesSessionToken() {
    if (routesSessionToken && Date.now() < routesSessionExpires - 5000) return routesSessionToken;
    const res = await fetch('/api/admin-ui/routes-session', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: 900 }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || 'Could not create a routes session');
    routesSessionToken = j.token;
    routesSessionExpires = j.expires;
    return routesSessionToken;
  }

  function flattenSpec(spec) {
    const out = [];
    Object.entries(spec.paths || {}).forEach(([routePath, methods]) => {
      Object.entries(methods).forEach(([method, def]) => {
        if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) return;
        out.push({
          path: routePath,
          method: method.toUpperCase(),
          summary: def.summary || '',
          tags: def.tags && def.tags.length ? def.tags : ['Other'],
          parameters: def.parameters || [],
          requestBody: def.requestBody || null,
        });
      });
    });
    out.sort((a, b) => (a.tags[0] + a.path).localeCompare(b.tags[0] + b.path));
    return out;
  }

  async function loadRoutes() {
    const list = document.getElementById('routesList');
    try {
      if (!openApiSpec) {
        const res = await fetch('/api/admin-ui/openapi', { credentials: 'same-origin' });
        openApiSpec = await res.json();
        flatRoutes = flattenSpec(openApiSpec);
      }
      renderRoutesList(flatRoutes);
    } catch (e) {
      list.innerHTML = `<div class="empty">${e.message}</div>`;
    }
  }

  function renderRoutesList(routes) {
    const list = document.getElementById('routesList');
    if (!routes.length) { list.innerHTML = '<div class="empty">No routes found.</div>'; return; }
    const groups = {};
    routes.forEach((r) => {
      const tag = r.tags[0];
      groups[tag] = groups[tag] || [];
      groups[tag].push(r);
    });
    list.innerHTML = Object.entries(groups).map(([tag, items]) => `
      <div class="route-group-title">${tag}</div>
      ${items.map((r, i) => {
        const idx = flatRoutes.indexOf(r);
        return `
        <button class="route-item" data-idx="${idx}">
          <span class="badge ${r.method}">${r.method}</span>
          <span class="path">${r.path}</span>
        </button>`;
      }).join('')}
    `).join('');
    list.querySelectorAll('.route-item').forEach((btn) => {
      btn.addEventListener('click', () => selectRoute(Number(btn.dataset.idx)));
    });
  }

  document.getElementById('routeSearch').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = flatRoutes.filter((r) => r.path.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q) || r.method.toLowerCase().includes(q));
    renderRoutesList(filtered);
  });

  function inputForParam(param) {
    const schema = param.schema || {};
    const id = `p_${param.in}_${param.name}`;
    return `
      <div class="field">
        <label for="${id}">${param.name}${param.required ? ' *' : ''} <span style="opacity:.6">(${param.in})</span></label>
        <input id="${id}" type="text" data-param-name="${param.name}" data-param-in="${param.in}" placeholder="${schema.type || ''}${param.description ? ' — ' + param.description : ''}" />
      </div>`;
  }

  function bodyFieldsFromSchema(schema) {
    if (!schema || !schema.properties) return '';
    return Object.entries(schema.properties).map(([name, propSchema]) => {
      const id = `b_${name}`;
      return `
        <div class="field">
          <label for="${id}">${name} <span style="opacity:.6">(${propSchema.type || 'any'})</span></label>
          <input id="${id}" type="text" data-body-field="${name}" placeholder="${propSchema.description || ''}" />
        </div>`;
    }).join('');
  }

  function selectRoute(idx) {
    activeRoute = flatRoutes[idx];
    document.querySelectorAll('.route-item').forEach((b) => b.classList.toggle('active', Number(b.dataset.idx) === idx));

    const detail = document.getElementById('routeDetail');
    const queryParams = activeRoute.parameters.filter((p) => p.in === 'query');
    const pathParams = activeRoute.parameters.filter((p) => p.in === 'path');
    const headerParams = activeRoute.parameters.filter((p) => p.in === 'header' && p.name.toLowerCase() !== 'api-key');

    const bodySchema = activeRoute.requestBody?.content?.['application/json']?.schema;
    const bodyFields = bodyFieldsFromSchema(bodySchema);

    detail.innerHTML = `
      <div class="row" style="justify-content:space-between">
        <div><span class="badge ${activeRoute.method}">${activeRoute.method}</span></div>
      </div>
      <div class="route-detail-path">${activeRoute.path}</div>
      ${activeRoute.summary ? `<p style="color:var(--muted); font-size:13px; margin-top:-8px">${activeRoute.summary}</p>` : ''}

      ${pathParams.length ? `<div class="section-title">Path parameters</div><div class="param-grid">${pathParams.map(inputForParam).join('')}</div>` : ''}
      ${queryParams.length ? `<div class="section-title">Query parameters</div><div class="param-grid">${queryParams.map(inputForParam).join('')}</div>` : ''}
      ${headerParams.length ? `<div class="section-title">Headers</div><div class="param-grid">${headerParams.map(inputForParam).join('')}</div>` : ''}

      ${bodySchema ? `
        <div class="section-title">Request body <label style="font-weight:400; text-transform:none; letter-spacing:0"><input type="checkbox" id="rawBodyToggle"/> raw JSON</label></div>
        <div id="bodyFieldsWrap" class="param-grid">${bodyFields}</div>
        <textarea id="rawBodyInput" rows="8" style="display:none; width:100%" placeholder='{ "example": true }'></textarea>
      ` : ''}

      <div class="row" style="margin-top:16px">
        <button id="sendRouteBtn" class="btn btn-accent">Send request</button>
        <span id="sendStatus" class="badge"></span>
      </div>

      <div class="section-title">Response</div>
      <div id="routeResponse" class="response-box">—</div>
    `;

    const rawToggle = document.getElementById('rawBodyToggle');
    if (rawToggle) {
      rawToggle.addEventListener('change', () => {
        document.getElementById('bodyFieldsWrap').style.display = rawToggle.checked ? 'none' : 'grid';
        document.getElementById('rawBodyInput').style.display = rawToggle.checked ? 'block' : 'none';
      });
    }

    document.getElementById('sendRouteBtn').addEventListener('click', sendActiveRoute);
  }

  async function sendActiveRoute() {
    const statusBadge = document.getElementById('sendStatus');
    const responseBox = document.getElementById('routeResponse');
    const sendBtn = document.getElementById('sendRouteBtn');
    sendBtn.disabled = true;
    statusBadge.textContent = 'Sending…';
    statusBadge.className = 'badge';

    try {
      const token = await getRoutesSessionToken();

      let finalPath = activeRoute.path;
      document.querySelectorAll('[data-param-in="path"]').forEach((el) => {
        finalPath = finalPath.replace(`{${el.dataset.paramName}}`, encodeURIComponent(el.value || ''));
      });

      const query = new URLSearchParams();
      document.querySelectorAll('[data-param-in="query"]').forEach((el) => {
        if (el.value !== '') query.set(el.dataset.paramName, el.value);
      });

      const headers = { 'x-admin-session': token };
      document.querySelectorAll('[data-param-in="header"]').forEach((el) => {
        if (el.value !== '') headers[el.dataset.paramName] = el.value;
      });

      let body;
      const rawToggle = document.getElementById('rawBodyToggle');
      if (rawToggle) {
        headers['Content-Type'] = 'application/json';
        if (rawToggle.checked) {
          const raw = document.getElementById('rawBodyInput').value.trim();
          body = raw ? raw : undefined;
        } else {
          const obj = {};
          document.querySelectorAll('[data-body-field]').forEach((el) => {
            if (el.value !== '') obj[el.dataset.bodyField] = el.value;
          });
          body = JSON.stringify(obj);
        }
      }

      const url = `/api${finalPath}${query.toString() ? '?' + query.toString() : ''}`;
      const res = await fetch(url, {
        method: activeRoute.method,
        headers,
        body: ['GET', 'DELETE'].includes(activeRoute.method) && !body ? undefined : body,
        credentials: 'same-origin',
      });

      const text = await res.text();
      let pretty = text;
      try { pretty = JSON.stringify(JSON.parse(text), null, 2); } catch (_) {}

      statusBadge.textContent = `${res.status} ${res.statusText}`;
      statusBadge.classList.add(res.ok ? 'ok' : 'err');
      responseBox.textContent = pretty || '(empty response)';
    } catch (e) {
      statusBadge.textContent = 'Error';
      statusBadge.classList.add('err');
      responseBox.textContent = e.message;
    } finally {
      sendBtn.disabled = false;
    }
  }
  // ---------------------------------------------------------------
// WEBHOOKS
// ---------------------------------------------------------------
async function loadWebhookLogs() {
    const area = document.getElementById('webhooksArea');
    area.innerHTML = '<div class="empty">Loading…</div>';

    const code = document.getElementById('webhookCodeFilter').value;
    const keyword = document.getElementById('webhookKeyword').value.trim();
    const n = Number(document.getElementById('webhookCount').value) || 100;

    const params = new URLSearchParams();
    if (code) params.set('code', code);
    if (keyword) params.set('keyword', keyword);
    params.set('n', n);

    try {
        const res = await fetch(`/api/admin-ui/webhooks/logs?${params.toString()}`, { credentials: 'same-origin' });
        const j = await res.json();
        if (!res.ok) { area.innerHTML = `<div class="empty">${j.error || 'Failed to load'}</div>`; return; }
        const logs = j.logs || [];
        if (!logs.length) { area.innerHTML = '<div class="empty">No webhook sends match your filters.</div>'; return; }
        area.innerHTML = logs.map(renderWebhookEntry).join('');
    } catch (e) {
        area.innerHTML = `<div class="empty">${e.message}</div>`;
    }
}

async function loadWebhooksTab() {
    if (!webhookPickersLoaded) {
        await loadWebhookPickers();
        webhookPickersLoaded = true;
    }
    await loadWebhookLogs();
}

document.getElementById('refreshWebhooksBtn').addEventListener('click', loadWebhookLogs);
document.getElementById('webhookCodeFilter').addEventListener('change', loadWebhookLogs);
document.getElementById('webhookKeyword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadWebhookLogs();
});
let webhookPickersLoaded = false;

function escHtml(str) {
    return String(str ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function decimalToHex(num) {
    if (typeof num !== 'number') return '#5865F2';
    return '#' + (num >>> 0).toString(16).padStart(6, '0').slice(-6);
}

function renderWebhookEntry(entry) {
    const payload = entry.payload || {};
    const embeds = Array.isArray(payload.embeds) && payload.embeds.length ? payload.embeds : [null];
    const when = entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '';
    const content = payload.content ? `<div class="embed-content">${escHtml(payload.content)}</div>` : '';

    const embedsHtml = embeds.map((embed) => {
        if (!embed) return '';
        const color = decimalToHex(embed.color);
        const title = embed.title ? `<div class="embed-title">${escHtml(embed.title)}</div>` : '';
        const desc = embed.description ? `<div class="embed-desc">${escHtml(embed.description)}</div>` : '';
        const fields = Array.isArray(embed.fields) && embed.fields.length
            ? `<div class="embed-fields">${embed.fields.map((f) => `
                <div class="embed-field${f.inline ? ' inline' : ''}">
                  <div class="embed-field-name">${escHtml(f.name)}</div>
                  <div class="embed-field-value">${escHtml(f.value)}</div>
                </div>`).join('')}</div>`
            : '';
        const footer = embed.footer?.text ? `<div class="embed-footer">${escHtml(embed.footer.text)}</div>` : '';
        return `
          <div class="discord-embed" style="--embed-color:${color}">
            <div class="embed-bar"></div>
            <div class="embed-body">${title}${desc}${fields}${footer}</div>
          </div>`;
    }).join('');

    return `
      <div class="webhook-card">
        <div class="webhook-card-meta">
          <span class="badge">${escHtml(entry.name || entry.code || 'unknown')}</span>
          <span class="mono" style="font-size:11px;color:var(--muted)">${escHtml(entry.code || '')} · ${escHtml(when)}</span>
        </div>
        ${content}
        ${embedsHtml}
      </div>`;
}

async function loadWebhookPickers() {
    const sel = document.getElementById('webhookCodeFilter');
    try {
        const res = await fetch('/api/admin-ui/webhooks', { credentials: 'same-origin' });
        const j = await res.json();
        const webhooks = j.webhooks || [];
        sel.innerHTML = '<option value="">All</option>' +
            webhooks.map((w) => `<option value="${escHtml(w.code)}">${escHtml(w.name)} (${escHtml(w.code)})</option>`).join('');
    } catch (e) { /* keep default "All" option */ }
}



  // ---------------------------------------------------------------
  // boot
  // ---------------------------------------------------------------
  (async () => {
    const me = await requireSession();
    if (!me) return;
    document.getElementById('userLabel').textContent = me.user || '';
    loadLogs();
  })();
})();
