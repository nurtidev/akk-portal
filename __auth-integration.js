/*
 * Слой реальной интеграции прототипа akk-railway с бэкендом (akk-railway/backend).
 *
 * Подключается после основного скрипта index.html — поэтому видит его глобальные
 * function-объявления (finishLogin, showSection, formatPhone, escHtml, PROGRAMS…)
 * и const state по имени, а переопределения window.* подхватываются вызовами по имени.
 *
 * Реализует passwordless-флоу по SMS (без пароля, без ЭЦП):
 *   Вход:        ИИН -> RequestSms -> ввод кода -> VerifySmsCode(login) -> токены
 *   Регистрация: ИИН+ФИО+тел -> CheckBmgAndSendSmsForRegister -> код -> VerifySmsCode(registration) -> smsRegister -> токены
 *   Кабинет:     GET /Account/me + GET /credit/applications (реальные заявки)
 *   Заявка:      «Отправить заявку» -> (если не вошёл — авторизация) -> POST /credit/applications с данными подбора
 *
 * Токены — в localStorage['akk-tokens']. Профиль для UI берём из JWT-claims.
 */
(function () {
  'use strict';

  // Ленивая активация: пока backend не сконфигурирован (нет AKK_API_BASE),
  // НЕ трогаем прототип — остаётся текущий мок. Так пуш не ломает живой демо,
  // пока на сервисе фронта не задан AKK_BACKEND_URL. Гард ставим только при активации,
  // чтобы повторная загрузка (dev-proxy инжектит позже с заданным base) сработала.
  if (!window.AKK_API_BASE) return;
  if (window.__akkAuthLoaded) return;
  window.__akkAuthLoaded = true;

  var AUTH = window.AKK_API_BASE;
  var CREDIT = window.AKK_CREDIT_BASE || AUTH.replace(/\/auth$/, '/credit');

  function log() {
    var a = ['%c[auth]', 'color:#2b8a3e;font-weight:bold'].concat([].slice.call(arguments));
    console.log.apply(console, a);
  }

  // --- HTTP ----------------------------------------------------------------
  function http(base, path, opts) {
    opts = opts || {};
    var headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    var tok = accessToken();
    if (opts.auth && tok) headers['Authorization'] = 'Bearer ' + tok;
    var init = { method: opts.method || 'POST', headers: headers };
    if (opts.body !== undefined) init.body = JSON.stringify(opts.body);
    log('->', init.method, path, opts.body || '');
    return fetch(base + path, init).then(function (res) {
      return res.text().then(function (txt) {
        var data = txt;
        try { data = txt ? JSON.parse(txt) : null; } catch (e) { /* not json */ }
        log('<-', res.status, path, data);
        return { ok: res.ok, status: res.status, data: data };
      });
    });
  }
  // Все auth-эндпоинты живут под /Account (контракт credit-backend).
  function callAuth(path, opts) { return http(AUTH, '/Account' + path, opts); }
  function callCredit(path, opts) { return http(CREDIT, path, opts); }

  function errText(r, fallback) {
    var d = r && r.data;
    if (d && typeof d === 'object') return d.message || d.error || d.title || fallback;
    if (typeof d === 'string' && d) return d;
    return fallback;
  }

  // --- Tokens / JWT --------------------------------------------------------
  function saveTokens(t) {
    try { localStorage.setItem('akk-tokens', JSON.stringify(t || {})); } catch (e) {}
  }
  function loadTokens() {
    try { return JSON.parse(localStorage.getItem('akk-tokens') || '{}'); } catch (e) { return {}; }
  }
  function clearTokens() {
    try { localStorage.removeItem('akk-tokens'); } catch (e) {}
  }
  function accessToken() { return loadTokens().accessToken || ''; }

  function parseJwt(token) {
    try {
      var part = token.split('.')[1];
      var b64 = part.replace(/-/g, '+').replace(/_/g, '/');
      var pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
      return JSON.parse(decodeURIComponent(escape(atob(b64 + pad))));
    } catch (e) { return {}; }
  }
  function profileFromTokens(tokens, fallbackIin) {
    var claims = tokens && tokens.accessToken ? parseJwt(tokens.accessToken) : {};
    log('JWT claims:', claims);
    var name = claims.name || [claims.lastName, claims.firstName].filter(Boolean).join(' ') || '';
    var iin = fallbackIin || claims.iin || '';
    var phone = claims.phone || '';
    return { name: name || ('ИИН ' + (fallbackIin || '')), iin: iin, phone: phone };
  }

  function splitFio(fio) {
    var p = String(fio || '').trim().split(/\s+/).filter(Boolean);
    return { lastName: p[0] || '', firstName: p[1] || '', middleName: p.slice(2).join(' ') || '' };
  }
  function maskPhone(digits) {
    var d = onlyDigits(digits);
    if (d.length !== 11) return '';
    return '+7 (' + d.slice(1, 4) + ') •••-••-' + d.slice(-2);
  }

  // Создание заявки, отложенное до авторизации (клик «Отправить заявку» без входа).
  var pendingSubmit = false;

  // =========================================================================
  // ВХОД ПО SMS (passwordless): ИИН -> код -> токены
  // =========================================================================
  window.attachLogin = function () {
    // Превращаем форму «ИИН + пароль» в «ИИН + код по SMS».
    var badge = document.querySelector('#auth-body .demo-badge');
    if (badge) badge.remove();
    var pass = document.getElementById('auth-pass');
    if (pass) { var pf = pass.closest('.auth-field'); if (pf) pf.style.display = 'none'; }
    var forgot = document.querySelector('#auth-body .auth-forgot');
    if (forgot) forgot.style.display = 'none';
    var sub = document.querySelector('#auth-body .auth-sub');
    if (sub) sub.innerHTML = 'Введите ИИН — отправим код подтверждения по SMS. Нет аккаунта? <a onclick="renderAuth(\'register\')">Регистрация</a>.';

    var iin = document.getElementById('auth-iin');
    if (iin) iin.addEventListener('input', function () { iin.value = onlyDigits(iin.value).slice(0, 12); });

    var btn = document.getElementById('auth-login-btn');
    if (!btn) return;
    btn.textContent = 'Получить код по SMS';
    btn.addEventListener('click', function () {
      var err = document.getElementById('auth-err');
      var iinV = onlyDigits(document.getElementById('auth-iin').value);
      err.textContent = '';
      if (iinV.length !== 12) { err.textContent = 'ИИН должен состоять из 12 цифр.'; return; }

      btn.disabled = true; btn.textContent = 'Отправка SMS…';
      callAuth('/RequestSms', { body: { iin: iinV } })
        .then(function (r) {
          if (r.status === 404) throw new Error('Пользователь с таким ИИН не найден. Пройдите регистрацию.');
          if (!r.ok) throw new Error(errText(r, 'Не удалось отправить SMS (код ' + r.status + ').'));
          renderOtpStep({ mode: 'login', iin: iinV, phone: '', demoCode: r.data && r.data.demoCode });
        })
        .catch(function (e) {
          err.textContent = e.message || 'Ошибка сети.';
          btn.disabled = false; btn.textContent = 'Получить код по SMS';
        });
    });
  };

  // =========================================================================
  // РЕГИСТРАЦИЯ ПО SMS (без пароля): ИИН+ФИО+тел -> код -> smsRegister -> токены
  // =========================================================================
  window.attachRegister = function () {
    var badge = document.querySelector('#auth-body .demo-badge');
    if (badge) badge.remove();
    var nameEl = document.getElementById('reg-name');
    if (nameEl) nameEl.placeholder = 'Фамилия Имя Отчество';
    var phone = document.getElementById('reg-phone');
    if (phone) phone.addEventListener('input', function (e) {
      e.target.value = formatPhone(onlyDigits(e.target.value).slice(0, 11));
    });
    var iin = document.getElementById('reg-iin');
    if (iin) iin.addEventListener('input', function () { iin.value = onlyDigits(iin.value).slice(0, 12); });

    var btn = document.getElementById('reg-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var err = document.getElementById('auth-err');
      var name = document.getElementById('reg-name').value.trim();
      var iinV = onlyDigits(document.getElementById('reg-iin').value);
      var phoneV = onlyDigits(document.getElementById('reg-phone').value);
      err.textContent = '';
      if (!name) { err.textContent = 'Введите ФИО.'; return; }
      if (iinV.length !== 12) { err.textContent = 'ИИН должен состоять из 12 цифр.'; return; }
      if (phoneV.length !== 11) { err.textContent = 'Введите корректный номер телефона.'; return; }

      var fio = splitFio(name);
      var ctx = {
        mode: 'register', iin: iinV, phone: '+' + phoneV,
        lastName: fio.lastName, firstName: fio.firstName, middleName: fio.middleName
      };
      btn.disabled = true; btn.textContent = 'Отправка SMS…';
      callAuth('/CheckBmgAndSendSmsForRegister', { body: { iin: iinV, phone: '+' + phoneV } })
        .then(function (r) {
          if (!r.ok) throw new Error(errText(r, 'Не удалось отправить SMS (код ' + r.status + ').'));
          ctx.demoCode = r.data && r.data.demoCode;
          renderOtpStep(ctx);
        })
        .catch(function (e) {
          err.textContent = e.message || 'Ошибка сети.';
          btn.disabled = false; btn.textContent = 'Зарегистрироваться';
        });
    });
  };

  // =========================================================================
  // ЭКРАН ВВОДА SMS-КОДА (общий для входа и регистрации)
  // =========================================================================
  function collectOtp() {
    var v = '';
    for (var i = 0; i < 6; i++) {
      var el = document.getElementById('otp-' + i);
      v += el ? onlyDigits(el.value).slice(-1) : '';
    }
    return v;
  }
  // Демо-режим: подставить код в ячейки.
  function fillOtp(code) {
    var d = String(code || '').replace(/\D/g, '').slice(0, 6);
    if (d.length !== 6) return;
    for (var i = 0; i < 6; i++) {
      var el = document.getElementById('otp-' + i);
      if (el) el.value = d[i] || '';
    }
  }
  function wireOtpCells() {
    var cells = [];
    for (var i = 0; i < 6; i++) cells.push(document.getElementById('otp-' + i));
    cells.forEach(function (el, idx) {
      if (!el) return;
      el.addEventListener('input', function () {
        el.value = onlyDigits(el.value).slice(-1);
        if (el.value && idx < 5 && cells[idx + 1]) cells[idx + 1].focus();
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !el.value && idx > 0 && cells[idx - 1]) cells[idx - 1].focus();
      });
      el.addEventListener('paste', function (e) {
        e.preventDefault();
        var t = onlyDigits((e.clipboardData || window.clipboardData).getData('text')).slice(0, 6);
        for (var j = 0; j < 6; j++) if (cells[j]) cells[j].value = t[j] || '';
        (cells[Math.min(t.length, 5)] || el).focus();
      });
    });
    if (cells[0]) cells[0].focus();
  }
  function resendEndpoint(ctx) {
    return ctx.mode === 'login'
      ? callAuth('/RequestSms', { body: { iin: ctx.iin } })
      : callAuth('/CheckBmgAndSendSmsForRegister', { body: { iin: ctx.iin, phone: ctx.phone } });
  }
  function startResendTimer(ctx) {
    var link = document.getElementById('otp-resend');
    if (!link) return;
    var left = 60;
    link.style.pointerEvents = 'none';
    link.style.opacity = '0.5';
    var t = setInterval(function () {
      left -= 1;
      if (left <= 0) {
        clearInterval(t);
        link.textContent = 'Отправить код повторно';
        link.style.pointerEvents = '';
        link.style.opacity = '';
      } else {
        link.textContent = 'Отправить код повторно (' + left + ' c)';
      }
    }, 1000);
    link.onclick = function () {
      if (left > 0) return;
      var err = document.getElementById('auth-err');
      err.textContent = '';
      resendEndpoint(ctx)
        .then(function (r) {
          if (!r.ok) throw new Error(errText(r, 'Не удалось отправить SMS.'));
          if (r.data && r.data.demoCode) fillOtp(r.data.demoCode);
          startResendTimer(ctx);
        })
        .catch(function (e) { err.textContent = e.message || 'Ошибка.'; });
    };
  }

  function renderOtpStep(ctx) {
    var body = document.getElementById('auth-body');
    if (!body) return;
    var where = maskPhone(ctx.phone) || 'привязанный к ИИН номер';
    var dc = (ctx.demoCode && /^\d{6}$/.test(String(ctx.demoCode))) ? String(ctx.demoCode) : '';
    var cells = '';
    for (var i = 0; i < 6; i++) {
      cells += '<input id="otp-' + i + '" class="auth-input" inputmode="numeric" maxlength="1" value="' + (dc ? dc[i] : '') + '" ' +
        'style="width:46px;height:56px;text-align:center;font-size:24px;font-weight:600;padding:0;" />';
    }
    body.innerHTML =
      '<div style="max-width:420px;margin:0 auto;">' +
        '<h2 class="auth-head">Введите код из SMS</h2>' +
        '<p class="auth-sub">' + (dc
          ? 'Демо-режим: SMS не отправляется — код подставлен автоматически.'
          : ('Мы отправили 6-значный код на <strong>' + where + '</strong>.')) + '</p>' +
        '<div style="display:flex;gap:8px;justify-content:space-between;margin:18px 0 6px;">' + cells + '</div>' +
        (dc ? '<div class="demo-badge" style="margin:0 0 8px;">демо · код вставлен, нажмите «Подтвердить»</div>' : '') +
        '<div class="auth-err" id="auth-err"></div>' +
        '<a id="otp-resend" class="auth-forgot" style="display:inline-block;margin:6px 0 14px;cursor:pointer;">Отправить код повторно</a>' +
        '<div class="auth-actions">' +
          '<button class="auth-btn auth-btn-primary" id="otp-confirm">Подтвердить</button>' +
          '<button class="auth-btn auth-btn-ghost" id="otp-back">Назад</button>' +
        '</div>' +
      '</div>';

    wireOtpCells();
    startResendTimer(ctx);
    document.getElementById('otp-back').addEventListener('click', function () {
      renderAuth(ctx.mode === 'login' ? 'login' : 'register');
    });

    document.getElementById('otp-confirm').addEventListener('click', function () {
      var err = document.getElementById('auth-err');
      var code = collectOtp();
      err.textContent = '';
      if (code.length !== 6) { err.textContent = 'Введите все 6 цифр кода.'; return; }
      var b = this; b.disabled = true; b.textContent = 'Проверка…';

      var purpose = ctx.mode === 'login' ? 'login' : 'registration';
      callAuth('/VerifySmsCode', { body: { iin: ctx.iin, code: code, purpose: purpose } })
        .then(function (r) {
          if (!r.ok || !(r.data && r.data.verified)) {
            var left = r.data && r.data.attemptsLeft;
            throw new Error((r.data && r.data.message ? r.data.message : 'Неверный код') +
              (left != null ? ' (осталось попыток: ' + left + ')' : '') + '.');
          }
          if (ctx.mode === 'login') {
            // токены пришли прямо из VerifySmsCode
            var tokens = { accessToken: r.data.accessToken, refreshToken: r.data.refreshToken };
            saveTokens(tokens);
            var prof = profileFromTokens(tokens, ctx.iin);
            finishLogin({ name: prof.name, iin: ctx.iin, phone: prof.phone, via: 'sms' });
            return null;
          }
          // Регистрация: завершаем создание клиента, получаем токены.
          return callAuth('/smsRegister', {
            body: {
              iin: ctx.iin, lastName: ctx.lastName, firstName: ctx.firstName,
              middleName: ctx.middleName, phoneNumber: ctx.phone
            }
          }).then(function (rr) {
            if (!rr.ok) throw new Error(errText(rr, 'Не удалось завершить регистрацию.'));
            var tokens = { accessToken: rr.data.accessToken, refreshToken: rr.data.refreshToken };
            saveTokens(tokens);
            var fio = (ctx.lastName + ' ' + ctx.firstName).trim();
            finishLogin({ name: fio, iin: ctx.iin, phone: ctx.phone, via: 'register' });
          });
        })
        .catch(function (e) {
          err.textContent = e.message || 'Ошибка.';
          b.disabled = false; b.textContent = 'Подтвердить';
        });
    });
  }

  // =========================================================================
  // eGov — в демо-стенде недоступен (нужен реальный редирект на idp.egov.kz)
  // =========================================================================
  window.attachEgov = function () {
    var btn = document.getElementById('egov-confirm');
    if (!btn) return;
    btn.addEventListener('click', function () { ssoLogin('egov'); });
  };

  // Демо-вход через eGov/Bayterek: бэкенд создаёт демо-клиента и выдаёт токен,
  // поэтому после входа кабинет и подача заявки работают как при обычном входе.
  window.ssoLogin = function (provider) {
    var btn = document.getElementById('sso-' + provider);
    var err = document.getElementById('auth-err');
    if (err) err.textContent = '';
    if (btn) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = 'Вход…'; }
    callAuth('/ssoDemoLogin', { body: { provider: provider } })
      .then(function (r) {
        if (!r.ok) throw new Error(errText(r, 'Не удалось войти (код ' + r.status + ').'));
        var d = r.data || {};
        saveTokens({ accessToken: d.accessToken, refreshToken: d.refreshToken });
        finishLogin({ name: d.name, iin: d.iin, phone: d.phone, via: provider });
      })
      .catch(function (e) {
        if (err) err.textContent = e.message || 'Ошибка сети.';
        if (btn) { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
      });
  };

  // =========================================================================
  // finishLogin: после входа — если ждали отправку заявки, отправляем её
  // =========================================================================
  var origFinishLogin = window.finishLogin;
  window.finishLogin = function (user) {
    origFinishLogin(user);
    if (pendingSubmit && accessToken()) {
      pendingSubmit = false;
      setTimeout(function () { window.submitCallback(); }, 150);
    }
  };

  // На выходе чистим и токены тоже.
  function logout() {
    clearTokens();
    state.user = null;
    try { localStorage.removeItem('akk-user'); } catch (e) {}
    renderAuthSlot();
    closeAuth();
  }

  // =========================================================================
  // КАБИНЕТ: реальные заявки из бэкенда
  // =========================================================================
  var origRenderAuth = window.renderAuth;
  window.renderAuth = function (view) {
    if (view === 'cabinet' && state.user) { return renderCabinet(); }
    return origRenderAuth(view);
  };

  function programTitle(id) {
    if (!id) return 'Индивидуальная консультация';
    var p = (typeof PROGRAMS !== 'undefined') && PROGRAMS.find(function (x) { return x.id === id; });
    return p ? p.title : id;
  }
  function fmtMoney(n) {
    if (typeof fmtAmount === 'function') return fmtAmount(Math.round(n || 0));
    return (Math.round(n || 0)).toLocaleString('ru-RU') + ' ₸';
  }

  function renderCabinet() {
    var body = document.getElementById('auth-body');
    if (!body) return;
    var u = state.user || {};
    body.innerHTML =
      '<h2 class="auth-head">Личный кабинет</h2>' +
      '<p class="auth-sub">Вы вошли по SMS.</p>' +
      '<div class="cab-list">' +
        '<div class="cab-row"><span>ФИО</span><span>' + escHtml(u.name || '—') + '</span></div>' +
        '<div class="cab-row"><span>ИИН</span><span>' + escHtml(maskIin ? maskIin(u.iin) : (u.iin || '—')) + '</span></div>' +
        '<div class="cab-row"><span>Телефон</span><span>' + escHtml(u.phone ? formatPhone(onlyDigits(u.phone)) : '—') + '</span></div>' +
      '</div>' +
      '<div id="cab-apps" style="margin:18px 0;"><div class="auth-sub">Загружаем ваши заявки…</div></div>' +
      '<div class="auth-actions">' +
        '<button class="auth-btn auth-btn-primary" onclick="closeAuth(); startQuiz();">Подобрать программу</button>' +
        '<button class="auth-btn auth-btn-ghost" id="logout-btn">Выйти</button>' +
      '</div>';
    var lo = document.getElementById('logout-btn');
    if (lo) lo.addEventListener('click', logout);

    callCredit('/applications', { method: 'GET', auth: true })
      .then(function (r) {
        var host = document.getElementById('cab-apps');
        if (!host) return;
        if (!r.ok) { host.innerHTML = '<div class="auth-err">Не удалось загрузить заявки.</div>'; return; }
        var apps = Array.isArray(r.data) ? r.data : [];
        if (!apps.length) {
          host.innerHTML = '<div class="auth-sub">У вас пока нет заявок. Подберите программу и подайте заявку.</div>';
          return;
        }
        host.innerHTML = '<div class="cab-row" style="font-weight:600;border:none;"><span>Мои заявки</span><span>' + apps.length + '</span></div>' +
          apps.map(function (a) {
            return '<div class="cab-row">' +
              '<span>№ ' + escHtml(a.number) + '<br><small style="color:var(--text-3);">' + escHtml(programTitle(a.program_id)) + '</small></span>' +
              '<span style="text-align:right;">' + escHtml(fmtMoney(a.amount)) + '<br><small style="color:var(--text-3);">' + escHtml(a.status || 'new') + '</small></span>' +
              '</div>';
          }).join('');
      });
  }

  // =========================================================================
  // ПОДАЧА ЗАЯВКИ: реальное создание через бэкенд (с авторизацией)
  // =========================================================================
  window.submitCallback = function () {
    var digits = onlyDigits(state.callback.phone);
    var btn = document.getElementById('submit-btn');
    if (!state.callback.name.trim() || digits.length !== 11) {
      if (btn) {
        btn.style.background = 'var(--danger)';
        btn.textContent = digits.length !== 11 ? 'Введите телефон полностью' : 'Заполните имя и телефон';
        setTimeout(function () { btn.style.background = ''; btn.textContent = 'Отправить заявку'; }, 1800);
      }
      return;
    }

    // Не авторизован — сперва вход/регистрация, потом автоматически отправим заявку.
    if (!accessToken()) {
      pendingSubmit = true;
      openAuth('login');
      return;
    }

    var progId = state.selectedProgram;
    var amount = (progId && state.calc[progId]) ? state.calc[progId].amount : 0;
    var prog = (typeof PROGRAMS !== 'undefined') && PROGRAMS.find(function (p) { return p.id === progId; });
    var purpose = prog ? (prog.category || prog.title) : 'Индивидуальная консультация';

    var payload = {
      requested_amount: amount || 0,
      loan_purpose: purpose,
      program_id: progId || '',
      onboarding: {
        answers: state.answers,
        program: prog ? { id: prog.id, title: prog.title, category: prog.category } : null,
        contact: { name: state.callback.name, phone: '+' + digits, channel: state.callback.channel }
      }
    };

    if (btn) { btn.disabled = true; btn.textContent = 'Отправляем…'; }
    callCredit('/applications', { method: 'POST', auth: true, body: payload })
      .then(function (r) {
        if (r.status === 401) { pendingSubmit = true; openAuth('login'); return; }
        if (!r.ok) throw new Error(errText(r, 'Не удалось отправить заявку.'));
        state.leadNumber = (r.data && r.data.number) || '—';
        showSuccess();
      })
      .catch(function (e) {
        if (btn) {
          btn.disabled = false; btn.textContent = 'Отправить заявку';
          btn.style.background = 'var(--danger)';
          setTimeout(function () { btn.style.background = ''; }, 1800);
        }
        var host = document.getElementById('submit-btn');
        if (host) host.insertAdjacentHTML('afterend',
          '<p class="auth-err" style="margin-top:8px;">' + (e.message || 'Ошибка сети.') + '</p>');
      });
  };

  // Реальный номер заявки в успехе (без лишнего «№» перед AKK-…).
  window.showSuccess = function () {
    state.screen = 'success';
    var p = (typeof PROGRAMS !== 'undefined') && PROGRAMS.find(function (x) { return x.id === state.selectedProgram; });
    var programPart = p ? ' по программе <strong>' + escHtml(p.title) + '</strong>' : '';
    var phone = formatPhone(onlyDigits(state.callback.phone)) || 'указанный номер';
    document.getElementById('success-container').innerHTML =
      '<div class="success-wrap fade-in">' +
        '<div class="success-icon">✓</div>' +
        '<h2 class="success-title">Заявка принята</h2>' +
        '<div class="success-num">Номер заявки: <strong>' + escHtml(state.leadNumber) + '</strong></div>' +
        '<p class="success-text">Менеджер АКК свяжется с вами в ближайшее рабочее время (пн–пт, 09:00–18:00)' + programPart +
          '. Статус заявки виден в личном кабинете.</p>' +
        '<p class="success-text" style="font-size: 13px; color: var(--text-3);">Если вопрос срочный — звоните 1408.</p>' +
        '<div class="success-actions">' +
          '<button class="btn-ghost" onclick="openAuth(\'cabinet\')">Открыть личный кабинет</button>' +
          '<button class="btn-ghost" onclick="resetAll()">Подобрать другую программу</button>' +
        '</div>' +
      '</div>';
    showSection('success-section');
  };

  // Восстановление сессии: если есть валидный токен, но state.user пуст — поднимем профиль.
  (function restore() {
    var tok = accessToken();
    if (tok && !state.user) {
      var prof = profileFromTokens(loadTokens(), '');
      if (prof.iin || prof.name) {
        state.user = { name: prof.name, iin: prof.iin, phone: prof.phone, via: 'sms' };
        try { renderAuthSlot(); } catch (e) {}
      }
    }
  })();

  log('integration loaded; AUTH =', AUTH, '; CREDIT =', CREDIT);
})();
