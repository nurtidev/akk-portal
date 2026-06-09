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
      var last = (document.getElementById('reg-last').value || '').trim();
      var first = (document.getElementById('reg-first').value || '').trim();
      var iinV = onlyDigits(document.getElementById('reg-iin').value);
      var phoneV = onlyDigits(document.getElementById('reg-phone').value);
      err.textContent = '';
      if (!last || !first) { err.textContent = 'Укажите фамилию и имя.'; return; }
      if (iinV.length !== 12) { err.textContent = 'ИИН должен состоять из 12 цифр.'; return; }
      if (phoneV.length !== 11) { err.textContent = 'Введите корректный номер телефона.'; return; }

      var ctx = {
        mode: 'register', iin: iinV, phone: '+' + phoneV,
        lastName: last, firstName: first, middleName: ''
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
  var pendingWizard = false;
  window.finishLogin = function (user) {
    origFinishLogin(user);
    if (pendingWizard && accessToken()) {
      pendingWizard = false;
      setTimeout(function () { startWizard(); }, 150);
      return;
    }
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
  // КАБИНЕТ как отдельная СТРАНИЦА (не модалка) + дропдаун в шапке
  // =========================================================================
  var origRenderAuth = window.renderAuth;
  var origOpenAuth = window.openAuth;
  var origRenderAuthSlot = window.renderAuthSlot;

  var cabTab = 'profile';   // активная вкладка кабинета
  var notifRead = false;    // уведомления просмотрены в этой сессии
  var cabApps = [];         // кэш заявок (для вкладок «Заявки»/«Уведомления» и бейджа)

  var LANDING_IDS = ['main', 'programs'];
  var FLOW_IDS = ['quiz-section', 'results-section', 'stress-section', 'callback-section', 'success-section'];

  // Внедряем секцию-страницу кабинета один раз (чтобы не трогать index.html).
  function ensureCabinetSection() {
    if (document.getElementById('cabinet-section')) return;
    var sec = document.createElement('section');
    sec.id = 'cabinet-section';
    sec.className = 'section';
    sec.hidden = true;
    sec.innerHTML = '<div class="cab-page"><aside class="cab-nav" id="cab-nav"></aside><div class="cab-main" id="cab-main"></div></div>';
    // Вставляем сразу ПОСЛЕ success-section (до футера), а не в конец родителя.
    var anchor = document.getElementById('success-section');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(sec, anchor.nextSibling);
    else document.body.appendChild(sec);
  }

  function setHidden(id, h) { var el = document.getElementById(id); if (el) el.hidden = !!h; }

  // Скрыть все «оверлейные» секции (кабинет, страница заявки, визард/флоу).
  function hideOverlaySections() {
    setHidden('cabinet-section', true);
    setHidden('application-section', true);
    FLOW_IDS.forEach(function (id) { setHidden(id, true); });
  }
  // Лендинг (главная) ⇄ страница кабинета.
  function showLanding() {
    hideOverlaySections();
    LANDING_IDS.forEach(function (id) { setHidden(id, false); });
  }
  window.exitCabinet = function () {
    closeAuthDropdown();
    showLanding();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Навигация из шапки: выйти из кабинета/заявки/визарда → лендинг → к нужной секции.
  window.akkGoLanding = function (target) {
    showLanding();
    closeAuthDropdown();
    var el = target ? document.getElementById(target) : null;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  // Вешаем обработчики на логотип и пункты шапки (якоря на скрытые секции лендинга).
  function wireHeaderNav() {
    var logo = document.querySelector('.logo');
    if (logo && !logo.__akkWired) {
      logo.__akkWired = true;
      logo.addEventListener('click', function (e) { e.preventDefault(); window.akkGoLanding('main'); });
    }
    document.querySelectorAll('a[href="#programs"]').forEach(function (a) {
      if (a.__akkWired) return; a.__akkWired = true;
      a.addEventListener('click', function (e) { e.preventDefault(); window.akkGoLanding('programs'); });
    });
    document.querySelectorAll('a[href="#contacts"]').forEach(function (a) {
      if (a.__akkWired) return; a.__akkWired = true;
      a.addEventListener('click', function (e) { e.preventDefault(); window.akkGoLanding('contacts'); });
    });
  }
  // «Подбор» (startQuiz) из любого места — сперва вернуть лендинг, затем квиз.
  var origStartQuiz = window.startQuiz;
  if (typeof origStartQuiz === 'function') {
    window.startQuiz = function () {
      hideOverlaySections();
      LANDING_IDS.forEach(function (id) { setHidden(id, false); });
      return origStartQuiz.apply(window, arguments);
    };
  }

  // Открыть кабинет на нужной вкладке.
  window.openCabinet = function (tab) {
    if (!state.user) { return origOpenAuth.call(window, 'login'); }
    ensureCabStyle();
    ensureCabinetSection();
    closeAuth();
    closeAuthDropdown();
    cabTab = tab || cabTab || 'profile';
    LANDING_IDS.concat(FLOW_IDS).forEach(function (id) { setHidden(id, true); });
    setHidden('cabinet-section', false);
    renderCabNav();
    renderCabTab();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadCabApps(function () { renderCabNav(); if (cabTab === 'apps') renderApps(); else if (cabTab === 'notif') renderCabTab(); });
  };

  // Перехватываем openAuth('cabinet') → открываем страницу вместо модалки.
  window.openAuth = function (view) {
    if (view === 'cabinet') { return window.openCabinet('profile'); }
    return origOpenAuth.call(window, view);
  };
  window.renderAuth = function (view) {
    if (view === 'cabinet' && state.user) { return window.openCabinet('profile'); }
    return origRenderAuth(view);
  };

  // --- дропдаун пользователя в шапке ----------------------------------------
  function unreadCount() { return notifRead ? 0 : notifEvents().length; }

  function closeAuthDropdown() {
    var dd = document.getElementById('auth-dd');
    if (dd) dd.classList.remove('open');
    var chip = document.querySelector('#auth-slot .user-chip');
    if (chip) chip.setAttribute('aria-expanded', 'false');
  }
  function toggleAuthDropdown() {
    var dd = document.getElementById('auth-dd');
    if (!dd) return;
    var open = !dd.classList.contains('open');
    dd.classList.toggle('open', open);
    var chip = document.querySelector('#auth-slot .user-chip');
    if (chip) chip.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  // Закрытие дропдауна по клику вне (вешаем один раз).
  document.addEventListener('click', function (e) {
    var slot = document.getElementById('auth-slot');
    if (slot && !slot.contains(e.target)) closeAuthDropdown();
  });

  function ddItem(tab, icon, label, badge) {
    return '<button data-cab-tab="' + tab + '">' + icon + '<span>' + label + '</span>' +
      (badge ? '<span class="nb-badge">' + badge + '</span>' : '') + '</button>';
  }

  window.renderAuthSlot = function () {
    var slot = document.getElementById('auth-slot');
    if (!slot) return;
    if (!state.user) { return origRenderAuthSlot ? origRenderAuthSlot.call(window) : null; }
    ensureCabStyle();
    var unread = unreadCount();
    slot.innerHTML =
      '<button class="user-chip" aria-haspopup="true" aria-expanded="false" id="auth-chip">' +
        '<span class="user-avatar" style="position:relative;">' + escHtml(initials(state.user.name)) +
          (unread ? '<span class="chip-badge">' + unread + '</span>' : '') + '</span>' +
        '<span class="user-chip-name">' + escHtml(firstName(state.user.name)) + '</span>' +
        NAV_ICONS.caret +
      '</button>' +
      '<div class="auth-dd" id="auth-dd" role="menu">' +
        ddItem('profile', NAV_ICONS.profile, 'Профиль') +
        ddItem('apps', NAV_ICONS.apps, 'Мои заявки') +
        ddItem('docs', NAV_ICONS.docs, 'Документы') +
        ddItem('notif', NAV_ICONS.notif, 'Уведомления', unread) +
        ddItem('support', NAV_ICONS.support, 'Поддержка') +
        '<div class="dd-sep"></div>' +
        '<button class="dd-danger" id="dd-logout">' + NAV_ICONS.logout + '<span>Выйти</span></button>' +
      '</div>';

    var chip = document.getElementById('auth-chip');
    if (chip) chip.addEventListener('click', function (e) { e.stopPropagation(); toggleAuthDropdown(); });
    slot.querySelectorAll('.auth-dd [data-cab-tab]').forEach(function (b) {
      b.addEventListener('click', function () { closeAuthDropdown(); window.openCabinet(b.getAttribute('data-cab-tab')); });
    });
    var ddLogout = document.getElementById('dd-logout');
    if (ddLogout) ddLogout.addEventListener('click', function () { closeAuthDropdown(); logout(); });
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

  // Лента движения заявки — полная клиентская проекция как в реальной системе
  // (credit-backend okaps_menu_status). 7 этапов + терминальная ветка отказа.
  var APP_STAGES = ['Регистрация заявки', 'Новая заявка', 'На рассмотрении', 'Одобрена',
    'Оценка залога', 'Договор', 'Средства выданы', 'Мониторинг', 'Завершена'];

  // Полный маппинг реальных workflow-статусов credit-backend -> индекс клиентского этапа.
  // Так лента корректна и для демо-лестницы, и если бэкенд начнёт слать настоящие статусы Temporal.
  var STATUS_INDEX = {
    'new': 0, 'flk_validation': 0, 'document_signing': 0,
    'scoring_in_progress': 1, 'scoring_positive': 1, 'scoring_reviewed': 1,
    'distribution_pending': 1, 'manager_assigned': 1,
    'manager_expertise': 2, 'inspections': 2, 'expertise': 2, 'aggregated': 2,
    'cc_pending': 2, 'cc_voting': 2,
    'cc_approved': 3, 'financing_conditions': 3, 'approval_letter_signing': 3,
    // Этап 4 — Оценка залога
    'collateral_valuation': 4, 'collateral_pledge': 4, 'valuation': 4, 'insurance': 4,
    // Этап 5 — Договор (contract_* теперь живут здесь, а не в «Одобрена»)
    'contract_generation': 5, 'contract_signing': 5, 'contracts_signed': 5, 'disbursement_pending': 5,
    'disbursed': 6,
    'monitoring': 7,
    'completed': 8
  };
  // Статусы отказа/отмены — показываем красную терминальную ленту вместо прогресса.
  var REJECTED_STATUS = {
    'rejected': 'Отказано', 'rejected_scoring': 'Отказано (скоринг)', 'rejected_cc': 'Отказано (КК)',
    'scoring_negative': 'Отказано (скоринг)', 'cc_rejected': 'Отказано (КК)', 'cancelled': 'Отменена'
  };
  function rejectLabel(status) { return REJECTED_STATUS[status] || ''; }

  function statusTimelineHtml(currentIdx) {
    return '<div style="display:flex;flex-direction:column;gap:6px;margin-top:10px;">' +
      APP_STAGES.map(function (s, i) {
        var done = i < currentIdx, cur = i === currentIdx;
        var bg = (done || cur) ? 'var(--primary,#2b8a3e)' : '#e3e8e5';
        var dotColor = (done || cur) ? '#fff' : '#9aa6a0';
        var textColor = cur ? 'var(--primary,#2b8a3e)' : (done ? 'var(--text,#14211b)' : '#9aa6a0');
        var icon = done ? '✓' : (cur ? '●' : '');
        return '<div class="' + (cur ? 'stage-current' : 'stage-row') + '" style="display:flex;align-items:center;gap:8px;font-size:12px;color:' + textColor + ';font-weight:' + (cur ? '700' : '400') + ';">' +
          '<span style="flex:0 0 16px;width:16px;height:16px;border-radius:50%;background:' + bg + ';color:' + dotColor + ';font-size:9px;line-height:16px;text-align:center;">' + icon + '</span>' +
          '<span>' + s + '</span>' +
          (cur ? '<span style="margin-left:auto;font-size:10px;">текущий этап</span>' : '') +
          '</div>';
      }).join('') + '</div>';
  }
  // Терминальная лента отказа: пройденные этапы серым, итог — красным.
  function rejectedTimelineHtml(reachedIdx, label) {
    var rows = '<div style="display:flex;flex-direction:column;gap:6px;margin-top:10px;">' +
      APP_STAGES.slice(0, reachedIdx + 1).map(function (s) {
        return '<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#9aa6a0;">' +
          '<span style="flex:0 0 16px;width:16px;height:16px;border-radius:50%;background:#cfd6d2;color:#fff;font-size:9px;line-height:16px;text-align:center;">✓</span>' +
          '<span>' + s + '</span></div>';
      }).join('') +
      '<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--danger,#d6336c);font-weight:700;">' +
        '<span style="flex:0 0 16px;width:16px;height:16px;border-radius:50%;background:var(--danger,#d6336c);color:#fff;font-size:11px;line-height:16px;text-align:center;">✕</span>' +
        '<span>' + escHtml(label) + '</span>' +
        '<span style="margin-left:auto;font-size:10px;">заявка закрыта</span>' +
      '</div></div>';
    return rows;
  }

  function appStageIndex(a) {
    var s = (a && a.status) || 'new';
    return STATUS_INDEX[s] != null ? STATUS_INDEX[s] : 0;
  }

  // =========================================================================
  // ДАННЫЕ «ИЗ ГОСБАЗ» (демо): детерминированно генерируются из ИИН, чтобы у одного
  // пользователя всегда были одинаковые значения. В проде эти блоки заполняются
  // реальными ответами через ШЭП (ГБД ФЛ, КГД, ЕНПФ, ПКБ, ИСЖИБ, земельный кадастр).
  // =========================================================================
  var govCache = {};        // iin -> объект данных
  var govAnimatedFor = {};  // iin -> анимация загрузки уже проигрывалась в этой сессии

  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h >>> 0;
  }
  function rngFrom(seed) {
    var x = seed || 123456789;
    return function () { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function rint(rng, a, b) { return a + Math.floor(rng() * (b - a + 1)); }

  function birthFromIin(iin) {
    // ИИН РК: первые 6 цифр — ГГММДД, 7-я — пол/век.
    if (!/^\d{12}$/.test(iin)) return '';
    var yy = +iin.slice(0, 2), mm = +iin.slice(2, 4), dd = +iin.slice(4, 6), c = +iin[6];
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return '';
    var century = (c === 1 || c === 2) ? 1800 : (c === 3 || c === 4) ? 1900 : 2000;
    return ('0' + dd).slice(-2) + '.' + ('0' + mm).slice(-2) + '.' + (century + yy);
  }

  function govDataFor(u) {
    var iin = onlyDigits(u.iin || '') || '000000000000';
    if (govCache[iin]) return govCache[iin];
    var rng = rngFrom(hashStr(iin));
    var oblasts = ['Алматинская обл.', 'Туркестанская обл.', 'Жамбылская обл.', 'Костанайская обл.',
      'Акмолинская обл.', 'Восточно-Казахстанская обл.', 'Северо-Казахстанская обл.'];
    var villages = ['с. Кокозек', 'с. Енбекши', 'а. Жетысай', 'с. Карабулак', 'с. Шамалган',
      'а. Узынагаш', 'с. Бесагаш'];
    var data = {
      identity: {
        fio: u.name || 'Клиент',
        iin: iin,
        birth: birthFromIin(iin) || ('0' + rint(rng, 1, 28)).slice(-2) + '.0' + rint(rng, 1, 9) + '.' + rint(rng, 1972, 1996),
        docNumber: '№ ' + rint(rng, 30000000, 49999999),
        issuedBy: 'МВД РК',
        issuedDate: ('0' + rint(rng, 1, 9)).slice(-2) + '.0' + rint(rng, 1, 9) + '.' + rint(rng, 2015, 2022),
        address: pick(rng, oblasts) + ', ' + pick(rng, villages)
      },
      income: {
        monthly: rint(rng, 22, 78) * 10000,
        ip: pick(rng, ['ИП (действующий)', 'КХ (крестьянское хозяйство)', 'Физическое лицо']),
        taxDebt: false
      },
      credit: {
        active: rint(rng, 0, 2),
        overdue: false,
        pdn: rint(rng, 14, 36)
      },
      agro: {
        cattle: rint(rng, 12, 90),
        smallCattle: rint(rng, 0, 220),
        landHa: rint(rng, 8, 140)
      }
    };
    govCache[iin] = data;
    return data;
  }

  // --- визуальные помощники --------------------------------------------------
  function ensureCabStyle() {
    if (document.getElementById('akk-cab-style')) return;
    var st = document.createElement('style');
    st.id = 'akk-cab-style';
    st.textContent =
      '@keyframes akkspin{to{transform:rotate(360deg)}}' +
      '.akk-spin{display:inline-block;width:14px;height:14px;border:2px solid #d7e6dc;border-top-color:#2b8a3e;border-radius:50%;animation:akkspin .7s linear infinite;flex:0 0 14px;}' +
      '@keyframes akkfade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}' +
      '.akk-fade{animation:akkfade .45s ease both;}' +
      '.akk-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}' +
      '@media(max-width:520px){.akk-grid{grid-template-columns:1fr;}}' +
      // страница кабинета
      '.cab-page{max-width:1080px;margin:0 auto;padding:28px 16px 64px;display:grid;grid-template-columns:240px 1fr;gap:26px;}' +
      '.cab-nav{display:flex;flex-direction:column;gap:4px;position:sticky;top:84px;align-self:start;}' +
      '.cab-navbtn{display:flex;align-items:center;gap:11px;width:100%;text-align:left;background:none;border:none;border-radius:10px;padding:10px 12px;font-size:14px;color:#3a463f;cursor:pointer;font-weight:500;line-height:1;}' +
      '.cab-navbtn svg{flex:0 0 18px;}' +
      '.cab-navbtn:hover{background:#f0f5f1;color:#14211b;}' +
      '.cab-navbtn.on{background:var(--primary-soft,#e7f3ea);color:var(--primary,#2b8a3e);font-weight:700;}' +
      '.cab-navbtn .nb-badge{margin-left:auto;background:#e8413c;color:#fff;border-radius:999px;font-size:10px;font-weight:700;min-width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;padding:0 5px;}' +
      '.cab-navsep{height:1px;background:#eef2f0;margin:7px 8px;}' +
      '.cab-main{min-width:0;}' +
      '.cab-h2{font-size:21px;font-weight:700;margin:0 0 4px;color:#14211b;}' +
      '@media(max-width:760px){.cab-page{grid-template-columns:1fr;gap:14px;padding-top:16px;}.cab-nav{flex-direction:row;overflow-x:auto;position:static;gap:6px;padding-bottom:4px;}.cab-navbtn{flex:0 0 auto;white-space:nowrap;}.cab-navbtn.cab-back,.cab-navsep{display:none;}}' +
      // дропдаун в шапке
      '#auth-slot{position:relative;}' +
      '.auth-dd{position:absolute;right:0;top:calc(100% + 8px);min-width:216px;background:#fff;border:1px solid #e6ebe8;border-radius:12px;box-shadow:0 14px 34px rgba(20,33,27,.14);padding:6px;z-index:1300;display:none;}' +
      '.auth-dd.open{display:block;animation:akkfade .16s ease both;}' +
      '.auth-dd button{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:none;border:none;border-radius:8px;padding:9px 10px;font-size:13.5px;color:#14211b;cursor:pointer;}' +
      '.auth-dd button svg{flex:0 0 17px;}' +
      '.auth-dd button:hover{background:#f0f5f1;}' +
      '.auth-dd .nb-badge{margin-left:auto;background:#e8413c;color:#fff;border-radius:999px;font-size:10px;font-weight:700;min-width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;padding:0 5px;}' +
      '.auth-dd .dd-sep{height:1px;background:#eef2f0;margin:5px 4px;}' +
      '.auth-dd .dd-danger{color:#d6336c;}' +
      '.chip-badge{position:absolute;top:-3px;right:-3px;min-width:16px;height:16px;background:#e8413c;color:#fff;border-radius:999px;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid #fff;padding:0 3px;}' +
      '.user-chip .ucaret{transition:transform .15s ease;}' +
      '.user-chip[aria-expanded="true"] .ucaret{transform:rotate(180deg);}' +
      // страница заявки (трекер)
      '.appx-page{max-width:760px;margin:0 auto;padding:28px 16px 64px;}' +
      '.appx-back{display:inline-flex;align-items:center;gap:6px;background:none;border:none;color:#3a463f;font-size:13px;font-weight:600;cursor:pointer;padding:0;margin-bottom:16px;}' +
      '.appx-back:hover{color:var(--primary,#2b8a3e);}' +
      '.appx-header{border:1px solid #e3e8e5;border-radius:14px;background:#fff;padding:16px 18px;margin-bottom:18px;}' +
      '.appx-header h2{font-size:18px;font-weight:700;margin:0 0 2px;color:#14211b;}' +
      '.appx-meta{display:flex;flex-wrap:wrap;gap:8px 16px;font-size:13px;color:#8a948f;margin-top:6px;}' +
      '.appx-meta b{color:#14211b;font-weight:600;}' +
      '.appx-stage-pill{display:inline-flex;align-items:center;gap:6px;background:var(--primary-soft,#e7f3ea);color:var(--primary,#2b8a3e);border-radius:999px;padding:4px 12px;font-size:12px;font-weight:700;}' +
      '.appx-card{border:1px solid #e3e8e5;border-radius:14px;background:#fff;padding:16px 18px;margin-bottom:14px;}' +
      '.appx-card-title{font-size:13px;font-weight:700;letter-spacing:.02em;color:#14211b;margin:0 0 4px;}' +
      '.appx-now{border:1px solid var(--primary,#2b8a3e);background:var(--primary-soft,#e7f3ea);}' +
      '.appx-doc-row{display:flex;align-items:center;gap:11px;padding:11px 0;border-top:1px solid #eef2f0;}' +
      '.appx-doc-row:first-of-type{border-top:none;}' +
      '.appx-doc-main{min-width:0;flex:1 1 auto;}' +
      '.appx-doc-title{font-size:13.5px;color:#14211b;font-weight:500;}' +
      '.appx-doc-file{font-size:11.5px;color:#8a948f;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
      '.appx-badge{flex:0 0 auto;font-size:10.5px;font-weight:700;border-radius:999px;padding:2px 9px;letter-spacing:.02em;}' +
      '.appx-badge-gov{background:#e7f0fb;color:#1c6fd6;}' +
      '.appx-badge-upload{background:#fff4e2;color:#b9770a;}' +
      '.appx-badge-sign{background:#efeaff;color:#6741d9;}' +
      '.appx-doc-act{flex:0 0 auto;}' +
      '.appx-check{flex:0 0 18px;width:18px;height:18px;border-radius:50%;background:var(--primary,#2b8a3e);color:#fff;font-size:11px;line-height:18px;text-align:center;}' +
      '.appx-up-btn{background:var(--primary,#2b8a3e);color:#fff;border:none;border-radius:8px;padding:7px 13px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;}' +
      '.appx-up-btn:hover{background:var(--primary-2,#26793a);}' +
      '.appx-stage-collapsed{border:1px solid #eef2f0;border-radius:12px;background:#fafbfa;margin-bottom:10px;overflow:hidden;}' +
      '.appx-stage-collapsed summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;padding:12px 14px;font-size:13px;font-weight:600;color:#3a463f;}' +
      '.appx-stage-collapsed summary::-webkit-details-marker{display:none;}' +
      '.appx-stage-collapsed[open] summary{border-bottom:1px solid #eef2f0;}' +
      '.appx-stage-collapsed .appx-stage-body{padding:4px 14px 12px;}' +
      '.appx-stage-dot{flex:0 0 16px;width:16px;height:16px;border-radius:50%;font-size:9px;line-height:16px;text-align:center;color:#fff;}';
    document.head.appendChild(st);
  }

  // Иконки навигации/дропдауна (inline-SVG, единый штрих).
  var NAV_ICONS = {
    home: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
    profile: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
    apps: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>',
    docs: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
    notif: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    support: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-3v-7h3a2 2 0 0 1 2 2zM3 19a2 2 0 0 0 2 2h3v-7H5a2 2 0 0 0-2 2z"/></svg>',
    logout: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
    caret: '<svg class="ucaret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'
  };

  // Чип источника данных: цветная пилюля с галочкой (inline-SVG).
  function srcChip(label, color) {
    return '<span style="display:inline-flex;align-items:center;gap:4px;background:' + color + '14;color:' + color +
      ';border:1px solid ' + color + '40;border-radius:999px;padding:2px 8px;font-size:10px;font-weight:700;white-space:nowrap;">' +
      '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>' +
      escHtml(label) + '</span>';
  }
  function infoCard(title, chip, rows) {
    return '<div class="akk-fade" style="border:1px solid #e6ebe8;border-radius:12px;padding:13px 14px;background:#fff;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">' +
        '<strong style="font-size:13px;color:#14211b;">' + title + '</strong>' + chip + '</div>' +
      rows.map(function (r) {
        return '<div style="display:flex;justify-content:space-between;gap:12px;padding:3px 0;font-size:12.5px;">' +
          '<span style="color:#8a948f;">' + r[0] + '</span>' +
          '<span style="font-weight:600;text-align:right;color:#14211b;">' + r[1] + '</span></div>';
      }).join('') + '</div>';
  }

  // --- секция профиля «из госбаз» -------------------------------------------
  function profileHtml(g) {
    return '<div class="akk-grid">' +
      infoCard('Личность', srcChip('ГБД ФЛ', '#1c6fd6'), [
        ['ФИО', escHtml(g.identity.fio)],
        ['ИИН', escHtml(g.identity.iin)],
        ['Дата рождения', escHtml(g.identity.birth)],
        ['Удостоверение', escHtml(g.identity.docNumber + ' · ' + g.identity.issuedBy)],
        ['Адрес (прописка)', escHtml(g.identity.address)]
      ]) +
      infoCard('Доходы и налоги', srcChip('КГД · ЕНПФ', '#0c8577'), [
        ['Среднемесячный доход', fmtMoney(g.income.monthly)],
        ['Статус', escHtml(g.income.ip)],
        ['Налоговая задолженность', '<span style="color:#2b8a3e;">нет</span>']
      ]) +
      infoCard('Кредитная история', srcChip('ПКБ', '#6741d9'), [
        ['Действующие займы', String(g.credit.active)],
        ['Просрочки', '<span style="color:#2b8a3e;">нет</span>'],
        ['Долговая нагрузка (ПДН)', g.credit.pdn + '%']
      ]) +
      infoCard('Агро-активы', srcChip('ИСЖИБ · кадастр', '#2f9e44'), [
        ['Поголовье КРС', g.agro.cattle + ' гол.'],
        ['Поголовье МРС', g.agro.smallCattle + ' гол.'],
        ['Земельные участки', g.agro.landHa + ' га']
      ]) +
      '</div>';
  }

  // --- секция документов (всё получено/подписано, без ручной загрузки) -------
  function docRow(name, badgeText, color) {
    return '<div class="akk-fade" style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f0f3f1;">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8a948f" stroke-width="1.8" style="flex:0 0 18px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>' +
      '<span style="flex:1;font-size:12.5px;color:#14211b;">' + escHtml(name) + '</span>' +
      srcChip(badgeText, color) + '</div>';
  }
  function documentsHtml() {
    return '<div style="border:1px solid #e6ebe8;border-radius:12px;padding:13px 14px;background:#fff;">' +
      docRow('Удостоверение личности', 'из ГБД ФЛ', '#1c6fd6') +
      docRow('Справка о доходах', 'из КГД · ЕНПФ', '#0c8577') +
      docRow('Согласие на обработку ПД', 'подписано ЭЦП', '#2b8a3e') +
      docRow('Согласие на запрос в ПКБ', 'подписано ЭЦП', '#2b8a3e') +
      docRow('Заявка-анкета', 'сформирована', '#2b8a3e') +
      '<p style="margin:10px 0 0;font-size:11px;color:#8a948f;line-height:1.45;">' +
      'Все документы получены из верифицированных госисточников или подписаны онлайн — ' +
      'загружать вручную ничего не нужно.</p>' +
      '</div>';
  }

  // --- анимация «запрашиваем данные из госбаз» -------------------------------
  function govLoaderHtml() {
    var steps = [
      ['ГБД ФЛ', 'личные данные'],
      ['КГД · ЕНПФ', 'доходы и налоги'],
      ['ПКБ', 'кредитная история'],
      ['ИСЖИБ · кадастр', 'агро-активы']
    ];
    return '<div style="border:1px solid #e6ebe8;border-radius:12px;padding:14px;background:#fafdfb;">' +
      '<div style="font-size:13px;font-weight:700;margin-bottom:10px;">Запрашиваем данные из госбаз…</div>' +
      steps.map(function (s, i) {
        return '<div id="gov-step-' + i + '" style="display:flex;align-items:center;gap:10px;padding:5px 0;font-size:12.5px;color:#8a948f;">' +
          '<span class="akk-spin"></span>' +
          '<span style="font-weight:600;color:#14211b;">' + s[0] + '</span>' +
          '<span>— ' + s[1] + '</span></div>';
      }).join('') + '</div>';
  }
  function animateGov(host, g, iin) {
    host.innerHTML = govLoaderHtml();
    var n = 4;
    for (var i = 0; i < n; i++) {
      (function (idx) {
        setTimeout(function () {
          var el = document.getElementById('gov-step-' + idx);
          if (!el) return;
          var sp = el.querySelector('.akk-spin');
          if (sp) sp.outerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2b8a3e" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="flex:0 0 16px;"><path d="M20 6L9 17l-5-5"/></svg>';
          el.style.color = '#2b8a3e';
        }, 350 + idx * 380);
      })(i);
    }
    setTimeout(function () {
      var cur = document.getElementById('cab-gov');
      if (cur) cur.innerHTML = profileHtml(g);
      govAnimatedFor[iin] = true;
    }, 350 + n * 380 + 250);
  }

  // --- заявки ----------------------------------------------------------------
  // Статус-пилюля заявки (цветная) для быстрого считывания состояния.
  function pill(text, color) {
    return '<span style="display:inline-flex;align-items:center;gap:6px;background:' + color + '14;color:' + color +
      ';border:1px solid ' + color + '33;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:700;white-space:nowrap;">' +
      '<span style="width:6px;height:6px;border-radius:50%;background:' + color + ';"></span>' + escHtml(text) + '</span>';
  }
  function statusPill(a) {
    var rej = rejectLabel(a.status);
    if (rej) return pill(rej, '#d6336c');
    var idx = appStageIndex(a);
    return pill(APP_STAGES[idx] || '', idx >= 3 ? '#2b8a3e' : '#1c6fd6');
  }

  // Компактная карточка заявки в списке (управление этапами — на странице-трекере).
  function appCardHtml(a) {
    return '<div class="app-card" data-app-number="' + escHtml(a.number) + '" onclick="openApplication(\'' + a.uid + '\')" ' +
      'style="border:1px solid #e3e8e5;border-radius:12px;padding:14px 16px;margin-bottom:10px;background:#fff;cursor:pointer;transition:border-color .15s,box-shadow .15s;" ' +
      'onmouseover="this.style.borderColor=\'#bcd3c4\';this.style.boxShadow=\'0 4px 14px rgba(20,33,27,.06)\';" ' +
      'onmouseout="this.style.borderColor=\'#e3e8e5\';this.style.boxShadow=\'none\';">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">' +
        '<strong style="font-size:14px;">№ ' + escHtml(a.number) + '</strong>' + statusPill(a) +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-top:8px;">' +
        '<span style="font-size:13px;color:var(--text-3,#8a948f);">' + escHtml(programTitle(a.program_id)) + '</span>' +
        '<span style="font-weight:700;font-size:14px;">' + escHtml(fmtMoney(a.amount)) + '</span>' +
      '</div>' +
      '<div style="margin-top:10px;font-size:12.5px;color:var(--primary,#2b8a3e);font-weight:600;">Открыть заявку →</div>' +
      '</div>';
  }
  function sectionTitle(txt) {
    return '<div style="font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#8a948f;margin:18px 0 8px;">' + txt + '</div>';
  }
  function initials(name) {
    var p = String(name || '').trim().split(/\s+/).filter(Boolean);
    return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase();
  }

  // Загрузка заявок в кэш (для вкладок «Заявки»/«Уведомления» и бейджа).
  function loadCabApps(cb) {
    callCredit('/applications', { method: 'GET', auth: true })
      .then(function (r) {
        cabApps = (r.ok && Array.isArray(r.data)) ? r.data : [];
        if (cb) cb();
      });
  }

  // Уведомления (демо) — выводятся из статусов заявок.
  function notifEvents() {
    var ev = [];
    cabApps.forEach(function (a) {
      var rej = rejectLabel(a.status);
      if (rej) {
        ev.push({ kind: 'danger', title: 'Заявка № ' + a.number + ' отклонена', text: rej });
      } else {
        var idx = appStageIndex(a);
        if (idx > 0) ev.push({ kind: 'info', title: 'Заявка № ' + a.number, text: 'Текущий этап: ' + APP_STAGES[idx] });
      }
      ev.push({ kind: 'ok', title: 'Заявка № ' + a.number + ' принята', text: 'Данные подтянуты из госбаз (ГБД ФЛ, КГД, ПКБ)' });
    });
    if (!ev.length) ev.push({ kind: 'ok', title: 'Профиль подтверждён', text: 'Вход через eGov выполнен. Подайте заявку — статус будет виден здесь.' });
    return ev;
  }

  // --- боковое меню кабинета --------------------------------------------------
  function navBtn(tab, icon, label, badge) {
    return '<button class="cab-navbtn ' + (cabTab === tab ? 'on' : '') + '" data-cab-tab="' + tab + '">' +
      icon + '<span>' + label + '</span>' + (badge ? '<span class="nb-badge">' + badge + '</span>' : '') + '</button>';
  }
  function renderCabNav() {
    var nav = document.getElementById('cab-nav');
    if (!nav) return;
    var unread = unreadCount();
    nav.innerHTML =
      '<button class="cab-navbtn cab-back" id="cab-home">' + NAV_ICONS.home + '<span>На главную</span></button>' +
      '<div class="cab-navsep"></div>' +
      navBtn('profile', NAV_ICONS.profile, 'Профиль') +
      navBtn('apps', NAV_ICONS.apps, 'Мои заявки') +
      navBtn('docs', NAV_ICONS.docs, 'Документы') +
      navBtn('notif', NAV_ICONS.notif, 'Уведомления', unread) +
      navBtn('support', NAV_ICONS.support, 'Поддержка') +
      '<div class="cab-navsep"></div>' +
      '<button class="cab-navbtn" id="cab-logout" style="color:#d6336c;">' + NAV_ICONS.logout + '<span>Выйти</span></button>';
    var home = document.getElementById('cab-home');
    if (home) home.addEventListener('click', function () { window.exitCabinet(); });
    nav.querySelectorAll('[data-cab-tab]').forEach(function (b) {
      b.addEventListener('click', function () {
        cabTab = b.getAttribute('data-cab-tab');
        renderCabNav(); renderCabTab();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
    var lo = document.getElementById('cab-logout');
    if (lo) lo.addEventListener('click', function () { logout(); });
  }

  // --- контент вкладок --------------------------------------------------------
  function renderCabTab() {
    var main = document.getElementById('cab-main');
    if (!main) return;
    if (cabTab === 'apps') return renderAppsTab(main);
    if (cabTab === 'docs') return renderDocsTab(main);
    if (cabTab === 'notif') return renderNotifTab(main);
    if (cabTab === 'support') return renderSupportTab(main);
    return renderProfileTab(main);
  }

  function renderProfileTab(main) {
    var u = state.user || {};
    var g = govDataFor(u);
    var iin = onlyDigits(u.iin || '');
    main.innerHTML =
      '<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">' +
        '<div style="flex:0 0 56px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#2b8a3e,#37b24d);color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;">' + escHtml(initials(u.name)) + '</div>' +
        '<div style="min-width:0;">' +
          '<h2 class="cab-h2">' + escHtml(u.name || 'Профиль') + '</h2>' +
          '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' + srcChip('Верифицирован через eGov', '#1c6fd6') +
            '<span style="font-size:12px;color:#8a948f;">' + (u.phone ? formatPhone(onlyDigits(u.phone)) : '') + '</span></div>' +
        '</div>' +
      '</div>' +
      sectionTitle('Данные из госбаз') +
      '<div id="cab-gov"></div>';
    var govHost = document.getElementById('cab-gov');
    if (govAnimatedFor[iin]) govHost.innerHTML = profileHtml(g);
    else animateGov(govHost, g, iin);
  }

  var showAllApps = false;
  window.akkToggleApps = function () { showAllApps = !showAllApps; renderApps(); };

  function appsSummary() {
    var approved = 0, sum = 0;
    cabApps.forEach(function (a) {
      if (rejectLabel(a.status)) return;
      var idx = appStageIndex(a);
      if (idx >= 3) approved++;
      if (idx < APP_STAGES.length - 1) sum += (a.amount || 0);
    });
    return { total: cabApps.length, approved: approved, sum: sum };
  }
  function summaryHtml() {
    var s = appsSummary();
    function stat(label, val) {
      return '<div style="flex:1;min-width:110px;border:1px solid #e6ebe8;border-radius:10px;padding:10px 13px;background:#fff;">' +
        '<div style="font-size:11px;color:#8a948f;">' + label + '</div>' +
        '<div style="font-size:17px;font-weight:700;color:#14211b;margin-top:2px;">' + val + '</div></div>';
    }
    return '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:0 0 16px;">' +
      stat('Заявок', s.total) + stat('Одобрено', s.approved) + stat('Запрошено', fmtMoney(s.sum)) + '</div>';
  }
  var APPS_EMPTY_SVG =
    '<svg width="120" height="86" viewBox="0 0 120 86" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="92" cy="24" r="14" fill="#37b24d" opacity="0.14"/><circle cx="92" cy="24" r="7" fill="#37b24d" opacity="0.45"/>' +
    '<path d="M10 66h100" stroke="#9fc3ab" stroke-width="2" stroke-linecap="round"/>' +
    '<g stroke="#2b8a3e" stroke-width="2.2" stroke-linecap="round" fill="none">' +
    '<path d="M38 66V48"/><path d="M38 55c-6-2-9-8-9-8M38 53c5-2 8-7 8-7"/>' +
    '<path d="M60 66V42"/><path d="M60 51c-7-2-10-9-10-9M60 49c6-2 10-8 10-8"/>' +
    '<path d="M82 66V51"/><path d="M82 57c-6-2-8-6-8-6M82 55c5-2 7-6 7-6"/>' +
    '</g></svg>';
  function emptyAppsHtml() {
    return '<div style="text-align:center;padding:34px 16px;border:1px dashed #d7e0db;border-radius:14px;background:#fafdfb;">' +
      APPS_EMPTY_SVG +
      '<div style="font-size:15px;font-weight:700;color:#14211b;margin-top:12px;">Заявок пока нет</div>' +
      '<div class="auth-sub" style="margin:6px auto 16px;max-width:340px;">Подберите программу под вашу деятельность — расчёт займёт минуту, документы подтянем из госбаз.</div>' +
      '<button class="auth-btn auth-btn-primary" style="display:inline-flex;width:auto;padding:0 22px;" onclick="exitCabinet(); startQuiz();">Подобрать программу</button>' +
      '</div>';
  }

  function renderAppsTab(main) {
    main.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px;">' +
        '<h2 class="cab-h2" style="margin:0;">Мои заявки</h2>' +
        '<button class="auth-btn auth-btn-primary" style="flex:0 0 auto;" onclick="exitCabinet(); startQuiz();">+ Подать заявку</button>' +
      '</div>' +
      '<div id="cab-apps-summary"></div>' +
      '<div id="cab-apps"><div class="auth-sub" style="margin:0;">Загружаем ваши заявки…</div></div>';
    renderApps();
  }
  function renderApps() {
    var host = document.getElementById('cab-apps');
    if (!host) return;
    var sumHost = document.getElementById('cab-apps-summary');
    if (!cabApps.length) {
      if (sumHost) sumHost.innerHTML = '';
      host.innerHTML = emptyAppsHtml();
      return;
    }
    if (sumHost) sumHost.innerHTML = summaryHtml();
    var list = showAllApps ? cabApps : cabApps.slice(0, 3);
    host.innerHTML = list.map(appCardHtml).join('') +
      (cabApps.length > 3
        ? '<button class="auth-btn auth-btn-ghost" style="width:100%;" onclick="akkToggleApps()">' + (showAllApps ? 'Свернуть' : 'Показать все (' + cabApps.length + ')') + '</button>'
        : '');
  }

  function renderDocsTab(main) {
    main.innerHTML = '<h2 class="cab-h2">Документы</h2>' +
      '<p class="auth-sub" style="margin:0 0 14px;">Документы по заявке — получены из госбаз или подписаны онлайн.</p>' +
      documentsHtml();
  }

  function renderNotifTab(main) {
    notifRead = true;
    renderCabNav();
    try { window.renderAuthSlot(); } catch (e) {}
    var ev = notifEvents();
    var color = { ok: '#2b8a3e', info: '#1c6fd6', danger: '#d6336c' };
    main.innerHTML = '<h2 class="cab-h2">Уведомления</h2>' +
      '<div style="border:1px solid #e6ebe8;border-radius:12px;background:#fff;overflow:hidden;margin-top:4px;">' +
      ev.map(function (n, i) {
        var c = color[n.kind] || '#1c6fd6';
        return '<div class="akk-fade" style="display:flex;gap:11px;padding:13px 14px;' + (i ? 'border-top:1px solid #f0f3f1;' : '') + '">' +
          '<span style="flex:0 0 9px;width:9px;height:9px;border-radius:50%;background:' + c + ';margin-top:5px;"></span>' +
          '<div style="min-width:0;"><div style="font-size:13.5px;font-weight:600;color:#14211b;">' + escHtml(n.title) + '</div>' +
          '<div style="font-size:12.5px;color:#8a948f;margin-top:2px;">' + escHtml(n.text) + '</div></div></div>';
      }).join('') + '</div>';
  }

  function renderSupportTab(main) {
    main.innerHTML = '<h2 class="cab-h2">Поддержка</h2>' +
      '<div class="akk-grid" style="margin-top:4px;">' +
      infoCard('Контакт-центр', srcChip('пн–пт 09:00–18:00', '#0c8577'), [
        ['Телефон', '<a href="tel:1408" style="color:var(--primary,#2b8a3e);font-weight:700;">1408</a>'],
        ['Email', 'info@agrocredit.kz'],
        ['Сайт', 'agrocredit.kz']
      ]) +
      infoCard('Частые вопросы', srcChip('FAQ', '#6741d9'), [
        ['Сроки рассмотрения', 'до 10 раб. дней'],
        ['Носить ли документы', 'нет — всё из госбаз'],
        ['Как узнать статус', '«Мои заявки»']
      ]) +
      '</div>';
  }

  // Демо-управление движением заявки: продвинуть на следующий этап (status=null)
  // или сбросить на конкретный (status='new'). После ответа — перерисовать кабинет.
  // =========================================================================
  // СТРАНИЦА ЗАЯВКИ (трекер): этапы + чек-лист «что нужно сейчас» + загрузка.
  // =========================================================================
  function findApp(uid) {
    for (var i = 0; i < cabApps.length; i++) { if (cabApps[i].uid === uid) return cabApps[i]; }
    return null;
  }

  // Секцию-страницу заявки внедряем один раз (как и кабинет — не трогая index.html).
  function ensureApplicationSection() {
    if (document.getElementById('application-section')) return;
    var sec = document.createElement('section');
    sec.id = 'application-section';
    sec.className = 'section';
    sec.hidden = true;
    sec.innerHTML = '<div class="appx-page" id="application-container"></div>';
    var anchor = document.getElementById('cabinet-section') || document.getElementById('success-section');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(sec, anchor.nextSibling);
    else document.body.appendChild(sec);
  }

  window.openApplication = function (uid) {
    if (!state.user) { return origOpenAuth.call(window, 'login'); }
    ensureCabStyle();
    ensureApplicationSection();
    closeAuth();
    closeAuthDropdown();
    LANDING_IDS.concat(FLOW_IDS).forEach(function (id) { setHidden(id, true); });
    setHidden('cabinet-section', true);
    setHidden('application-section', false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    var host = document.getElementById('application-container');
    if (host) host.innerHTML = '<button class="appx-back" onclick="openCabinet(\'apps\')">← Назад к заявкам</button>' +
      '<div class="auth-sub" style="margin:0;">Загружаем заявку…</div>';
    if (findApp(uid)) renderApplication(uid);
    else loadCabApps(function () { renderApplication(uid); });
  };

  function docBadge(source) {
    if (source === 'gov') return '<span class="appx-badge appx-badge-gov">Из госбаз</span>';
    if (source === 'sign') return '<span class="appx-badge appx-badge-sign">Подпись ЭЦП</span>';
    return '<span class="appx-badge appx-badge-upload">Загрузка</span>';
  }
  function docDone(doc) { return doc.status === 'verified' || doc.status === 'uploaded'; }

  // interactive — текущий этап (можно загружать/подписывать); иначе только статус.
  function docRowHtml(uid, doc, interactive) {
    var act;
    if (docDone(doc)) {
      act = '<span class="appx-check">✓</span>';
    } else if (!interactive) {
      act = '<span class="appx-badge" style="background:#f0f3f1;color:#9aa6a0;">ожидается</span>';
    } else if (doc.source === 'sign') {
      act = '<button class="appx-up-btn" onclick="akkSignDoc(\'' + uid + '\',\'' + doc.requirement_key + '\',this)">Подписать ЭЦП</button>';
    } else {
      var fid = 'appx-file-' + doc.requirement_key;
      act = '<button class="appx-up-btn" onclick="document.getElementById(\'' + fid + '\').click()">Загрузить</button>' +
        '<input type="file" id="' + fid + '" style="display:none" onchange="akkUploadDoc(\'' + uid + '\',\'' + doc.requirement_key + '\',this)">';
    }
    return '<div class="appx-doc-row">' +
      '<div class="appx-doc-main"><div class="appx-doc-title">' + escHtml(doc.title) + '</div>' +
        (doc.file_name ? '<div class="appx-doc-file">' + escHtml(doc.file_name) + '</div>' : '') + '</div>' +
      docBadge(doc.source) +
      '<div class="appx-doc-act">' + act + '</div>' +
      '</div>';
  }

  // Свёрнутый блок прошлого/будущего этапа с документами.
  function collapsedStageHtml(uid, stage, kind) {
    var dot = kind === 'past'
      ? '<span class="appx-stage-dot" style="background:var(--primary,#2b8a3e);">✓</span>'
      : '<span class="appx-stage-dot" style="background:#cfd6d2;"></span>';
    var rows = stage.documents.map(function (d) { return docRowHtml(uid, d, false); }).join('');
    return '<details class="appx-stage-collapsed">' +
      '<summary>' + dot + '<span>' + escHtml(stage.label) + '</span>' +
        '<span style="margin-left:auto;font-size:11px;color:#9aa6a0;">' + stage.documents.length + ' док.</span></summary>' +
      '<div class="appx-stage-body">' + rows + '</div></details>';
  }

  function applicationHtml(a, dto) {
    var idx = appStageIndex(a);
    var rej = rejectLabel(a.status);
    var prog = (typeof PROGRAMS !== 'undefined') && PROGRAMS.find(function (p) { return p.id === a.program_id; });
    var cat = prog ? (prog.category || '') : '';

    var head = '<div class="appx-header">' +
      '<h2>' + escHtml(programTitle(a.program_id)) + '</h2>' +
      (cat ? '<div style="font-size:12px;color:#8a948f;">' + escHtml(cat) + '</div>' : '') +
      '<div class="appx-meta">' +
        '<span>Заявка <b>№ ' + escHtml(a.number) + '</b></span>' +
        '<span>Сумма <b>' + escHtml(fmtMoney(a.amount)) + '</b></span>' +
        (rej ? '' : '<span class="appx-stage-pill">● ' + escHtml(APP_STAGES[idx] || '') + '</span>') +
      '</div></div>';

    var timeline = '<div class="appx-card"><div class="appx-card-title">Движение заявки</div>' +
      (rej ? rejectedTimelineHtml(Math.min(idx, APP_STAGES.length - 1), rej) : statusTimelineHtml(idx)) + '</div>';

    if (rej) {
      return head + timeline +
        '<div class="appx-card"><p class="auth-sub" style="margin:0;">Заявка закрыта. По вопросам обратитесь в колл-центр 1408.</p></div>' +
        controlsHtml(a);
    }

    var stages = (dto && dto.stages) || [];
    var current = null, past = [], future = [];
    stages.forEach(function (s) {
      if (!s.documents || !s.documents.length) { if (s.stage_index === idx) current = s; return; }
      if (s.stage_index === idx) current = s;
      else if (s.stage_index < idx) past.push(s);
      else future.push(s);
    });

    var nowBody;
    if (current && current.documents && current.documents.length) {
      nowBody = current.documents.map(function (d) { return docRowHtml(a.uid, d, true); }).join('');
    } else {
      nowBody = '<p class="auth-sub" style="margin:0;">На этом этапе загрузка документов не требуется — заявка обрабатывается специалистами АКК.</p>';
    }
    var now = '<div class="appx-card appx-now"><div class="appx-card-title">Что нужно сейчас · ' + escHtml(APP_STAGES[idx] || '') + '</div>' + nowBody + '</div>';

    var pastHtml = past.length ? ('<div class="appx-card-title" style="margin-top:6px;">Пройденные этапы</div>' +
      past.map(function (s) { return collapsedStageHtml(a.uid, s, 'past'); }).join('')) : '';
    var futureHtml = future.length ? ('<div class="appx-card-title" style="margin-top:6px;">Впереди</div>' +
      future.map(function (s) { return collapsedStageHtml(a.uid, s, 'future'); }).join('')) : '';

    return head + timeline + now + pastHtml + futureHtml + controlsHtml(a);
  }

  // Демо-управление этапами на странице заявки (те же действия, что в карточке кабинета).
  function controlsHtml(a) {
    var rej = rejectLabel(a.status);
    var idx = appStageIndex(a);
    var isFinal = idx >= APP_STAGES.length - 1;
    var buttons = '';
    if (!rej && !isFinal) {
      buttons += '<button class="auth-btn auth-btn-primary" style="padding:7px 13px;font-size:12px;" onclick="akkAdvanceApp(\'' + a.uid + '\', null, this)">Продвинуть этап →</button>' +
        '<button class="auth-btn auth-btn-ghost" style="padding:7px 13px;font-size:12px;color:var(--danger,#d6336c);" onclick="akkAdvanceApp(\'' + a.uid + '\', \'rejected\', this)">Отклонить</button>';
    }
    buttons += '<button class="auth-btn auth-btn-ghost" style="padding:7px 13px;font-size:12px;" onclick="akkAdvanceApp(\'' + a.uid + '\', \'new\', this)">Сбросить</button>';
    return '<div class="appx-card" style="background:#fafbfa;"><div class="appx-card-title">Демо-управление</div>' +
      '<p class="auth-sub" style="margin:0 0 10px;font-size:11.5px;">В рабочей системе этапы переключаются автоматически по ходу workflow. Здесь — вручную для показа.</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' + buttons + '</div></div>';
  }

  function renderApplication(uid) {
    var host = document.getElementById('application-container');
    if (!host) return;
    var a = findApp(uid);
    if (!a) {
      host.innerHTML = '<button class="appx-back" onclick="openCabinet(\'apps\')">← Назад к заявкам</button>' +
        '<p class="auth-sub" style="margin:0;">Заявка не найдена.</p>';
      return;
    }
    var back = '<button class="appx-back" onclick="openCabinet(\'apps\')">← Назад к заявкам</button>';
    callCredit('/applications/' + uid + '/documents', { method: 'GET', auth: true })
      .then(function (r) {
        var dto = (r.ok && r.data) ? r.data : null;
        host.innerHTML = back + applicationHtml(a, dto);
      });
  }

  // Загрузка файла по требованию текущего этапа (метаданные; файл-байты пока не храним).
  window.akkUploadDoc = function (uid, reqKey, input) {
    var f = input && input.files && input.files[0];
    if (!f) return;
    postDoc(uid, reqKey, f.name);
  };
  // Подписание ЭЦП (демо): отправляем синтетическое имя файла.
  window.akkSignDoc = function (uid, reqKey, btn) {
    if (btn) { btn.disabled = true; btn.textContent = '…'; }
    postDoc(uid, reqKey, 'signed-' + reqKey + '.pdf');
  };
  function postDoc(uid, reqKey, fileName) {
    callCredit('/applications/' + uid + '/documents', { method: 'POST', auth: true,
      body: { requirement_key: reqKey, file_name: fileName } })
      .then(function (r) {
        if (r.ok) { renderApplication(uid); return; }
        var host = document.getElementById('application-container');
        if (host) host.insertAdjacentHTML('beforeend',
          '<p class="auth-err" style="margin-top:8px;">' + errText(r, 'Не удалось сохранить документ.') + '</p>');
      });
  }

  window.akkAdvanceApp = function (uid, status, btn) {
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = '…'; }
    var body = status ? { status: status } : undefined;
    callCredit('/applications/' + uid + '/advance', { method: 'POST', auth: true, body: body })
      .then(function (r) {
        if (!r.ok) {
          if (btn) { btn.disabled = false; if (btn.dataset.label) btn.textContent = btn.dataset.label; }
          var host = document.getElementById('cab-apps');
          if (host) host.insertAdjacentHTML('beforeend',
            '<p class="auth-err" style="margin-top:6px;">' + errText(r, 'Не удалось обновить этап.') + '</p>');
          return;
        }
        // обновляем кэш заявок и перерисовываем список + бейдж уведомлений
        var appSec = document.getElementById('application-section');
        if (appSec && !appSec.hidden) {
          loadCabApps(function () { renderApplication(uid); renderCabNav(); });
        } else {
          loadCabApps(function () { renderApps(); renderCabNav(); });
        }
      });
  };

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
          '<button class="btn-ghost" onclick="openCabinet(\'apps\')">Открыть личный кабинет</button>' +
          '<button class="btn-ghost" onclick="resetAll()">Подобрать другую программу</button>' +
        '</div>' +
      '</div>';
    showSection('success-section');
  };

  // Восстановление сессии: если есть валидный токен, но state.user пуст — поднимем профиль.
  // =========================================================================
  // ВИЗАРД ПОДАЧИ ЗАЯВКИ (банковский флоу вместо формы обратной связи).
  // Шаги: параметры → заявитель → согласия → подтверждение по SMS → готово.
  // gov-данные «подтягиваются» автоматически; согласия подписываются SMS-кодом.
  // =========================================================================
  var WIZ_STEPS = ['Параметры', 'Заявитель', 'Согласия', 'Подтверждение', 'Готово'];
  var wiz = null;
  var wizStep = 0;
  var WIZ_SOURCES = 'ГБД ФЛ, КГД, ЕНПФ, ПКБ, ИСЖИБ и земельного кадастра';

  function initWiz() {
    var pid = state.selectedProgram;
    var prog = (typeof PROGRAMS !== 'undefined') && PROGRAMS.find(function (p) { return p.id === pid; });
    var calc = (state.calc && state.calc[pid]) || {};
    return {
      programId: pid, program: prog || null,
      amount: calc.amount || 0,
      term: calc.term || 60,
      purpose: prog ? (prog.category || prog.title) : '',
      consents: { pd: false, pkb: false, gov: false },
      otp: { code: '', sent: false },
      created: null
    };
  }

  // Перехват: заявка по программе → визард; консультация (без программы) → старая форма.
  var origShowCallback = window.showCallback;
  window.showCallback = function () {
    if (state.selectedProgram) return startWizard();
    return origShowCallback.apply(window, arguments);
  };

  function startWizard() {
    if (!accessToken()) { pendingWizard = true; openAuth('login'); return; }
    wiz = initWiz();
    wizStep = 0;
    if (typeof showSection === 'function') showSection('callback-section');
    // фокусируемся на заявке — прячем маркетинговый лендинг (как в банке)
    LANDING_IDS.forEach(function (id) { setHidden(id, true); });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderWizard();
  }
  // Выход из визарда обратно к программам (восстанавливаем лендинг).
  window.akkWizExit = function () {
    setHidden('callback-section', true);
    LANDING_IDS.forEach(function (id) { setHidden(id, false); });
    var p = document.getElementById('programs');
    if (p) p.scrollIntoView({ behavior: 'smooth' });
  };

  function wizProgressHtml() {
    return '<div style="display:flex;gap:6px;margin:0 0 20px;">' +
      WIZ_STEPS.map(function (s, i) {
        var on = i <= wizStep;
        return '<div style="flex:1;text-align:center;">' +
          '<div style="height:4px;border-radius:2px;background:' + (on ? 'var(--primary,#2b8a3e)' : '#e3e8e5') + ';"></div>' +
          '<div style="font-size:10.5px;margin-top:5px;color:' + (i === wizStep ? 'var(--primary,#2b8a3e)' : '#9aa6a0') + ';font-weight:' + (i === wizStep ? '700' : '500') + ';">' + s + '</div></div>';
      }).join('') + '</div>';
  }

  function wizShell(bodyHtml) {
    var host = document.getElementById('callback-container');
    if (!host) return;
    var prog = wiz.program;
    host.innerHTML =
      '<button class="muted-link" onclick="akkWizExit()" style="margin-bottom:14px;">← К программам</button>' +
      '<div class="callback-wrap fade-in" style="max-width:560px;">' +
        '<div class="section-eyebrow" style="margin-bottom:6px;">Заявка на кредит</div>' +
        '<h2 class="stress-title" style="margin:0 0 4px;">' + escHtml(prog ? prog.title : 'Заявка') + '</h2>' +
        (prog && prog.category ? '<p class="stress-sub" style="margin:0 0 16px;">' + escHtml(prog.category) + '</p>' : '<div style="height:8px;"></div>') +
        wizProgressHtml() +
        '<div id="wiz-err" class="auth-err" style="margin-bottom:10px;"></div>' +
        bodyHtml +
      '</div>';
  }
  function wizError(msg) { var e = document.getElementById('wiz-err'); if (e) e.textContent = msg || ''; }
  function wizNav(nextLabel, opts) {
    opts = opts || {};
    return '<div style="display:flex;gap:10px;margin-top:22px;">' +
      (wizStep > 0 && !opts.noBack ? '<button class="auth-btn auth-btn-ghost" style="flex:0 0 auto;" onclick="akkWizBack()">Назад</button>' : '') +
      (opts.hideNext ? '' : '<button class="btn-submit" id="wiz-next" style="flex:1;margin:0;" onclick="akkWizNext()">' + (nextLabel || 'Далее') + '</button>') +
      '</div>';
  }

  function renderWizard() {
    if (!wiz) wiz = initWiz();
    if (wizStep === 1) return wizApplicant();
    if (wizStep === 2) return wizConsents();
    if (wizStep === 3) return wizSms();
    if (wizStep === 4) return wizDone();
    return wizParams();
  }

  // Шаг 1 — параметры займа
  function wizParams() {
    var terms = [12, 24, 36, 60, 84, 120];
    wizShell(
      '<div class="field"><label>Сумма займа, ₸</label>' +
        '<input class="text-input" id="wiz-amount" inputmode="numeric" value="' + (wiz.amount ? Number(wiz.amount).toLocaleString('ru-RU') : '') + '" placeholder="например, 5 000 000"></div>' +
      '<div class="field"><label>Срок, мес.</label>' +
        '<select class="text-input" id="wiz-term">' + terms.map(function (t) {
          return '<option value="' + t + '"' + (t === wiz.term ? ' selected' : '') + '>' + t + ' мес. (' + (t / 12) + ' г.)</option>';
        }).join('') + '</select></div>' +
      '<div class="field"><label>Цель кредитования</label>' +
        '<input class="text-input" id="wiz-purpose" value="' + escHtml(wiz.purpose) + '" placeholder="на что направите средства"></div>' +
      wizNav('Далее')
    );
    var amt = document.getElementById('wiz-amount');
    if (amt) amt.addEventListener('input', function () {
      var d = onlyDigits(amt.value); amt.value = d ? Number(d).toLocaleString('ru-RU') : '';
    });
  }

  // Шаг 2 — заявитель (данные из госбаз)
  function wizApplicant() {
    var u = state.user || {};
    var g = govDataFor(u);
    function row(label, val, chip) {
      return '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #f0f3f1;">' +
        '<span style="color:#8a948f;font-size:12.5px;">' + label + '</span>' +
        '<span style="display:flex;align-items:center;gap:8px;text-align:right;"><b style="font-weight:600;font-size:13px;">' + escHtml(val) + '</b>' + (chip || '') + '</span></div>';
    }
    wizShell(
      '<p class="stress-sub" style="margin:0 0 14px;">Данные заявителя подтянуты автоматически и подтверждены через eGov.</p>' +
      '<div style="border:1px solid #e6ebe8;border-radius:12px;padding:6px 14px;background:#fff;">' +
        row('ФИО', g.identity.fio, srcChip('ГБД ФЛ', '#1c6fd6')) +
        row('ИИН', g.identity.iin, '') +
        row('Дата рождения', g.identity.birth, '') +
        row('Адрес', g.identity.address, '') +
        row('Телефон', u.phone ? formatPhone(onlyDigits(u.phone)) : '—', srcChip('БМГ', '#0c8577')) +
      '</div>' +
      wizNav('Далее')
    );
  }

  // Шаг 3 — согласия
  function wizConsents() {
    function c(key, title, why) {
      return '<label style="display:flex;gap:11px;align-items:flex-start;padding:12px 0;border-bottom:1px solid #f0f3f1;cursor:pointer;">' +
        '<input type="checkbox" id="wiz-c-' + key + '"' + (wiz.consents[key] ? ' checked' : '') + ' onchange="akkWizConsent(\'' + key + '\',this.checked)" style="margin-top:3px;width:18px;height:18px;flex:0 0 18px;">' +
        '<span><span style="font-size:13.5px;font-weight:600;color:#14211b;">' + title + '</span>' +
        '<span style="display:block;font-size:12px;color:#8a948f;margin-top:2px;">' + why + '</span></span></label>';
    }
    wizShell(
      '<p class="stress-sub" style="margin:0 0 6px;">Для рассмотрения заявки нужны ваши согласия:</p>' +
      '<div style="border:1px solid #e6ebe8;border-radius:12px;padding:2px 14px;background:#fff;">' +
        c('pd', 'Согласие на обработку персональных данных', 'Необходимо для регистрации и рассмотрения заявки в АКК.') +
        c('pkb', 'Согласие на запрос кредитной истории', 'Запрос в ПКБ/ГКБ для оценки кредитоспособности.') +
        c('gov', 'Согласие на получение сведений из госбаз', 'ГБД ФЛ, КГД, ЕНПФ, ИСЖИБ, земельный кадастр — для проверки данных и активов.') +
      '</div>' +
      wizNav('Далее')
    );
  }

  // Шаг 4 — подтверждение по SMS
  function wizSms() {
    var u = state.user || {};
    var phone = u.phone ? formatPhone(onlyDigits(u.phone)) : 'привязанный номер';
    var info = '<div style="border:1px solid #dbe7f6;background:#f4f8fe;border-radius:12px;padding:13px 15px;font-size:12.5px;color:#2b4257;line-height:1.5;">' +
      'Запрашиваем ваши сведения из <b>' + WIZ_SOURCES + '</b> для рассмотрения заявки по программе «' + escHtml(wiz.program ? wiz.program.title : '') + '». ' +
      'Подтвердите согласие кодом из SMS на <b>' + escHtml(phone) + '</b>.</div>';
    if (!wiz.otp.sent) {
      wizShell(info + '<div style="margin-top:16px;"></div>' +
        '<button class="btn-submit" style="margin:0;" onclick="akkWizSendSms(this)">Отправить код по SMS</button>' +
        '<div style="margin-top:10px;"><button class="auth-btn auth-btn-ghost" onclick="akkWizBack()">Назад</button></div>');
      return;
    }
    wizShell(info +
      '<div class="field" style="margin-top:16px;"><label>Код из SMS</label>' +
        '<input class="text-input" id="wiz-otp" inputmode="numeric" maxlength="6" placeholder="••••••" style="letter-spacing:8px;text-align:center;font-size:20px;font-weight:700;"></div>' +
      '<div class="demo-badge" style="margin:0 0 6px;">демо · код подставлен автоматически</div>' +
      wizNav('Подтвердить и подать заявку'));
    var el = document.getElementById('wiz-otp');
    if (el) { el.value = wiz.otp.code; el.addEventListener('input', function () { el.value = onlyDigits(el.value).slice(0, 6); }); }
  }

  // Шаг 5 — готово
  function wizDone() {
    var c = wiz.created || {};
    wizShell(
      '<div style="text-align:center;padding:6px 0 2px;">' +
        '<div class="success-icon" style="margin:0 auto 10px;">✓</div>' +
        '<h2 class="success-title" style="margin:0 0 4px;">Заявка подана</h2>' +
        '<div class="success-num" style="margin-bottom:8px;">Номер заявки: <strong>' + escHtml(c.number || '—') + '</strong></div>' +
        '<p class="auth-sub" style="max-width:420px;margin:0 auto 4px;">Данные получены из госбаз, согласия подписаны по SMS. Отслеживайте движение заявки по этапам в личном кабинете.</p>' +
      '</div>' +
      '<div style="display:flex;gap:10px;margin-top:18px;">' +
        '<button class="btn-submit" style="flex:1;margin:0;" onclick="akkWizOpenApp()">Открыть заявку →</button>' +
        '<button class="auth-btn auth-btn-ghost" style="flex:0 0 auto;" onclick="openCabinet(\'apps\')">В кабинет</button>' +
      '</div>'
    );
  }

  window.akkWizBack = function () { if (wizStep > 0) { wizStep--; renderWizard(); } };
  window.akkWizConsent = function (key, val) { if (wiz) wiz.consents[key] = !!val; };
  window.akkWizSendSms = function (btn) {
    if (btn) { btn.disabled = true; btn.textContent = 'Отправка…'; }
    wiz.otp.code = String(Math.floor(100000 + Math.random() * 900000));
    wiz.otp.sent = true;
    renderWizard();
  };
  window.akkWizOpenApp = function () {
    var uid = wiz.created && wiz.created.uid;
    if (!uid) return openCabinet('apps');
    loadCabApps(function () { openApplication(uid); });
  };
  window.akkWizNext = function () {
    if (!wiz) return;
    if (wizStep === 0) {
      var amt = parseInt(onlyDigits((document.getElementById('wiz-amount') || {}).value || ''), 10) || 0;
      wiz.amount = amt;
      wiz.term = parseInt((document.getElementById('wiz-term') || {}).value || '60', 10) || 60;
      wiz.purpose = ((document.getElementById('wiz-purpose') || {}).value || wiz.purpose || '').trim();
      if (wiz.amount <= 0) { wizError('Укажите сумму займа.'); return; }
      wizStep = 1; renderWizard(); return;
    }
    if (wizStep === 1) { wizStep = 2; renderWizard(); return; }
    if (wizStep === 2) {
      if (!(wiz.consents.pd && wiz.consents.pkb && wiz.consents.gov)) { wizError('Отметьте все согласия, чтобы продолжить.'); return; }
      wizStep = 3; renderWizard(); return;
    }
    if (wizStep === 3) {
      var entered = onlyDigits((document.getElementById('wiz-otp') || {}).value || '');
      if (!wiz.otp.sent) { wizError('Сначала отправьте код.'); return; }
      if (entered.length !== 6 || entered !== wiz.otp.code) { wizError('Неверный код из SMS.'); return; }
      wizCreateApplication();
      return;
    }
  };

  function wizCreateApplication() {
    var btn = document.getElementById('wiz-next');
    if (btn) { btn.disabled = true; btn.textContent = 'Создаём заявку…'; }
    var u = state.user || {};
    var payload = {
      requested_amount: wiz.amount,
      loan_purpose: wiz.purpose || (wiz.program ? wiz.program.category : ''),
      program_id: wiz.programId || '',
      onboarding: {
        params: { amount: wiz.amount, term_months: wiz.term, purpose: wiz.purpose },
        applicant: { name: u.name, iin: u.iin, phone: u.phone },
        consents: { personal_data: true, credit_bureau: true, gov_sources: true, signed_via: 'sms' },
        program: wiz.program ? { id: wiz.program.id, title: wiz.program.title, category: wiz.program.category } : null,
        answers: state.answers || null
      }
    };
    callCredit('/applications', { method: 'POST', auth: true, body: payload })
      .then(function (r) {
        if (r.status === 401) { pendingWizard = true; openAuth('login'); return; }
        if (!r.ok) {
          wizError(errText(r, 'Не удалось создать заявку.'));
          if (btn) { btn.disabled = false; btn.textContent = 'Подтвердить и подать заявку'; }
          return;
        }
        wiz.created = r.data;
        if (r.data && r.data.number) state.leadNumber = r.data.number;
        wizStep = 4; renderWizard();
      });
  }

  (function restore() {
    var tok = accessToken();
    if (tok && !state.user) {
      var prof = profileFromTokens(loadTokens(), '');
      if (prof.iin || prof.name) {
        state.user = { name: prof.name, iin: prof.iin, phone: prof.phone, via: 'sms' };
      }
    }
    // index.html уже вызвал renderAuthSlot() (старой версией) ДО загрузки интеграции,
    // поэтому у уже залогиненной сессии оставался старый чип без дропдауна.
    // Перерисовываем шапку новой версией, если пользователь авторизован.
    if (state.user) { try { window.renderAuthSlot(); } catch (e) {} }
    try { wireHeaderNav(); } catch (e) {}
  })();

  log('integration loaded; AUTH =', AUTH, '; CREDIT =', CREDIT);
})();
