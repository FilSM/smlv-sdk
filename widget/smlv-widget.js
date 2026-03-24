/*!
 * SMLV Widget v2.0.0
 * https://cdn.smlv.com/v2/smlv-widget.js
 * (c) SMLV Platform ? MIT License
 *
 * No iframe. Renders directly into the host page DOM.
 * Communicates with the SMLV Widget API using a short-lived JWT token.
 */
(function (root, factory) {
	'use strict';
	if (typeof define === 'function' && define.amd) {
		define([], factory);
	} else if (typeof module === 'object' && module.exports) {
		module.exports = factory();
	} else {
		root.SmlvWidget = factory();
	}
})(typeof self !== 'undefined' ? self : this, function () {
	'use strict';

	var VERSION = '2.1.0';
	var STYLE_ID = 'smlv-widget-styles';
	var DEFAULT_API_URL = 'https://api.smlvcoin.com';
	var _widgetLang = 'en';

	// --- CSS (injected once into <head>) ----------------------------------------

	var CSS = [
		/* Scope: every element touched by the widget lives inside [data-smlv] */
		'[data-smlv]{',
		'  --smlv-primary:#6366f1;--smlv-primary-h:#4f46e5;',
		'  --smlv-bg:#ffffff;--smlv-bg2:#f8fafc;',
		'  --smlv-border:#e2e8f0;--smlv-text:#1e293b;--smlv-muted:#64748b;',
		'  --smlv-ok:#10b981;--smlv-err:#ef4444;--smlv-warn:#f59e0b;',
		'  --smlv-r:8px;',
		'  --smlv-font:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
		'  font-family:var(--smlv-font);color:var(--smlv-text);box-sizing:border-box;',
		'}',
		'[data-smlv][data-theme="dark"]{',
		'  --smlv-primary:#818cf8;--smlv-primary-h:#6366f1;',
		'  --smlv-bg:#0f172a;--smlv-bg2:#1e293b;',
		'  --smlv-border:#334155;--smlv-text:#f1f5f9;--smlv-muted:#94a3b8;',
		'}',
		'[data-smlv] *,[data-smlv] *::before,[data-smlv] *::after{box-sizing:border-box;}',
		/* Inner card */
		'.smlv-card{background:var(--smlv-bg);border:1px solid var(--smlv-border);border-radius:var(--smlv-r);padding:24px;width:100%;}',
		/* Header */
		'.smlv-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--smlv-border);}',
		'.smlv-title{font-size:16px;font-weight:600;margin:0;}',
		'.smlv-brand{font-size:11px;font-weight:700;color:var(--smlv-muted);letter-spacing:.06em;text-transform:uppercase;}',
		/* Buttons */
		'.smlv-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 20px;background:var(--smlv-primary);color:#fff;border:none;border-radius:var(--smlv-r);font-size:14px;font-weight:500;cursor:pointer;transition:background .15s;width:100%;}',
		'.smlv-btn:hover{background:var(--smlv-primary-h);}',
		'.smlv-btn:disabled{opacity:.55;cursor:not-allowed;}',
		'.smlv-btn-sm{width:auto;padding:6px 14px;font-size:13px;background:transparent;color:var(--smlv-primary);border:1px solid var(--smlv-primary);}',
		'.smlv-btn-sm:hover{background:var(--smlv-bg2);}',
		/* Form fields */
		'.smlv-field{margin-bottom:16px;}',
		'.smlv-label{display:block;font-size:13px;font-weight:500;color:var(--smlv-muted);margin-bottom:6px;}',
		'.smlv-input,.smlv-select{width:100%;padding:10px 12px;background:var(--smlv-bg2);border:1px solid var(--smlv-border);border-radius:var(--smlv-r);font-size:14px;color:var(--smlv-text);outline:none;transition:border-color .15s;}',
		'.smlv-input:focus,.smlv-select:focus{border-color:var(--smlv-primary);}',
		/* Copy box */
		'.smlv-copy-box{display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--smlv-bg2);border:1px solid var(--smlv-border);border-radius:var(--smlv-r);font-size:13px;font-family:monospace;word-break:break-all;}',
		'.smlv-copy-box span{flex:1;}',
		/* Balance grid */
		'.smlv-btn-row{display:flex;gap:8px;flex-shrink:0; margin-top:12px; margin-bottom:12px;}',
		'.smlv-bal-grid{margin-bottom:16px;}',
		'.smlv-bal-card{background:var(--smlv-bg2);border:1px solid var(--smlv-border);border-radius:var(--smlv-r);padding:14px;}',
		'.smlv-bal-cur{font-size:12px;font-weight:700;color:var(--smlv-muted);text-transform:uppercase;margin-bottom:4px;}',
		'.smlv-bal-amt{font-size:20px;font-weight:800;line-height:1.2;overflow:hidden;word-break:break-all;}',
		/* Table */
		'.smlv-tbl-wrap{overflow-x:auto;}',
		'.smlv-tbl{width:100%;border-collapse:collapse;font-size:13px;}',
		'.smlv-tbl th{text-align:left;padding:8px 12px;font-size:11px;font-weight:700;color:var(--smlv-muted);text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--smlv-border);}',
		'.smlv-tbl td{padding:10px 12px;border-bottom:1px solid var(--smlv-border);}',
		'.smlv-tbl tr:last-child td{border-bottom:none;}',
		/* Badges */
		'.smlv-badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;}',
		'.smlv-ok-b{background:#d1fae5;color:#065f46;}',
		'.smlv-warn-b{background:#fef3c7;color:#92400e;}',
		'.smlv-err-b{background:#fee2e2;color:#991b1b;}',
		/* Alerts */
		'.smlv-alert{padding:12px 14px;border-radius:var(--smlv-r);font-size:13px;margin-bottom:16px;line-height:1.5;}',
		'.smlv-alert-ok{background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;}',
		'.smlv-alert-info{background:#e0e7ff;color:#3730a3;border:1px solid #a5b4fc;}',
		'.smlv-alert-err{background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;}',
		/* Loading */
		'.smlv-spin-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;gap:12px;color:var(--smlv-muted);font-size:14px;}',
		'.smlv-spinner{width:28px;height:28px;border:3px solid var(--smlv-border);border-top-color:var(--smlv-primary);border-radius:50%;animation:smlv-spin .7s linear infinite;}',
		'@keyframes smlv-spin{to{transform:rotate(360deg);}}',
		/* Info rows */
		'.smlv-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--smlv-border);font-size:14px;}',
		'.smlv-row:last-child{border-bottom:none;}',
		'.smlv-row-lbl{color:var(--smlv-muted);}',
		'.smlv-row-val{font-weight:600;}',
		/* Paginator */
		'.smlv-pgn{display:flex;align-items:center;justify-content:space-between;margin-top:14px;font-size:13px;color:var(--smlv-muted);}',
		/* Filter bar */
		'.smlv-fltr{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;margin-bottom:16px;padding:10px 12px;background:var(--smlv-bg2);border:1px solid var(--smlv-border);border-radius:var(--smlv-r);}',
		'.smlv-fltr label{font-size:11px;font-weight:700;color:var(--smlv-muted);text-transform:uppercase;letter-spacing:.05em;display:flex;flex-direction:column;gap:4px;}',
		'.smlv-fltr select,.smlv-fltr input[type=date],.smlv-fltr input[type=text]{padding:5px 8px;font-size:13px;background:var(--smlv-bg);border:1px solid var(--smlv-border);border-radius:calc(var(--smlv-r) - 2px);color:var(--smlv-text);height:32px;min-width:120px;}',
		,
		'.smlv-fltr-rst{align-self:flex-end;}',
		'.smlv-fltr-active{border-color:var(--smlv-accent)!important;color:var(--smlv-accent)!important;}',

		'.smlv-ts{font-size:12px;color:var(--smlv-muted);margin-top:8px;}',
		/* Tabs */
		'.smlv-tabs{display:flex;gap:2px;background:var(--smlv-bg2);border:1px solid var(--smlv-border);border-radius:var(--smlv-r);padding:3px;margin-bottom:20px;}',
		'.smlv-tab{flex:1;padding:7px 12px;background:transparent;border:none;border-radius:calc(var(--smlv-r) - 2px);font-size:13px;font-weight:500;color:var(--smlv-muted);cursor:pointer;transition:all .15s;text-align:center;}',
		'.smlv-tab:hover{color:var(--smlv-text);}',
		'.smlv-tab.active{background:var(--smlv-bg);color:var(--smlv-text);box-shadow:0 1px 3px rgba(0,0,0,.08);}',
		'.smlv-tab-panel{display:none;}.smlv-tab-panel.active{display:block;}',
		/* Form actions */
		'.smlv-form-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:20px;padding-top:16px;border-top:1px solid var(--smlv-border);}',
		/* Danger zone */
		'.smlv-danger{border:1px solid var(--smlv-err);border-radius:var(--smlv-r);padding:16px;margin-top:4px;}',
		'.smlv-danger-title{font-size:13px;font-weight:700;color:var(--smlv-err);margin-bottom:8px;}',
		'.smlv-danger-desc{font-size:13px;color:var(--smlv-muted);margin-bottom:14px;line-height:1.5;}',
		'.smlv-btn-danger{background:#ef4444;color:#fff;}.smlv-btn-danger:hover{background:#dc2626;}',
		'.smlv-btn-ok{background:var(--smlv-ok);color:#fff;}.smlv-btn-ok:hover{background:#059669;}',
		'.smlv-btn-ghost{background:transparent;color:var(--smlv-muted);border:1px solid var(--smlv-border);}.smlv-btn-ghost:hover{background:var(--smlv-bg2);}',
		/* Confirm inline */
		'.smlv-confirm{background:var(--smlv-bg2);border:1px solid var(--smlv-border);border-radius:var(--smlv-r);padding:14px;margin-top:12px;font-size:13px;}',
		'.smlv-confirm p{margin:0 0 12px;color:var(--smlv-text);line-height:1.5;}',
		'.smlv-confirm .smlv-form-actions{margin-top:0;padding-top:0;border-top:none;}',
		/* Mini bar (navbar inline widget) */
		'.smlv-mini-bar{display:inline-flex;align-items:center;gap:8px;padding:4px 10px;background:var(--smlv-bg2);border:1px solid var(--smlv-border);border-radius:var(--smlv-r);font-size:13px;vertical-align:middle;white-space:nowrap;}',
		'.smlv-mini-label{font-size:11px;font-weight:700;color:var(--smlv-muted);text-transform:uppercase;letter-spacing:.05em;}',
		'.smlv-mini-amt{font-weight:700;color:var(--smlv-text);}',
		'.smlv-mini-dep{padding:3px 10px!important;font-size:12px!important;margin:0!important;}',
	].join('');

	// --- i18n -------------------------------------------------------------------

	function mkT(lang) {
		var i18n = window.SmlvWidgetI18n || {};
		var d = i18n[lang] || i18n['en'] || {};
		var en = i18n['en'] || {};
		return function (key, vars) {
			var s =
				d[key] !== undefined
					? d[key]
					: en[key] !== undefined
						? en[key]
						: key;
			if (vars)
				Object.keys(vars).forEach(function (k) {
					s = s.replace('{' + k + '}', vars[k]);
				});
			return s;
		};
	}

	// --- Lightweight fetch-based API client -------------------------------------

	function SmlvApi(apiUrl, token, xdebug, lang) {
		this.base = (apiUrl || DEFAULT_API_URL).replace(/\/$/, '');
		this.token = token;
		this.xdebug = !!xdebug;
		this.lang = lang || null;
	}

	SmlvApi.prototype._req = function (method, path, data) {
		var url = this.base + '/v1/widget' + path;
		var sep = '?';

		// Debug mode: append Xdebug session trigger to every API request
		if (this.xdebug) {
			url += sep + 'XDEBUG_SESSION_START=netbeans-xdebug';
			sep = '&';
		}

		var opts = {
			method: method,
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				Authorization: 'Bearer ' + this.token,
				'X-Widget-Version': VERSION,
			},
		};
		if (this.lang) {
			opts.headers['X-Language'] = this.lang;
		}

		if (data) {
			if (method === 'GET') {
				var qs = Object.keys(data)
					.filter(function (k) {
						return data[k] != null;
					})
					.map(function (k) {
						return (
							encodeURIComponent(k) +
							'=' +
							encodeURIComponent(data[k])
						);
					})
					.join('&');
				if (qs) url += sep + qs;
			} else {
				opts.body = JSON.stringify(data);
			}
		}

		return fetch(url, opts).then(function (res) {
			return res.json().then(function (body) {
				if (!res.ok) {
					var err = new Error(
						body.message || body.error || 'Request failed',
					);
					err.code = res.status;
					throw err;
				}
				return body;
			});
		});
	};

	SmlvApi.prototype.get = function (path, p) {
		return this._req('GET', path, p);
	};
	SmlvApi.prototype.post = function (path, d) {
		return this._req('POST', path, d);
	};
	SmlvApi.prototype.patch = function (path, d) {
		return this._req('PATCH', path, d);
	};
	SmlvApi.prototype.del = function (path) {
		return this._req('DELETE', path);
	};

	// --- DOM helpers ------------------------------------------------------------

	/**
	 * Tiny element factory:  h('div', {className:'foo', onClick: fn}, [...children])
	 */
	function h(tag, attrs, children) {
		var el = document.createElement(tag);
		if (attrs) {
			Object.keys(attrs).forEach(function (k) {
				if (k === 'className') {
					el.className = attrs[k];
				} else if (k === 'style') {
					el.style.cssText = attrs[k];
				} else if (k.slice(0, 2) === 'on') {
					el.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
				} else {
					el.setAttribute(k, attrs[k]);
				}
			});
		}
		if (children != null) {
			(Array.isArray(children) ? children : [children]).forEach(
				function (c) {
					if (c == null) return;
					el.appendChild(
						typeof c === 'string' ? document.createTextNode(c) : c,
					);
				},
			);
		}
		return el;
	}

	function spinner() {
		return h('div', { className: 'smlv-spin-wrap' }, [
			h('div', { className: 'smlv-spinner' }),
			'Loading...',
		]);
	}

	function alertBox(type, msg) {
		return h('div', { className: 'smlv-alert smlv-alert-' + type }, msg);
	}

	function badge(status) {
		var map = {
			completed: 'ok',
			confirmed: 'ok',
			pending: 'warn',
			failed: 'err',
		};
		var cls = (map[status] || 'warn') + '-b';
		return h(
			'span',
			{ className: 'smlv-badge smlv-' + cls },
			status || 'pending',
		);
	}

	function copyToClipboard(text, btn, copiedMsg) {
		if (!navigator.clipboard) return;
		navigator.clipboard.writeText(text).then(function () {
			var orig = btn.textContent;
			btn.textContent = copiedMsg || 'Copied!';
			setTimeout(function () {
				btn.textContent = orig;
			}, 1600);
		});
	}

	function fmtDate(iso) {
		try {
			return new Date(iso).toLocaleString(_widgetLang);
		} catch (e) {
			return iso || '—';
		}
	}

	var FP_CDN = 'https://cdn.jsdelivr.net/npm/flatpickr';

	function initFlatpickr(inpFrom, inpTo, lang, onChange) {
		var cssId = 'smlv-fp-css';
		var jsId = 'smlv-fp-js';

		function applyFp() {
			var opts = {
				dateFormat: 'Y-m-d',
				allowInput: false,
				disableMobile: true,
				onChange: function () {
					onChange && onChange();
				},
			};
			if (lang && lang !== 'en' && window.flatpickr.l10ns[lang]) {
				opts.locale = lang;
			}
			var optsTo = JSON.parse(JSON.stringify(opts));
			optsTo.onChange = function () {
				onChange && onChange();
			};
			inpFrom._fp = window.flatpickr(inpFrom, opts);
			inpTo._fp = window.flatpickr(inpTo, optsTo);
		}

		function loadLocale() {
			if (!lang || lang === 'en') {
				applyFp();
				return;
			}
			var locId = 'smlv-fp-loc-' + lang;
			if (document.getElementById(locId)) {
				applyFp();
				return;
			}
			var s = document.createElement('script');
			s.id = locId;
			s.src = FP_CDN + '/dist/l10n/' + lang + '.js';
			s.onload = applyFp;
			document.head.appendChild(s);
		}

		if (!document.getElementById(cssId)) {
			var link = document.createElement('link');
			link.id = cssId;
			link.rel = 'stylesheet';
			link.href = FP_CDN + '/dist/flatpickr.min.css';
			document.head.appendChild(link);
		}

		if (window.flatpickr) {
			loadLocale();
			return;
		}
		var existing = document.getElementById(jsId);
		if (existing) {
			existing.addEventListener('load', loadLocale);
			return;
		}
		var script = document.createElement('script');
		script.id = jsId;
		script.src = FP_CDN;
		script.onload = loadLocale;
		document.head.appendChild(script);
	}

	function fmtAmt(val) {
		var n = parseFloat(val || 0);
		if (isNaN(n)) return '0.00000000';
		var abs = Math.abs(n).toFixed(8);
		return n < 0 ? '-' + abs : '+' + abs;
	}

	function amtEl(val) {
		var n = parseFloat(val || 0);
		var style =
			n < 0
				? 'color:#e74c3c;font-weight:600'
				: 'color:#27ae60;font-weight:600';
		return h('span', { style: style }, fmtAmt(val));
	}

	function fmtBal(val) {
		var n = parseFloat(val || 0);
		if (isNaN(n)) return '0.00000000';
		return Math.abs(n).toFixed(8);
	}
	// --- Account resolution -----------------------------------------------------
	//
	// Calls POST /v1/widget/account/resolve.
	// Server decodes JWT, finds account by external_user_id (or account_reference).
	// Returns:
	//   { success:true, data:{ account:{...} } }             — account found/created
	//   { success:false, code:'ACCOUNT_NOT_FOUND',           — needs setup form
	//     prefill:{ email, first_name, last_name, account_type } }

	function resolveAccount(api) {
		return api.post('/account/resolve', {});
	}

	// --- Create-account form -----------------------------------------------------

	function renderCreateForm(card, api, prefill, cb, onCreated, lang) {
		var t = mkT(lang);
		card.innerHTML = '';
		card.appendChild(mkHeader(t('createAccount')));
		card.appendChild(alertBox('info', t('setupPrompt')));

		var emailEl = h('input', {
			className: 'smlv-input',
			type: 'email',
			value: prefill.email || '',
			placeholder: t('emailPlaceholder'),
		});
		var firstEl = h('input', {
			className: 'smlv-input',
			type: 'text',
			value: prefill.first_name || '',
			placeholder: t('firstNamePlaceholder'),
		});
		var lastEl = h('input', {
			className: 'smlv-input',
			type: 'text',
			value: prefill.last_name || '',
			placeholder: t('lastNamePlaceholder'),
		});
		var typeEl = h('select', { className: 'smlv-select' }, [
			h('option', { value: 'natural' }, t('individual')),
			h('option', { value: 'legal' }, t('company')),
		]);
		if (prefill.account_type === 'legal') typeEl.value = 'legal';

		[
			[t('emailLabel'), emailEl],
			[t('firstNameLabel'), firstEl],
			[t('lastNameLabel'), lastEl],
			[t('accountTypeLabel'), typeEl],
		].forEach(function (pair) {
			card.appendChild(
				h('div', { className: 'smlv-field' }, [
					h('label', { className: 'smlv-label' }, pair[0]),
					pair[1],
				]),
			);
		});

		var errBox = h('div', {});
		card.appendChild(errBox);

		var submitBtn = h(
			'button',
			{ className: 'smlv-btn' },
			t('createAccount'),
		);
		submitBtn.addEventListener('click', function () {
			var email = emailEl.value.trim();
			var first = firstEl.value.trim();
			if (!email || !first) {
				errBox.innerHTML = '';
				errBox.appendChild(alertBox('err', t('emailFirstRequired')));
				return;
			}
			submitBtn.disabled = true;
			submitBtn.textContent = t('creating');
			errBox.innerHTML = '';

			api.post('/account/create', {
				email: email,
				first_name: first,
				last_name: lastEl.value.trim() || undefined,
				account_type: typeEl.value,
			})
				.then(function (res) {
					cb.onSuccess &&
						cb.onSuccess({
							event: 'account_created',
							account: res.data,
						});
					onCreated(res.data);
				})
				.catch(function (e) {
					errBox.innerHTML = '';
					errBox.appendChild(alertBox('err', e.message));
					submitBtn.disabled = false;
					submitBtn.textContent = t('createAccount');
					cb.onError && cb.onError(e);
				});
		});
		card.appendChild(submitBtn);
	}

	// --- Tab helper --------------------------------------------------------------

	function mkTabs(labels, panels) {
		var tabEls = [];
		var panelEls = [];

		function activate(i) {
			tabEls.forEach(function (t, j) {
				t.className = 'smlv-tab' + (i === j ? ' active' : '');
			});
			panelEls.forEach(function (p, j) {
				p.className = 'smlv-tab-panel' + (i === j ? ' active' : '');
			});
		}

		var tabBar = h(
			'div',
			{ className: 'smlv-tabs' },
			labels.map(function (lbl, i) {
				var t = h(
					'button',
					{ className: 'smlv-tab' + (i === 0 ? ' active' : '') },
					lbl,
				);
				t.addEventListener('click', function () {
					activate(i);
				});
				tabEls.push(t);
				return t;
			}),
		);

		panels.forEach(function (content, i) {
			var p = h('div', {
				className: 'smlv-tab-panel' + (i === 0 ? ' active' : ''),
			});
			if (typeof content === 'function') content(p);
			else if (content) p.appendChild(content);
			panelEls.push(p);
		});

		return { tabBar: tabBar, panels: panelEls };
	}

	// --- Widget header -----------------------------------------------------------

	function mkHeader(title, rightEl) {
		return h('div', { className: 'smlv-hdr' }, [
			h('h3', { className: 'smlv-title' }, title),
			rightEl || h('span', { className: 'smlv-brand' }, 'SMLV'),
		]);
	}

	// --- Renderers (one per widget type) ----------------------------------------

	var Renderers = {
		/**
		 * Deposit: user buys SMLV from the platform.
		 * Flow: enter amount > rate/fee preview > POST /deposit/buy >
		 *       show bank transfer instructions > poll /deposit/order/<uuid>
		 *       > success screen.
		 */
		deposit: function (root, api, cfg, cb) {
			var card = root.querySelector('.smlv-card');
			var t = mkT(cfg.lang);
			var depositInfo = null;
			var order = null;
			var pollTimer = null;

			function cancelPoll() {
				if (pollTimer) {
					clearInterval(pollTimer);
					pollTimer = null;
				}
			}

			function initialLoad() {
				card.innerHTML = '';
				card.appendChild(spinner());
				api.get('/deposit/info')
					.then(function (res) {
						depositInfo = res.data || {};
						renderForm();
						cb.onReady && cb.onReady();
					})
					.catch(function (e) {
						card.innerHTML = '';
						card.appendChild(alertBox('err', e.message));
						cb.onError && cb.onError(e);
					});
			}

			function renderForm() {
				cancelPoll();
				card.innerHTML = '';
				card.appendChild(mkHeader(t('deposit')));

				var payCurrencies = depositInfo.pay_currencies || [
					{ code: 'EUR', rate: 1 },
				];
				var selectedCur = payCurrencies[0] || { code: 'EUR', rate: 1 };
				var feePercent = parseFloat(depositInfo.fee_percent) || 0;
				var feeFixed = parseFloat(depositInfo.fee_fixed) || 0;
				var minAmount = parseFloat(depositInfo.min_amount) || 0;

				// Amount input
				var amtInp = document.createElement('input');
				amtInp.type = 'number';
				amtInp.min = minAmount > 0 ? minAmount : '0.01';
				amtInp.step = '0.01';
				amtInp.className = 'smlv-input';
				amtInp.placeholder = '0.00';

				// Payment currency selector
				var sel = h(
					'select',
					{ className: 'smlv-select' },
					payCurrencies.map(function (c) {
						var o = h('option', { value: c.code }, c.code);
						if (c.code === selectedCur.code) o.selected = true;
						return o;
					}),
				);
				sel.addEventListener('change', function () {
					selectedCur =
						payCurrencies.filter(function (c) {
							return c.code === sel.value;
						})[0] || payCurrencies[0];
					updatePreview();
				});

				// Preview area
				var previewEl = h('div', { className: 'smlv-deposit-preview' });

				function mkPreviewRow(lbl, val, bold) {
					return h(
						'div',
						{
							style: 'display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px solid var(--smlv-border,#eee)',
						},
						[
							h(
								'span',
								{ style: 'color:var(--smlv-muted,#666)' },
								lbl,
							),
							bold ? h('b', {}, val) : h('span', {}, val),
						],
					);
				}

				function updatePreview() {
					var amt = parseFloat(amtInp.value) || 0;
					previewEl.innerHTML = '';
					if (amt <= 0) return;
					var rate = parseFloat(selectedCur.rate) || 1;
					var amtFiat = Math.round(amt * rate * 100) / 100;
					var feeAmt =
						Math.round(
							((amtFiat * feePercent) / 100 + feeFixed) * 100,
						) / 100;
					var totalDue = Math.round((amtFiat + feeAmt) * 100) / 100;
					previewEl.appendChild(
						h(
							'div',
							{
								style: 'background:var(--smlv-bg,#f8f9fa);border:1px solid var(--smlv-border,#ddd);border-radius:6px;padding:10px 14px;margin-top:10px',
							},
							[
								mkPreviewRow(
									t('depositRate'),
									'1\u00a0SMLV\u00a0=\u00a0' +
										rate.toFixed(4) +
										'\u00a0' +
										selectedCur.code,
									false,
								),
								mkPreviewRow(
									t('depositFee'),
									feeAmt.toFixed(2) +
										'\u00a0' +
										selectedCur.code +
										(feePercent > 0
											? ' (' + feePercent + '%)'
											: ''),
									false,
								),
								mkPreviewRow(
									t('depositTotal'),
									totalDue.toFixed(2) +
										'\u00a0' +
										selectedCur.code,
									true,
								),
							],
						),
					);
				}

				amtInp.addEventListener('input', updatePreview);

				var buyBtn = h(
					'button',
					{
						className: 'smlv-btn',
						style: 'margin-top:16px;width:100%',
					},
					t('buyNow'),
				);
				buyBtn.addEventListener('click', function () {
					var amt = parseFloat(amtInp.value) || 0;
					if (amt <= 0) return;
					if (minAmount > 0 && amt < minAmount) {
						var existErr = card.querySelector('.smlv-amt-err');
						if (existErr) existErr.remove();
						var errEl = alertBox(
							'err',
							t('minDeposit', {
								amount: minAmount,
								currency: 'SMLV',
							}),
						);
						errEl.className += ' smlv-amt-err';
						card.insertBefore(errEl, buyBtn);
						return;
					}
					buyBtn.disabled = true;
					buyBtn.textContent = t('loading');
					api.post('/deposit/buy', {
						amount_smlv: amt,
						from_currency: selectedCur.code,
					})
						.then(function (res) {
							order = res.data || {};
							renderOrderWaiting();
						})
						.catch(function (e) {
							var existErr = card.querySelector('.smlv-buy-err');
							if (existErr) existErr.remove();
							var errEl = alertBox('err', e.message);
							errEl.className += ' smlv-buy-err';
							card.insertBefore(errEl, buyBtn);
							buyBtn.disabled = false;
							buyBtn.textContent = t('buyNow');
						});
				});

				card.appendChild(
					h('div', { className: 'smlv-field' }, [
						h(
							'label',
							{ className: 'smlv-label' },
							t('depositAmountLabel'),
						),
						h(
							'div',
							{
								style: 'display:flex;gap:8px;align-items:center',
							},
							[
								amtInp,
								h(
									'span',
									{
										style: 'font-weight:700;white-space:nowrap',
									},
									'SMLV',
								),
							],
						),
					]),
				);
				card.appendChild(
					h('div', { className: 'smlv-field' }, [
						h(
							'label',
							{ className: 'smlv-label' },
							t('depositPayWith'),
						),
						sel,
					]),
				);
				card.appendChild(previewEl);
				if (minAmount > 0) {
					card.appendChild(
						alertBox(
							'info',
							t('minDeposit', {
								amount: minAmount,
								currency: 'SMLV',
							}),
						),
					);
				}
				card.appendChild(buyBtn);
			}

			function renderOrderWaiting() {
				cancelPoll();
				if (!order) return;
				card.innerHTML = '';
				card.appendChild(mkHeader(t('depositAwaiting')));

				var pay = order.payment || {};

				function mkSummRow(lbl, val, bold) {
					return h(
						'div',
						{
							style: 'display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px solid var(--smlv-border,#eee)',
						},
						[
							h(
								'span',
								{ style: 'color:var(--smlv-muted,#666)' },
								lbl,
							),
							bold ? h('b', {}, val) : h('span', {}, val),
						],
					);
				}

				// Order summary
				card.appendChild(
					h(
						'div',
						{
							style: 'background:var(--smlv-bg,#f8f9fa);border:1px solid var(--smlv-border,#ddd);border-radius:6px;padding:10px 14px;margin:0 0 16px',
						},
						[
							mkSummRow(
								t('depositYouGet'),
								(order.amount_smlv || 0) + '\u00a0SMLV',
								false,
							),
							mkSummRow(
								t('depositRate'),
								'1\u00a0SMLV\u00a0=\u00a0' +
									(order.rate || '?') +
									'\u00a0' +
									(order.currency || ''),
								false,
							),
							mkSummRow(
								t('depositFee'),
								(order.fee_amount || 0) +
									'\u00a0' +
									(order.currency || ''),
								false,
							),
							mkSummRow(
								t('depositTotal'),
								(order.total_due || 0) +
									'\u00a0' +
									(order.currency || ''),
								true,
							),
						],
					),
				);

				// Bank transfer instructions
				if (pay.iban || pay.beneficiary) {
					card.appendChild(
						h(
							'p',
							{ style: 'font-weight:700;margin:0 0 10px' },
							t('depositPayInstructions'),
						),
					);

					function mkInstRow(lbl, val, copyable) {
						if (!val) return h('span', {});
						var valueEl;
						if (copyable) {
							var cpyBtn = h(
								'button',
								{ className: 'smlv-btn smlv-btn-sm' },
								t('copy'),
							);
							cpyBtn.addEventListener('click', function () {
								copyToClipboard(val, cpyBtn, t('copied'));
							});
							valueEl = h('div', { className: 'smlv-copy-box' }, [
								h('span', {}, val),
								cpyBtn,
							]);
						} else {
							valueEl = h(
								'div',
								{ style: 'font-weight:600' },
								val,
							);
						}
						return h('div', { style: 'margin:8px 0' }, [
							h(
								'div',
								{
									style: 'font-size:11px;color:var(--smlv-muted,#888);margin-bottom:2px',
								},
								lbl,
							),
							valueEl,
						]);
					}

					if (pay.beneficiary)
						card.appendChild(
							mkInstRow(
								t('depositBeneficiary'),
								pay.beneficiary,
								false,
							),
						);
					if (pay.bank_name)
						card.appendChild(
							mkInstRow(t('depositBank'), pay.bank_name, false),
						);
					if (pay.iban)
						card.appendChild(
							mkInstRow(t('depositIBAN'), pay.iban, true),
						);
					if (pay.bic)
						card.appendChild(
							mkInstRow(t('depositBIC'), pay.bic, true),
						);
					if (pay.reference)
						card.appendChild(
							mkInstRow(
								t('depositReference'),
								pay.reference,
								true,
							),
						);
					card.appendChild(
						alertBox('info', t('depositReferenceHint')),
					);
				} else {
					card.appendChild(
						alertBox('info', t('depositContactSupport')),
					);
				}

				// Status indicator
				var statusEl = h(
					'div',
					{
						style: 'text-align:center;padding:12px 0;color:var(--smlv-muted,#666);font-size:13px',
					},
					'\u23f3\u00a0' + t('depositWatching'),
				);
				card.appendChild(statusEl);

				// Poll status every 5 s
				var pollCount = 0;
				function doPoll() {
					if (++pollCount > 120) {
						cancelPoll();
						statusel.textContent = t('depositPollTimeout');
						return;
					}
					api.get('/deposit/order/' + order.order_uuid)
						.then(function (res) {
							var d = res.data || {};
							if (d.status === 'completed') {
								cancelPoll();
								renderSuccess(
									d.amount_smlv || order.amount_smlv,
								);
							} else if (
								d.status === 'failed' ||
								d.status === 'cancelled'
							) {
								cancelPoll();
								card.innerHTML = '';
								card.appendChild(mkHeader(t('deposit')));
								card.appendChild(
									alertBox('err', t('depositFailed')),
								);
								var retryBtn = h(
									'button',
									{
										className: 'smlv-btn',
										style: 'margin-top:16px;width:100%',
									},
									t('depositTryAgain'),
								);
								retryBtn.addEventListener('click', function () {
									order = null;
									renderForm();
								});
								card.appendChild(retryBtn);
							}
							// else still pending
						})
						.catch(function () {});
				}
				pollTimer = setInterval(doPoll, 5000);

				// "Start new order" button
				var backBtn = h(
					'button',
					{
						className: 'smlv-btn smlv-btn-sm',
						style: 'margin-top:16px;background:transparent;color:var(--smlv-muted,#999);border:1px solid var(--smlv-border,#ccc)',
					},
					t('depositNewOrder'),
				);
				backBtn.addEventListener('click', function () {
					cancelPoll();
					order = null;
					renderForm();
				});
				card.appendChild(backBtn);
			}

			function renderSuccess(amountSmlv) {
				cancelPoll();
				card.innerHTML = '';
				card.appendChild(
					h('div', { style: 'text-align:center;padding:32px 0' }, [
						h(
							'div',
							{ style: 'font-size:48px;margin-bottom:12px' },
							'\u2705',
						),
						h(
							'div',
							{
								style: 'font-size:18px;font-weight:700;margin-bottom:8px',
							},
							t('depositSuccess'),
						),
						h(
							'div',
							{
								style: 'color:var(--smlv-muted,#666);font-size:14px',
							},
							t('depositSuccessHint', {
								amount: amountSmlv,
							}),
						),
					]),
				);
				cb.onSuccess && cb.onSuccess({ amount_smlv: amountSmlv });
			}

			initialLoad();
		},

		/**
		 * Balance: grid of currency > amount cards. Refresh = POST /balance/sync.
		 */
		balance: function (root, api, cfg, cb) {
			var card = root.querySelector('.smlv-card');
			var t = mkT(cfg.lang);

			function renderBalances(res) {
				var s = card.querySelector('.smlv-spin-wrap');
				if (s) s.remove();
				card.querySelector('.smlv-bal-grid') &&
					card.querySelector('.smlv-bal-grid').remove();
				card.querySelector('.smlv-ts') &&
					card.querySelector('.smlv-ts').remove();
				card.querySelector('.smlv-alert') &&
					card.querySelector('.smlv-alert').remove();

				var balances =
					res.data && res.data.balances ? res.data.balances : [];
				if (!balances.length) {
					card.appendChild(
						h(
							'p',
							{ style: 'color:var(--smlv-muted);font-size:14px' },
							t('noBalance'),
						),
					);
				} else {
					var grid = h('div', { className: 'smlv-bal-grid' });
					balances.forEach(function (b) {
						grid.appendChild(
							h('div', { className: 'smlv-bal-card' }, [
								h(
									'div',
									{ className: 'smlv-bal-cur' },
									(b.currency || '').toUpperCase(),
								),
								h(
									'div',
									{ className: 'smlv-bal-amt' },
									fmtBal(b.amount),
								),
							]),
						);
					});
					card.appendChild(grid);
				}
				if (res.data && res.data.updated_at) {
					card.appendChild(
						h(
							'p',
							{ className: 'smlv-ts' },
							t('updatedAt') + fmtDate(res.data.updated_at),
						),
					);
				}
			}

			function doSync(syncBtn) {
				if (syncBtn) {
					syncBtn.disabled = true;
					syncBtn.textContent = t('syncing');
				}
				card.appendChild(spinner());
				api.post('/balance/sync')
					.then(function (res) {
						renderBalances(res);
						if (syncBtn) {
							syncBtn.disabled = false;
							syncBtn.textContent = t('sync');
						}
					})
					.catch(function (e) {
						var s = card.querySelector('.smlv-spin-wrap');
						if (s) s.remove();
						card.appendChild(alertBox('err', e.message));
						if (syncBtn) {
							syncBtn.disabled = false;
							syncBtn.textContent = t('sync');
						}
						cb.onError && cb.onError(e);
					});
			}

			function load() {
				card.innerHTML = '';
				var syncBtn = h(
					'button',
					{ className: 'smlv-btn smlv-btn-sm' },
					t('sync'),
				);
				syncBtn.addEventListener('click', function () {
					doSync(syncBtn);
				});
				var headerRight;
				if (cfg.depositUrl) {
					var depositBtn = h(
						'button',
						{ className: 'smlv-btn smlv-btn-sm smlv-btn-ok' },
						t('deposit'),
					);
					depositBtn.addEventListener('click', function () {
						window.location.href = cfg.depositUrl;
					});
					headerRight = h('div', { className: 'smlv-btn-row' }, [
						depositBtn,
						syncBtn,
					]);
				} else {
					headerRight = syncBtn;
				}
				card.appendChild(mkHeader(t('balance'), headerRight));
				card.appendChild(spinner());

				api.get('/balance')
					.then(function (res) {
						renderBalances(res);
						cb.onReady && cb.onReady();
					})
					.catch(function (e) {
						var s = card.querySelector('.smlv-spin-wrap');
						if (s) s.remove();
						card.appendChild(alertBox('err', e.message));
						cb.onError && cb.onError(e);
					});
			}

			load();
		},

		/**
		 * Transactions: paginated table
		 */
		transactions: function (root, api, cfg, cb) {
			var card = root.querySelector('.smlv-card');
			var t = mkT(cfg.lang);
			var page = 1;
			var perPage = cfg.perPage || 10;
			var total = 0;

			function load() {
				card.innerHTML = '';
				card.appendChild(mkHeader(t('transactions')));
				card.appendChild(spinner());

				api.get('/transaction', { page: page, per_page: perPage })
					.then(function (res) {
						card.querySelector('.smlv-spin-wrap').remove();

						var items =
							res.data && res.data.items ? res.data.items : [];
						total =
							res.data && res.data.total
								? res.data.total
								: items.length;

						if (!items.length) {
							card.appendChild(
								h(
									'p',
									{
										style: 'color:var(--smlv-muted);font-size:14px',
									},
									t('noTransactions'),
								),
							);
							cb.onReady && cb.onReady();
							return;
						}

						var thead = h('thead', {}, [
							h('tr', {}, [
								h('th', {}, t('colDate')),
								h('th', {}, t('colType')),
								h('th', {}, t('colAmount')),
								h('th', {}, t('colFee')),
								h('th', {}, t('colCurrency')),
								h('th', {}, t('colStatus')),
								h('th', {}, t('colInvoice')),
							]),
						]);

						var tbody = h(
							'tbody',
							{},
							items.map(function (tx) {
								var stPrintTd;
								if (tx.direction === 'credit' && tx.reference) {
									var stBtn = h(
										'button',
										{
											className: 'smlv-btn smlv-btn-sm',
											style: 'white-space:nowrap',
										},
										t('printInvoice'),
									);
									stBtn.addEventListener(
										'click',
										(function (ref) {
											return function () {
												window.open(
													api.base +
														'/v1/widget/transaction/' +
														encodeURIComponent(
															ref,
														) +
														'/invoice?widget_token=' +
														encodeURIComponent(
															api.token,
														),
													'_blank',
												);
											};
										})(tx.reference),
									);
									stPrintTd = h('td', {}, stBtn);
								} else {
									stPrintTd = h(
										'td',
										{ style: 'color:var(--smlv-muted)' },
										'—',
									);
								}
								return h('tr', {}, [
									h('td', {}, fmtDate(tx.created_at)),
									h(
										'td',
										{},
										t('txType_' + tx.type) ||
											tx.type ||
											'-',
									),
									h('td', {}, amtEl(tx.amount)),
									h(
										'td',
										{ style: 'color:var(--smlv-muted)' },
										tx.fee != null && tx.fee > 0
											? fmtBal(tx.fee)
											: '—',
									),
									h(
										'td',
										{},
										(tx.currency || '').toUpperCase(),
									),
									h('td', {}, badge(tx.status)),
									stPrintTd,
								]);
							}),
						);
						var stTotalAmt = items.reduce(function (s, tx) {
							return s + (tx.amount || 0);
						}, 0);
						var stTotalFee = items.reduce(function (s, tx) {
							return s + (tx.fee || 0);
						}, 0);
						var stTfoot = h('tfoot', {}, [
							h(
								'tr',
								{
									style: 'border-top:2px solid var(--smlv-border);font-weight:700;font-size:12px;',
								},
								[
									h(
										'td',
										{
											colSpan: 2,
											style: 'text-align:right;padding-right:8px;color:var(--smlv-muted);',
										},
										t('colTotal'),
									),
									h('td', {}, amtEl(stTotalAmt)),
									h(
										'td',
										{ style: 'color:var(--smlv-muted);' },
										stTotalFee > 0
											? fmtBal(stTotalFee)
											: '—',
									),
									h('td'),
									h('td'),
									h('td'),
								],
							),
						]);

						card.appendChild(
							h('div', { className: 'smlv-tbl-wrap' }, [
								h('table', { className: 'smlv-tbl' }, [
									thead,
									tbody,
									stTfoot,
								]),
							]),
						);

						/* Pagination */
						var pages = Math.ceil(total / perPage);
						if (pages > 1) {
							var prev = h(
								'button',
								{ className: 'smlv-btn smlv-btn-sm' },
								t('prevPage'),
							);
							var next = h(
								'button',
								{ className: 'smlv-btn smlv-btn-sm' },
								t('nextPage'),
							);
							prev.disabled = page <= 1;
							next.disabled = page >= pages;
							prev.addEventListener('click', function () {
								page--;
								load();
							});
							next.addEventListener('click', function () {
								page++;
								load();
							});
							card.appendChild(
								h('div', { className: 'smlv-pgn' }, [
									prev,
									t('pageOf', { page: page, total: pages }),
									next,
								]),
							);
						}

						cb.onReady && cb.onReady();
					})
					.catch(function (e) {
						var s = card.querySelector('.smlv-spin-wrap');
						if (s) s.remove();
						card.appendChild(alertBox('err', e.message));
						cb.onError && cb.onError(e);
					});
			}

			load();
		},

		/**
		 * Management: full CRUD ? Overview | Edit | Danger Zone
		 */
		management: function (root, api, cfg, cb) {
			var card = root.querySelector('.smlv-card');
			var t = mkT(cfg.lang);
			card.innerHTML = '';
			card.appendChild(mkHeader(t('account')));
			card.appendChild(spinner());

			api.get('/account')
				.then(function (res) {
					var s = card.querySelector('.smlv-spin-wrap');
					if (s) s.remove();
					var acc = res.data || {};
					renderManagement(acc);
					cb.onReady && cb.onReady();
				})
				.catch(function (e) {
					card.innerHTML = '';
					card.appendChild(alertBox('err', e.message));
					cb.onError && cb.onError(e);
				});

			function renderManagement(acc) {
				// Remove everything below the header
				while (card.children.length > 1)
					card.removeChild(card.lastChild);

				var tabs = mkTabs(
					[t('overview'), t('edit'), t('dangerZone')],
					[renderOverviewPanel, renderEditPanel, renderDangerPanel],
				);
				card.appendChild(tabs.tabBar);
				tabs.panels.forEach(function (p) {
					card.appendChild(p);
				});

				// -- Tab 1: Overview -----------------------------------------
				function renderOverviewPanel(panel) {
					var infoRows = [
						[
							t('reference'),
							acc.reference || acc.account_reference,
						],
						[t('emailField'), acc.email],
						[t('firstNameField'), acc.first_name],
						[t('lastNameField'), acc.last_name],
						[t('typeField'), acc.account_type],
						[t('statusField'), acc.status],
						[
							t('createdField'),
							acc.created_at ? fmtDate(acc.created_at) : null,
						],
					];
					infoRows
						.filter(function (f) {
							return f[1];
						})
						.forEach(function (f) {
							panel.appendChild(
								h('div', { className: 'smlv-row' }, [
									h(
										'span',
										{ className: 'smlv-row-lbl' },
										f[0],
									),
									h(
										'span',
										{ className: 'smlv-row-val' },
										String(f[1]),
									),
								]),
							);
						});
				}

				// -- Tab 2: Edit ---------------------------------------------
				function renderEditPanel(panel) {
					var firstEl = h('input', {
						className: 'smlv-input',
						type: 'text',
						value: acc.first_name || '',
					});
					var lastEl = h('input', {
						className: 'smlv-input',
						type: 'text',
						value: acc.last_name || '',
					});
					var emailEl = h('input', {
						className: 'smlv-input',
						type: 'email',
						value: acc.email || '',
					});
					var typeEl = h('select', { className: 'smlv-select' }, [
						h('option', { value: 'natural' }, t('individualShort')),
						h('option', { value: 'legal' }, t('companyShort')),
					]);
					if (acc.account_type === 'legal') typeEl.value = 'legal';

					[
						[t('firstNameField'), firstEl],
						[t('lastNameField'), lastEl],
						[t('emailField'), emailEl],
						[t('accountTypeLabel'), typeEl],
					].forEach(function (pair) {
						panel.appendChild(
							h('div', { className: 'smlv-field' }, [
								h(
									'label',
									{ className: 'smlv-label' },
									pair[0],
								),
								pair[1],
							]),
						);
					});

					var msgBox = h('div', {});
					panel.appendChild(msgBox);

					var saveBtn = h(
						'button',
						{ className: 'smlv-btn', style: 'margin-top:4px' },
						t('saveChanges'),
					);
					saveBtn.addEventListener('click', function () {
						saveBtn.disabled = true;
						saveBtn.textContent = t('saving');
						msgBox.innerHTML = '';
						api.patch('/account', {
							first_name: firstEl.value.trim() || undefined,
							last_name: lastEl.value.trim() || undefined,
							email: emailEl.value.trim() || undefined,
							account_type: typeEl.value,
						})
							.then(function (r) {
								acc = r.data || acc;
								msgBox.appendChild(
									alertBox('ok', t('accountUpdated')),
								);
								saveBtn.disabled = false;
								saveBtn.textContent = t('saveChanges');
								cb.onSuccess &&
									cb.onSuccess({
										event: 'account_updated',
										account: acc,
									});
							})
							.catch(function (e) {
								msgBox.appendChild(alertBox('err', e.message));
								saveBtn.disabled = false;
								saveBtn.textContent = t('saveChanges');
								cb.onError && cb.onError(e);
							});
					});
					panel.appendChild(saveBtn);
				}

				// -- Tab 3: Danger Zone ---------------------------------------
				function renderDangerPanel(panel) {
					var isActive =
						acc.status === 'active' || acc.status === 'Active';

					/* -- Close / Reactivate -- */
					var closeSection = h('div', { className: 'smlv-danger' });
					closeSection.appendChild(
						h(
							'div',
							{ className: 'smlv-danger-title' },
							isActive
								? t('deactivateTitle')
								: t('reactivateTitle'),
						),
					);
					closeSection.appendChild(
						h(
							'div',
							{ className: 'smlv-danger-desc' },
							isActive
								? t('deactivateDesc')
								: t('reactivateDesc'),
						),
					);

					var closeConfirm = h('div', {
						className: 'smlv-confirm',
						style: 'display:none',
					});
					closeConfirm.appendChild(
						h(
							'p',
							{},
							isActive
								? t('confirmDeactivate')
								: t('confirmReactivate'),
						),
					);
					var closeErrBox = h('div', {});
					closeConfirm.appendChild(closeErrBox);
					var confirmCloseBtn = h(
						'button',
						{
							className:
								'smlv-btn ' +
								(isActive ? 'smlv-btn-danger' : 'smlv-btn-ok'),
							style: 'width:auto;padding:8px 16px',
						},
						isActive ? t('deactivate') : t('reactivate'),
					);
					var cancelCloseBtn = h(
						'button',
						{
							className: 'smlv-btn smlv-btn-ghost',
							style: 'width:auto;padding:8px 16px',
						},
						t('cancel'),
					);
					closeConfirm.appendChild(
						h('div', { className: 'smlv-form-actions' }, [
							cancelCloseBtn,
							confirmCloseBtn,
						]),
					);

					cancelCloseBtn.addEventListener('click', function () {
						closeConfirm.style.display = 'none';
					});
					confirmCloseBtn.addEventListener('click', function () {
						confirmCloseBtn.disabled = true;
						closeErrBox.innerHTML = '';
						var method = isActive
							? api.post('/account/close', {})
							: api.post('/account/reactivate', {});
						method
							.then(function (r) {
								acc = r.data || acc;
								closeConfirm.style.display = 'none';
								renderManagement(acc);
								cb.onSuccess &&
									cb.onSuccess({
										event: isActive
											? 'account_closed'
											: 'account_reactivated',
										account: acc,
									});
							})
							.catch(function (e) {
								closeErrBox.appendChild(
									alertBox('err', e.message),
								);
								confirmCloseBtn.disabled = false;
								cb.onError && cb.onError(e);
							});
					});

					var toggleCloseBtn = h(
						'button',
						{
							className:
								'smlv-btn ' +
								(isActive ? 'smlv-btn-danger' : 'smlv-btn-ok'),
						},
						isActive ? t('deactivateTitle') : t('reactivateTitle'),
					);
					toggleCloseBtn.addEventListener('click', function () {
						closeConfirm.style.display = 'block';
					});

					closeSection.appendChild(toggleCloseBtn);
					closeSection.appendChild(closeConfirm);
					panel.appendChild(closeSection);
					panel.appendChild(h('div', { style: 'height:16px' }));

					/* -- Delete -- */
					var delSection = h('div', { className: 'smlv-danger' });
					delSection.appendChild(
						h(
							'div',
							{ className: 'smlv-danger-title' },
							t('deleteTitle'),
						),
					);
					delSection.appendChild(
						h(
							'div',
							{ className: 'smlv-danger-desc' },
							t('deleteDesc'),
						),
					);

					var delConfirm = h('div', {
						className: 'smlv-confirm',
						style: 'display:none',
					});
					delConfirm.appendChild(h('p', {}, t('typeDeleteConfirm')));
					var delInput = h('input', {
						className: 'smlv-input',
						type: 'text',
						placeholder: 'DELETE',
					});
					delConfirm.appendChild(delInput);
					var delErrBox = h('div', {});
					delConfirm.appendChild(delErrBox);
					var confirmDelBtn = h(
						'button',
						{
							className: 'smlv-btn smlv-btn-danger',
							style: 'width:auto;padding:8px 16px',
						},
						t('deleteForever'),
					);
					var cancelDelBtn = h(
						'button',
						{
							className: 'smlv-btn smlv-btn-ghost',
							style: 'width:auto;padding:8px 16px',
						},
						t('cancel'),
					);
					delConfirm.appendChild(
						h('div', { className: 'smlv-form-actions' }, [
							cancelDelBtn,
							confirmDelBtn,
						]),
					);

					cancelDelBtn.addEventListener('click', function () {
						delInput.value = '';
						delConfirm.style.display = 'none';
					});
					confirmDelBtn.addEventListener('click', function () {
						if (delInput.value.trim() !== 'DELETE') {
							delErrBox.innerHTML = '';
							delErrBox.appendChild(
								alertBox('err', t('typeDeleteCaps')),
							);
							return;
						}
						confirmDelBtn.disabled = true;
						delErrBox.innerHTML = '';
						api.del('/account')
							.then(function () {
								card.innerHTML = '';
								card.appendChild(
									alertBox(
										'ok',
										'Account has been permanently deleted.',
									),
								);
								cb.onSuccess &&
									cb.onSuccess({ event: 'account_deleted' });
							})
							.catch(function (e) {
								delErrBox.appendChild(
									alertBox('err', e.message),
								);
								confirmDelBtn.disabled = false;
								cb.onError && cb.onError(e);
							});
					});

					var showDelBtn = h(
						'button',
						{ className: 'smlv-btn smlv-btn-danger' },
						t('deleteTitle'),
					);
					showDelBtn.addEventListener('click', function () {
						delConfirm.style.display = 'block';
					});
					delSection.appendChild(showDelBtn);
					delSection.appendChild(delConfirm);
					panel.appendChild(delSection);
				}
			}
		},

		/**
		 * Account (unified): "Create SMLV Account" button when no SMLV account exists,
		 * or a 4-tab dashboard (SMLV Balance | Transactions | Overview | Danger Zone)
		 * when the account exists.
		 * Handles resolveAccount() internally — skips mount()'s auto-resolve flow.
		 *
		 * cfg.prefill / cfg.syncData  — subscriber data pre-passed by eGram.
		 * The "Create" button auto-creates using prefill (no form) when email+first_name
		 * are available; falls back to the create form otherwise.
		 * The "Update" button on the Overview tab pushes prefill/syncData to SMLV
		 * without any additional user input.
		 */
		account: function (root, api, cfg, cb) {
			var card = root.querySelector('.smlv-card');
			var t = mkT(cfg.lang);
			var perPage = cfg.perPage || 10;
			card.innerHTML = '';
			card.appendChild(spinner());

			/* -- Merchant owner: bypass account resolution, show wallet balances -- */
			if (cfg.isMerchantOwner) {
				var moSpin = card.querySelector('.smlv-spin-wrap');
				if (moSpin) moSpin.remove();
				renderMerchantOwnerPanel();
				cb.onReady && cb.onReady();
				return;
			}

			resolveAccount(api)
				.then(function (res) {
					var s = card.querySelector('.smlv-spin-wrap');
					if (s) s.remove();
					if (!res.found) {
						renderSetupPrompt();
						cb.onReady && cb.onReady();
						return;
					}
					var acc =
						res.data && res.data.account
							? res.data.account
							: res.data || {};
					renderTabs(acc);
					cb.onReady && cb.onReady();
				})
				.catch(function (e) {
					var s = card.querySelector('.smlv-spin-wrap');
					if (s) s.remove();
					card.appendChild(alertBox('err', e.message));
					cb.onError && cb.onError(e);
				});

			/* -- No SMLV account: single "Create" button ----------------------- */
			/* -- Merchant owner: wallet balance panel (no CrgAccount) ----------- */
			function renderMerchantOwnerPanel() {
				card.innerHTML = '';
				card.appendChild(mkHeader(t('balance') || t('smlvBalance')));

				/* -- Tabs: Balance | Transactions -- */
				var tabs = mkTabs(
					[t('balance') || t('smlvBalance'), t('transactions')],
					[renderMoBalancePanel, renderMoTxPanel],
				);
				card.appendChild(tabs.tabBar);
				tabs.panels.forEach(function (p) {
					card.appendChild(p);
				});

				/* -- Tab 1: Balance -- */
				function renderMoBalancePanel(panel) {
					/* toolbar buttons */
					var syncBtn = h(
						'button',
						{ className: 'smlv-btn smlv-btn-sm' },
						t('sync') || 'Sync',
					);
					var btnRow = h('div', { className: 'smlv-btn-row' });
					btnRow.appendChild(syncBtn);
					if (cfg.depositUrl) {
						var depBtn = h(
							'button',
							{ className: 'smlv-btn smlv-btn-sm smlv-btn-ok' },
							t('deposit') || 'Deposit',
						);
						depBtn.addEventListener('click', function () {
							window.location.href = cfg.depositUrl;
						});
						btnRow.appendChild(depBtn);
					}
					if (cfg.allowWithdraw) {
						var wdBtn = h(
							'button',
							{
								className:
									'smlv-btn smlv-btn-sm smlv-btn-primary',
							},
							t('withdraw') || 'Withdraw',
						);
						btnRow.appendChild(wdBtn);
						wdBtn.addEventListener('click', function () {
							openWithdrawModal();
						});
					}
					panel.appendChild(btnRow);
					var toolbar =
						btnRow; /* anchor for insertBefore in renderMoBalances */

					/* ---------- withdraw modal ---------- */
					function openWithdrawModal() {
						var overlay = h('div', {
							className: 'smlv-modal-overlay',
						});
						var modal = h('div', { className: 'smlv-modal' });
						modal.appendChild(
							mkHeader(t('withdraw') || 'Withdraw'),
						);
						var form = h('div', { className: 'smlv-form' });

						var amountWrap = h('div', {
							className: 'smlv-form-row',
						});
						amountWrap.appendChild(
							h('label', {}, t('amount') || 'Amount'),
						);
						var amountInput = h('input', {
							type: 'number',
							className: 'smlv-input',
							min: '0.01',
							step: '0.01',
							placeholder: '0.00',
						});
						amountWrap.appendChild(amountInput);

						var ibanWrap = h('div', { className: 'smlv-form-row' });
						ibanWrap.appendChild(h('label', {}, 'IBAN'));
						var ibanInput = h('input', {
							type: 'text',
							className: 'smlv-input',
							placeholder: 'LVxxBLAxx...',
						});
						ibanWrap.appendChild(ibanInput);

						var bicWrap = h('div', { className: 'smlv-form-row' });
						bicWrap.appendChild(h('label', {}, 'BIC / SWIFT'));
						var bicInput = h('input', {
							type: 'text',
							className: 'smlv-input',
							placeholder: 'XXXXX',
						});
						bicWrap.appendChild(bicInput);

						var nameWrap = h('div', { className: 'smlv-form-row' });
						nameWrap.appendChild(
							h(
								'label',
								{},
								t('beneficiaryName') || 'Beneficiary name',
							),
						);
						var nameInput = h('input', {
							type: 'text',
							className: 'smlv-input',
							placeholder: t('beneficiaryName') || 'Full name',
						});
						nameWrap.appendChild(nameInput);

						if (cfg.withdrawPrefill) {
							if (cfg.withdrawPrefill.iban)
								ibanInput.value = cfg.withdrawPrefill.iban;
							if (cfg.withdrawPrefill.bic)
								bicInput.value = cfg.withdrawPrefill.bic;
							if (cfg.withdrawPrefill.beneficiary_name)
								nameInput.value =
									cfg.withdrawPrefill.beneficiary_name;
						}

						form.appendChild(amountWrap);
						form.appendChild(ibanWrap);
						form.appendChild(bicWrap);
						form.appendChild(nameWrap);
						modal.appendChild(form);

						var alertArea = h('div', {
							className: 'smlv-modal-alert',
						});
						modal.appendChild(alertArea);

						var btnRow = h('div', { className: 'smlv-btn-row' });
						var submitBtn = h(
							'button',
							{ className: 'smlv-btn smlv-btn-primary' },
							t('withdraw') || 'Withdraw',
						);
						var cancelBtn = h(
							'button',
							{ className: 'smlv-btn smlv-btn-ghost' },
							t('cancel') || 'Cancel',
						);
						btnRow.appendChild(submitBtn);
						btnRow.appendChild(cancelBtn);
						modal.appendChild(btnRow);
						overlay.appendChild(modal);
						card.appendChild(overlay);

						cancelBtn.addEventListener('click', function () {
							overlay.remove();
						});

						submitBtn.addEventListener('click', function () {
							alertArea.innerHTML = '';
							var amount = parseFloat(amountInput.value);
							var iban = ibanInput.value.trim();
							var bic = bicInput.value.trim();
							var beneficiaryName = nameInput.value.trim();
							if (
								!amount ||
								amount <= 0 ||
								!iban ||
								!bic ||
								!beneficiaryName
							) {
								alertArea.appendChild(
									alertBox(
										'err',
										t('fillAllFields') ||
											'Please fill all fields.',
									),
								);
								return;
							}
							submitBtn.disabled = true;
							api.post('/merchant/withdraw', {
								amount: amount,
								iban: iban,
								bic: bic,
								beneficiary_name: beneficiaryName,
							})
								.then(function () {
									overlay.remove();
									api.get('/merchant/balance')
										.then(renderMoBalances)
										.catch(function () {});
								})
								.catch(function (e) {
									submitBtn.disabled = false;
									alertArea.innerHTML = '';
									alertArea.appendChild(
										alertBox('err', e.message),
									);
								});
						});
					}

					/* ---------- render balances ---------- */
					function renderMoBalances(res) {
						if (res && res.data && res.data._debug) {
							console.log(
								'[SMLV merchant balance debug]',
								res.data._debug,
							);
						}
						var old;
						while (
							(old = panel.querySelector(
								'.smlv-bal-grid, .smlv-ts, .smlv-spin-wrap',
							))
						)
							old.remove();
						var oldAlert = panel.querySelector(
							'.smlv-alert:not(.smlv-modal-overlay .smlv-alert)',
						);
						if (oldAlert) oldAlert.remove();

						var balances =
							res && res.data && res.data.balances
								? res.data.balances
								: res && res.balances
									? res.balances
									: [];
						if (!balances.length) {
							panel.insertBefore(
								alertBox(
									'info',
									t('noData') || 'No balance data.',
								),
								toolbar.nextSibling,
							);
							return;
						}
						var newGrid = h('div', { className: 'smlv-bal-grid' });
						balances.forEach(function (b) {
							var children = [
								h(
									'div',
									{ className: 'smlv-bal-cur' },
									(b.currency || '').toUpperCase(),
								),
								h(
									'div',
									{ className: 'smlv-bal-amt' },
									b.amount != null ? fmtBal(b.amount) : '—',
								),
							];
							if (
								b.frozen_balance != null &&
								b.frozen_balance !== 0
							) {
								children.push(
									h(
										'div',
										{
											style: 'font-size:11px;color:var(--smlv-muted);margin-top:4px;',
										},
										(t('frozen') || 'Frozen') +
											': ' +
											fmtBal(b.frozen_balance),
									),
								);
							}
							newGrid.appendChild(
								h(
									'div',
									{ className: 'smlv-bal-card' },
									children,
								),
							);
						});
						panel.insertBefore(newGrid, toolbar.nextSibling);
					}

					/* sync button */
					syncBtn.addEventListener('click', function () {
						syncBtn.disabled = true;
						api.post('/merchant/balance/sync', {})
							.then(function (res) {
								renderMoBalances(res);
								syncBtn.disabled = false;
							})
							.catch(function (e) {
								syncBtn.disabled = false;
								panel.appendChild(alertBox('err', e.message));
							});
					});

					/* initial load */
					panel.appendChild(spinner());
					api.get('/merchant/balance')
						.then(function (res) {
							var sp = panel.querySelector('.smlv-spin-wrap');
							if (sp) sp.remove();
							renderMoBalances(res);
						})
						.catch(function (e) {
							var sp = panel.querySelector('.smlv-spin-wrap');
							if (sp) sp.remove();
							panel.appendChild(alertBox('err', e.message));
						});
				} /* end renderMoBalancePanel */

				/* -- Tab 2: Transactions -- */
				function renderMoTxPanel(panel) {
					var txPage = 1;
					var txSort = 'created_at';
					var txDir = 'desc';
					var txTotal = 0;
					var txType = '';
					var txStatus = '';
					var txDateFrom = '';
					var txDateTo = '';
					var txCurrency = '';

					var COLS = [
						{ key: 'created_at', label: t('colDate') },
						{ key: 'type', label: t('colType') },
						{ key: 'amount', label: t('colAmount') },
						{ key: 'fee', label: t('colFee') },
						{ key: 'currency', label: t('colCurrency') },
						{ key: 'status', label: t('colStatus') },
						{ key: '', label: t('colInvoice') },
					];

					var stmtBtn = h(
						'button',
						{
							className: 'smlv-btn smlv-btn-sm',
							style: 'white-space:nowrap',
						},
						t('printStatement'),
					);
					stmtBtn.addEventListener('click', function () {
						var url =
							api.base +
							'/v1/widget/transactions/statement?widget_token=' +
							encodeURIComponent(api.token);
						if (txDateFrom)
							url +=
								'&date_from=' + encodeURIComponent(txDateFrom);
						if (txDateTo)
							url += '&date_to=' + encodeURIComponent(txDateTo);
						if (txCurrency)
							url +=
								'&currency=' + encodeURIComponent(txCurrency);
						if (txType)
							url += '&type=' + encodeURIComponent(txType);
						window.open(url, '_blank');
					});
					var selType = document.createElement('select');
					var selStatus = document.createElement('select');
					var selCurrency = document.createElement('select');
					(function () {
						var opt = document.createElement('option');
						opt.value = '';
						opt.textContent = t('allOption');
						selCurrency.appendChild(opt);
						api.get('/currency')
							.then(function (res) {
								var curs =
									res && res.data && res.data.currencies
										? res.data.currencies
										: [];
								curs.forEach(function (c) {
									var o = document.createElement('option');
									o.value = c.code;
									o.textContent = c.code;
									selCurrency.appendChild(o);
								});
							})
							.catch(function () {});
					})();
					var inpFrom = document.createElement('input');
					var inpTo = document.createElement('input');
					inpFrom.type = 'text';
					inpTo.type = 'text';
					inpFrom.placeholder = 'YYYY-MM-DD';
					inpTo.placeholder = 'YYYY-MM-DD';
					inpFrom.readOnly = true;
					inpTo.readOnly = true;
					setTimeout(function () {
						initFlatpickr(inpFrom, inpTo, cfg.lang, onFlt);
					}, 0);
					[
						['', t('allOption')],
						['deposit', t('txType_deposit')],
						['withdrawal', t('txType_withdrawal')],
						['transfer', t('txType_transfer')],
						['fee', t('txType_fee')],
						['refund', t('txType_refund')],
						['bonus', t('txType_bonus')],
						['adjustment', t('txType_adjustment')],
						['service_fee', t('txType_service_fee')],
					].forEach(function (o) {
						var e = document.createElement('option');
						e.value = o[0];
						e.textContent = o[1];
						selType.appendChild(e);
					});
					[
						['', t('allOption')],
						['pending', t('txSt_pending')],
						['completed', t('txSt_completed')],
						['failed', t('txSt_failed')],
						['cancelled', t('txSt_cancelled')],
					].forEach(function (o) {
						var e = document.createElement('option');
						e.value = o[0];
						e.textContent = o[1];
						selStatus.appendChild(e);
					});
					var dateRe = /^\d{4}-\d{2}-\d{2}$/;
					function onFlt() {
						txType = selType.value;
						txStatus = selStatus.value;
						txCurrency = selCurrency.value;
						txDateFrom =
							inpFrom.value && dateRe.test(inpFrom.value)
								? inpFrom.value
								: '';
						txDateTo =
							inpTo.value && dateRe.test(inpTo.value)
								? inpTo.value
								: '';
						txPage = 1;
						loadTx();
					}
					selType.addEventListener('change', onFlt);
					selStatus.addEventListener('change', onFlt);
					selCurrency.addEventListener('change', onFlt);
					var rstBtn = h(
						'button',
						{ className: 'smlv-btn smlv-btn-sm smlv-fltr-rst' },
						t('filterReset'),
					);
					rstBtn.addEventListener('click', function () {
						selType.value = '';
						selStatus.value = '';
						selCurrency.value = '';
						if (inpFrom._fp) {
							inpFrom._fp.clear(false);
						} else {
							inpFrom.value = '';
						}
						if (inpTo._fp) {
							inpTo._fp.clear(false);
						} else {
							inpTo.value = '';
						}
						txType = '';
						txStatus = '';
						txCurrency = '';
						txDateFrom = '';
						txDateTo = '';
						txPage = 1;
						loadTx();
					});
					panel.appendChild(
						h('div', { className: 'smlv-fltr' }, [
							h('label', {}, [t('filterType'), selType]),
							h('label', {}, [t('filterStatus'), selStatus]),
							h('label', {}, [t('filterCurrency'), selCurrency]),
							h('label', {}, [t('filterDateFrom'), inpFrom]),
							h('label', {}, [t('filterDateTo'), inpTo]),
							rstBtn,
							stmtBtn,
						]),
					);
					var listEl = document.createElement('div');
					panel.appendChild(listEl);
					var txSeq = 0;

					function loadTx() {
						var seq = ++txSeq;
						listEl.innerHTML = '';
						listEl.appendChild(spinner());
						var params = {
							page: txPage,
							per_page: perPage,
							sort: txSort,
							direction: txDir,
						};
						if (txType) params.type = txType;
						if (txStatus) params.status = txStatus;
						if (txDateFrom) params.date_from = txDateFrom;
						if (txDateTo) params.date_to = txDateTo;
						if (txCurrency) params.currency = txCurrency;
						api.get('/transaction', params)
							.then(function (res) {
								if (seq !== txSeq) return;
								var s = listEl.querySelector('.smlv-spin-wrap');
								if (s) s.remove();
								var items =
									res.data && res.data.items
										? res.data.items
										: [];
								txTotal =
									res.data && res.data.total
										? res.data.total
										: items.length;
								var pages = Math.ceil(txTotal / perPage);

								if (!items.length) {
									listEl.appendChild(
										h(
											'p',
											{
												style: 'color:var(--smlv-muted);font-size:14px',
											},
											t('noTransactions'),
										),
									);
									return;
								}

								var theadRow = h(
									'tr',
									{},
									COLS.map(function (col) {
										var isActive = col.key === txSort;
										var ind = col.key
											? isActive
												? txDir === 'asc'
													? ' \u25b2'
													: ' \u25bc'
												: ' \u25bd'
											: '';
										var st = col.key
											? 'cursor:pointer;user-select:none' +
												(isActive
													? ';color:var(--smlv-accent)'
													: '')
											: '';
										var th = h(
											'th',
											{ style: st },
											col.label + ind,
										);
										if (col.key) {
											th.addEventListener(
												'click',
												(function (k) {
													return function () {
														if (txSort === k) {
															txDir =
																txDir === 'asc'
																	? 'desc'
																	: 'asc';
														} else {
															txSort = k;
															txDir = 'desc';
														}
														txPage = 1;
														loadTx();
													};
												})(col.key),
											);
										}
										return th;
									}),
								);

								var tbody = h(
									'tbody',
									{},
									items.map(function (tx) {
										var moPrintTd;
										if (
											tx.direction === 'credit' &&
											tx.reference
										) {
											var moBtn = h(
												'button',
												{
													className:
														'smlv-btn smlv-btn-sm',
													style: 'white-space:nowrap',
												},
												t('printInvoice'),
											);
											moBtn.addEventListener(
												'click',
												(function (ref) {
													return function () {
														window.open(
															api.base +
																'/v1/widget/transaction/' +
																encodeURIComponent(
																	ref,
																) +
																'/invoice?widget_token=' +
																encodeURIComponent(
																	api.token,
																),
															'_blank',
														);
													};
												})(tx.reference),
											);
											moPrintTd = h('td', {}, moBtn);
										} else {
											moPrintTd = h(
												'td',
												{
													style: 'color:var(--smlv-muted)',
												},
												'—',
											);
										}
										return h('tr', {}, [
											h('td', {}, fmtDate(tx.created_at)),
											h(
												'td',
												{},
												tx.type
													? (function (k) {
															var tr = t(
																'txType_' + k,
															);
															return tr ===
																'txType_' + k
																? k
																		.charAt(
																			0,
																		)
																		.toUpperCase() +
																		k.slice(
																			1,
																		)
																: tr;
														})(tx.type)
													: '\u2014',
											),
											h('td', {}, amtEl(tx.amount)),
											h(
												'td',
												{
													style: 'color:var(--smlv-muted)',
												},
												tx.fee != null && tx.fee > 0
													? fmtBal(tx.fee)
													: '\u2014',
											),
											h(
												'td',
												{},
												(
													tx.currency || ''
												).toUpperCase(),
											),
											h('td', {}, badge(tx.status)),
											moPrintTd,
										]);
									}),
								);

								var moTotalAmt = items.reduce(function (s, tx) {
									return s + (tx.amount || 0);
								}, 0);
								var moTotalFee = items.reduce(function (s, tx) {
									return s + (tx.fee || 0);
								}, 0);
								var moTfoot = h('tfoot', {}, [
									h(
										'tr',
										{
											style: 'border-top:2px solid var(--smlv-border);font-weight:700;font-size:12px;',
										},
										[
											h(
												'td',
												{
													colSpan: 2,
													style: 'text-align:right;padding-right:8px;color:var(--smlv-muted);',
												},
												t('colTotal'),
											),
											h('td', {}, amtEl(moTotalAmt)),
											h(
												'td',
												{
													style: 'color:var(--smlv-muted);',
												},
												moTotalFee > 0
													? fmtBal(moTotalFee)
													: '\u2014',
											),
											h('td'),
											h('td'),
											h('td'),
										],
									),
								]);

								listEl.appendChild(
									h('div', { className: 'smlv-tbl-wrap' }, [
										h('table', { className: 'smlv-tbl' }, [
											h('thead', {}, theadRow),
											tbody,
											moTfoot,
										]),
									]),
								);

								if (pages > 1) {
									var prev = h(
										'button',
										{ className: 'smlv-btn smlv-btn-sm' },
										t('prevPage'),
									);
									var next = h(
										'button',
										{ className: 'smlv-btn smlv-btn-sm' },
										t('nextPage'),
									);
									prev.disabled = txPage <= 1;
									next.disabled = txPage >= pages;
									prev.addEventListener('click', function () {
										txPage--;
										loadTx();
									});
									next.addEventListener('click', function () {
										txPage++;
										loadTx();
									});
									listEl.appendChild(
										h('div', { className: 'smlv-pgn' }, [
											prev,
											h(
												'span',
												{ style: 'line-height:2' },
												t('pageOf', {
													page: txPage,
													total: pages,
												}),
											),
											next,
										]),
									);
								}
							})
							.catch(function (e) {
								var s = listEl.querySelector('.smlv-spin-wrap');
								if (s) s.remove();
								listEl.appendChild(alertBox('err', e.message));
								cb.onError && cb.onError(e);
							});
					}
					loadTx();
				} /* end renderMoTxPanel */
			}

			function renderSetupPrompt() {
				card.innerHTML = '';
				card.appendChild(mkHeader(t('smlvBalance')));
				card.appendChild(alertBox('info', t('setupPrompt')));
				var createBtn = h(
					'button',
					{ className: 'smlv-btn' },
					t('createSmlvAccount'),
				);
				card.appendChild(createBtn);

				createBtn.addEventListener('click', function () {
					// Always show the create form pre-filled with subscriber data.
					// The user must review and explicitly submit -- never auto-create.
					renderCreateForm(
						card,
						api,
						cfg.prefill || {},
						cb,
						function (acc) {
							renderTabs(acc || {});
						},
						cfg.lang,
					);
				});
			}

			/* -- Has SMLV account: 4-tab dashboard ------------------------------ */
			function renderTabs(acc) {
				card.innerHTML = '';
				card.appendChild(mkHeader(t('smlvBalance')));

				var tabs = mkTabs(
					[
						t('smlvBalance'),
						t('transactions'),
						t('overview'),
						t('dangerZone'),
					],
					[
						renderBalancePanel,
						renderTxPanel,
						renderOverviewPanel,
						renderDangerPanel,
					],
				);
				card.appendChild(tabs.tabBar);
				tabs.panels.forEach(function (p) {
					card.appendChild(p);
				});

				/* - Tab 1: SMLV Balance - */
				function renderBalancePanel(panel) {
					var syncBtn = h(
						'button',
						{ className: 'smlv-btn smlv-btn-sm' },
						t('sync'),
					);
					var btnRow = h(
						'div',
						{
							className: 'smlv-btn-row',
							style: 'margin-bottom:12px',
						},
						[syncBtn],
					);
					if (cfg.depositUrl) {
						var depositBtn = h(
							'button',
							{ className: 'smlv-btn smlv-btn-sm smlv-btn-ok' },
							t('deposit'),
						);
						depositBtn.addEventListener('click', function () {
							window.location.href = cfg.depositUrl;
						});
						btnRow.appendChild(depositBtn);
					}
					if (cfg.allowWithdraw) {
						var withdrawBtn = h(
							'button',
							{
								className:
									'smlv-btn smlv-btn-sm smlv-btn-danger',
							},
							t('withdraw'),
						);
						btnRow.appendChild(withdrawBtn);
					}
					panel.appendChild(btnRow);
					if (cfg.allowWithdraw) {
						var withdrawModal = h('div', {
							className: 'smlv-confirm smlv-withdraw-modal',
							style: 'display:none;margin-top:0',
						});
						withdrawModal.appendChild(
							h('p', {}, h('strong', {}, t('withdrawTitle'))),
						);
						var amountInp = h('input', {
							className: 'smlv-input',
							type: 'number',
							min: '0.01',
							step: '0.01',
							placeholder: '0.00',
						});
						var ibanInp = h('input', {
							className: 'smlv-input',
							type: 'text',
							placeholder: 'LV00BANK0000000000000',
						});
						var bicInp = h('input', {
							className: 'smlv-input',
							type: 'text',
							placeholder: 'XXXXXX',
						});
						var benefInp = h('input', {
							className: 'smlv-input',
							type: 'text',
						});
						withdrawModal.appendChild(
							h('div', { className: 'smlv-field' }, [
								h(
									'label',
									{ className: 'smlv-label' },
									t('withdrawAmount'),
								),
								amountInp,
							]),
						);
						withdrawModal.appendChild(
							h('div', { className: 'smlv-field' }, [
								h(
									'label',
									{ className: 'smlv-label' },
									t('ibanLabel'),
								),
								ibanInp,
							]),
						);
						withdrawModal.appendChild(
							h('div', { className: 'smlv-field' }, [
								h(
									'label',
									{ className: 'smlv-label' },
									t('bicLabel'),
								),
								bicInp,
							]),
						);
						withdrawModal.appendChild(
							h('div', { className: 'smlv-field' }, [
								h(
									'label',
									{ className: 'smlv-label' },
									t('beneficiaryLabel'),
								),
								benefInp,
							]),
						);
						if (cfg.withdrawPrefill) {
							if (cfg.withdrawPrefill.iban)
								ibanInp.value = cfg.withdrawPrefill.iban;
							if (cfg.withdrawPrefill.bic)
								bicInp.value = cfg.withdrawPrefill.bic;
							if (cfg.withdrawPrefill.beneficiary_name)
								benefInp.value =
									cfg.withdrawPrefill.beneficiary_name;
						}
						var wErrBox = h('div', {});
						withdrawModal.appendChild(wErrBox);
						var submitWithdrawBtn = h(
							'button',
							{
								className: 'smlv-btn smlv-btn-danger',
								style: 'width:auto;padding:8px 16px',
							},
							t('withdrawSubmit'),
						);
						var cancelWithdrawBtn = h(
							'button',
							{
								className: 'smlv-btn smlv-btn-ghost',
								style: 'width:auto;padding:8px 16px',
							},
							t('cancel'),
						);
						withdrawModal.appendChild(
							h('div', { className: 'smlv-form-actions' }, [
								cancelWithdrawBtn,
								submitWithdrawBtn,
							]),
						);
						cancelWithdrawBtn.addEventListener(
							'click',
							function () {
								withdrawModal.style.display = 'none';
							},
						);
						submitWithdrawBtn.addEventListener(
							'click',
							function () {
								var amount = parseFloat(amountInp.value);
								var iban = ibanInp.value.trim().toUpperCase();
								var bic = bicInp.value.trim().toUpperCase();
								var beneficiary = benefInp.value.trim();
								wErrBox.innerHTML = '';
								if (!amount || amount <= 0) {
									wErrBox.appendChild(
										alertBox(
											'err',
											t('withdrawAmount') +
												' is required',
										),
									);
									return;
								}
								if (!iban) {
									wErrBox.appendChild(
										alertBox(
											'err',
											t('ibanLabel') + ' is required',
										),
									);
									return;
								}
								if (!bic) {
									wErrBox.appendChild(
										alertBox(
											'err',
											t('bicLabel') + ' is required',
										),
									);
									return;
								}
								if (!beneficiary) {
									wErrBox.appendChild(
										alertBox(
											'err',
											t('beneficiaryLabel') +
												' is required',
										),
									);
									return;
								}
								submitWithdrawBtn.disabled = true;
								submitWithdrawBtn.textContent =
									t('withdrawProcessing');
								api.post('/withdraw', {
									amount: amount,
									iban: iban,
									bic: bic,
									beneficiary_name: beneficiary,
								})
									.then(function (r) {
										withdrawModal.innerHTML = '';
										withdrawModal.appendChild(
											alertBox(
												'ok',
												t('withdrawSuccess'),
											),
										);
										var doneBtn = h(
											'button',
											{
												className:
													'smlv-btn smlv-btn-sm',
												style: 'margin-top:10px;width:auto;padding:8px 16px',
											},
											t('cancel'),
										);
										doneBtn.addEventListener(
											'click',
											function () {
												withdrawModal.style.display =
													'none';
												api.get('/balance')
													.then(renderBalances)
													.catch(function () {});
											},
										);
										withdrawModal.appendChild(doneBtn);
										cb.onSuccess &&
											cb.onSuccess({
												event: 'withdraw',
												data: r.data,
											});
									})
									.catch(function (e) {
										wErrBox.innerHTML = '';
										wErrBox.appendChild(
											alertBox('err', e.message),
										);
										submitWithdrawBtn.disabled = false;
										submitWithdrawBtn.textContent =
											t('withdrawSubmit');
										cb.onError && cb.onError(e);
									});
							},
						);
						withdrawBtn.addEventListener('click', function () {
							wErrBox.innerHTML = '';
							submitWithdrawBtn.disabled = false;
							submitWithdrawBtn.textContent = t('withdrawSubmit');
							withdrawModal.style.display =
								withdrawModal.style.display === 'none'
									? 'block'
									: 'none';
						});
						panel.appendChild(withdrawModal);
					}
					panel.appendChild(spinner());

					function renderBalances(res) {
						var s = panel.querySelector('.smlv-spin-wrap');
						if (s) s.remove();
						panel.querySelector('.smlv-bal-grid') &&
							panel.querySelector('.smlv-bal-grid').remove();
						panel.querySelector('.smlv-ts') &&
							panel.querySelector('.smlv-ts').remove();
						panel.querySelector('.smlv-alert') &&
							panel.querySelector('.smlv-alert').remove();

						var balances =
							res.data && res.data.balances
								? res.data.balances
								: [];
						if (!balances.length) {
							panel.appendChild(
								h(
									'p',
									{
										style: 'color:var(--smlv-muted);font-size:14px',
									},
									t('noBalance'),
								),
							);
						} else {
							var grid = h('div', { className: 'smlv-bal-grid' });
							balances.forEach(function (b) {
								grid.appendChild(
									h('div', { className: 'smlv-bal-card' }, [
										h(
											'div',
											{ className: 'smlv-bal-cur' },
											(b.currency || '').toUpperCase(),
										),
										h(
											'div',
											{ className: 'smlv-bal-amt' },
											fmtBal(b.amount),
										),
									]),
								);
							});
							panel.appendChild(grid);
						}
						if (res.data && res.data.updated_at) {
							panel.appendChild(
								h(
									'p',
									{ className: 'smlv-ts' },
									t('updatedAt') +
										fmtDate(res.data.updated_at),
								),
							);
						}
						syncBtn.disabled = false;
						syncBtn.textContent = t('sync');
					}

					syncBtn.addEventListener('click', function () {
						syncBtn.disabled = true;
						syncBtn.textContent = t('syncing');
						panel.appendChild(spinner());
						api.post('/balance/sync')
							.then(renderBalances)
							.catch(function (e) {
								var s = panel.querySelector('.smlv-spin-wrap');
								if (s) s.remove();
								panel.appendChild(alertBox('err', e.message));
								syncBtn.disabled = false;
								syncBtn.textContent = t('sync');
								cb.onError && cb.onError(e);
							});
					});

					api.get('/balance')
						.then(renderBalances)
						.catch(function (e) {
							var s = panel.querySelector('.smlv-spin-wrap');
							if (s) s.remove();
							panel.appendChild(alertBox('err', e.message));
							syncBtn.disabled = false;
							syncBtn.textContent = t('sync');
							cb.onError && cb.onError(e);
						});
				}

				/* - Tab 2: Transactions - */
				function renderTxPanel(panel) {
					var txPage = 1;
					var txSort = 'created_at';
					var txDir = 'desc';
					var txTotal = 0;
					var txType = '';
					var txStatus = '';
					var txDateFrom = '';
					var txDateTo = '';
					var txCurrency = '';

					var COLS = [
						{ key: 'created_at', label: t('colDate') },
						{ key: 'type', label: t('colType') },
						{ key: 'amount', label: t('colAmount') },
						{ key: 'fee', label: t('colFee') },
						{ key: 'currency', label: t('colCurrency') },
						{ key: 'status', label: t('colStatus') },
						{ key: '', label: t('colInvoice') },
					];

					// Filter bar
					var stmtBtn = h(
						'button',
						{
							className: 'smlv-btn smlv-btn-sm',
							style: 'white-space:nowrap',
						},
						t('printStatement'),
					);
					stmtBtn.addEventListener('click', function () {
						var url =
							api.base +
							'/v1/widget/transactions/statement?widget_token=' +
							encodeURIComponent(api.token);
						if (txDateFrom)
							url +=
								'&date_from=' + encodeURIComponent(txDateFrom);
						if (txDateTo)
							url += '&date_to=' + encodeURIComponent(txDateTo);
						if (txCurrency)
							url +=
								'&currency=' + encodeURIComponent(txCurrency);
						if (txType)
							url += '&type=' + encodeURIComponent(txType);
						window.open(url, '_blank');
					});
					var selType = document.createElement('select');
					var selStatus = document.createElement('select');
					var selCurrency = document.createElement('select');
					(function () {
						var opt = document.createElement('option');
						opt.value = '';
						opt.textContent = t('allOption');
						selCurrency.appendChild(opt);
						api.get('/currency')
							.then(function (res) {
								var curs =
									res && res.data && res.data.currencies
										? res.data.currencies
										: [];
								curs.forEach(function (c) {
									var o = document.createElement('option');
									o.value = c.code;
									o.textContent = c.code;
									selCurrency.appendChild(o);
								});
							})
							.catch(function () {});
					})();
					var inpFrom = document.createElement('input');
					var inpTo = document.createElement('input');
					inpFrom.type = 'text';
					inpTo.type = 'text';
					inpFrom.placeholder = 'YYYY-MM-DD';
					inpTo.placeholder = 'YYYY-MM-DD';
					inpFrom.readOnly = true;
					inpTo.readOnly = true;
					setTimeout(function () {
						initFlatpickr(inpFrom, inpTo, cfg.lang, onFlt);
					}, 0);
					[
						['', t('allOption')],
						['deposit', t('txType_deposit')],
						['withdrawal', t('txType_withdrawal')],
						['transfer', t('txType_transfer')],
						['fee', t('txType_fee')],
						['refund', t('txType_refund')],
						['bonus', t('txType_bonus')],
						['adjustment', t('txType_adjustment')],
						['service_fee', t('txType_service_fee')],
					].forEach(function (o) {
						var e = document.createElement('option');
						e.value = o[0];
						e.textContent = o[1];
						selType.appendChild(e);
					});
					[
						['', t('allOption')],
						['pending', t('txSt_pending')],
						['completed', t('txSt_completed')],
						['failed', t('txSt_failed')],
						['cancelled', t('txSt_cancelled')],
					].forEach(function (o) {
						var e = document.createElement('option');
						e.value = o[0];
						e.textContent = o[1];
						selStatus.appendChild(e);
					});
					var dateRe = /^\d{4}-\d{2}-\d{2}$/;
					function onFlt() {
						txType = selType.value;
						txStatus = selStatus.value;
						txCurrency = selCurrency.value;
						txDateFrom =
							inpFrom.value && dateRe.test(inpFrom.value)
								? inpFrom.value
								: '';
						txDateTo =
							inpTo.value && dateRe.test(inpTo.value)
								? inpTo.value
								: '';
						txPage = 1;
						loadTx();
					}
					selType.addEventListener('change', onFlt);
					selStatus.addEventListener('change', onFlt);
					selCurrency.addEventListener('change', onFlt);
					var rstBtn = h(
						'button',
						{ className: 'smlv-btn smlv-btn-sm smlv-fltr-rst' },
						t('filterReset'),
					);
					rstBtn.addEventListener('click', function () {
						selType.value = '';
						selStatus.value = '';
						selCurrency.value = '';
						if (inpFrom._fp) {
							inpFrom._fp.clear(false);
						} else {
							inpFrom.value = '';
						}
						if (inpTo._fp) {
							inpTo._fp.clear(false);
						} else {
							inpTo.value = '';
						}
						txType = '';
						txStatus = '';
						txCurrency = '';
						txDateFrom = '';
						txDateTo = '';
						txPage = 1;
						loadTx();
					});
					panel.appendChild(
						h('div', { className: 'smlv-fltr' }, [
							h('label', {}, [t('filterType'), selType]),
							h('label', {}, [t('filterStatus'), selStatus]),
							h('label', {}, [t('filterCurrency'), selCurrency]),
							h('label', {}, [t('filterDateFrom'), inpFrom]),
							h('label', {}, [t('filterDateTo'), inpTo]),
							rstBtn,
							stmtBtn,
						]),
					);
					var listEl = document.createElement('div');
					panel.appendChild(listEl);
					var txSeq = 0;

					function loadTx() {
						var seq = ++txSeq;
						listEl.innerHTML = '';
						listEl.appendChild(spinner());
						var params = {
							page: txPage,
							per_page: perPage,
							sort: txSort,
							direction: txDir,
						};
						if (txType) params.type = txType;
						if (txStatus) params.status = txStatus;
						if (txDateFrom) params.date_from = txDateFrom;
						if (txDateTo) params.date_to = txDateTo;
						if (txCurrency) params.currency = txCurrency;
						api.get('/transaction', params)
							.then(function (res) {
								if (seq !== txSeq) return;
								var s = listEl.querySelector('.smlv-spin-wrap');
								if (s) s.remove();
								var items =
									res.data && res.data.items
										? res.data.items
										: [];
								txTotal =
									res.data && res.data.total
										? res.data.total
										: items.length;
								var pages = Math.ceil(txTotal / perPage);

								if (!items.length) {
									listEl.appendChild(
										h(
											'p',
											{
												style: 'color:var(--smlv-muted);font-size:14px',
											},
											t('noTransactions'),
										),
									);
									return;
								}

								var theadRow = h(
									'tr',
									{},
									COLS.map(function (col) {
										var isActive = col.key === txSort;
										var ind = col.key
											? isActive
												? txDir === 'asc'
													? ' \u25b2'
													: ' \u25bc'
												: ' \u25bd'
											: '';
										var st = col.key
											? 'cursor:pointer;user-select:none' +
												(isActive
													? ';color:var(--smlv-accent)'
													: '')
											: '';
										var th = h(
											'th',
											{ style: st },
											col.label + ind,
										);
										if (col.key) {
											th.addEventListener(
												'click',
												(function (k) {
													return function () {
														if (txSort === k) {
															txDir =
																txDir === 'asc'
																	? 'desc'
																	: 'asc';
														} else {
															txSort = k;
															txDir = 'desc';
														}
														txPage = 1;
														loadTx();
													};
												})(col.key),
											);
										}
										return th;
									}),
								);

								var tbody = h(
									'tbody',
									{},
									items.map(function (tx) {
										var rtPrintTd;
										if (
											tx.direction === 'credit' &&
											tx.reference
										) {
											var rtBtn = h(
												'button',
												{
													className:
														'smlv-btn smlv-btn-sm',
													style: 'white-space:nowrap',
												},
												t('printInvoice'),
											);
											rtBtn.addEventListener(
												'click',
												(function (ref) {
													return function () {
														window.open(
															api.base +
																'/v1/widget/transaction/' +
																encodeURIComponent(
																	ref,
																) +
																'/invoice?widget_token=' +
																encodeURIComponent(
																	api.token,
																),
															'_blank',
														);
													};
												})(tx.reference),
											);
											rtPrintTd = h('td', {}, rtBtn);
										} else {
											rtPrintTd = h(
												'td',
												{
													style: 'color:var(--smlv-muted)',
												},
												'—',
											);
										}
										return h('tr', {}, [
											h('td', {}, fmtDate(tx.created_at)),
											h(
												'td',
												{},
												tx.type
													? (function (k) {
															var tr = t(
																'txType_' + k,
															);
															return tr ===
																'txType_' + k
																? k
																		.charAt(
																			0,
																		)
																		.toUpperCase() +
																		k.slice(
																			1,
																		)
																: tr;
														})(tx.type)
													: '\u2014',
											),
											h('td', {}, amtEl(tx.amount)),
											h(
												'td',
												{
													style: 'color:var(--smlv-muted)',
												},
												tx.fee != null && tx.fee > 0
													? fmtBal(tx.fee)
													: '\u2014',
											),
											h(
												'td',
												{},
												(
													tx.currency || ''
												).toUpperCase(),
											),
											h('td', {}, badge(tx.status)),
											rtPrintTd,
										]);
									}),
								);

								var rtTotalAmt = items.reduce(function (s, tx) {
									return s + (tx.amount || 0);
								}, 0);
								var rtTotalFee = items.reduce(function (s, tx) {
									return s + (tx.fee || 0);
								}, 0);
								var rtTfoot = h('tfoot', {}, [
									h(
										'tr',
										{
											style: 'border-top:2px solid var(--smlv-border);font-weight:700;font-size:12px;',
										},
										[
											h(
												'td',
												{
													colSpan: 2,
													style: 'text-align:right;padding-right:8px;color:var(--smlv-muted);',
												},
												t('colTotal'),
											),
											h('td', {}, amtEl(rtTotalAmt)),
											h(
												'td',
												{
													style: 'color:var(--smlv-muted);',
												},
												rtTotalFee > 0
													? fmtBal(rtTotalFee)
													: '\u2014',
											),
											h('td'),
											h('td'),
											h('td'),
										],
									),
								]);

								listEl.appendChild(
									h('div', { className: 'smlv-tbl-wrap' }, [
										h('table', { className: 'smlv-tbl' }, [
											h('thead', {}, theadRow),
											tbody,
											rtTfoot,
										]),
									]),
								);

								if (pages > 1) {
									var prev = h(
										'button',
										{ className: 'smlv-btn smlv-btn-sm' },
										t('prevPage'),
									);
									var next = h(
										'button',
										{ className: 'smlv-btn smlv-btn-sm' },
										t('nextPage'),
									);
									prev.disabled = txPage <= 1;
									next.disabled = txPage >= pages;
									prev.addEventListener('click', function () {
										txPage--;
										loadTx();
									});
									next.addEventListener('click', function () {
										txPage++;
										loadTx();
									});
									listEl.appendChild(
										h('div', { className: 'smlv-pgn' }, [
											prev,
											h(
												'span',
												{ style: 'line-height:2' },
												t('pageOf', {
													page: txPage,
													total: pages,
												}),
											),
											next,
										]),
									);
								}
							})
							.catch(function (e) {
								var s = listEl.querySelector('.smlv-spin-wrap');
								if (s) s.remove();
								listEl.appendChild(alertBox('err', e.message));
								cb.onError && cb.onError(e);
							});
					}
					loadTx();
				}

				/* - Tab 3: Overview + push-update button - */
				function renderOverviewPanel(panel) {
					[
						[
							t('reference'),
							acc.reference || acc.account_reference,
						],
						[t('emailField'), acc.email],
						[t('firstNameField'), acc.first_name],
						[t('lastNameField'), acc.last_name],
						[t('typeField'), acc.account_type],
						[t('statusField'), acc.status],
						[
							t('createdField'),
							acc.created_at ? fmtDate(acc.created_at) : null,
						],
					]
						.filter(function (f) {
							return f[1];
						})
						.forEach(function (f) {
							panel.appendChild(
								h('div', { className: 'smlv-row' }, [
									h(
										'span',
										{ className: 'smlv-row-lbl' },
										f[0],
									),
									h(
										'span',
										{ className: 'smlv-row-val' },
										String(f[1]),
									),
								]),
							);
						});

					// "Update" button — pushes eGram subscriber data to SMLV without any form
					var pushData = cfg.prefill || cfg.syncData || {};
					if (Object.keys(pushData).length) {
						var msgBox = h('div', {});
						var updateBtn = h(
							'button',
							{
								className: 'smlv-btn',
								style: 'margin-top:16px',
							},
							t('pushUpdate'),
						);
						updateBtn.addEventListener('click', function () {
							updateBtn.disabled = true;
							updateBtn.textContent = t('pushUpdating');
							msgBox.innerHTML = '';
							api.patch('/account', pushData)
								.then(function (r) {
									acc = r.data || acc;
									msgBox.appendChild(
										alertBox('ok', t('profileSynced')),
									);
									updateBtn.disabled = false;
									updateBtn.textContent = t('pushUpdate');
									cb.onSuccess &&
										cb.onSuccess({
											event: 'account_updated',
											account: acc,
										});
								})
								.catch(function (e) {
									msgBox.appendChild(
										alertBox('err', e.message),
									);
									updateBtn.disabled = false;
									updateBtn.textContent = t('pushUpdate');
									cb.onError && cb.onError(e);
								});
						});
						panel.appendChild(msgBox);
						panel.appendChild(updateBtn);
					}
				}

				/* - Tab 4: Danger Zone - */
				function renderDangerPanel(panel) {
					var isActive =
						acc.status === 'active' || acc.status === 'Active';

					/* Close / Reactivate */
					var closeSection = h('div', { className: 'smlv-danger' });
					closeSection.appendChild(
						h(
							'div',
							{ className: 'smlv-danger-title' },
							isActive
								? t('deactivateTitle')
								: t('reactivateTitle'),
						),
					);
					closeSection.appendChild(
						h(
							'div',
							{ className: 'smlv-danger-desc' },
							isActive
								? t('deactivateDesc')
								: t('reactivateDesc'),
						),
					);
					var closeConfirm = h('div', {
						className: 'smlv-confirm',
						style: 'display:none',
					});
					closeConfirm.appendChild(
						h(
							'p',
							{},
							isActive
								? t('confirmDeactivate')
								: t('confirmReactivate'),
						),
					);
					var closeErrBox = h('div', {});
					closeConfirm.appendChild(closeErrBox);
					var confirmCloseBtn = h(
						'button',
						{
							className:
								'smlv-btn ' +
								(isActive ? 'smlv-btn-danger' : 'smlv-btn-ok'),
							style: 'width:auto;padding:8px 16px',
						},
						isActive ? t('deactivate') : t('reactivate'),
					);
					var cancelCloseBtn = h(
						'button',
						{
							className: 'smlv-btn smlv-btn-ghost',
							style: 'width:auto;padding:8px 16px',
						},
						t('cancel'),
					);
					closeConfirm.appendChild(
						h('div', { className: 'smlv-form-actions' }, [
							cancelCloseBtn,
							confirmCloseBtn,
						]),
					);
					cancelCloseBtn.addEventListener('click', function () {
						closeConfirm.style.display = 'none';
					});
					confirmCloseBtn.addEventListener('click', function () {
						confirmCloseBtn.disabled = true;
						closeErrBox.innerHTML = '';
						var method = isActive
							? api.post('/account/close', {})
							: api.post('/account/reactivate', {});
						method
							.then(function (r) {
								acc = r.data || acc;
								closeConfirm.style.display = 'none';
								renderTabs(acc);
								cb.onSuccess &&
									cb.onSuccess({
										event: isActive
											? 'account_closed'
											: 'account_reactivated',
										account: acc,
									});
							})
							.catch(function (e) {
								closeErrBox.appendChild(
									alertBox('err', e.message),
								);
								confirmCloseBtn.disabled = false;
								cb.onError && cb.onError(e);
							});
					});
					var toggleCloseBtn = h(
						'button',
						{
							className:
								'smlv-btn ' +
								(isActive ? 'smlv-btn-danger' : 'smlv-btn-ok'),
						},
						isActive ? t('deactivateTitle') : t('reactivateTitle'),
					);
					toggleCloseBtn.addEventListener('click', function () {
						closeConfirm.style.display = 'block';
					});
					closeSection.appendChild(toggleCloseBtn);
					closeSection.appendChild(closeConfirm);
					panel.appendChild(closeSection);
					panel.appendChild(h('div', { style: 'height:16px' }));

					/* Delete */
					var delSection = h('div', { className: 'smlv-danger' });
					delSection.appendChild(
						h(
							'div',
							{ className: 'smlv-danger-title' },
							t('deleteTitle'),
						),
					);
					delSection.appendChild(
						h(
							'div',
							{ className: 'smlv-danger-desc' },
							t('deleteDesc'),
						),
					);
					var delConfirm = h('div', {
						className: 'smlv-confirm',
						style: 'display:none',
					});
					delConfirm.appendChild(h('p', {}, t('typeDeleteConfirm')));
					var delInput = h('input', {
						className: 'smlv-input',
						type: 'text',
						placeholder: 'DELETE',
					});
					delConfirm.appendChild(delInput);
					var delErrBox = h('div', {});
					delConfirm.appendChild(delErrBox);
					var confirmDelBtn = h(
						'button',
						{
							className: 'smlv-btn smlv-btn-danger',
							style: 'width:auto;padding:8px 16px',
						},
						t('deleteForever'),
					);
					var cancelDelBtn = h(
						'button',
						{
							className: 'smlv-btn smlv-btn-ghost',
							style: 'width:auto;padding:8px 16px',
						},
						t('cancel'),
					);
					delConfirm.appendChild(
						h('div', { className: 'smlv-form-actions' }, [
							cancelDelBtn,
							confirmDelBtn,
						]),
					);
					cancelDelBtn.addEventListener('click', function () {
						delInput.value = '';
						delConfirm.style.display = 'none';
					});
					confirmDelBtn.addEventListener('click', function () {
						if (delInput.value.trim() !== 'DELETE') {
							delErrBox.innerHTML = '';
							delErrBox.appendChild(
								alertBox('err', t('typeDeleteCaps')),
							);
							return;
						}
						confirmDelBtn.disabled = true;
						delErrBox.innerHTML = '';
						api.del('/account')
							.then(function () {
								card.innerHTML = '';
								card.appendChild(
									alertBox('ok', t('accountDeleted')),
								);
								cb.onSuccess &&
									cb.onSuccess({ event: 'account_deleted' });
							})
							.catch(function (e) {
								delErrBox.appendChild(
									alertBox('err', e.message),
								);
								confirmDelBtn.disabled = false;
								cb.onError && cb.onError(e);
							});
					});
					var showDelBtn = h(
						'button',
						{ className: 'smlv-btn smlv-btn-danger' },
						t('deleteTitle'),
					);
					showDelBtn.addEventListener('click', function () {
						delConfirm.style.display = 'block';
					});
					delSection.appendChild(showDelBtn);
					delSection.appendChild(delConfirm);
					panel.appendChild(delSection);
				}
			}
		},

		/**
		 * Mini inline bar: shows first SMLV balance + Deposit button.
		 * Designed for navbar embedding — single line, no card chrome.
		 * Skips mount()'s resolve flow; calls /balance directly.
		 */
		mini: function (root, api, cfg, cb) {
			var t = mkT(cfg.lang);

			/* Replace the smlv-card wrapper with a minimal inline bar */
			root.innerHTML = '';
			var amtEl = h('span', { className: 'smlv-mini-amt' }, '\u2026');
			var bar = h('div', { className: 'smlv-mini-bar' }, [
				h('span', { className: 'smlv-mini-label' }, 'SMLV'),
				amtEl,
			]);
			root.appendChild(bar);

			api.get('/balance')
				.then(function (res) {
					var balances =
						res.data && res.data.balances ? res.data.balances : [];
					if (balances.length) {
						var b = balances[0];
						amtEl.textContent =
							fmtBal(b.amount) +
							'\u00a0' +
							(b.currency || 'SMLV').toUpperCase();
					} else {
						amtEl.textContent = '0.00000000\u00a0SMLV';
					}
					if (cfg.depositUrl) {
						var depBtn = h(
							'button',
							{
								className:
									'smlv-btn smlv-btn-sm smlv-btn-ok smlv-mini-dep',
							},
							t('deposit') || 'Deposit',
						);
						depBtn.addEventListener('click', function () {
							window.location.href = cfg.depositUrl;
						});
						bar.appendChild(depBtn);
					}
					cb.onReady && cb.onReady();
				})
				.catch(function (e) {
					amtEl.textContent = '—';
					cb.onError && cb.onError(e);
				});
		},
	};
	Renderers.account.skipResolve = true;
	Renderers.mini.skipResolve = true;

	// --- Widget instance ---------------------------------------------------------

	function WidgetInstance(config) {
		this.config = config;
		this.el = null;
		this.destroyed = false;
	}

	WidgetInstance.prototype.mount = function () {
		var cfg = this.config;
		_widgetLang = cfg.lang || 'en';

		/* Resolve container */
		var el =
			typeof cfg.container === 'string'
				? document.querySelector(cfg.container)
				: cfg.container;

		if (!el) {
			console.error('[SmlvWidget] container not found:', cfg.container);
			return this;
		}
		if (!cfg.token) {
			console.error('[SmlvWidget] token is required');
			return this;
		}

		var type = cfg.type || 'deposit';
		var theme = cfg.theme || 'light';

		/* Stamp the root */
		el.setAttribute('data-smlv', type);
		el.setAttribute('data-theme', theme);
		el.setAttribute('lang', cfg.lang || 'en');
		el.innerHTML = '<div class="smlv-card"></div>';
		this.el = el;

		var api = new SmlvApi(cfg.apiUrl, cfg.token, cfg.xdebug, cfg.lang);
		var cb = {
			onReady: cfg.onReady || null,
			onSuccess: cfg.onSuccess || null,
			onError: cfg.onError || null,
			onClose: cfg.onClose || null,
		};

		var renderer = Renderers[type];
		if (!renderer) {
			el.querySelector('.smlv-card').appendChild(
				alertBox('err', 'Unknown widget type: ' + type),
			);
			return this;
		}

		var card = el.querySelector('.smlv-card');

		// Renderers that handle account resolution internally skip mount()'s resolve flow.
		if (renderer.skipResolve) {
			renderer(el, api, cfg, cb);
			return this;
		}

		// -- Step 1: Resolve / auto-create account ----------------------------
		// POST /v1/widget/account/resolve
		// Server decodes JWT:
		//   ? If JWT has account_reference > skip creation, return account
		//   ? If JWT has external_user_id  > find or signal needs_setup
		//   Response variants:
		//     { success:true, data:{ account:{...} } }
		//     { success:false, code:'ACCOUNT_NOT_FOUND',
		//       prefill:{ email, first_name, last_name, account_type } }

		card.appendChild(spinner());

		resolveAccount(api)
			.then(function (res) {
				var s = card.querySelector('.smlv-spin-wrap');
				if (s) s.remove();
				// Account found ? proceed to requested renderer
				renderer(el, api, cfg, cb);
			})
			.catch(function (e) {
				var s = card.querySelector('.smlv-spin-wrap');
				if (s) s.remove();

				if (e.code === 404) {
					// Account doesn't exist ? show create-account form
					// Pre-fill data can come from JWT (forwarded via cfg.prefill) or API response
					var prefill = cfg.prefill || {};
					renderCreateForm(
						card,
						api,
						prefill,
						cb,
						function (/*account*/) {
							// After creation ? render the originally requested widget
							card.innerHTML = '';
							renderer(el, api, cfg, cb);
						},
					);
				} else {
					card.appendChild(alertBox('err', e.message));
					cb.onError && cb.onError(e);
				}
			});

		return this;
	};

	WidgetInstance.prototype.destroy = function () {
		if (this.el) {
			this.el.innerHTML = '';
			this.el.removeAttribute('data-smlv');
			this.el.removeAttribute('data-theme');
			this.el = null;
		}
		this.destroyed = true;
		return this;
	};

	// --- CSS injection -----------------------------------------------------------

	function injectStyles() {
		if (document.getElementById(STYLE_ID)) return;
		var style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = CSS;
		document.head.appendChild(style);
	}

	// --- Public API --------------------------------------------------------------

	var instances = [];

	var SmlvWidget = {
		version: VERSION,

		/**
		 * Initialize a widget.
		 *
		 * The widget automatically calls POST /v1/widget/account/resolve on mount.
		 * If the account does not exist yet (JWT contains external_user_id), a
		 * create-account form is shown; after creation the requested widget type
		 * is rendered. This means SaaS developers never need to build account
		 * management UI themselves.
		 *
		 * @param {object} config
		 * @param {string|Element} config.container   CSS selector or DOM element
		 * @param {string}         config.token        Short-lived JWT from your server
		 *   JWT may contain either:
		 *     - external_user_id + email  (user-based, auto resolves account)
		 *     - account_reference         (direct, skips resolve step)
		 * @param {string}         [config.type]       'deposit'|'balance'|'transactions'|'management'
		 * @param {string}         [config.theme]      'light'|'dark'
		 * @param {string}         [config.lang]       BCP-47, e.g. 'en', 'ru'
		 * @param {string}         [config.apiUrl]     Override API base URL
		 * @param {string}         [config.returnUrl]  Redirect after success (deposit)
		 * @param {string}         [config.depositUrl] URL of SMLV deposit page (shows Deposit button in balance panel)
		 * @param {number}         [config.perPage]    Rows per page (transactions)
		 * @param {object}         [config.prefill]    Pre-fill create-account form
		 * @param {string}         [config.prefill.first_name]
		 * @param {string}         [config.prefill.last_name]
		 * @param {string}         [config.prefill.account_type]  'natural'|'legal'
		 * @param {Function}       [config.onReady]    Widget rendered successfully
		 * @param {Function}       [config.onSuccess]  Action completed — receives { event, ... }
		 *   Events: 'account_created' | 'account_updated' | 'account_closed' |
		 *           'account_reactivated' | 'account_deleted' | (deposit confirmation)
		 * @param {Function}       [config.onError]    Error — receives Error object
		 * @param {Function}       [config.onClose]    Widget dismissed by user
		 * @returns {WidgetInstance}
		 */
		init: function (config) {
			injectStyles();
			var inst = new WidgetInstance(config);
			instances.push(inst);
			inst.mount();
			return inst;
		},

		/** Destroy a specific instance returned by init() */
		destroy: function (inst) {
			if (inst instanceof WidgetInstance) {
				inst.destroy();
				instances = instances.filter(function (i) {
					return i !== inst;
				});
			}
		},

		/** Destroy all mounted widgets */
		destroyAll: function () {
			instances.forEach(function (i) {
				i.destroy();
			});
			instances = [];
		},
	};

	// --- Async queue -------------------------------------------------------------
	//
	// Developers can queue configs before the script loads:
	//   window._smlvQueue = window._smlvQueue || [];
	//   window._smlvQueue.push({ container: '#id', token: '...', type: 'deposit' });
	//
	// After load, any push() immediately inits the widget.

	var queue = window._smlvQueue;
	if (Array.isArray(queue)) {
		queue.forEach(function (cfg) {
			SmlvWidget.init(cfg);
		});
	}
	window._smlvQueue = {
		push: function (cfg) {
			SmlvWidget.init(cfg);
		},
	};

	/* Let the host page know the script is ready */
	try {
		document.dispatchEvent(
			new CustomEvent('SmlvWidgetReady', {
				detail: { version: VERSION },
			}),
		);
	} catch (e) {
		/* IE11 fallback ? ignore */
	}

	return SmlvWidget;
});
