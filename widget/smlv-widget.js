/*!
 * SMLV Widget v2.0.0
 * https://cdn.smlv.com/v2/smlv-widget.js
 * (c) SMLV Platform — MIT License
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

	var VERSION = '2.0.0';
	var STYLE_ID = 'smlv-widget-styles';
	var DEFAULT_API_URL = 'https://api.smlvcoin.com';

	// ─── CSS (injected once into <head>) ────────────────────────────────────────

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
		'.smlv-bal-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:16px;}',
		'.smlv-bal-card{background:var(--smlv-bg2);border:1px solid var(--smlv-border);border-radius:var(--smlv-r);padding:14px;}',
		'.smlv-bal-cur{font-size:12px;font-weight:700;color:var(--smlv-muted);text-transform:uppercase;margin-bottom:4px;}',
		'.smlv-bal-amt{font-size:20px;font-weight:800;line-height:1.2;}',
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
	].join('');

	// ─── Lightweight fetch-based API client ─────────────────────────────────────

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

	// ─── DOM helpers ────────────────────────────────────────────────────────────

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
			'Loading…',
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

	function copyToClipboard(text, btn) {
		if (!navigator.clipboard) return;
		navigator.clipboard.writeText(text).then(function () {
			var orig = btn.textContent;
			btn.textContent = 'Copied!';
			setTimeout(function () {
				btn.textContent = orig;
			}, 1600);
		});
	}

	function fmtDate(iso) {
		try {
			return new Date(iso).toLocaleString();
		} catch (e) {
			return iso || '—';
		}
	}

	function fmtAmt(val) {
		var n = parseFloat(val || 0);
		return isNaN(n) ? '0' : n.toFixed(8).replace(/\.?0+$/, '');
	}

	// ─── Account resolution ─────────────────────────────────────────────────────
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

	// ─── Create-account form ─────────────────────────────────────────────────────

	function renderCreateForm(card, api, prefill, cb, onCreated) {
		card.innerHTML = '';
		card.appendChild(mkHeader('Create Account'));
		card.appendChild(
			alertBox('info', 'Set up your SMLV account to get started.'),
		);

		var emailEl = h('input', {
			className: 'smlv-input',
			type: 'email',
			value: prefill.email || '',
			placeholder: 'youremail@example.com',
		});
		var firstEl = h('input', {
			className: 'smlv-input',
			type: 'text',
			value: prefill.first_name || '',
			placeholder: 'First name',
		});
		var lastEl = h('input', {
			className: 'smlv-input',
			type: 'text',
			value: prefill.last_name || '',
			placeholder: 'Last name (optional)',
		});
		var typeEl = h('select', { className: 'smlv-select' }, [
			h('option', { value: 'natural' }, 'Individual (Natural person)'),
			h('option', { value: 'legal' }, 'Company (Legal entity)'),
		]);
		if (prefill.account_type === 'legal') typeEl.value = 'legal';

		[
			['Email *', emailEl],
			['First name *', firstEl],
			['Last name', lastEl],
			['Account type', typeEl],
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
			'Create Account',
		);
		submitBtn.addEventListener('click', function () {
			var email = emailEl.value.trim();
			var first = firstEl.value.trim();
			if (!email || !first) {
				errBox.innerHTML = '';
				errBox.appendChild(
					alertBox('err', 'Email and first name are required.'),
				);
				return;
			}
			submitBtn.disabled = true;
			submitBtn.textContent = 'Creating…';
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
					submitBtn.textContent = 'Create Account';
					cb.onError && cb.onError(e);
				});
		});
		card.appendChild(submitBtn);
	}

	// ─── Tab helper ──────────────────────────────────────────────────────────────

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

	// ─── Widget header ───────────────────────────────────────────────────────────

	function mkHeader(title, rightEl) {
		return h('div', { className: 'smlv-hdr' }, [
			h('h3', { className: 'smlv-title' }, title),
			rightEl || h('span', { className: 'smlv-brand' }, 'SMLV'),
		]);
	}

	// ─── Renderers (one per widget type) ────────────────────────────────────────

	var Renderers = {
		/**
		 * Deposit: currency picker → get wallet address → copy address
		 */
		deposit: function (root, api, cfg, cb) {
			var card = root.querySelector('.smlv-card');
			var selectedCurrency = null;
			var walletData = null;

			function setLoading(el) {
				el.innerHTML = '';
				el.appendChild(spinner());
			}

			function initialLoad() {
				setLoading(card);
				api.get('/deposit/info')
					.then(function (res) {
						var info = res.data || {};
						var currencies = info.currencies || [];
						selectedCurrency = currencies[0] || 'BTC';
						renderForm(info, currencies);
						cb.onReady && cb.onReady();
					})
					.catch(function (e) {
						card.innerHTML = '';
						card.appendChild(alertBox('err', e.message));
						cb.onError && cb.onError(e);
					});
			}

			function renderForm(info, currencies) {
				card.innerHTML = '';
				card.appendChild(mkHeader('Deposit'));

				/* Currency selector */
				var sel = h(
					'select',
					{ className: 'smlv-select' },
					currencies.map(function (c) {
						var o = h('option', { value: c }, c.toUpperCase());
						if (c === selectedCurrency) o.selected = true;
						return o;
					}),
				);
				sel.addEventListener('change', function () {
					selectedCurrency = sel.value;
					walletData = null;
					renderWalletSection();
				});
				card.appendChild(
					h('div', { className: 'smlv-field' }, [
						h(
							'label',
							{ className: 'smlv-label' },
							'Select currency',
						),
						sel,
					]),
				);

				if (info.min_amount) {
					card.appendChild(
						alertBox(
							'info',
							'Minimum deposit: ' +
								info.min_amount +
								'\u00a0' +
								selectedCurrency.toUpperCase(),
						),
					);
				}

				renderWalletSection();
			}

			function renderWalletSection() {
				var existing = card.querySelector('.smlv-wallet');
				if (existing) existing.remove();

				var section = h('div', { className: 'smlv-wallet' });

				if (!walletData) {
					var btn = h(
						'button',
						{ className: 'smlv-btn' },
						'Get Deposit Address',
					);
					btn.addEventListener('click', function () {
						btn.disabled = true;
						btn.textContent = 'Loading…';
						api.get('/deposit/address', {
							currency: selectedCurrency,
						})
							.then(function (r) {
								walletData = r.data || {};
								renderWalletSection();
							})
							.catch(function (e) {
								section.appendChild(alertBox('err', e.message));
								btn.disabled = false;
								btn.textContent = 'Get Deposit Address';
							});
					});
					section.appendChild(btn);
				} else {
					section.appendChild(
						alertBox(
							'ok',
							'Send ' +
								selectedCurrency.toUpperCase() +
								' to the address below. ' +
								'The payment will be confirmed automatically.',
						),
					);

					/* Address copy box */
					var cpyBtn = h(
						'button',
						{ className: 'smlv-btn smlv-btn-sm' },
						'Copy',
					);
					cpyBtn.addEventListener('click', function () {
						copyToClipboard(walletData.address, cpyBtn);
					});
					section.appendChild(
						h('div', { className: 'smlv-field' }, [
							h(
								'label',
								{ className: 'smlv-label' },
								'Wallet address',
							),
							h('div', { className: 'smlv-copy-box' }, [
								h('span', {}, walletData.address),
								cpyBtn,
							]),
						]),
					);

					/* Memo / Tag if present */
					var memo = walletData.memo || walletData.tag;
					if (memo) {
						var mBtn = h(
							'button',
							{ className: 'smlv-btn smlv-btn-sm' },
							'Copy',
						);
						mBtn.addEventListener('click', function () {
							copyToClipboard(memo, mBtn);
						});
						section.appendChild(
							h('div', { className: 'smlv-field' }, [
								h(
									'label',
									{ className: 'smlv-label' },
									'Memo / Tag',
								),
								h('div', { className: 'smlv-copy-box' }, [
									h('span', {}, memo),
									mBtn,
								]),
							]),
						);
					}

					/* Done button */
					var doneBtn = h(
						'button',
						{
							className: 'smlv-btn',
							style: 'margin-top:12px',
						},
						"I've sent the payment",
					);
					doneBtn.addEventListener('click', function () {
						var payload = {
							currency: selectedCurrency,
							address: walletData.address,
						};
						cb.onSuccess && cb.onSuccess(payload);
						if (cfg.returnUrl) window.location.href = cfg.returnUrl;
					});
					section.appendChild(doneBtn);
				}

				card.appendChild(section);
			}

			initialLoad();
		},

		/**
		 * Balance: grid of currency → amount cards. Refresh = POST /balance/sync.
		 */
		balance: function (root, api, cfg, cb) {
			var card = root.querySelector('.smlv-card');

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
							'No balance data yet.',
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
									fmtAmt(b.amount),
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
							'Updated: ' + fmtDate(res.data.updated_at),
						),
					);
				}
			}

			function doSync(syncBtn) {
				if (syncBtn) {
					syncBtn.disabled = true;
					syncBtn.textContent = 'Syncing…';
				}
				card.appendChild(spinner());
				api.post('/balance/sync')
					.then(function (res) {
						renderBalances(res);
						if (syncBtn) {
							syncBtn.disabled = false;
							syncBtn.textContent = 'Sync';
						}
					})
					.catch(function (e) {
						var s = card.querySelector('.smlv-spin-wrap');
						if (s) s.remove();
						card.appendChild(alertBox('err', e.message));
						if (syncBtn) {
							syncBtn.disabled = false;
							syncBtn.textContent = 'Sync';
						}
						cb.onError && cb.onError(e);
					});
			}

			function load() {
				card.innerHTML = '';
				var syncBtn = h(
					'button',
					{ className: 'smlv-btn smlv-btn-sm' },
					'Sync',
				);
				syncBtn.addEventListener('click', function () {
					doSync(syncBtn);
				});
				card.appendChild(mkHeader('Balance', syncBtn));
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
			var page = 1;
			var perPage = cfg.perPage || 10;
			var total = 0;

			function load() {
				card.innerHTML = '';
				card.appendChild(mkHeader('Transactions'));
				card.appendChild(spinner());

				api.get('/transactions', { page: page, per_page: perPage })
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
									'No transactions yet.',
								),
							);
							cb.onReady && cb.onReady();
							return;
						}

						var thead = h('thead', {}, [
							h('tr', {}, [
								h('th', {}, 'Date'),
								h('th', {}, 'Type'),
								h('th', {}, 'Amount'),
								h('th', {}, 'Currency'),
								h('th', {}, 'Status'),
							]),
						]);

						var tbody = h(
							'tbody',
							{},
							items.map(function (tx) {
								return h('tr', {}, [
									h('td', {}, fmtDate(tx.created_at)),
									h('td', {}, tx.type || '—'),
									h('td', {}, fmtAmt(tx.amount)),
									h(
										'td',
										{},
										(tx.currency || '').toUpperCase(),
									),
									h('td', {}, badge(tx.status)),
								]);
							}),
						);

						card.appendChild(
							h('div', { className: 'smlv-tbl-wrap' }, [
								h('table', { className: 'smlv-tbl' }, [
									thead,
									tbody,
								]),
							]),
						);

						/* Pagination */
						var pages = Math.ceil(total / perPage);
						if (pages > 1) {
							var prev = h(
								'button',
								{ className: 'smlv-btn smlv-btn-sm' },
								'← Prev',
							);
							var next = h(
								'button',
								{ className: 'smlv-btn smlv-btn-sm' },
								'Next →',
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
									'Page\u00a0' +
										page +
										'\u00a0of\u00a0' +
										pages,
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
		 * Management: full CRUD — Overview | Edit | Danger Zone
		 */
		management: function (root, api, cfg, cb) {
			var card = root.querySelector('.smlv-card');
			card.innerHTML = '';
			card.appendChild(mkHeader('Account'));
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
					['Overview', 'Edit', 'Danger Zone'],
					[renderOverviewPanel, renderEditPanel, renderDangerPanel],
				);
				card.appendChild(tabs.tabBar);
				tabs.panels.forEach(function (p) {
					card.appendChild(p);
				});

				// ── Tab 1: Overview ─────────────────────────────────────────
				function renderOverviewPanel(panel) {
					var infoRows = [
						['Reference', acc.reference || acc.account_reference],
						['Email', acc.email],
						['First name', acc.first_name],
						['Last name', acc.last_name],
						['Type', acc.account_type],
						['Status', acc.status],
						[
							'Created',
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

				// ── Tab 2: Edit ─────────────────────────────────────────────
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
						h('option', { value: 'natural' }, 'Individual'),
						h('option', { value: 'legal' }, 'Company'),
					]);
					if (acc.account_type === 'legal') typeEl.value = 'legal';

					[
						['First name', firstEl],
						['Last name', lastEl],
						['Email', emailEl],
						['Account type', typeEl],
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
						'Save changes',
					);
					saveBtn.addEventListener('click', function () {
						saveBtn.disabled = true;
						saveBtn.textContent = 'Saving…';
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
									alertBox(
										'ok',
										'Account updated successfully.',
									),
								);
								saveBtn.disabled = false;
								saveBtn.textContent = 'Save changes';
								cb.onSuccess &&
									cb.onSuccess({
										event: 'account_updated',
										account: acc,
									});
							})
							.catch(function (e) {
								msgBox.appendChild(alertBox('err', e.message));
								saveBtn.disabled = false;
								saveBtn.textContent = 'Save changes';
								cb.onError && cb.onError(e);
							});
					});
					panel.appendChild(saveBtn);
				}

				// ── Tab 3: Danger Zone ───────────────────────────────────────
				function renderDangerPanel(panel) {
					var isActive =
						acc.status === 'active' || acc.status === 'Active';

					/* ── Close / Reactivate ── */
					var closeSection = h('div', { className: 'smlv-danger' });
					closeSection.appendChild(
						h(
							'div',
							{ className: 'smlv-danger-title' },
							isActive
								? 'Deactivate account'
								: 'Reactivate account',
						),
					);
					closeSection.appendChild(
						h(
							'div',
							{ className: 'smlv-danger-desc' },
							isActive
								? 'Suspend this account. Deposits and transactions will be disabled. You can reactivate at any time.'
								: 'Restore this account to active status.',
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
								? 'Are you sure you want to deactivate this account?'
								: 'Reactivate account and restore access?',
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
						isActive ? 'Deactivate' : 'Reactivate',
					);
					var cancelCloseBtn = h(
						'button',
						{
							className: 'smlv-btn smlv-btn-ghost',
							style: 'width:auto;padding:8px 16px',
						},
						'Cancel',
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
						isActive ? 'Deactivate account' : 'Reactivate account',
					);
					toggleCloseBtn.addEventListener('click', function () {
						closeConfirm.style.display = 'block';
					});

					closeSection.appendChild(toggleCloseBtn);
					closeSection.appendChild(closeConfirm);
					panel.appendChild(closeSection);
					panel.appendChild(h('div', { style: 'height:16px' }));

					/* ── Delete ── */
					var delSection = h('div', { className: 'smlv-danger' });
					delSection.appendChild(
						h(
							'div',
							{ className: 'smlv-danger-title' },
							'Delete account',
						),
					);
					delSection.appendChild(
						h(
							'div',
							{ className: 'smlv-danger-desc' },
							'Permanently delete this account and all associated data. This action cannot be undone.',
						),
					);

					var delConfirm = h('div', {
						className: 'smlv-confirm',
						style: 'display:none',
					});
					delConfirm.appendChild(
						h(
							'p',
							{},
							'Type DELETE to confirm permanent deletion:',
						),
					);
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
						'Delete forever',
					);
					var cancelDelBtn = h(
						'button',
						{
							className: 'smlv-btn smlv-btn-ghost',
							style: 'width:auto;padding:8px 16px',
						},
						'Cancel',
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
								alertBox(
									'err',
									'Type DELETE in all caps to confirm.',
								),
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
						'Delete account',
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
	};

	// ─── Widget instance ─────────────────────────────────────────────────────────

	function WidgetInstance(config) {
		this.config = config;
		this.el = null;
		this.destroyed = false;
	}

	WidgetInstance.prototype.mount = function () {
		var cfg = this.config;

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

		// ── Step 1: Resolve / auto-create account ────────────────────────────
		// POST /v1/widget/account/resolve
		// Server decodes JWT:
		//   • If JWT has account_reference → skip creation, return account
		//   • If JWT has external_user_id  → find or signal needs_setup
		//   Response variants:
		//     { success:true, data:{ account:{...} } }
		//     { success:false, code:'ACCOUNT_NOT_FOUND',
		//       prefill:{ email, first_name, last_name, account_type } }

		card.appendChild(spinner());

		resolveAccount(api)
			.then(function (res) {
				var s = card.querySelector('.smlv-spin-wrap');
				if (s) s.remove();
				// Account found — proceed to requested renderer
				renderer(el, api, cfg, cb);
			})
			.catch(function (e) {
				var s = card.querySelector('.smlv-spin-wrap');
				if (s) s.remove();

				if (e.code === 404) {
					// Account doesn't exist — show create-account form
					// Pre-fill data can come from JWT (forwarded via cfg.prefill) or API response
					var prefill = cfg.prefill || {};
					renderCreateForm(
						card,
						api,
						prefill,
						cb,
						function (/*account*/) {
							// After creation — render the originally requested widget
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

	// ─── CSS injection ───────────────────────────────────────────────────────────

	function injectStyles() {
		if (document.getElementById(STYLE_ID)) return;
		var style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = CSS;
		document.head.appendChild(style);
	}

	// ─── Public API ──────────────────────────────────────────────────────────────

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

	// ─── Async queue ─────────────────────────────────────────────────────────────
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
		/* IE11 fallback — ignore */
	}

	return SmlvWidget;
});
