"use client";

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Filter, Calendar } from 'lucide-react';
import { formatDistanceToNow, format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

// Generic interfaces for the exportable table
export interface TableColumn<T> {
  key: keyof T;
  header: string;
  accessor: (item: T) => React.ReactNode;
  csvAccessor?: (item: T) => string | number;
  className?: string;
}

export interface ExportableTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  title: string;
  dateField: keyof T; // Which field to use for date filtering
  filename: string; // Base filename for exports
  emptyMessage?: string;
  showDateFilters?: boolean;
}

// Generic function to safely access nested properties
const safeGet = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

// Generic ExportableTable component
export function ExportableTable<T extends Record<string, any>>({
  data,
  columns,
  title,
  dateField,
  filename,
  emptyMessage = "No data found",
  showDateFilters = true
}: ExportableTableProps<T>) {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Filter data based on date range
  const filteredData = useMemo(() => {
    if (!data) return [];
    
    let filtered = [...data];

    if (showDateFilters && startDate) {
      const start = startOfDay(new Date(startDate));
      filtered = filtered.filter(item => {
        const itemDate = safeGet(item, dateField as string);
        if (!itemDate) return false;
        const date = new Date(itemDate);
        return isAfter(date, start) || format(date, 'yyyy-MM-dd') === startDate;
      });
    }

    if (showDateFilters && endDate) {
      const end = endOfDay(new Date(endDate));
      filtered = filtered.filter(item => {
        const itemDate = safeGet(item, dateField as string);
        if (!itemDate) return false;
        const date = new Date(itemDate);
        return isBefore(date, end) || format(date, 'yyyy-MM-dd') === endDate;
      });
    }

    return filtered;
  }, [data, startDate, endDate, dateField, showDateFilters]);

  // Function to download as CSV
  const downloadCSV = (dataToExport = filteredData) => {
    if (!dataToExport || dataToExport.length === 0) {
      alert('No data to download');
      return;
    }

    // Create CSV headers
    const headers = columns.map(col => col.header);

    // Convert data to CSV rows
    const csvRows = dataToExport.map(item => 
      columns.map(col => {
        const value = col.csvAccessor 
          ? col.csvAccessor(item)
          : safeGet(item, col.key as string) ?? '';
        
        // Handle string values that might contain commas
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
    );

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    const dateRange = startDate && endDate ? `_${startDate}_to_${endDate}` : '';
    link.setAttribute('download', `${filename}${dateRange}_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  };

  // Function to download as Excel
  const downloadExcel = (dataToExport = filteredData) => {
    if (!dataToExport || dataToExport.length === 0) {
      alert('No data to download');
      return;
    }

    // Create Excel headers
    const headers = columns.map(col => col.header);

    // Convert data to Excel rows
    const excelRows = dataToExport.map(item => 
      columns.map(col => {
        const value = col.csvAccessor 
          ? col.csvAccessor(item)
          : safeGet(item, col.key as string) ?? '';
        
        // Remove tabs that might break formatting
        if (typeof value === 'string') {
          return value.replace(/\t/g, ' ');
        }
        return value;
      })
    );

    // Use tab separation for Excel
    const excelContent = [
      headers.join('\t'),
      ...excelRows.map(row => row.join('\t'))
    ].join('\n');

    // Create and download the file
    const blob = new Blob([excelContent], { 
      type: 'application/vnd.ms-excel;charset=utf-8;' 
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    const dateRange = startDate && endDate ? `_${startDate}_to_${endDate}` : '';
    link.setAttribute('download', `${filename}${dateRange}_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xls`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  };

  // Clear date filters
  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  // Quick date filter presets
  const setQuickFilter = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          {showDateFilters && (startDate || endDate) && (
            <Badge variant="secondary" className="text-xs">
              {filteredData.length} of {data.length} records
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Filter Toggle Button */}
          {showDateFilters && (
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          )}

          {/* Download Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => downloadCSV()}>
                Download as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadExcel()}>
                Download as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Date Filters */}
      {showDateFilters && showFilters && (
        <div className="border rounded-lg p-4 bg-muted/50 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4" />
            Date Filters
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date" className="text-sm">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate || format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end-date" className="text-sm">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Quick Filters</Label>
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setQuickFilter(7)}
                  className="text-xs"
                >
                  7d
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setQuickFilter(30)}
                  className="text-xs"
                >
                  30d
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setQuickFilter(90)}
                  className="text-xs"
                >
                  90d
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Actions</Label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearFilters}
                className="w-full text-xs"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead key={index} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.map((item, index) => (
            <TableRow key={index}>
              {columns.map((column, colIndex) => (
                <TableCell key={colIndex} className={column.className}>
                  {column.accessor(item)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}