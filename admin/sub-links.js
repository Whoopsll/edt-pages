(function () {
	function toast(msg, type) {
		if (typeof showToast === 'function') showToast(msg, type || 'success');
		else alert(msg);
	}

	async function subApi(method, body, query) {
		query = query || '';
		if (query.indexOf('_t=') < 0) query += (query.indexOf('?') >= 0 ? '&' : '?') + '_t=' + Date.now();
		var ctrl = new AbortController(), tm = setTimeout(function () { ctrl.abort(); }, 15000);
		try {
			var r = await fetch('/admin/sub-links.json' + query, {
				method,
				signal: ctrl.signal,
				credentials: 'same-origin',
				cache: 'no-store',
				headers: body ? { 'Content-Type': 'application/json', 'Accept': 'application/json' } : { 'Accept': 'application/json' },
				body: body ? JSON.stringify(body) : undefined
			});
			clearTimeout(tm);
			var ct = (r.headers.get('content-type') || '').toLowerCase();
			if (r.url.indexOf('sub-links.json') < 0 || r.url.indexOf('/login') >= 0 || ct.indexOf('json') < 0) {
				throw new Error('未登录或会话已过期，请刷新页面重新登录');
			}
			var text = await r.text();
			var data;
			try { data = JSON.parse(text); } catch (parseErr) { throw new Error('接口返回异常，请确认 Worker 已部署'); }
			if (!r.ok || data.error) throw new Error(data.error || ('HTTP ' + r.status));
			return data;
		} catch (e) {
			clearTimeout(tm);
			if (e && e.name === 'AbortError') throw new Error('请求超时，请稍后点「刷新列表」重试');
			throw e;
		}
	}

	function esc(s) {
		return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
	}

	function subRowHtml(i) {
		var status = (i.enabled ? '✅ 启用' : '⛔ 停用') + ' · ↑' + i.uploadGB + ' ↓' + i.downloadGB + ' / ' + i.quotaGB + ' GB (' + i.percent + '%)';
		var b64 = i.subUrl + '&b64', clash = i.subUrl + '&clash', sb = i.subUrl + '&sb';
		return '<div class="sub-link-item" data-id="' + esc(i.id) + '">'
			+ '<div class="form-group"><label>' + esc(i.name) + '<br><span class="sub-muted">' + status + '</span></label>'
			+ '<div class="input-wrapper subscription-link-wrapper">'
			+ '<input type="text" readonly value="' + esc(i.subUrl) + '" title="自适应订阅">'
			+ '<div class="btn-container">'
			+ '<button type="button" class="btn btn-qrcode sub-qrcode">📱二维码</button>'
			+ '<button type="button" class="btn btn-primary copy-sub-link" data-url="' + esc(i.subUrl) + '">复制订阅</button>'
			+ '</div></div></div>'
			+ '<div class="form-group"><label>其他格式</label>'
			+ '<div class="input-wrapper sub-format-wrap">'
			+ '<button type="button" class="btn btn-secondary copy-sub-link" data-url="' + esc(b64) + '">Base64</button>'
			+ '<button type="button" class="btn btn-secondary copy-sub-link" data-url="' + esc(clash) + '">Clash</button>'
			+ '<button type="button" class="btn btn-secondary copy-sub-link" data-url="' + esc(sb) + '">SingBox</button>'
			+ '</div></div>'
			+ '<div class="form-group"><label>操作</label>'
			+ '<div class="input-wrapper sub-actions-wrap">'
			+ '<button type="button" class="btn btn-secondary sub-toggle" data-id="' + esc(i.id) + '" data-enabled="' + (!i.enabled) + '">' + (i.enabled ? '停用' : '启用') + '</button>'
			+ '<button type="button" class="btn btn-secondary sub-reset" data-id="' + esc(i.id) + '">重置本月</button>'
			+ '<button type="button" class="btn btn-secondary sub-quota" data-id="' + esc(i.id) + '" data-quota="' + i.quotaGB + '">改配额</button>'
			+ '<button type="button" class="btn btn-secondary sub-del" data-id="' + esc(i.id) + '" style="color:#dc2626">删除</button>'
			+ '</div></div>'
			+ '<div class="form-group"><label>&nbsp;</label>'
			+ '<p class="sub-muted">UUID: ' + esc(i.uuid) + ' · 账期: ' + esc(i.month) + '</p></div>'
			+ '</div>';
	}

	async function loadSubLinks() {
		var el = document.getElementById('subLinksList');
		if (!el) return;
		el.innerHTML = '<span class="loading"></span> 加载中...';
		try {
			var data = await subApi('GET');
			if (data.error) { el.innerHTML = '<p class="sub-muted" style="color:#dc2626;font-size:14px">' + esc(data.error) + '</p>'; return; }
			if (!data.items || !data.items.length) { el.innerHTML = '<p class="sub-muted" style="color:#6b7280;font-size:14px">暂无订阅，请先创建。</p>'; return; }
			el.innerHTML = data.items.map(subRowHtml).join('');
		} catch (e) {
			el.innerHTML = '<p class="sub-muted" style="color:#dc2626;font-size:14px">加载失败：' + esc(e.message) + '</p>';
		}
	}

	async function doCreateSub() {
		var createBtn = document.getElementById('subLinkCreateBtn');
		if (createBtn && createBtn.disabled) return false;
		var nameEl = document.getElementById('subLinkName');
		var quotaEl = document.getElementById('subLinkQuotaGB');
		var quotaGB = Number(quotaEl ? quotaEl.value : 0);
		if (createBtn) { createBtn.disabled = true; createBtn.textContent = '创建中...'; }
		try {
			var r = await subApi('POST', { name: (nameEl ? nameEl.value : '').trim(), quotaGB: quotaGB });
			if (r.error) { toast(r.error, 'error'); return false; }
			toast('✅ 订阅链接已创建', 'success');
			await loadSubLinks();
			return false;
		} catch (e) {
			toast(e.message || '创建失败', 'error');
			return false;
		} finally {
			if (createBtn) { createBtn.disabled = false; createBtn.textContent = '创建链接'; }
		}
	}

	function doRefreshSub() {
		var refreshBtn = document.getElementById('subLinkRefreshBtn');
		if (refreshBtn && refreshBtn.disabled) return false;
		if (refreshBtn) { refreshBtn.disabled = true; refreshBtn.textContent = '⏳ 刷新中...'; }
		loadSubLinks().finally(function () {
			if (refreshBtn) { refreshBtn.disabled = false; refreshBtn.textContent = '🔄 刷新列表'; }
		});
		return false;
	}

	function bindSubLinksUI() {
		window.__subLinksCreate = function (ev) { if (ev) { ev.preventDefault(); ev.stopPropagation(); } return doCreateSub(); };
		window.__subLinksRefresh = function (ev) { if (ev) { ev.preventDefault(); ev.stopPropagation(); } return doRefreshSub(); };
		var createBtn = document.getElementById('subLinkCreateBtn');
		if (createBtn && !createBtn.dataset.bound) {
			createBtn.dataset.bound = '1';
			createBtn.addEventListener('click', function (ev) { ev.preventDefault(); ev.stopPropagation(); doCreateSub(); });
		}
		var refreshBtn = document.getElementById('subLinkRefreshBtn');
		if (refreshBtn && !refreshBtn.dataset.bound) {
			refreshBtn.dataset.bound = '1';
			refreshBtn.addEventListener('click', function (ev) { ev.preventDefault(); ev.stopPropagation(); doRefreshSub(); });
		}
		var list = document.getElementById('subLinksList');
		if (list && !list.dataset.bound) {
			list.dataset.bound = '1';
			list.addEventListener('click', function (ev) {
				var btn = ev.target.closest('button');
				if (!btn) return;
				if (btn.classList.contains('copy-sub-link')) {
					var wrap = btn.closest('.subscription-link-wrapper');
					var inp = wrap ? wrap.querySelector('input') : null;
					var url = btn.dataset.url || (inp ? inp.value : '');
					navigator.clipboard.writeText(url).then(function () { toast('📋 已复制到剪贴板', 'success'); }).catch(function () { toast('复制失败', 'error'); });
				} else if (btn.classList.contains('sub-qrcode')) {
					var wrap2 = btn.closest('.subscription-link-wrapper');
					var inp2 = wrap2 ? wrap2.querySelector('input') : null;
					if (!inp2) return;
					var tmp = document.getElementById('subLinkQrTemp');
					if (!tmp) { tmp = document.createElement('input'); tmp.type = 'hidden'; tmp.id = 'subLinkQrTemp'; document.body.appendChild(tmp); }
					tmp.value = inp2.value;
					if (typeof showQRCode === 'function') showQRCode('subLinkQrTemp');
					else toast('二维码功能不可用', 'error');
				} else if (btn.classList.contains('sub-toggle')) {
					btn.disabled = true;
					subApi('PUT', { id: btn.dataset.id, enabled: btn.dataset.enabled === 'true' }).then(function () { return loadSubLinks(); }).then(function () { toast('已更新', 'success'); }).catch(function (e) { toast(e.message || '操作失败', 'error'); }).finally(function () { btn.disabled = false; });
				} else if (btn.classList.contains('sub-reset')) {
					if (!confirm('重置本月已用流量？')) return;
					btn.disabled = true;
					subApi('PUT', { id: btn.dataset.id, resetUsage: true }).then(function () { return loadSubLinks(); }).then(function () { toast('✅ 本月流量已重置', 'success'); }).catch(function (e) { toast(e.message || '操作失败', 'error'); }).finally(function () { btn.disabled = false; });
				} else if (btn.classList.contains('sub-quota')) {
					var v = prompt('新的月流量配额 (GB)', btn.dataset.quota);
					if (v === null) return;
					btn.disabled = true;
					subApi('PUT', { id: btn.dataset.id, quotaGB: Number(v) }).then(function () { return loadSubLinks(); }).then(function () { toast('配额已更新', 'success'); }).catch(function (e) { toast(e.message || '操作失败', 'error'); }).finally(function () { btn.disabled = false; });
				} else if (btn.classList.contains('sub-del')) {
					if (!confirm('确定删除该订阅链接？')) return;
					var item = btn.closest('.sub-link-item');
					var delId = item && item.dataset ? item.dataset.id : btn.dataset.id;
					if (!delId) { toast('无法识别订阅 ID', 'error'); return; }
					btn.disabled = true;
					if (item && item.parentNode) item.style.opacity = '0.5';
					subApi('DELETE', null, '?id=' + encodeURIComponent(delId)).then(function () {
						if (item && item.parentNode) item.remove();
					}).then(function () { return loadSubLinks(); }).then(function () { toast('已删除', 'success'); })
						.catch(function (e) { toast(e.message || '删除失败', 'error'); return loadSubLinks(); })
						.finally(function () { btn.disabled = false; });
				}
			});
		}
		loadSubLinks();
		if (location.hash === '#sub-links') {
			var m = document.getElementById('subLinksModule');
			if (m) m.scrollIntoView({ behavior: 'smooth' });
		}
	}

	function bootSubLinksUI() {
		bindSubLinksUI();
		setTimeout(function () {
			var el = document.getElementById('subLinksList');
			if (el && el.textContent.indexOf('加载中') >= 0) loadSubLinks();
		}, 800);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', bootSubLinksUI);
	} else {
		bootSubLinksUI();
	}
})();
