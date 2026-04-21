import React, { useState, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';

import { getDB, createTable, deleteTable, addRecord, updateRecord, deleteRecord, addField, saveDB, getSettings, saveSettings } from './lib/db';

import { 
  Plus, 
  Settings, 
  Table as TableIcon, 
  Trash2, 
  Edit2, 
  Search, 
  Download, 
  ChevronRight,
  Database,
  X,
  Check,
  Filter,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  Share2,
  Layers,
  Layout,
  MessageSquare,
  Send,
  User as UserIcon,
  Bot as BotIcon
} from 'lucide-react';



import { askAI } from './lib/groq';

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const FIELD_TYPES = [
  { id: 'text', name: 'Texto', icon: 'abc' },
  { id: 'number', name: 'Número', icon: '123' },
  { id: 'date', name: 'Fecha', icon: 'date' },
  { id: 'boolean', name: 'Verdadero/Falso', icon: 'check' },
  { id: 'email', name: 'Email', icon: '@' },
  { id: 'phone', name: 'Teléfono', icon: '#' },
  { id: 'relation', name: 'Relación', icon: 'link' },
];

export default function App() {
  const [db, setDb] = useState({ tables: [], data: {} });
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [view, setView] = useState('data'); // 'data' or 'settings'
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingTable, setIsCreatingTable] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({ groqKey: '' });
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const tableRef = useRef(null);
  const chatEndRef = useRef(null);





  useEffect(() => {
    setDb(getDB());
    setSettings(getSettings());
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);



  const refreshDB = () => setDb(getDB());

  const handleCreateTable = (e) => {
    e.preventDefault();
    if (!newTableName.trim()) return;
    const table = createTable(newTableName);
    setNewTableName('');
    setIsCreatingTable(false);
    setSelectedTableId(table.id);
    setView('settings');
    refreshDB();
  };

  const handleDeleteTable = (id) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta tabla y todos sus datos?')) {
      deleteTable(id);
      if (selectedTableId === id) setSelectedTableId(null);
      refreshDB();
    }
  };

  const handleAiCommand = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim() || isAiLoading) return;

    setIsAiLoading(true);
    try {
      const result = await askAI(aiPrompt, db);
      
      if (result.action === 'CREATE_DATABASE') {
        const createdTables = [];
        // First pass: create all tables
        result.tables.forEach(tData => {
          const table = createTable(tData.name);
          createdTables.push({ ...table, rawFields: tData.fields });
        });

        // Second pass: add fields (handling relations)
        const dbSnapshot = getDB();
        createdTables.forEach(tempTable => {
          tempTable.rawFields.forEach(fData => {
            const field = { ...fData };
            if (fData.type === 'relation') {
              const target = dbSnapshot.tables.find(t => t.name.toLowerCase() === fData.relationTable.toLowerCase());
              if (target) field.relationTableId = target.id;
            }
            addField(tempTable.id, field);
          });
        });
        
        refreshDB();
        setView('schema');
        setAiPrompt(`Base de datos creada con ${result.tables.length} tablas.`);

      } else if (result.action === 'CREATE_TABLE') {

        const table = createTable(result.name);
        result.fields.forEach(f => addField(table.id, f));
        setSelectedTableId(table.id);
        setView('data');
        refreshDB(); 
        setAiPrompt(`Tabla "${result.name}" creada.`);
      } else if (result.action === 'ADD_RECORDS') {
        const targetTable = result.tableId || selectedTableId;
        if (!targetTable) throw new Error('Selecciona una tabla primero o especifica el nombre en tu pedido.');
        result.records.forEach(r => addRecord(targetTable, r));
        refreshDB();
        setAiPrompt(`${result.records.length} registros añadidos.`);
      } else if (result.action === 'FILTER') {
        setSearchTerm(result.logic); 
        setAiPrompt(`Filtrado por: ${result.logic}`);
      } else if (result.action === 'MESSAGE') {
        alert(result.text);
      }
      
      if (result.action !== 'MESSAGE') {
        setTimeout(() => setAiPrompt(''), 3000);
      }
    } catch (error) {

      alert(error.message || 'Error al procesar comando');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleChatMessage = async (text) => {
    if (!text.trim()) return;
    const newMessages = [...chatMessages, { role: 'user', text }];
    setChatMessages(newMessages);
    setIsAiLoading(true);

    try {
      const result = await askAI(text, db);
      const botResponse = result.action === 'MESSAGE' 
        ? result.text 
        : `He realizado la siguiente acción: ${result.action}. ¿Hay algo más en lo que pueda ayudarte?`;
      
      setChatMessages([...newMessages, { role: 'bot', text: botResponse }]);
      
      // Execute action if it came from chat too
      if (result.action !== 'MESSAGE') {
          if (result.action === 'CREATE_DATABASE') {
              const createdTables = [];
              result.tables.forEach(tData => {
                  const table = createTable(tData.name);
                  createdTables.push({ ...table, rawFields: tData.fields });
              });
              const dbSnapshot = getDB();
              createdTables.forEach(tempTable => {
                  tempTable.rawFields.forEach(fData => {
                      const field = { ...fData };
                      if (fData.type === 'relation') {
                          const target = dbSnapshot.tables.find(t => t.name.toLowerCase() === fData.relationTable.toLowerCase());
                          if (target) field.relationTableId = target.id;
                      }
                      addField(tempTable.id, field);
                  });
              });
              refreshDB();
              setView('schema');
          } else if (result.action === 'CREATE_TABLE') {
              const table = createTable(result.name);
              result.fields.forEach(f => addField(table.id, f));
              setSelectedTableId(table.id);
              setView('data');
              refreshDB();
          } else if (result.action === 'ADD_RECORDS') {
              const targetTable = result.tableId || selectedTableId;
              if (targetTable) {
                  result.records.forEach(r => addRecord(targetTable, r));
                  refreshDB();
              }
          }
      }
    } catch (err) {
      setChatMessages([...newMessages, { role: 'bot', text: 'Lo siento, hubo un error al procesar tu mensaje. Revisa tu API Key.' }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const selectedTable = db.tables.find(t => t.id === selectedTableId);

  const tableData = selectedTable ? db.data[selectedTableId] || [] : [];

  const filteredData = tableData.filter(row => {
    if (!searchTerm) return true;
    return Object.values(row).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleExportCSV = () => {
    if (!selectedTable) return;
    const fields = selectedTable.fields;
    const headers = fields.map(f => f.name).join(',');
    const rows = filteredData.map(row => 
      fields.map(f => {
        const val = row[f.id];
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
      }).join(',')
    ).join('\n');
    
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedTable.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportImage = async () => {
    if (!tableRef.current) return;
    try {
      const dataUrl = await toPng(tableRef.current, { backgroundColor: '#f8fafc', cacheBust: true });
      const link = document.createElement('a');
      link.download = `${selectedTable.name}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert('Error al generar la imagen');
    }
  };


  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans text-slate-800">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm z-20">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-200">
              <Database size={24} />
            </div>
            <h1 className="font-bold text-xl tracking-tight text-slate-900">EasyDB</h1>
          </div>
        </div>

        <div className="px-4 pb-2">
          <button
            onClick={() => { setSelectedTableId(null); setView('schema'); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm",
              view === 'schema' && !selectedTableId 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                : "text-slate-600 hover:bg-slate-100 hover:text-blue-600"
            )}
          >
            <Layout size={20} />
             Esquema de la DB
          </button>
        </div>


        <div className="flex-1 overflow-y-auto p-4 space-y-2">

          <div className="flex items-center justify-between px-2 mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tus Tablas</span>
            <button 
              onClick={() => setIsCreatingTable(true)}
              className="p-1 hover:bg-slate-100 rounded-md transition-colors text-blue-600"
              title="Nueva Tabla"
            >
              <Plus size={18} />
            </button>
          </div>

          {isCreatingTable && (
            <form onSubmit={handleCreateTable} className="px-2 mb-4 animate-in fade-in slide-in-from-top-1">
              <input
                autoFocus
                type="text"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="Nombre de tabla..."
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm border-slate-200"
              />
              <div className="flex gap-2 mt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-1.5 rounded-md text-xs font-medium hover:bg-blue-700 transition">Crear</button>
                <button type="button" onClick={() => setIsCreatingTable(false)} className="px-3 py-1.5 border border-slate-200 rounded-md text-xs font-medium hover:bg-slate-50 transition">Cancelar</button>
              </div>
            </form>
          )}

          {db.tables.length === 0 && !isCreatingTable && (
            <p className="text-sm text-slate-400 px-2 italic">No hay tablas aún</p>
          )}

          {db.tables.map(table => (
            <button
              key={table.id}
              onClick={() => {
                setSelectedTableId(table.id);
                setView('data');
              }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group",
                selectedTableId === table.id 
                  ? "bg-blue-50 text-blue-700 font-medium border border-blue-100 shadow-sm" 
                  : "hover:bg-slate-50 text-slate-600 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-3">
                <TableIcon size={18} className={selectedTableId === table.id ? "text-blue-600" : "text-slate-400 group-hover:text-slate-500"} />
                <span className="text-sm">{table.name}</span>
              </div>
              <ChevronRight size={14} className={cn("opacity-0 transition-opacity", selectedTableId === table.id && "opacity-100")} />
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 flex flex-col gap-2">
          <button 
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all text-xs font-bold uppercase tracking-wider"
          >
            <Settings size={16} />
            Configuración IA
          </button>
          <div className="text-center">
             <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Almacenamiento Local</p>
          </div>
        </div>
      </aside>


      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Global AI Command Bar */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center gap-4 shadow-sm z-10">
          <div className="flex-1 relative">
            <form onSubmit={handleAiCommand}>
              <Sparkles className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 transition-colors",
                isAiLoading ? "text-purple-400" : "text-purple-600"
              )} size={20} />
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="IA: 'Crea una tabla...', 'Genera datos...', 'Analiza...'"
                className="w-full pl-12 pr-12 py-3 bg-purple-50/30 border border-purple-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-purple-300"
                disabled={isAiLoading}
              />
              {isAiLoading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Loader2 size={18} className="animate-spin text-purple-600" />
                </div>
              )}
            </form>
          </div>
        </div>

        {selectedTable ? (

          <>
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20">

              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold text-slate-900">{selectedTable.name}</h2>
                  <div className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 uppercase">
                    {tableData.length} registros
                  </div>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setView('data')}
                    className={cn(
                      "text-sm font-medium transition",
                      view === 'data' ? "text-blue-600 border-b-2 border-blue-600 pb-1" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Datos
                  </button>
                  <button 
                    onClick={() => setView('settings')}
                    className={cn(
                      "text-sm font-medium transition",
                      view === 'settings' ? "text-blue-600 border-b-2 border-blue-600 pb-1" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Estructura
                  </button>
                  <button 
                    onClick={() => setView('schema')}
                    className={cn(
                      "text-sm font-medium transition",
                      view === 'schema' ? "text-blue-600 border-b-2 border-blue-600 pb-1" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Esquema (Visual)
                  </button>
                </div>
              </div>


              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button 
                  onClick={handleExportCSV}
                  className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition text-slate-600"
                  title="Exportar CSV"
                >
                  <Download size={20} />
                </button>
                <button 
                  onClick={handleExportImage}
                  className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition text-slate-600"
                  title="Exportar Imagen"
                >
                  <ImageIcon size={20} />
                </button>

                <button 
                  onClick={() => handleDeleteTable(selectedTableId)}
                  className="p-2 border border-slate-200 rounded-xl hover:bg-red-50 hover:text-red-600 transition text-slate-600"
                  title="Eliminar Tabla"
                >
                  <Trash2 size={20} />
                </button>
                <button 
                  onClick={() => setEditingRecord({})}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">Nuevo Registro</span>
                </button>
              </div>
            </header>



            {/* View Content */}
            <div className="flex-1 overflow-auto p-6" ref={tableRef}>
              {view === 'data' ? (

                <DataGrid 
                  table={selectedTable} 
                  data={filteredData} 
                  onEditRecord={(record) => setEditingRecord(record)}
                  onDeleteRecord={(id) => {
                    if (confirm('¿Eliminar este registro?')) {
                      deleteRecord(selectedTableId, id);
                      refreshDB();
                    }
                  }}
                  db={db}
                />
              ) : view === 'settings' ? (
                <TableSettings 
                  table={selectedTable} 
                  onRefresh={refreshDB}
                  db={db}
                />
              ) : (
                <div className="max-w-xl">
                    <TableSchemaCard table={selectedTable} db={db} onSelectTable={(id) => setSelectedTableId(id)} />
                </div>
              )}
            </div>

          </>
        ) : view === 'schema' ? (
          <SchemaView db={db} onSelectTable={(id) => { setSelectedTableId(id); setView('data'); }} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">

            <div className="bg-slate-100 p-8 rounded-full mb-6">
              <Database size={64} className="text-slate-300" />
            </div>
            <h2 className="text-2xl font-bold text-slate-700 mb-2">Bienvenido a EasyDB</h2>
            <p className="max-w-md mx-auto">Selecciona una tabla de la izquierda para empezar a gestionar tus datos o crea una nueva.</p>
            <button 
              onClick={() => setIsCreatingTable(true)}
              className="mt-8 flex items-center gap-2 bg-white border border-slate-200 px-6 py-3 rounded-2xl text-slate-700 font-semibold hover:bg-slate-50 transition shadow-sm hover:shadow-md"
            >
              <Plus size={20} className="text-blue-600" />
              Crear mi primera tabla
            </button>
          </div>
        )}
      </main>

      {/* Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">
                {editingRecord._id ? 'Editar Registro' : 'Registrar Nuevo'}
              </h3>
              <button 
                onClick={() => setEditingRecord(null)}
                className="p-2 hover:bg-slate-200/50 rounded-full transition text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <form 
              className="p-6"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const record = {};
                selectedTable.fields.forEach(field => {
                  if (field.system) return;
                  if (field.type === 'boolean') {
                    record[field.id] = formData.get(field.id) === 'on';
                  } else {
                    record[field.id] = formData.get(field.id);
                  }
                });
                
                if (editingRecord._id) {
                  updateRecord(selectedTableId, editingRecord._id, record);
                } else {
                  addRecord(selectedTableId, record);
                }
                setEditingRecord(null);
                refreshDB();
              }}
            >
              <div className="space-y-5 max-h-[60vh] overflow-y-auto px-1 pr-3">
                {selectedTable.fields.filter(f => !f.system).map(field => (
                  <div key={field.id}>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                      {field.name} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {field.type === 'boolean' ? (
                      <div className="flex items-center gap-3 px-1">
                        <input
                          type="checkbox"
                          name={field.id}
                          defaultChecked={editingRecord[field.id]}
                          className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                        />
                        <span className="text-sm text-slate-600">Activo / Marcado</span>
                      </div>
                    ) : field.type === 'relation' ? (
                      <select
                        name={field.id}
                        required={field.required}
                        defaultValue={editingRecord[field.id] || ''}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                      >
                        <option value="">Selecciona un registro...</option>
                        {(db.data[field.relationTableId] || []).map(r => (
                          <option key={r._id} value={r._id}>
                            {Object.values(r).filter(v => typeof v === 'string' && !v.includes('-')).slice(0, 1)[0] || r._id}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text'}
                        name={field.id}
                        required={field.required}
                        defaultValue={editingRecord[field.id] || ''}
                        placeholder={`Escribe ${field.name.toLowerCase()}...`}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-8 flex gap-3">
                <button 
                  type="submit" 
                  className="flex-1 bg-blue-600 text-white py-3.5 rounded-2xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100"
                >
                  {editingRecord._id ? 'Guardar Cambios' : 'Crear Registro'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditingRecord(null)}
                  className="px-6 py-3.5 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-6">
                <Settings size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Configuración IA</h3>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                Tu API Key de Groq se guarda localmente en tu navegador y nunca se envía a nuestros servidores.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">
                    Groq API Key
                  </label>
                  <input
                    type="password"
                    value={settings.groqKey}
                    onChange={(e) => setSettings({ ...settings, groqKey: e.target.value })}
                    placeholder="gsk_..."
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-mono text-sm"
                  />
                </div>
              </div>

              <div className="mt-10 flex flex-col gap-3">
                <button 
                  onClick={() => {
                    saveSettings(settings);
                    setShowSettings(false);
                  }}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition shadow-xl shadow-slate-200 active:scale-95"
                >
                  Guardar Cambios
                </button>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 transition text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Button */}
      <button 
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-700 transition-all hover:scale-110 z-50 group"
      >
        {isChatOpen ? <X size={28} /> : <MessageSquare size={28} />}
        {!isChatOpen && (
          <span className="absolute -top-12 right-0 bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
             ¿Necesitas ayuda? ✨
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isChatOpen && (
        <div className="fixed bottom-28 right-8 w-[24rem] h-[34rem] bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden border border-slate-100 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <BotIcon size={24} />
              </div>
              <div>
                <h4 className="font-bold text-sm">EasyBot AI</h4>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Expert Tutor</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
            {chatMessages.length === 0 && (
                <div className="text-center py-10">
                    <p className="text-slate-400 text-sm px-8">👋 ¡Hola! Soy tu asistente experto en EasyDB. Puedo ayudarte a crear tablas, explicarte cómo usar la página o resolver tus dudas sobre bases de datos.</p>
                </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={cn(
                "flex gap-3 max-w-[85%]",
                msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
              )}>
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm",
                  msg.role === 'user' ? "bg-slate-200 text-slate-600" : "bg-blue-600 text-white"
                )}>
                  {msg.role === 'user' ? <UserIcon size={14} /> : <BotIcon size={14} />}
                </div>
                <div className={cn(
                  "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                  msg.role === 'user' ? "bg-white border border-slate-200 text-slate-800 rounded-tr-none" : "bg-blue-600 text-white rounded-tl-none shadow-md shadow-blue-100"
                )}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-slate-100">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.target.elements.chatInput;
                handleChatMessage(input.value);
                input.value = '';
              }}
              className="relative"
            >
              <input
                name="chatInput"
                type="text"
                autoComplete="off"
                placeholder="Escribe tu duda aquí..."
                className="w-full pl-5 pr-12 py-4 bg-slate-100 border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                disabled={isAiLoading}
              />
              <button 
                type="submit"
                disabled={isAiLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:bg-slate-300"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>


  );
}

function TableSchemaCard({ table, db, onSelectTable }) {

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col animate-in zoom-in-95">
      <div className="p-4 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TableIcon size={16} className="text-blue-400" />
          <span className="font-bold">{table.name}</span>
        </div>
      </div>
      <div className="p-2 divide-y divide-slate-50">
        {table.fields.map(field => (
          <div key={field.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-700">{field.name}</span>
                {field.system && <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase">PK</span>}
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">{field.type}</span>
            </div>
            {field.type === 'relation' && (
              <button 
                onClick={() => onSelectTable(field.relationTableId)}
                className="flex items-center gap-2 text-[11px] bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl font-bold hover:bg-indigo-100 transition"
              >
                <Share2 size={12} />
                {db.tables.find(t => t.id === field.relationTableId)?.name || 'FK'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SchemaView({ db, onSelectTable }) {

  return (
    <div className="flex-1 overflow-auto p-8 bg-slate-50/50">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Esquema de Base de Datos</h2>
        <p className="text-slate-500">Visualiza las tablas y sus relaciones (Estilo Supabase)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {db.tables.map(table => (
          <div 
            key={table.id} 
            className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group"
          >
            <div className="p-4 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TableIcon size={16} className="text-blue-400" />
                <span className="font-bold">{table.name}</span>
              </div>
              <button 
                onClick={() => onSelectTable(table.id)}
                className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded-md transition"
              >
                Abrir Tabla
              </button>
            </div>
            <div className="p-2 divide-y divide-slate-50 flex-1">
              {table.fields.map(field => (
                <div key={field.id} className="p-3 flex items-center justify-between group-hover:bg-slate-50/50 transition">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700">{field.name}</span>
                      {field.system && <span className="text-[9px] bg-slate-100 text-slate-400 px-1 rounded font-black uppercase">PK</span>}
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">{field.type}</span>
                  </div>
                  {field.type === 'relation' && (
                    <div className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-bold">
                      <Share2 size={10} />
                      {db.tables.find(t => t.id === field.relationTableId)?.name || 'FK'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {db.tables.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <Layers size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400">Pídele a Groq que cree tu base de datos para ver el esquema aquí.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DataGrid({ table, data, onEditRecord, onDeleteRecord, db }) {

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
        <div className="flex justify-center mb-4 text-slate-200">
          <TableIcon size={48} />
        </div>
        <p className="text-lg font-medium text-slate-500">No hay registros todavía en {table.name}</p>
        <p className="text-sm">Agrega un registro usando el botón superior derecho.</p>
      </div>
    );
  }

  const renderValue = (field, value) => {
    if (value === null || value === undefined || value === '') return '-';
    if (field.type === 'boolean') return value ? '✅ Sí' : '❌ No';
    if (field.type === 'relation' && value) {
      const targetTable = db.tables.find(t => t.id === field.relationTableId);
      if (!targetTable) return 'Tabla eliminada';
      const targetRecord = (db.data[field.relationTableId] || []).find(r => r._id === value);
      if (targetRecord) {
        // Try to find a human-readable name field, otherwise return ID
        const displayValue = Object.keys(targetRecord)
          .filter(k => !k.startsWith('_') && k !== 'id')
          .map(k => targetRecord[k])
          .find(v => typeof v === 'string' && v.length > 0);
        return displayValue || value.slice(0, 8);
      }
      return 'Registro no encontrado';
    }
    return value;
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {table.fields.map(field => (
                <th key={field.id} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  {field.name}
                </th>
              ))}
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map(row => (
              <tr key={row._id} className="hover:bg-blue-50/30 transition group">
                {table.fields.map(field => (
                  <td key={field.id} className="px-6 py-4 text-sm text-slate-600">
                    {field.system && field.name === 'ID' ? (
                      <span className="font-mono text-xs text-slate-400 select-all">{row._id.slice(0, 8)}...</span>
                    ) : (
                      renderValue(field, row[field.id])
                    )}
                  </td>
                ))}
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onEditRecord(row)}
                      className="p-2 hover:bg-white hover:text-blue-600 rounded-lg transition border border-transparent hover:border-blue-100 shadow-none hover:shadow-sm"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => onDeleteRecord(row._id)}
                      className="p-2 hover:bg-white hover:text-red-600 rounded-lg transition border border-transparent hover:border-red-100 shadow-none hover:shadow-sm"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableSettings({ table, onRefresh, db }) {
  const [isAddingField, setIsAddingField] = useState(false);
  const [newField, setNewField] = useState({ name: '', type: 'text', required: false, unique: false, relationTableId: '' });

  const handleAddField = (e) => {
    e.preventDefault();
    if (!newField.name) return;
    addField(table.id, newField);
    setNewField({ name: '', type: 'text', required: false, unique: false, relationTableId: '' });
    setIsAddingField(false);
    onRefresh();
  };

  const handleDeleteField = (fieldId) => {
    if (confirm('¿Eliminar este campo? Los datos asociados a él se perderán.')) {
      const _db = getDB();
      const _table = _db.tables.find(t => t.id === table.id);
      _table.fields = _table.fields.filter(f => f.id !== fieldId);
      // Clean data for this field
      _db.data[table.id] = _db.data[table.id].map(row => {
        const { [fieldId]: _, ...rest } = row;
        return rest;
      });
      saveDB(_db);
      onRefresh();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900 mb-1">Estructura de la Tabla</h3>
          <p className="text-slate-500 text-sm">Define los campos y tipos de datos para tu tabla.</p>
        </div>
        {!isAddingField && (
          <button 
            onClick={() => setIsAddingField(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            <Plus size={18} className="text-blue-600" />
            Añadir Campo
          </button>
        )}
      </div>

      {isAddingField && (
        <form onSubmit={handleAddField} className="bg-white p-8 rounded-3xl border border-blue-100 shadow-xl shadow-blue-50/50 space-y-6 animate-in zoom-in-95 duration-200">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Nombre del Campo</label>
              <input
                autoFocus
                type="text"
                required
                value={newField.name}
                onChange={e => setNewField({...newField, name: e.target.value})}
                placeholder="Ej: Apellido, Precio, Fecha de Nacimiento..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Tipo de Dato</label>
              <select
                value={newField.type}
                onChange={e => setNewField({...newField, type: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition cursor-pointer"
              >
                {FIELD_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {newField.type === 'relation' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Vincular con Tabla</label>
              <select
                required
                value={newField.relationTableId}
                onChange={e => setNewField({...newField, relationTableId: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition cursor-pointer"
              >
                <option value="">Selecciona una tabla...</option>
                {db.tables.filter(t => t.id !== table.id).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 italic">Este campo permitirá elegir un registro de la tabla seleccionada.</p>
            </div>
          )}

          <div className="flex gap-6 pt-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={newField.required}
                onChange={e => setNewField({...newField, required: e.target.checked})}
                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
              />
              <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition">Es obligatorio</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={newField.unique}
                onChange={e => setNewField({...newField, unique: e.target.checked})}
                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
              />
              <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition">Es único (sin duplicados)</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button type="submit" className="flex-1 bg-blue-600 text-white py-3.5 rounded-2xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100">Confirmar Campo</button>
            <button type="button" onClick={() => setIsAddingField(false)} className="px-6 py-3.5 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition">Cancelar</button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {table.fields.map(field => (
          <div key={field.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between group hover:border-slate-300 transition-all shadow-sm">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold",
                field.system ? "bg-slate-100 text-slate-400" : "bg-blue-50 text-blue-600"
              )}>
                {FIELD_TYPES.find(t => t.id === field.type)?.icon?.charAt(0) || '#'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-800">{field.name}</h4>
                  {field.system && <span className="bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter">Sistema</span>}
                  {field.required && <span className="bg-red-50 text-red-500 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter">Obligatorio</span>}
                  {field.unique && <span className="bg-amber-50 text-amber-500 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter">Único</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-400">{FIELD_TYPES.find(t => t.id === field.type)?.name}</span>
                  {field.type === 'relation' && (
                    <div className="flex items-center gap-1 text-[10px] text-blue-400 font-bold uppercase italic">
                      <ChevronRight size={10} />
                      {db.tables.find(t => t.id === field.relationTableId)?.name || 'Tabla eliminada'}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {!field.system && (
              <button 
                onClick={() => handleDeleteField(field.id)}
                className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                title="Eliminar Campo"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
