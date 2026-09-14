const SHEET_NAME = 'Expenses';
const HEADERS = ['id', 'title', 'amount', 'category', 'payment', 'date', 'dueDate', 'notes', 'recurring', 'status', 'createdAt', 'updatedAt', 'deletedAt'];
const CATEGORIES = ['Food', 'Transport', 'Bills', 'Shopping', 'Entertainment', 'Health', 'Rent', 'Education', 'Other'];
const PAYMENTS = ['Card', 'Cash', 'Bank transfer', 'UPI'];
const STATUSES = ['Pending', 'Paid', 'Due Today', 'Upcoming', 'Overdue'];

function doGet() {
  try { return json({ ok: true, expenses: readExpenses(), deleted: readDeletedExpenses() }); }
  catch (error) { console.error(error); return json({ ok: false, error: error.message }); }
}

function doPost(event) {
  try {
    const body = JSON.parse(event.postData.contents);
    let result;
    if (body.action === 'add') result = addExpense(body.expense);
    else if (body.action === 'update') result = updateExpense(body.expense);
    else if (body.action === 'delete') result = softDelete(body.id);
    else if (body.action === 'restore') result = restoreExpense(body.id);
    else if (body.action === 'purge') result = permanentlyDelete(body.id);
    else throw new Error('Unsupported action');
    return json({ ok: true, result });
  } catch (error) { console.error(error); return json({ ok: false, error: error.message }); }
}

function sheet() {
  const file = SpreadsheetApp.getActiveSpreadsheet();
  const tab = file.getSheetByName(SHEET_NAME) || file.insertSheet(SHEET_NAME);
  if (tab.getLastRow() === 0) tab.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  return tab;
}

function readExpenses() {
  const tab = sheet();
  if (tab.getLastRow() < 2) return [];
  const values = tab.getRange(1, 1, tab.getLastRow(), HEADERS.length).getValues();
  return values.slice(1).map(row => toObject(row)).filter(item => !item.deletedAt);
}

function readDeletedExpenses() {
  const tab = sheet();
  if (tab.getLastRow() < 2) return [];
  const values = tab.getRange(1, 1, tab.getLastRow(), HEADERS.length).getValues();
  return values.slice(1).map(row => toObject(row)).filter(item => item.deletedAt);
}

function addExpense(input) {
  validate(input);
  const now = new Date().toISOString();
  const expense = Object.assign({}, input, {
    id: input.id || Utilities.getUuid(), amount: Number(input.amount),
    createdAt: input.createdAt || now, updatedAt: now, deletedAt: ''
  });
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try { sheet().appendRow(toRow(expense)); return expense; } finally { lock.releaseLock(); }
}

function updateExpense(input) {
  validate(input);
  const tab = sheet(); const row = findRow(tab, input.id);
  if (!row) throw new Error('Expense not found');
  const updated = Object.assign({}, toObject(tab.getRange(row, 1, 1, HEADERS.length).getValues()[0]), input, { id: input.id, amount: Number(input.amount), updatedAt: new Date().toISOString(), deletedAt: '' });
  tab.getRange(row, 1, 1, HEADERS.length).setValues([toRow(updated)]);
  return updated;
}

function softDelete(id) { return setDeletedAt(id, new Date().toISOString()); }
function restoreExpense(id) { return setDeletedAt(id, ''); }

function permanentlyDelete(id) {
  const tab = sheet(); const row = findRow(tab, id);
  if (!row) throw new Error('Expense not found');
  tab.deleteRow(row);
  return { id, deleted: true };
}

function setDeletedAt(id, value) {
  const tab = sheet(); const row = findRow(tab, id);
  if (!row) throw new Error('Expense not found');
  const item = toObject(tab.getRange(row, 1, 1, HEADERS.length).getValues()[0]);
  item.deletedAt = value; item.updatedAt = new Date().toISOString();
  tab.getRange(row, 1, 1, HEADERS.length).setValues([toRow(item)]);
  return item;
}

function findRow(tab, id) {
  if (tab.getLastRow() < 2) return null;
  const ids = tab.getRange(2, 1, tab.getLastRow() - 1, 1).getValues().flat();
  const index = ids.findIndex(value => String(value) === String(id));
  return index < 0 ? null : index + 2;
}

function validate(item) {
  if (!item || !item.title || Number(item.amount) <= 0) throw new Error('Title and a positive amount are required');
  if (!CATEGORIES.includes(item.category)) throw new Error('Invalid category');
  if (!PAYMENTS.includes(item.payment)) throw new Error('Invalid payment method');
  if (!STATUSES.includes(item.status)) throw new Error('Invalid status');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !/^\d{4}-\d{2}-\d{2}$/.test(item.dueDate)) throw new Error('Invalid date');
}

function dateOnly(value) { if (!value) return ''; if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) return Utilities.formatDate(value, 'Asia/Kolkata', 'yyyy-MM-dd'); const text = String(value); if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text; const parsed = new Date(text); return isNaN(parsed) ? '' : Utilities.formatDate(parsed, 'Asia/Kolkata', 'yyyy-MM-dd'); }
function toObject(row) { const item = {}; HEADERS.forEach((key, index) => item[key] = row[index]); item.id = String(item.id || ''); item.amount = Number(item.amount || 0); item.date = dateOnly(item.date); item.dueDate = dateOnly(item.dueDate); item.recurring = item.recurring === true || String(item.recurring).toLowerCase() === 'true'; return item; }
function toRow(item) { return HEADERS.map(key => item[key] == null ? '' : item[key]); }
function json(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
