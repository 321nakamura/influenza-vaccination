'use strict';

/** 設定 **/
const CONFIG = {
  storageKey: 'flu2025_submissions',
  webhookUrl: '', // 任意
};

const DEPARTMENTS = [
  '営業本部',
  '管理本部',
  '生産本部',
  '生産管理部',
  '出力業務部',
  '制作部',
  '印刷生産課',
  '加工生産課',
  '用紙管理課',
];

const els = {
  form: document.getElementById('reservation-form'),
  employeeId: document.getElementById('employeeId'),
  department: document.getElementById('department'),
  fullName: document.getElementById('fullName'),
  choice: document.getElementById('choice'),
  place: document.getElementById('place'),
  listTbody: document.querySelector('#list tbody'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  clearBtn: document.getElementById('clearBtn'),
  csvFile: document.getElementById('csvFile'),
  adminToggle: document.getElementById('adminToggle'),
};

function setAdminVisible(on) {
  document.body.classList.toggle('admin-visible', on);
}
function isAdminMode() {
  const params = new URLSearchParams(location.search);
  return params.get('admin') === '1' || location.hash === '#admin';
}
function applyAdminVisibility() {
  setAdminVisible(isAdminMode());
}
window.addEventListener('hashchange', applyAdminVisibility);
applyAdminVisibility();

// Keyboard shortcut: Alt+Shift+A to toggle admin
window.addEventListener('keydown', (e) => {
  if (e.altKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
    e.preventDefault();
    setAdminVisible(!document.body.classList.contains('admin-visible'));
  }
});

// Hidden corner button to toggle admin
if (els.adminToggle) {
  els.adminToggle.addEventListener('click', () => {
    setAdminVisible(!document.body.classList.contains('admin-visible'));
  });
}

function initDepartmentOptions() {
  els.department.innerHTML = '<option value=\"\">選択してください</option>' +
    DEPARTMENTS.map(d => `<option value=\"${d}\">${d}</option>`).join('');
}

function loadAll() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG.storageKey) || '[]');
  } catch (e) {
    console.warn('Storage load error', e);
    return [];
  }
}

function saveAll(items) {
  localStorage.setItem(CONFIG.storageKey, JSON.stringify(items));
}

function clearAll() {
  localStorage.removeItem(CONFIG.storageKey);
}

function normalizeEmployeeId(val) {
  return (val || '').trim().replace(/\\s+/g, '').toUpperCase();
}

function isDuplicateEmployeeId(employeeId, items) {
  const id = normalizeEmployeeId(employeeId);
  return items.some(x => normalizeEmployeeId(x.employeeId) === id);
}

function addRow(item) {
  if (!els.listTbody) return;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${escapeHtml(item.employeeId)}</td>
    <td>${escapeHtml(item.department)}</td>
    <td>${escapeHtml(item.fullName)}</td>
    <td>${escapeHtml(item.choice)}</td>
    <td>${escapeHtml(item.place || '')}</td>
    <td>${new Date(item.createdAt).toLocaleString('ja-JP')}</td>
  `;
  els.listTbody.appendChild(tr);
}

function renderList(items) {
  if (!els.listTbody) return;
  els.listTbody.innerHTML = '';
  items.forEach(addRow);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;'
  })[s]);
}

async function postWebhook(data) {
  if (!CONFIG.webhookUrl) return { ok: true, skipped: true };
  try {
    const res = await fetch(CONFIG.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    console.warn('Webhook error', e);
    return { ok: false, error: String(e) };
  }
}

function toCSV(items) {
  const header = ['employee_id', 'department', 'full_name', 'choice', 'place', 'created_at'];
  const rows = items.map(x => [
    x.employeeId, x.department, x.fullName, x.choice, x.place || '', x.createdAt
  ]);
  const all = [header, ...rows];
  return all.map(cols => cols.map(v => `\"${String(v).replace(/\"/g, '\"\"')}\"`).join(',')).join('\\r\\n');
}

function download(filename, content, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function handleCsvImport(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = reader.result;
      const lines = text.split(/\\r?\\n/).filter(Boolean);
      if (!lines.length) return;
      const header = lines[0].split(',').map(s => s.replace(/^\"|\"$/g, ''));
      const idx = {
        employeeId: header.indexOf('employee_id'),
        department: header.indexOf('department'),
        fullName: header.indexOf('full_name'),
        choice: header.indexOf('choice'),
        place: header.indexOf('place'),
        createdAt: header.indexOf('created_at'),
      };
      const current = loadAll();
      let added = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].match(/(\"([^\"]|\"\")*\"|[^,]+)/g);
        if (!cols) continue;
        const get = (j) => (j >= 0 ? cols[j].replace(/^\"|\"$/g, '').replace(/\"\"/g, '\"') : '');
        const item = {
          employeeId: get(idx.employeeId),
          department: get(idx.department),
          fullName: get(idx.fullName),
          choice: get(idx.choice),
          place: get(idx.place),
          createdAt: get(idx.createdAt) || new Date().toISOString(),
        };
        if (item.employeeId && !isDuplicateEmployeeId(item.employeeId, current)) {
          current.push(item);
          added++;
        }
      }
      saveAll(current);
      renderList(current);
      alert(`取り込み完了：${added}件 追加しました。`);
    } catch (e) {
      console.error(e);
      alert('CSVの取り込みでエラーが発生しました。');
    }
  };
  reader.readAsText(file, 'utf-8');
}

if (els.form) {
  els.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const employeeId = normalizeEmployeeId(els.employeeId.value);
    const department = els.department.value;
    const fullName = els.fullName.value.trim();
    const choice = els.choice.value;
    const place = els.place.value;

    if (!employeeId || !department || !fullName || !choice || !place) {
      alert('未入力の項目があります。');
      return;
    }

    let items = loadAll();
    if (isDuplicateEmployeeId(employeeId, items)) {
      alert('この社員番号は既に登録されています。重複登録はできません。');
      return;
    }

    const entry = {
      employeeId,
      department,
      fullName,
      choice,
      place,
      createdAt: new Date().toISOString(),
    };

    const webhookRes = await postWebhook(entry);
    if (webhookRes && webhookRes.ok === false) {
      const cont = confirm('外部送信に失敗しました。ローカル保存のみ続行しますか？');
      if (!cont) return;
    }

    items.push(entry);
    saveAll(items);
    renderList(items);
    els.form.reset();
    alert('登録しました。');
  });
}

if (els.exportCsvBtn) {
  els.exportCsvBtn.addEventListener('click', () => {
    const items = loadAll();
    const csv = toCSV(items);
    const ts = new Date().toISOString().slice(0,10).replace(/-/g,'');
    download(`flu_reservations_${ts}.csv`, csv, 'text/csv');
  });
}

if (els.clearBtn) {
  els.clearBtn.addEventListener('click', () => {
    const items = loadAll();
    if (items.length === 0) {
      if (confirm('この端末には登録がありません。初期化しますか？（重複チェック履歴も消えます）')) {
        clearAll();
        renderList([]);
        alert('初期化しました。');
      }
      return;
    }
    const ok = confirm('この端末に保存された登録データを全て削除します。よろしいですか？\\n※ 事前にCSVエクスポートでバックアップ取得を推奨します。');
    if (!ok) return;
    clearAll();
    renderList([]);
    alert('初期化しました。');
  });
}

if (els.csvFile) {
  els.csvFile.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleCsvImport(file);
  });
}

// 初期化処理
(function init() {
  if (isAdminMode()) {
    document.body.classList.add('admin-visible');
  }
  initDepartmentOptions();
  renderList(loadAll());
})();
