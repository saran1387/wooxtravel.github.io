(function () {
  'use strict';

  /* ---------- styles (injected, so no CSS file to edit) ---------- */
  var CSS = [
    '.field-error{margin-top:6px;font-size:13px;line-height:1.4;color:#d93025;}',
    '.field-error[hidden]{display:none;}',
    '.field-error::before{content:"\\26A0\\00a0";}',
    'form .has-error{border:1px solid #d93025 !important;box-shadow:0 0 0 3px rgba(217,48,37,.12);}',
    '.form-success{padding:50px 20px;text-align:center;color:#1e7a34;}',
    '.form-success[hidden]{display:none;}',
    '.form-success strong{display:block;font-size:26px;line-height:1.3;margin-bottom:10px;}',
    '.form-success strong::before{content:"\\2713";display:block;width:70px;height:70px;line-height:70px;',
    'margin:0 auto 20px;border-radius:50%;background:#e6f4ea;font-size:34px;}',
    '.form-success span{display:block;font-size:16px;color:#666;}'
  ].join('\n');

  function injectStyles() {
    if (document.getElementById('reservation-validation-styles')) return;
    var s = document.createElement('style');
    s.id = 'reservation-validation-styles';
    s.appendChild(document.createTextNode(CSS));
    document.head.appendChild(s);
  }

  /* ---------- rules: each returns an error message, or '' when valid ---------- */
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' +
      ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
      ('0' + d.getDate()).slice(-2);
  }

  function validateName(el) {
    var v = el.value.trim();
    if (!v) return 'Please enter your name.';
    if (v.length < 2) return 'Name must be at least 2 characters.';
    if (!/^[\p{L}][\p{L} .'\-]*$/u.test(v)) {
      return 'Name can only contain letters, spaces, apostrophes and hyphens.';
    }
    return '';
  }

  function validatePhone(el) {
    var v = el.value.trim();
    if (!v) return 'Please enter your phone number.';
    var digits = v.replace(/[\s\-().]/g, '');
    if (!/^\+?\d{7,15}$/.test(digits)) {
      return 'Enter a valid phone number, e.g. +41 79 123 4567.';
    }
    return '';
  }

  // The template's first <option> is a placeholder ("ex. 3 or 4 or 5") with no value,
  // so the browser's own "required" check would accept it. Treat it as "not chosen".
  function validateSelect(el, message) {
    var first = el.options[0];
    var placeholderChosen = el.selectedIndex === 0 && first &&
      (!first.hasAttribute('value') || first.value === '');
    if (el.selectedIndex === -1 || el.value === '' || placeholderChosen) return message;
    return '';
  }

  function validateDate(el) {
    if (!el.value) return 'Please choose a check-in date.';
    if (el.value < todayISO()) return "Check-in date can't be in the past.";
    return '';
  }

  /* ---------- error UI ---------- */
  var uid = 0;

  function errorBox(el) {
    var holder = el.closest('fieldset') || el.parentNode;
    var box = holder.querySelector('.field-error');
    if (!box) {
      box = document.createElement('div');
      box.className = 'field-error';
      box.id = 'field-error-' + (++uid);
      box.setAttribute('role', 'alert');
      box.hidden = true;
      holder.appendChild(box);
    }
    return box;
  }

  // Shows or clears the message for one field. Returns true when the field is valid.
  function setError(el, message) {
    var box = errorBox(el);
    if (message) {
      box.textContent = message;
      box.hidden = false;
      el.classList.add('has-error');
      el.setAttribute('aria-invalid', 'true');
      el.setAttribute('aria-describedby', box.id);
    } else {
      box.textContent = '';
      box.hidden = true;
      el.classList.remove('has-error');
      el.removeAttribute('aria-invalid');
      el.removeAttribute('aria-describedby');
    }
    return !message;
  }

  /* ---------- wire-up ---------- */
  function init() {
    var form = document.querySelector('.reservation-form form') ||
               document.querySelector('form#reservation-form') ||
               document.querySelector('form');
    if (!form) return;

    injectStyles();
    form.setAttribute('novalidate', 'novalidate');

    // Fields are found by name first, then by position, so small markup
    // differences in the template don't break it.
    var textInputs = form.querySelectorAll('input[type="text"], input[type="tel"], input:not([type])');
    var selects = form.querySelectorAll('select');
    var dateInput = form.querySelector('input[type="date"]');
    if (dateInput) dateInput.setAttribute('min', todayISO());

    var fields = [
      { el: form.querySelector('input[name="Name"]') || textInputs[0], validate: validateName },
      { el: form.querySelector('input[name="Number"]') || textInputs[1], validate: validatePhone },
      {
        el: form.querySelector('select[name="Guests"]') || selects[0],
        validate: function (el) { return validateSelect(el, 'Please select the number of guests.'); }
      },
      { el: dateInput, validate: validateDate },
      {
        el: form.querySelector('select[name="Destination"]') || selects[1],
        validate: function (el) { return validateSelect(el, 'Please choose a destination.'); }
      }
    ].filter(function (f) { return f.el; });

    var successBox = null;

    function clearSuccess() {
      if (successBox) successBox.hidden = true;
    }

    function formatDate(iso) {
      var p = iso.split('-');
      var d = new Date(+p[0], +p[1] - 1, +p[2]);
      return isNaN(d.getTime()) ? iso :
        d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    }

    function showSuccess(data) {
      // Hide everything inside the form (heading, fields, button) so that only the
      // message is left. It is shown inside the form element itself, so it keeps the
      // template's white card styling.
      Array.prototype.slice.call(form.children).forEach(function (child) {
        if (child !== successBox) child.style.display = 'none';
      });

      if (!successBox) {
        successBox = document.createElement('div');
        successBox.className = 'form-success';
        successBox.setAttribute('role', 'status');
        form.appendChild(successBox);
      }

      // Built with textContent (never innerHTML) because the name is user input.
      var title = document.createElement('strong');
      title.textContent = 'Thank you, ' + data.name + '! Your reservation is booked.';
      var details = document.createElement('span');
      details.textContent = data.destination + ' · ' +
        (data.guests === '1' ? '1 guest' : data.guests + ' guests') +
        ' · check-in ' + formatDate(data.date);

      while (successBox.firstChild) successBox.removeChild(successBox.firstChild);
      successBox.appendChild(title);
      successBox.appendChild(details);
      successBox.hidden = false;

      if (typeof successBox.scrollIntoView === 'function') {
        successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    // Validate a field when the user leaves it, then keep it live while they fix it.
    fields.forEach(function (f) {
      var touched = false;
      f.el.addEventListener('blur', function () {
        touched = true;
        setError(f.el, f.validate(f.el));
      });
      ['input', 'change'].forEach(function (evt) {
        f.el.addEventListener(evt, function () {
          clearSuccess();
          if (touched || f.el.classList.contains('has-error')) {
            setError(f.el, f.validate(f.el));
          }
        });
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var firstInvalid = null;
      fields.forEach(function (f) {
        var ok = setError(f.el, f.validate(f.el));
        if (!ok && !firstInvalid) firstInvalid = f.el;
      });

      if (firstInvalid) {
        firstInvalid.focus({ preventScroll: true });
        if (typeof firstInvalid.scrollIntoView === 'function') {
          firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      var data = {
        name: fields[0].el.value.trim(),
        phone: fields[1].el.value.trim(),
        guests: fields[2] ? fields[2].el.value : '',
        date: dateInput ? dateInput.value : '',
        destination: fields[4] ? fields[4].el.value : ''
      };

      // TODO: send `data` to your backend here (fetch/POST, Formspree, EmailJS, etc.).
      // Until then the form only confirms on screen.
      showSuccess(data);

      form.reset();
      fields.forEach(function (f) { setError(f.el, ''); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();