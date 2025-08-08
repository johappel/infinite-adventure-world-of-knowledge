/**
 * Toast/Utility Modul für World Editor
 * Exportiert:
 *   - escapeHtml(input): nutzt DOMPurify (falls vorhanden). Fallback ist bewusst deaktiviert.
 *   - showToast(type, message, title?, ms?)
 */

export function escapeHtml(input) {
  const str = String(input);
  // Bevorzugt DOMPurify, falls eingebunden (world-editor.html lädt es per CDN)
  if (typeof window !== 'undefined' && window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
    return window.DOMPurify.sanitize(str);
  }
  // Policy: Kein Regex-Fallback hier – Rückgabe unverändert
  return str;
}

export function showToast(type, message, title = null, ms = 4200) {
  let root = document.getElementById('toast-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toast-root';
    root.className = 'toast-container';
    root.setAttribute('aria-live', 'polite');
    root.setAttribute('aria-atomic', 'true');
    document.body.appendChild(root);
  }
  const el = document.createElement('div');
  el.className = 'toast ' + (type || 'info');
  el.style.setProperty('--hide-delay', (ms / 1000) + 's');
  el.setAttribute('role', 'status');
  el.innerHTML =
    (title ? '<div class="title">' + escapeHtml(title) + '</div>' : '') +
    '<div class="msg">' + escapeHtml(message) + '</div>';
  root.appendChild(el);
  const total = 200 + ms + 200 + 50;
  setTimeout(() => { el.remove(); }, total);
}

// Optionale globale Zuweisung zur Kompatibilität
if (typeof window !== 'undefined') {
  window.showToast = showToast;
  window.escapeHtml = escapeHtml;
}
