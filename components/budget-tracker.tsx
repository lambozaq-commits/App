'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Trash2, Plus, Edit2, DollarSign, X, AlertTriangle, TrendingUp, PieChart } from 'lucide-react'; // Added PieChart icon

interface Cell {
  value: string;
  formula?: string;
}

interface Row {
  id: string;
  cells: Record<string, Cell>;
}

interface CategoryBudget {
  id: string;
  name: string;
  limit: number;
  spent: number;
  alertThreshold: number; // percentage at which to show warning (e.g., 80)
}

interface BudgetTable {
  id: string;
  name: string;
  headers: string[];
  rows: Row[];
  createdAt: string;
  categoryBudgets?: CategoryBudget[]; // Added category tracking
}

const safePercent = (value: number, total: number) => {
  if (total === 0 || isNaN(value) || isNaN(total)) return 0;
  return (value / total) * 100;
};

const safeDivide = (value: number, divisor: number) => {
  if (divisor === 0 || isNaN(value) || isNaN(divisor)) return 0;
  return value / divisor;
};

export function BudgetTracker() {
  const [tables, setTables] = useState<BudgetTable[]>([]);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ tableId: string; rowId: string; colIndex: number } | null>(null);
  const [editingCellValue, setEditingCellValue] = useState<string>('');
  const [formulaPreview, setFormulaPreview] = useState<string>('');
  const [showNewTableForm, setShowNewTableForm] = useState(false);
  const [newTableRows, setNewTableRows] = useState('3');
  const [newTableCols, setNewTableCols] = useState('3');
  const [editingTableName, setEditingTableName] = useState<string | null>(null);
  const [editedTableName, setEditedTableName] = useState('');
  const [editingHeader, setEditingHeader] = useState<{ tableId: string; headerIndex: number } | null>(null);
  const [editedHeaderName, setEditedHeaderName] = useState('');
  const [newColumnName, setNewColumnName] = useState('');
  const [showAddColumnForm, setShowAddColumnForm] = useState<string | null>(null);
  // Added category budgets and alerts display
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', limit: '', threshold: '80' });
  // Added statistics overview
  const [showStats, setShowStats] = useState(false);
  const [showChart, setShowChart] = useState(false); // Added chart toggle state

  useEffect(() => {
    const saved = localStorage.getItem('budget-tables');
    if (saved) {
      const parsed = JSON.parse(saved);
      setTables(parsed);
      if (parsed.length > 0) {
        setActiveTableId(parsed[0].id);
      }
    }
  }, []);

  useEffect(() => {
    if (tables.length > 0) {
      localStorage.setItem('budget-tables', JSON.stringify(tables));
    }
  }, [tables]);

  const activeTable = tables.find(t => t.id === activeTableId);

  const evaluateFormula = useCallback((formula: string, currentTableId: string, currentRowId: string, currentTables: BudgetTable[]): string => {
    try {
      if (!formula.startsWith('=')) return formula;

      let expression = formula.substring(1);

      // Replace cell references like A1, B2, etc.
      expression = expression.replace(/\b([A-Z])(\d+)\b/g, (match, col, row) => {
        const table = currentTables.find(t => t.id === currentTableId);
        if (!table) return '0';
        const colIndex = col.charCodeAt(0) - 65;
        const header = table.headers[colIndex];
        const targetRow = table.rows[parseInt(row) - 1];
        if (!header || !targetRow) return '0';
        const val = targetRow.cells[header]?.value || '0';
        return isNaN(Number(val)) ? '0' : val;
      });

      // Replace TableName.A1 references
      expression = expression.replace(/(\w+)\.([A-Z])(\d+)/g, (match, tableName, col, row) => {
        const table = currentTables.find(t => t.name.toLowerCase() === tableName.toLowerCase() || t.id === tableName);
        if (!table) return '0';
        const colIndex = col.charCodeAt(0) - 65;
        const header = table.headers[colIndex];
        const targetRow = table.rows[parseInt(row) - 1];
        if (!header || !targetRow) return '0';
        const val = targetRow.cells[header]?.value || '0';
        return isNaN(Number(val)) ? '0' : val;
      });

      // Replace SUM function
      expression = expression.replace(/SUM$$([^)]+)$$/gi, (match, range) => {
        return calculateRange(range, currentTableId, currentTables).toString();
      });

      // Replace AVERAGE function
      expression = expression.replace(/AVERAGE$$([^)]+)$$/gi, (match, range) => {
        const sum = calculateRange(range, currentTableId, currentTables);
        const count = countRange(range, currentTableId, currentTables);
        return safeDivide(sum, count).toString();
      });

      // Replace COUNT function
      expression = expression.replace(/COUNT$$([^)]+)$$/gi, (match, range) => {
        return countRange(range, currentTableId, currentTables).toString();
      });

      const result = Function('"use strict"; return (' + expression + ')')();
      return isNaN(result) ? '#ERROR' : result.toString();
    } catch (error) {
      console.error("Formula evaluation error:", error);
      return '#ERROR';
    }
  }, []);

  const calculateRange = (range: string, tableId: string, currentTables: BudgetTable[]): number => {
    const table = currentTables.find(t => t.id === tableId);
    if (!table) return 0;

    let sum = 0;
    const parts = range.split(':');

    if (parts.length === 2) {
      const start = parts[0].trim().match(/([A-Z])(\d+)/);
      const end = parts[1].trim().match(/([A-Z])(\d+)/);

      if (start && end) {
        const startCol = start[1].charCodeAt(0) - 65;
        const startRow = parseInt(start[2]) - 1;
        const endCol = end[1].charCodeAt(0) - 65;
        const endRow = parseInt(end[2]) - 1;

        for (let r = Math.min(startRow, endRow); r <= Math.max(startRow, endRow); r++) {
          for (let c = Math.min(startCol, endCol); c <= Math.max(startCol, endCol); c++) {
            const header = table.headers[c];
            const row = table.rows[r];
            if (header && row) {
              const val = parseFloat(row.cells[header]?.value || '0');
              sum += isNaN(val) ? 0 : val;
            }
          }
        }
      }
    }
    return sum;
  };

  const countRange = (range: string, tableId: string, currentTables: BudgetTable[]): number => {
    const table = currentTables.find(t => t.id === tableId);
    if (!table) return 0;

    let count = 0;
    const parts = range.split(':');

    if (parts.length === 2) {
      const start = parts[0].trim().match(/([A-Z])(\d+)/);
      const end = parts[1].trim().match(/([A-Z])(\d+)/);

      if (start && end) {
        const startCol = start[1].charCodeAt(0) - 65;
        const startRow = parseInt(start[2]) - 1;
        const endCol = end[1].charCodeAt(0) - 65;
        const endRow = parseInt(end[2]) - 1;

        for (let r = Math.min(startRow, endRow); r <= Math.max(startRow, endRow); r++) {
          for (let c = Math.min(startCol, endCol); c <= Math.max(startCol, endCol); c++) {
            const header = table.headers[c];
            const row = table.rows[r];
            if (header && row && row.cells[header]?.value) {
              count++;
            }
          }
        }
      }
    }
    return count;
  };

  const recalculateAllFormulas = (tableId: string, updatedTables: BudgetTable[]): BudgetTable[] => {
    let newTables = updatedTables;
    const table = newTables.find(t => t.id === tableId);
    if (!table) return newTables;

    let hasChanges = true;
    let iterations = 0;
    const maxIterations = 10;

    while (hasChanges && iterations < maxIterations) {
      hasChanges = false;
      iterations++;

      newTables = newTables.map(t => {
        if (t.id === tableId) {
          return {
            ...t,
            rows: t.rows.map(row => {
              let rowChanged = false;
              const updatedCells = { ...row.cells };

              Object.keys(row.cells).forEach(header => {
                const cell = row.cells[header];
                if (cell.formula) {
                  const newValue = evaluateFormula(cell.formula, tableId, row.id, newTables);
                  if (newValue !== cell.value) {
                    updatedCells[header] = { ...cell, value: newValue };
                    rowChanged = true;
                    hasChanges = true;
                  }
                }
              });

              return rowChanged ? { ...row, cells: updatedCells } : row;
            }),
          };
        }
        return t;
      });
    }

    return newTables;
  };

  const createNewTable = () => {
    const rows = parseInt(newTableRows) || 3;
    const cols = parseInt(newTableCols) || 3;
    if (rows <= 0 || cols <= 0) return;

    const headers = Array.from({ length: cols }, (_, i) => `Column ${i + 1}`);
    const tableRows = Array.from({ length: rows }, () => {
      const newRow: Row = {
        id: Date.now().toString() + Math.random(),
        cells: {},
      };
      headers.forEach(header => {
        newRow.cells[header] = { value: '' };
      });
      return newRow;
    });

    const newTable: BudgetTable = {
      id: Date.now().toString(),
      name: `Table ${tables.length + 1}`,
      headers,
      rows: tableRows,
      createdAt: new Date().toISOString(),
      categoryBudgets: [], // Initialize empty category budgets
    };

    setTables([...tables, newTable]);
    setActiveTableId(newTable.id);
    setNewTableRows('3');
    setNewTableCols('3');
    setShowNewTableForm(false);
  };

  const updateCell = (tableId: string, rowId: string, headerIndex: number, value: string) => {
    let newTables = tables.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          rows: t.rows.map(r => {
            if (r.id === rowId) {
              const header = t.headers[headerIndex];
              const evaluatedValue = value.startsWith('=') ? evaluateFormula(value, tableId, rowId, tables) : value;
              return {
                ...r,
                cells: {
                  ...r.cells,
                  [header]: {
                    value: evaluatedValue,
                    formula: value.startsWith('=') ? value : undefined,
                  },
                },
              };
            }
            return r;
          }),
        };
      }
      return t;
    });

    newTables = recalculateAllFormulas(tableId, newTables);
    
    setTables(newTables);
    setEditingCell(null);
    setEditingCellValue('');
    setFormulaPreview('');
  };

  const updateFormulaPreview = (formula: string, tableId: string, rowId: string) => {
    if (formula.startsWith('=')) {
      const preview = evaluateFormula(formula, tableId, rowId, tables);
      setFormulaPreview(preview);
    } else {
      setFormulaPreview('');
    }
  };

  const updateTableName = (tableId: string) => {
    if (!editedTableName.trim()) return;

    setTables(tables.map(t => {
      if (t.id === tableId) {
        return { ...t, name: editedTableName.trim() };
      }
      return t;
    }));
    setEditingTableName(null);
    setEditedTableName('');
  };

  const renameHeader = (tableId: string, headerIndex: number, newName: string) => {
    if (!newName.trim()) return;

    setTables(tables.map(t => {
      if (t.id === tableId) {
        const oldHeader = t.headers[headerIndex];
        const updatedHeaders = [...t.headers];
        updatedHeaders[headerIndex] = newName.trim();

        const updatedRows = t.rows.map(row => {
          const newCells = { ...row.cells };
          if (newCells[oldHeader]) {
            newCells[newName.trim()] = newCells[oldHeader];
            delete newCells[oldHeader];
          }
          return { ...row, cells: newCells };
        });

        return { ...t, headers: updatedHeaders, rows: updatedRows };
      }
      return t;
    }));
    setEditingHeader(null);
    setEditedHeaderName('');
  };

  const deleteTable = (id: string) => {
    const filtered = tables.filter(t => t.id !== id);
    setTables(filtered);
    if (activeTableId === id) {
      setActiveTableId(filtered.length > 0 ? filtered[0].id : null);
    }
  };

  const addRow = (tableId: string) => {
    setTables(tables.map(t => {
      if (t.id === tableId) {
        const newRow: Row = {
          id: Date.now().toString() + Math.random(),
          cells: {},
        };
        t.headers.forEach(header => {
          newRow.cells[header] = { value: '' };
        });
        return { ...t, rows: [...t.rows, newRow] };
      }
      return t;
    }));
  };

  const deleteRow = (tableId: string, rowId: string) => {
    setTables(tables.map(t => {
      if (t.id === tableId) {
        return { ...t, rows: t.rows.filter(r => r.id !== rowId) };
      }
      return t;
    }));
  };

  const deleteColumn = (tableId: string, headerIndex: number) => {
    setTables(tables.map(t => {
      if (t.id === tableId) {
        const headerToDelete = t.headers[headerIndex];
        return {
          ...t,
          headers: t.headers.filter((_, idx) => idx !== headerIndex),
          rows: t.rows.map(row => {
            const newCells = { ...row.cells };
            delete newCells[headerToDelete];
            return { ...row, cells: newCells };
          }),
        };
      }
      return t;
    }));
  };

  const addColumn = (tableId: string) => {
    if (!newColumnName.trim()) return;

    setTables(tables.map(t => {
      if (t.id === tableId) {
        const updatedTable = { ...t, headers: [...t.headers, newColumnName.trim()] };
        updatedTable.rows = updatedTable.rows.map(row => ({
          ...row,
          cells: { ...row.cells, [newColumnName.trim()]: { value: '' } },
        }));
        return updatedTable;
      }
      return t;
    }));
    setNewColumnName('');
    setShowAddColumnForm(null);
  };

  const addCategoryBudget = () => {
    if (!newCategory.name.trim() || !newCategory.limit) return;
    if (!activeTableId) return;

    setTables(tables.map(t => {
      if (t.id === activeTableId) {
        const category: CategoryBudget = {
          id: Date.now().toString(),
          name: newCategory.name.trim(),
          limit: parseFloat(newCategory.limit),
          spent: 0,
          alertThreshold: parseFloat(newCategory.threshold) || 80,
        };
        return {
          ...t,
          categoryBudgets: [...(t.categoryBudgets || []), category],
        };
      }
      return t;
    }));

    setNewCategory({ name: '', limit: '', threshold: '80' });
    setShowCategoryForm(false);
  };

  const deleteCategoryBudget = (categoryId: string) => {
    if (!activeTableId) return;

    setTables(tables.map(t => {
      if (t.id === activeTableId) {
        return {
          ...t,
          categoryBudgets: (t.categoryBudgets || []).filter(c => c.id !== categoryId),
        };
      }
      return t;
    }));
  };

  const updateCategorySpent = (categoryId: string, amount: number) => {
    if (!activeTableId) return;

    setTables(tables.map(t => {
      if (t.id === activeTableId) {
        return {
          ...t,
          categoryBudgets: (t.categoryBudgets || []).map(c =>
            c.id === categoryId ? { ...c, spent: amount } : c
          ),
        };
      }
      return t;
    }));
  };

  const isNumericColumn = (header: string) => {
    return header.toLowerCase().includes('amount') ||
      header.toLowerCase().includes('price') ||
      header.toLowerCase().includes('cost') ||
      header.toLowerCase().includes('total') ||
      header.toLowerCase().includes('value') ||
      !isNaN(Number(header));
  };

  const calculateSum = (tableId: string, headerIndex: number) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return 0;

    const header = table.headers[headerIndex];
    return table.rows.reduce((sum, row) => {
      const value = row.cells[header]?.value || '0';
      const num = parseFloat(value);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  };

  const calculateTotalSpending = () => {
    if (!activeTable) return 0;
    
    let total = 0;
    activeTable.headers.forEach((header, idx) => {
      if (isNumericColumn(header)) {
        total += calculateSum(activeTable.id, idx);
      }
    });
    return total;
  };

  const totalSpending = calculateTotalSpending();
  const categories = activeTable?.categoryBudgets || [];

  const renderPieChart = () => {
    if (categories.length === 0) return null;

    const total = categories.reduce((sum, c) => sum + c.spent, 0);
    if (total === 0) return null;

    let currentAngle = -90;
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

    return (
      <Card className="p-6 bg-card">
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <PieChart size={20} />
          Spending Distribution
        </h3>
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="relative w-64 h-64">
            <svg viewBox="0 0 200 200" className="transform -rotate-90">
              {categories.map((category, idx) => {
                const percentage = safePercent(category.spent, total); // Using safe division
                const angle = (percentage / 100) * 360;
                
                const startX = 100 + 80 * Math.cos((currentAngle * Math.PI) / 180);
                const startY = 100 + 80 * Math.sin((currentAngle * Math.PI) / 180);
                const endX = 100 + 80 * Math.cos((endAngle * Math.PI) / 180);
                const endY = 100 + 80 * Math.sin((endAngle * Math.PI) / 180);
                
                const largeArc = angle > 180 ? 1 : 0;
                
                const path = `M 100 100 L ${startX} ${startY} A 80 80 0 ${largeArc} 1 ${endX} ${endY} Z`;
                
                currentAngle = endAngle;
                
                return (
                  <path
                    key={category.id}
                    d={path}
                    fill={colors[idx % colors.length]}
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                    title={`${category.name}: $${category.spent.toFixed(2)} (${percentage.toFixed(1)}%)`}
                  />
                );
              })}
              <circle cx="100" cy="100" r="40" fill="white" className="dark:fill-slate-900" />
              <text
                x="100"
                y="105"
                textAnchor="middle"
                className="text-xs fill-foreground transform rotate-90"
                style={{ transformOrigin: 'center' }}
              >
                ${total.toFixed(0)}
              </text>
            </svg>
          </div>
          
          <div className="flex-1 space-y-3 w-full">
            {categories.map((category, idx) => {
              const percentage = safePercent(category.spent, total); // Using safe division
              return (
                <div key={category.id} className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: colors[idx % colors.length] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground truncate">{category.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ${category.spent.toFixed(2)} of ${category.limit.toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    );
  };

  const renderBarChart = () => {
    if (categories.length === 0) return null;

    const maxValue = Math.max(...categories.map(c => Math.max(c.spent, c.limit)));
    if (maxValue === 0) return null; // Prevent division by zero

    return (
      <Card className="p-6 bg-card">
        <h3 className="text-lg font-bold text-foreground mb-4">Budget vs Actual</h3>
        <div className="space-y-4">
          {categories.map(category => {
            const spentWidth = safeDivide(category.spent, maxValue) * 100; // Using safe division
            const limitWidth = safeDivide(category.limit, maxValue) * 100; // Using safe division
            const percentage = safePercent(category.spent, category.limit); // Using safe division
            
            return (
              <div key={category.id} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground">{category.name}</span>
                  <span className="text-muted-foreground">
                    ${category.spent.toFixed(2)} / ${category.limit.toFixed(2)}
                  </span>
                </div>
                <div className="relative h-8 bg-muted rounded">
                  <div
                    className="absolute h-full bg-blue-500/30 rounded"
                    style={{ width: `${limitWidth}%` }}
                  />
                  <div
                    className={`absolute h-full rounded transition-all ${
                      category.spent > category.limit ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${spentWidth}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-foreground">
                    {percentage.toFixed(0)}% {/* Now safe from NaN */}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background p-4 md:p-6 gap-4 md:gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <DollarSign size={28} className="md:hidden" />
          <DollarSign size={32} className="hidden md:block" />
          <span className="hidden sm:inline">Budget Tracker</span>
          <span className="sm:hidden">Budget</span>
        </h2>
        <div className="flex gap-2 w-full sm:w-auto">
          {activeTable && categories.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowChart(!showChart)}
              className="flex-1 sm:flex-initial min-h-[44px]"
            >
              <PieChart size={16} className="mr-2" />
              <span className="hidden sm:inline">Charts</span>
              <span className="sm:hidden">Charts</span>
            </Button>
          )}
          {activeTable && (
            <Button
              variant="outline"
              onClick={() => setShowStats(!showStats)}
              className="flex-1 sm:flex-initial min-h-[44px]"
            >
              <TrendingUp size={16} className="mr-2" />
              <span className="hidden sm:inline">Stats</span>
              <span className="sm:hidden">Stats</span>
            </Button>
          )}
          <Button
            onClick={() => setShowNewTableForm(!showNewTableForm)}
            className="gap-2 flex-1 sm:flex-initial min-h-[44px]"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">New Table</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>

      {showNewTableForm && (
        <Card className="p-4 bg-card border border-border">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Number of Rows</label>
                <Input
                  type="number"
                  min="1"
                  value={newTableRows}
                  onChange={(e) => setNewTableRows(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Number of Columns</label>
                <Input
                  type="number"
                  min="1"
                  value={newTableCols}
                  onChange={(e) => setNewTableCols(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={createNewTable} variant="default">
                Create Table
              </Button>
              <Button onClick={() => setShowNewTableForm(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {activeTable && categories.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {categories.map(category => {
            const percentage = safePercent(category.spent, category.limit); // Using safe division
            const isOverBudget = percentage > 100;
            const isNearLimit = percentage >= category.alertThreshold && !isOverBudget;

            return (
              <Card
                key={category.id}
                className={`p-4 ${isOverBudget ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : isNearLimit ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' : 'bg-card'}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-foreground">{category.name}</h4>
                    {isOverBudget && <AlertTriangle size={16} className="text-red-500" />}
                    {isNearLimit && <AlertTriangle size={16} className="text-yellow-500" />}
                  </div>
                  <button
                    onClick={() => deleteCategoryBudget(category.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X size={14} />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Spent</span>
                    <Input
                      type="number"
                      value={category.spent}
                      onChange={(e) => updateCategorySpent(category.id, parseFloat(e.target.value) || 0)}
                      className="w-24 h-7 text-right"
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Budget</span>
                    <span className="font-semibold text-foreground">${category.limit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Remaining</span>
                    <span className={`font-semibold ${isOverBudget ? 'text-red-500' : 'text-foreground'}`}>
                      ${(category.limit - category.spent).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="w-full bg-muted rounded-full h-2 mt-3">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isOverBudget ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    {percentage.toFixed(1)}% used
                  </p>
                </div>
              </Card>
            );
          })}
          
          <Card className="p-4 bg-card border-2 border-dashed flex items-center justify-center">
            <Button
              variant="ghost"
              onClick={() => setShowCategoryForm(true)}
              className="flex flex-col h-full gap-2"
            >
              <Plus size={24} />
              <span>Add Category</span>
            </Button>
          </Card>
        </div>
      )}

      {showCategoryForm && (
        <Card className="p-4 bg-card">
          <h4 className="font-semibold text-foreground mb-4">New Category Budget</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Category Name</label>
              <Input
                placeholder="e.g., Groceries"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Budget Limit</label>
              <Input
                type="number"
                placeholder="500"
                value={newCategory.limit}
                onChange={(e) => setNewCategory({ ...newCategory, limit: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Alert at (%)</label>
              <Input
                type="number"
                placeholder="80"
                value={newCategory.threshold}
                onChange={(e) => setNewCategory({ ...newCategory, threshold: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={addCategoryBudget}>Add Category</Button>
            <Button variant="outline" onClick={() => setShowCategoryForm(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {showStats && activeTable && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card className="p-4 bg-card">
            <p className="text-sm text-muted-foreground mb-2">Total Spending</p>
            <p className="text-3xl font-bold text-foreground">${totalSpending.toFixed(2)}</p>
          </Card>
          <Card className="p-4 bg-card">
            <p className="text-sm text-muted-foreground mb-2">Active Categories</p>
            <p className="text-3xl font-bold text-primary">{categories.length}</p>
          </Card>
          <Card className="p-4 bg-card">
            <p className="text-sm text-muted-foreground mb-2">Over Budget</p>
            <p className="text-3xl font-bold text-red-500">
              {categories.filter(c => c.limit > 0 && (c.spent / c.limit) * 100 > 100).length}
            </p>
          </Card>
          <Card className="p-4 bg-card">
            <p className="text-sm text-muted-foreground mb-2">Total Budget</p>
            <p className="text-3xl font-bold text-foreground">
              ${categories.reduce((sum, c) => sum + c.limit, 0).toFixed(2)}
            </p>
          </Card>
        </div>
      )}

      {showChart && activeTable && categories.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {renderPieChart()}
          {renderBarChart()}
        </div>
      )}

      {tables.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap items-center">
          {tables.map(table => (
            <div key={table.id} className="flex items-center gap-1">
              <Button
                variant={activeTableId === table.id ? 'default' : 'outline'}
                onClick={() => setActiveTableId(table.id)}
                className="flex-1"
              >
                {table.name}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteTable(table.id)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {activeTable ? (
        <div className="flex-1 overflow-auto">
          <div className="mb-4 flex items-center gap-2">
            {editingTableName === activeTable.id ? (
              <div className="flex gap-2 w-full max-w-md">
                <Input
                  autoFocus
                  value={editedTableName}
                  onChange={(e) => setEditedTableName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') updateTableName(activeTable.id);
                    if (e.key === 'Escape') setEditingTableName(null);
                  }}
                  className="h-8"
                />
                <Button size="sm" onClick={() => updateTableName(activeTable.id)}>Save</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-foreground">{activeTable.name}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditingTableName(activeTable.id);
                    setEditedTableName(activeTable.name);
                  }}
                  className="h-8 w-8"
                >
                  <Edit2 size={14} />
                </Button>
              </div>
            )}
          </div>

          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full min-w-max">
              <thead>
                <tr className="bg-muted border-b border-border">
                  {activeTable.headers.map((header, idx) => (
                    <th
                      key={idx}
                      className="px-4 py-3 text-left font-bold text-foreground bg-muted text-sm relative group"
                    >
                      {editingHeader?.tableId === activeTable.id && editingHeader?.headerIndex === idx ? (
                        <div className="flex gap-2">
                          <Input
                            autoFocus
                            value={editedHeaderName}
                            onChange={(e) => setEditedHeaderName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') renameHeader(activeTable.id, idx, editedHeaderName);
                              if (e.key === 'Escape') setEditingHeader(null);
                            }}
                            onBlur={() => renameHeader(activeTable.id, idx, editedHeaderName)}
                            className="h-7 text-sm"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-between group">
                          <span
                            className="cursor-pointer hover:text-primary transition-colors"
                            onClick={() => {
                              setEditingHeader({ tableId: activeTable.id, headerIndex: idx });
                              setEditedHeaderName(header);
                            }}
                          >
                            {header}
                          </span>
                          <button
                            onClick={() => deleteColumn(activeTable.id, idx)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 text-destructive hover:text-destructive/80"
                            title="Delete column"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left font-bold text-foreground bg-muted text-sm w-12">
                    Delete
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeTable.rows.map((row, rowIndex) => (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/50">
                    {activeTable.headers.map((header, idx) => (
                      <td
                        key={`${row.id}-${idx}`}
                        className="px-4 py-3 text-foreground cursor-pointer hover:bg-muted/70"
                        onClick={() => {
                          setEditingCell({ tableId: activeTable.id, rowId: row.id, colIndex: idx });
                          setEditingCellValue(row.cells[header]?.formula || row.cells[header]?.value || '');
                        }}
                        title={row.cells[header]?.formula ? `Formula: ${row.cells[header]?.formula}` : ''}
                      >
                        {editingCell?.tableId === activeTable.id &&
                        editingCell?.rowId === row.id &&
                        editingCell?.colIndex === idx ? (
                          <div className="flex flex-col gap-1">
                            <Input
                              autoFocus
                              value={editingCellValue}
                              onChange={(e) => {
                                const newValue = e.target.value;
                                setEditingCellValue(newValue);
                                updateFormulaPreview(newValue, activeTable.id, row.id);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateCell(activeTable.id, row.id, idx, editingCellValue);
                                }
                                if (e.key === 'Escape') {
                                  setEditingCell(null);
                                  setEditingCellValue('');
                                  setFormulaPreview('');
                                }
                              }}
                              className="h-8"
                              placeholder="Enter value or formula (start with =)"
                            />
                            {formulaPreview && (
                              <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                Preview: <span className="text-foreground font-semibold">{formulaPreview}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className={row.cells[header]?.formula ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}>
                            {row.cells[header]?.value || '-'}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRow(activeTable.id, row.id)}
                        className="text-destructive hover:bg-destructive/10"
                        title="Delete row"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {activeTable.rows.length > 0 && (
            <div className="mt-6 border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <tbody>
                  <tr className="bg-card border-b border-border">
                    {activeTable.headers.map((header, idx) => {
                      const isNumeric = isNumericColumn(header);
                      const sum = isNumeric ? calculateSum(activeTable.id, idx) : null;

                      return (
                        <td
                          key={idx}
                          className="px-4 py-3 font-bold text-foreground text-sm bg-muted"
                        >
                          {isNumeric && sum !== null ? (
                            <span>${sum.toFixed(2)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 font-bold text-foreground text-sm bg-muted" />
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => addRow(activeTable.id)}
              variant="outline"
              className="flex-1 gap-2 min-h-[44px]"
              title="Add a new row to the table"
            >
              <Plus size={18} />
              Add Row
            </Button>
            <Button
              onClick={() => setShowAddColumnForm(activeTable.id)}
              variant="outline"
              className="flex-1 gap-2 min-h-[44px]"
              title="Add a new column to the table"
            >
              <Plus size={18} />
              Add Column
            </Button>
          </div>

          {showAddColumnForm === activeTable.id && (
            <Card className="mt-4 p-4 bg-card border border-border">
              <div className="flex gap-2">
                <Input
                  autoFocus
                  placeholder="Column name"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addColumn(activeTable.id);
                    if (e.key === 'Escape') {
                      setShowAddColumnForm(null);
                      setNewColumnName('');
                    }
                  }}
                  className="h-9"
                />
                <Button
                  onClick={() => addColumn(activeTable.id)}
                  size="sm"
                >
                  Add
                </Button>
                <Button
                  onClick={() => {
                    setShowAddColumnForm(null);
                    setNewColumnName('');
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </Card>
          )}

          <Card className="mt-6 p-4 bg-card border border-border">
            <h4 className="font-bold text-foreground mb-2">Formula Help</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li><span className="text-foreground font-semibold">Basic:</span> =A1+B1 (add cells)</li>
              <li><span className="text-foreground font-semibold">SUM:</span> =SUM(A1:A5) (sum range)</li>
              <li><span className="text-foreground font-semibold">AVERAGE:</span> =AVERAGE(A1:A5)</li>
              <li><span className="text-foreground font-semibold">COUNT:</span> =COUNT(A1:A5)</li>
              <li><span className="text-foreground font-semibold">Cross-table:</span> =TableName.A1 (reference other table)</li>
            </ul>
          </Card>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="p-6 md:p-8 text-center bg-card border border-border max-w-md">
            <p className="text-muted-foreground mb-4">No tables yet. Create one to get started!</p>
            <Button onClick={() => setShowNewTableForm(true)} className="gap-2 min-h-[44px] w-full sm:w-auto">
              <Plus size={18} />
              Create First Table
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
