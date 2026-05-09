/**
 * gs-auth.js — локальный режим (без сервера)
 * Аккаунты и баланс хранятся прямо в браузере (localStorage).
 * Можно создать несколько аккаунтов — у каждого свой баланс.
 */

const GS = (() => {

  function getUser()    { return localStorage.getItem('gs_user') || null; }
  function isLoggedIn() { return !!getUser(); }

  // Ключи хранилища для конкретного пользователя
  function key(field) {
    const u = getUser() || 'guest';
    return `gs_${u}_${field}`;
  }

  // Баланс
  function getBal()  { return parseInt(localStorage.getItem(key('bal')) ?? 1000); }
  function setBal(v) {
    localStorage.setItem(key('bal'), v);
    localStorage.setItem('gs_bal', v); // совместимость с игровыми страницами
  }

  // Статистика
  function getStat(f)    { return parseInt(localStorage.getItem(key(f)) ?? 0); }
  function setStat(f, v) {
    localStorage.setItem(key(f), v);
    localStorage.setItem('gs_' + f, v);
  }

  // Загрузить данные этого пользователя в общие ключи
  function loadUserData() {
    localStorage.setItem('gs_bal',   getBal());
    localStorage.setItem('gs_spins', getStat('spins'));
    localStorage.setItem('gs_wins',  getStat('wins'));
    localStorage.setItem('gs_best',  getStat('best'));
  }

  // Сохранить общие ключи обратно в пользовательские
  function saveUserData() {
    if (!isLoggedIn()) return;
    localStorage.setItem(key('bal'),   localStorage.getItem('gs_bal')   ?? 1000);
    localStorage.setItem(key('spins'), localStorage.getItem('gs_spins') ?? 0);
    localStorage.setItem(key('wins'),  localStorage.getItem('gs_wins')  ?? 0);
    localStorage.setItem(key('best'),  localStorage.getItem('gs_best')  ?? 0);
  }

  // syncToServer — в локальном режиме просто сохраняет локально
  function syncToServer() { saveUserData(); }

  // Выход
  function logout() {
    saveUserData();
    localStorage.removeItem('gs_user');
    window.location.href = 'login.html';
  }

  // Добавить имя пользователя и кнопку выхода в navbar
  function injectNavControls() {
    const navBal = document.getElementById('nav-bal');
    if (!navBal) return;
    const parent = navBal.parentElement;

    const chip = document.createElement('div');
    chip.style.cssText = 'font-size:12px;color:#c8a84a;letter-spacing:1px;padding:4px 10px;border:1px solid rgba(212,175,55,.25);border-radius:6px;margin-left:8px;white-space:nowrap;font-family:Oswald,sans-serif';
    chip.textContent = '👤 ' + (getUser() || '');
    parent.appendChild(chip);

    const btn = document.createElement('button');
    btn.textContent = 'ВЫЙТИ';
    btn.style.cssText = 'margin-left:6px;background:transparent;border:1px solid rgba(180,40,40,.35);color:#b06060;font-family:Bebas Neue,sans-serif;font-size:14px;letter-spacing:1px;padding:4px 12px;border-radius:6px;cursor:pointer;transition:all .2s';
    btn.onmouseenter = () => { btn.style.color='#ff8080'; btn.style.borderColor='#e05050'; };
    btn.onmouseleave = () => { btn.style.color='#b06060'; btn.style.borderColor='rgba(180,40,40,.35)'; };
    btn.onclick = logout;
    parent.appendChild(btn);
  }

  // Главная функция — вызывается на каждой странице
  async function initPage() {
    if (!isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    loadUserData();
    injectNavControls();
    window.addEventListener('beforeunload', saveUserData);
    return true;
  }

  return { initPage, syncToServer, logout, isLoggedIn, getUser,
           getBal, setBal, getStat, setStat };
})();
