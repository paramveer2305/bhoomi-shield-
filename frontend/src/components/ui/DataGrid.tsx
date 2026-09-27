import React, { forwardRef, useState, useMemo } from 'react';
import { cn } from '../../utils/cn';
import { ChevronUp, ChevronDown, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  accessor?: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataGridProps<T> {
  columns: Column<T>[];
  data: T[];
  keyAccessor: (row: T) => string;
  rowClassName?: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  pagination?: boolean;
  pageSize?: number;
  showPageSizeSelector?: boolean;
  pageSizeOptions?: number[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (key: string, order: 'asc' | 'desc') => void;
  filters?: Record<string, string>;
  onFilterChange?: (filters: Record<string, string>) => void;
  stickyHeader?: boolean;
  hoverable?: boolean;
  striped?: boolean;
  compact?: boolean;
  className?: string;
  renderToolbar?: () => React.ReactNode;
  renderRowActions?: (row: T) => React.ReactNode;
}

function DataGrid<T>({
  columns,
  data,
  keyAccessor,
  rowClassName,
  onRowClick,
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  loading = false,
  emptyMessage = 'No data available',
  emptyIcon,
  pagination = true,
  pageSize = 10,
  showPageSizeSelector = true,
  pageSizeOptions = [10, 25, 50, 100],
  sortBy,
  sortOrder,
  onSortChange,
  filters = {},
  onFilterChange,
  stickyHeader = true,
  hoverable = true,
  striped = false,
  compact = false,
  className,
  renderToolbar,
  renderRowActions,
}: DataGridProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(pageSize);
  const [localSortBy, setLocalSortBy] = useState(sortBy || '');
  const [localSortOrder, setLocalSortOrder] = useState<'asc' | 'desc'>(sortOrder || 'asc');
  const [localFilters, setLocalFilters] = useState(filters);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [filterInputs, setFilterInputs] = useState<Record<string, string>>({});

  const sortedAndFilteredData = useMemo(() => {
    let result = [...data];

    // Apply filters
    Object.entries(localFilters).forEach(([key, value]) => {
      if (value) {
        const column = columns.find(c => c.key === key);
        if (column?.filterable) {
          result = result.filter(row => {
            const cellValue = column.accessor ? column.accessor(row) : (row as any)[key];
            return String(cellValue).toLowerCase().includes(value.toLowerCase());
          });
        }
      }
    });

    // Apply sorting
    if (localSortBy) {
      const column = columns.find(c => c.key === localSortBy);
      if (column?.sortable) {
        result.sort((a, b) => {
          const aVal = column.accessor ? column.accessor(a) : (a as any)[localSortBy];
          const bVal = column.accessor ? column.accessor(b) : (b as any)[localSortBy];
          const aStr = String(aVal).toLowerCase();
          const bStr = String(bVal).toLowerCase();
          if (aStr < bStr) return localSortOrder === 'asc' ? -1 : 1;
          if (aStr > bStr) return localSortOrder === 'asc' ? 1 : -1;
          return 0;
        });
      }
    }

    return result;
  }, [data, columns, localFilters, localSortBy, localSortOrder]);

  const totalPages = Math.ceil(sortedAndFilteredData.length / localPageSize);
  const paginatedData = pagination
    ? sortedAndFilteredData.slice((currentPage - 1) * localPageSize, currentPage * localPageSize)
    : sortedAndFilteredData;

  const handleSort = (key: string) => {
    const column = columns.find(c => c.key === key);
    if (!column?.sortable) return;

    if (localSortBy === key) {
      const newOrder = localSortOrder === 'asc' ? 'desc' : 'asc';
      setLocalSortOrder(newOrder);
      onSortChange?.(key, newOrder);
    } else {
      setLocalSortBy(key);
      setLocalSortOrder('asc');
      onSortChange?.(key, 'asc');
    }
    setSortColumn(key);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFilterChange?.(newFilters);
    setCurrentPage(1);
  };

  const handleFilterInputChange = (key: string, value: string) => {
    setFilterInputs(prev => ({ ...prev, [key]: value }));
  };

  const handleFilterSubmit = (key: string) => {
    handleFilterChange(key, filterInputs[key] || '');
  };

  const handleSelectAll = () => {
    const keys = paginatedData.map(keyAccessor);
    if (selectedKeys.length === keys.length) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(keys);
    }
  };

  const isRowSelected = (row: T) => selectedKeys.includes(keyAccessor(row));

  if (loading) {
    return (
      <div className={cn('table-container', className)}>
        <table className="table w-full" role="grid">
          <thead className="table-header">
            <tr>
              {selectable && <th className="table-head w-12"></th>}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn('table-head', column.className, column.headerClassName)}
                  style={{ width: column.width }}
                >
                  {column.header}
                </th>
              ))}
              {renderRowActions && <th className="table-head w-32">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="table-row animate-pulse">
                {selectable && <td className="table-cell w-12"></td>}
                {columns.map((column) => (
                  <td key={column.key} className={cn('table-cell', column.className)}>
                    <div className="skeleton h-4 w-3/4" />
                  </td>
                ))}
                {renderRowActions && <td className="table-cell w-32"><div className="skeleton h-8 w-20" /></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar */}
      {(renderToolbar || columns.some(c => c.filterable)) && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-card border border-border rounded-lg">
          {renderToolbar ? renderToolbar() : null}
          {columns.some(c => c.filterable) && (
            <div className="flex flex-wrap gap-2">
              {columns.filter(c => c.filterable).map((column) => (
                <div key={column.key} className="relative">
                  <input
                    type="text"
                    placeholder={`Filter ${column.header}...`}
                    value={filterInputs[column.key] || ''}
                    onChange={(e) => handleFilterInputChange(column.key, e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleFilterSubmit(column.key)}
                    className="input w-48 sm:w-64 pl-9 pr-4"
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className={cn('table-container rounded-lg border border-border overflow-hidden', className)}>
        <div className="overflow-x-auto">
          <table className="table w-full" role="grid">
            <thead className={cn('table-header', stickyHeader && 'sticky top-0 z-10')}>
              <tr>
                {selectable && (
                  <th className="table-head w-12">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      checked={selectedKeys.length === paginatedData.length && paginatedData.length > 0}
                      onChange={handleSelectAll}
                      aria-label="Select all rows"
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      'table-head',
                      column.className,
                      column.headerClassName,
                      column.sortable && 'cursor-pointer select-none hover:bg-muted',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right'
                    )}
                    style={{ width: column.width }}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{column.header}</span>
                      {column.sortable && localSortBy === column.key && (
                        localSortOrder === 'asc' ? (
                          <ChevronUp className="w-4 h-4 text-primary" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-primary" />
                        )
                      )}
                      {column.sortable && localSortBy !== column.key && (
                        <span className="w-4 h-4 text-muted-foreground/50">
                          <ChevronUp className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                {renderRowActions && <th className="table-head w-32 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0) + (renderRowActions ? 1 : 0)} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      {emptyIcon || (
                        <svg className="w-12 h-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      <span className="text-lg font-medium text-foreground">{emptyMessage}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, rowIndex) => {
                  const key = keyAccessor(row);
                  const isSelected = isRowSelected(row);
                  return (
                    <tr
                      key={key}
                      className={cn(
                        'table-row',
                        hoverable && 'hover:bg-muted/50',
                        striped && rowIndex % 2 === 1 && 'bg-muted/30',
                        compact && 'compact',
                        isSelected && 'bg-primary-50 border-l-2 border-l-primary',
                        rowClassName?.(row)
                      )}
                      onClick={() => onRowClick?.(row)}
                      style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                    >
                      {selectable && (
                        <td className="table-cell w-12">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              const newKeys = e.target.checked
                                ? [...selectedKeys, key]
                                : selectedKeys.filter(k => k !== key);
                              onSelectionChange?.(newKeys);
                            }}
                            aria-label={`Select row ${key}`}
                          />
                        </td>
                      )}
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={cn(
                            'table-cell',
                            column.className,
                            column.align === 'center' && 'text-center',
                            column.align === 'right' && 'text-right'
                          )}
                        >
                          {column.accessor ? column.accessor(row) : (row as any)[column.key]}
                        </td>
                      ))}
                      {renderRowActions && (
                        <td className="table-cell w-32 text-center">
                          <div className="flex items-center justify-center gap-1">{renderRowActions(row)}</div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border bg-muted/30">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * localPageSize + 1} to{' '}
              {Math.min(currentPage * localPageSize, sortedAndFilteredData.length)} of{' '}
              {sortedAndFilteredData.length} results
            </div>
            <div className="flex items-center gap-2">
              {showPageSizeSelector && (
                <select
                  value={localPageSize}
                  onChange={(e) => {
                    setLocalPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="select w-auto px-3 py-1.5 text-sm"
                  aria-label="Rows per page"
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size} per page
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="btn-icon btn-ghost p-1.5"
                aria-label="First page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn-icon btn-ghost p-1.5"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium w-20 text-center">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn-icon btn-ghost p-1.5"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="btn-icon btn-ghost p-1.5"
                aria-label="Last page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { DataGrid };