import React, { useState, useRef } from 'react';
import { Task } from '../types/task';
import { taskService } from '../services/api';

interface ExportImportProps {
  tasks: Task[];
  onImportComplete: () => void;
  onClose: () => void;
}

type ImportStatus = 'idle' | 'loading' | 'success' | 'error';

const ExportImport: React.FC<ExportImportProps> = ({ tasks, onImportComplete, onClose }) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [importPreview, setImportPreview] = useState<Task[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [exportFilter, setExportFilter] = useState<'all' | 'todo' | 'in-progress' | 'done'>('all');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredTasks = exportFilter === 'all'
    ? tasks
    : tasks.filter(t => t.status === exportFilter);

  // ── Export helpers ─────────────────────────────────────────────────────────
  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const exportData = filteredTasks.map(task => ({
      title:            task.title,
      description:      task.description ?? '',
      status:           task.status,
      priority:         task.priority,
      category:         task.category,
      labels:           task.labels,
      dueDate:          task.dueDate ?? '',
      isRecurring:      task.isRecurring ?? false,
      recurringPattern: task.recurringPattern ?? 'none',
      recurringInterval: task.recurringInterval ?? 1,
      recurringEndDate: task.recurringEndDate ?? '',
      subtasks:         (task.subtasks ?? []).map(s => ({ text: s.text, completed: s.completed })),
      comments:         (task.comments ?? []).map(c => ({ userName: c.userName, text: c.text, createdAt: c.createdAt })),
      createdAt:        task.createdAt ?? '',
    }));

    const json = JSON.stringify(exportData, null, 2);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadFile(json, `tasks-${exportFilter}-${timestamp}.json`, 'application/json');
  };

  const handleExportCSV = () => {
    const headers = [
      'Title', 'Description', 'Status', 'Priority', 'Category',
      'Labels', 'Due Date', 'Recurring', 'Subtasks Total',
      'Subtasks Done', 'Comments', 'Created At',
    ];

    const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;

    const rows = filteredTasks.map(task => [
      escape(task.title),
      escape(task.description ?? ''),
      escape(task.status),
      escape(task.priority),
      escape(task.category),
      escape((task.labels ?? []).join(', ')),
      escape(task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ''),
      escape(task.isRecurring ? `${task.recurringPattern} (every ${task.recurringInterval})` : 'No'),
      String(task.subtasks?.length ?? 0),
      String(task.subtasks?.filter(s => s.completed).length ?? 0),
      String(task.comments?.length ?? 0),
      escape(task.createdAt ? new Date(task.createdAt).toLocaleDateString() : ''),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const timestamp = new Date().toISOString().split('T')[0];
    downloadFile(csv, `tasks-${exportFilter}-${timestamp}.csv`, 'text/csv');
  };

  const handleExport = () => {
    exportFormat === 'json' ? handleExportJSON() : handleExportCSV();
  };

  // ── Import helpers ─────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setImportStatus('error');
      setImportMessage('Only JSON files are supported for import.');
      setImportPreview([]);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setImportStatus('idle');
    setImportMessage('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (!Array.isArray(parsed)) throw new Error('File must contain a JSON array of tasks.');
        if (parsed.length === 0) throw new Error('File contains no tasks.');
        if (!parsed[0].title) throw new Error('Tasks must have a "title" field.');
        setImportPreview(parsed.slice(0, 5));
        setImportStatus('idle');
        setImportMessage(`${parsed.length} task${parsed.length > 1 ? 's' : ''} ready to import.`);
      } catch (err: any) {
        setImportStatus('error');
        setImportMessage(err.message ?? 'Invalid JSON file.');
        setImportPreview([]);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setImportStatus('loading');

    try {
      const text = await selectedFile.text();
      const parsed: Partial<Task>[] = JSON.parse(text);

      let successCount = 0;
      let failCount    = 0;

      for (const raw of parsed) {
        try {
          await taskService.createTask({
            title:            raw.title ?? 'Untitled',
            description:      raw.description ?? '',
            status:           raw.status ?? 'todo',
            priority:         raw.priority ?? 'medium',
            category:         raw.category ?? 'other',
            labels:           Array.isArray(raw.labels) ? raw.labels : [],
            attachments:      [],
            comments:         [],
            subtasks:         [],
            history:          [],
            dueDate:          raw.dueDate ?? '',
            isRecurring:      raw.isRecurring ?? false,
            recurringPattern: raw.recurringPattern ?? 'none',
            recurringInterval: raw.recurringInterval ?? 1,
            recurringEndDate: raw.recurringEndDate ?? '',
          });
          successCount++;
        } catch {
          failCount++;
        }
      }

      setImportStatus('success');
      setImportMessage(
        failCount > 0
          ? `✅ Imported ${successCount} tasks. ⚠️ ${failCount} failed.`
          : `✅ Successfully imported ${successCount} task${successCount > 1 ? 's' : ''}!`
      );
      setImportPreview([]);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onImportComplete();
    } catch (err: any) {
      setImportStatus('error');
      setImportMessage(err.message ?? 'Import failed. Please check the file and try again.');
    }
  };

  const statusColors: Record<string, string> = {
    'todo':        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    'done':        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  };

  const priorityDot: Record<string, string> = {
    high: 'bg-red-500', medium: 'bg-amber-400', low: 'bg-emerald-500',
  };

  const exportStats = {
    total:      filteredTasks.length,
    todo:       filteredTasks.filter(t => t.status === 'todo').length,
    inProgress: filteredTasks.filter(t => t.status === 'in-progress').length,
    done:       filteredTasks.filter(t => t.status === 'done').length,
    withDue:    filteredTasks.filter(t => t.dueDate).length,
    recurring:  filteredTasks.filter(t => t.isRecurring).length,
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📦</span>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Export / Import</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800">
          {(['export', 'import'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab === 'export' ? '⬇️ Export Tasks' : '⬆️ Import Tasks'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ── EXPORT TAB ── */}
          {activeTab === 'export' && (
            <>
              {/* Format selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Format
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['json', 'csv'] as const).map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => setExportFormat(fmt)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        exportFormat === fmt
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="text-2xl mb-1">{fmt === 'json' ? '{ }' : '📊'}</div>
                      <p className="font-bold text-gray-900 dark:text-white uppercase text-sm">{fmt}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {fmt === 'json'
                          ? 'Full data with subtasks & comments. Re-importable.'
                          : 'Spreadsheet-friendly. Opens in Excel / Google Sheets.'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Which tasks?
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['all', 'todo', 'in-progress', 'done'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setExportFilter(f)}
                      className={`py-2 px-3 rounded-lg text-xs font-medium capitalize transition-all ${
                        exportFilter === f
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {f === 'in-progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats preview */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                  Export Preview
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total',       value: exportStats.total,      color: 'text-gray-900 dark:text-white' },
                    { label: 'To Do',       value: exportStats.todo,       color: 'text-gray-600 dark:text-gray-400' },
                    { label: 'In Progress', value: exportStats.inProgress, color: 'text-blue-600 dark:text-blue-400' },
                    { label: 'Done',        value: exportStats.done,       color: 'text-emerald-600 dark:text-emerald-400' },
                    { label: 'With Due Date', value: exportStats.withDue,  color: 'text-amber-600 dark:text-amber-400' },
                    { label: 'Recurring',   value: exportStats.recurring,  color: 'text-purple-600 dark:text-purple-400' },
                  ].map(stat => (
                    <div key={stat.label} className="text-center">
                      <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {exportStats.total === 0 ? (
                <div className="text-center py-4 text-gray-400 dark:text-gray-500 text-sm">
                  No tasks match this filter.
                </div>
              ) : (
                <button
                  onClick={handleExport}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <span>⬇️</span>
                  Export {exportStats.total} task{exportStats.total > 1 ? 's' : ''} as {exportFormat.toUpperCase()}
                </button>
              )}
            </>
          )}

          {/* ── IMPORT TAB ── */}
          {activeTab === 'import' && (
            <>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
                <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">⚠️ Import Notes</p>
                <ul className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 space-y-1 list-disc list-inside">
                  <li>Only <strong>.json</strong> files exported from this app are supported</li>
                  <li>Imported tasks are added to your current task list — nothing is overwritten</li>
                  <li>Attachments, comments history, and IDs are not preserved</li>
                </ul>
              </div>

              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
              >
                <div className="text-4xl mb-3">📂</div>
                <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                  {selectedFile ? selectedFile.name : 'Click to select a JSON file'}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Only .json files exported from this app
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Status message */}
              {importMessage && (
                <div className={`p-3 rounded-xl text-sm font-medium ${
                  importStatus === 'error'   ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                  importStatus === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
                  'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                }`}>
                  {importMessage}
                </div>
              )}

              {/* Preview table */}
              {importPreview.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                    Preview (first {importPreview.length})
                  </p>
                  <div className="space-y-2">
                    {importPreview.map((task, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[task.priority ?? 'medium']}`} />
                        <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">
                          {task.title}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[task.status ?? 'todo']}`}>
                          {(task.status ?? 'todo').replace('-', ' ')}
                        </span>
                        {task.dueDate && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Import button */}
              {selectedFile && importStatus !== 'error' && importStatus !== 'success' && (
                <button
                  onClick={handleImport}
                  disabled={importStatus === 'loading'}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {importStatus === 'loading' ? (
                    <><span className="animate-spin">⏳</span> Importing...</>
                  ) : (
                    <><span>⬆️</span> Import Tasks</>
                  )}
                </button>
              )}

              {importStatus === 'success' && (
                <button
                  onClick={() => { setImportStatus('idle'); setImportMessage(''); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="w-full py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-colors"
                >
                  Import Another File
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportImport;