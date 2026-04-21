const STORAGE_KEY = 'easy_db_manager_data';
const SETTINGS_KEY = 'easy_db_manager_settings';


export const getDB = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : { tables: [], data: {} };
};

export const saveDB = (db) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

export const getSettings = () => {
  const data = localStorage.getItem(SETTINGS_KEY);
  return data ? JSON.parse(data) : { groqKey: '' };
};

export const saveSettings = (settings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};


export const createTable = (name) => {
  const db = getDB();
  const id = crypto.randomUUID();
  const newTable = {
    id,
    name,
    fields: [
      { id: crypto.randomUUID(), name: 'ID', type: 'text', required: true, unique: true, system: true }
    ],
  };
  db.tables.push(newTable);
  db.data[id] = [];
  saveDB(db);
  return newTable;
};

export const addField = (tableId, field) => {
  const db = getDB();
  const table = db.tables.find(t => t.id === tableId);
  if (table) {
    table.fields.push({ ...field, id: crypto.randomUUID() });
    saveDB(db);
  }
};

export const deleteTable = (tableId) => {
  const db = getDB();
  db.tables = db.tables.filter(t => t.id !== tableId);
  delete db.data[tableId];
  saveDB(db);
};

export const addRecord = (tableId, record) => {
  const db = getDB();
  if (db.data[tableId]) {
    const table = db.tables.find(t => t.id === tableId);
    const newRecord = { ...record, _id: crypto.randomUUID(), _createdAt: new Date().toISOString() };
    db.data[tableId].push(newRecord);
    saveDB(db);
    return newRecord;
  }
};

export const updateRecord = (tableId, recordId, updates) => {
  const db = getDB();
  if (db.data[tableId]) {
    const index = db.data[tableId].findIndex(r => r._id === recordId);
    if (index !== -1) {
      db.data[tableId][index] = { ...db.data[tableId][index], ...updates };
      saveDB(db);
    }
  }
};

export const deleteRecord = (tableId, recordId) => {
  const db = getDB();
  if (db.data[tableId]) {
    db.data[tableId] = db.data[tableId].filter(r => r._id !== recordId);
    saveDB(db);
  }
};
