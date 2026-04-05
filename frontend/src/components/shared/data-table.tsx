"use client";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Search,
} from "lucide-react";
import { useState } from "react";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

export type SortDirection = "asc" | "desc";

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  getRowKey: (row: T) => string;
  expandedContent?: (row: T) => React.ReactNode;
  className?: string;
  // Búsqueda
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  // Ordenamiento
  sortKey?: string;
  sortDir?: SortDirection;
  onSort?: (key: string, dir: SortDirection) => void;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = "No hay datos disponibles.",
  total = 0,
  page = 1,
  pageSize = 20,
  onPageChange,
  getRowKey,
  expandedContent,
  className,
  searchable = false,
  searchPlaceholder = "Buscar...",
  onSearch,
  sortKey,
  sortDir,
  onSort,
}: DataTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [internalSearch, setInternalSearch] = useState("");

  const totalPages = Math.ceil(total / pageSize) || 1;
  const hasExpand = !!expandedContent;

  function toggleRow(key: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSearch(q: string) {
    setInternalSearch(q);
    onSearch?.(q);
  }

  function handleSort(col: Column<T>) {
    if (!col.sortable || !onSort) return;
    const newDir: SortDirection =
      sortKey === col.key && sortDir === "asc" ? "desc" : "asc";
    onSort(col.key, newDir);
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Buscador */}
      {searchable && (
        <div className="relative">
          <Search
            size={15}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            placeholder={searchPlaceholder}
            value={internalSearch}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8 h-8 max-w-xs"
          />
        </div>
      )}

      {/* Tabla */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    "text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3",
                    col.sortable && onSort && "cursor-pointer select-none hover:text-foreground",
                    col.headerClassName
                  )}
                  onClick={() => handleSort(col)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && onSort && (
                      <span className="ml-0.5">
                        {sortKey === col.key ? (
                          sortDir === "asc" ? (
                            <ChevronUp size={13} className="text-primary" />
                          ) : (
                            <ChevronDown size={13} className="text-primary" />
                          )
                        ) : (
                          <ArrowUpDown size={12} className="opacity-40" />
                        )}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
              {hasExpand && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                  {hasExpand && <TableCell />}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (hasExpand ? 1 : 0)}
                  className="text-center text-muted-foreground py-12 text-sm"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => {
                const key = getRowKey(row);
                const isExpanded = expandedRows.has(key);
                return (
                  <>
                    <TableRow
                      key={key}
                      className={cn("transition-colors", isExpanded && "bg-muted/30")}
                    >
                      {columns.map((col) => (
                        <TableCell key={col.key} className={cn("py-3", col.className)}>
                          {col.cell(row)}
                        </TableCell>
                      ))}
                      {hasExpand && (
                        <TableCell className="w-10">
                          <button
                            onClick={() => toggleRow(key)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Expandir fila"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </TableCell>
                      )}
                    </TableRow>
                    {hasExpand && isExpanded && (
                      <TableRow key={`${key}-expanded`} className="bg-muted/20">
                        <TableCell colSpan={columns.length + 1} className="p-0">
                          {expandedContent!(row)}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {onPageChange && total > pageSize && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Mostrando {Math.min((page - 1) * pageSize + 1, total)}–
            {Math.min(page * pageSize, total)} de {total} registros
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(1)}
              disabled={page === 1}
              className="p-1 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="p-1 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 font-medium text-foreground">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={page >= totalPages}
              className="p-1 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
