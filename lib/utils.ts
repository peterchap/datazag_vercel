import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatDate(date: Date | string): string {
  try {
    // If date is falsy or obviously invalid, return a fallback
    if (!date || date === 'null' || date === 'undefined') {
      return 'N/A';
    }
    
    const d = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(d.getTime())) {
      return 'Invalid date';
    }
    
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch (error) {
    console.error('Error formatting date:', error, date);
    return 'Invalid date';
  }
}

export function timeAgo(date: Date | string): string {
  try {
    // If date is falsy or obviously invalid, return a fallback
    if (!date || date === 'null' || date === 'undefined') {
      return 'N/A';
    }
    
    const d = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(d.getTime())) {
      return 'Invalid date';
    }
    
    const seconds = Math.floor((new Date().getTime() - d.getTime()) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) {
      return Math.floor(interval) + " years ago";
    }
    
    interval = seconds / 2592000;
    if (interval > 1) {
      return Math.floor(interval) + " months ago";
    }
    
    interval = seconds / 86400;
    if (interval > 1) {
      return Math.floor(interval) + " days ago";
    }
    
    interval = seconds / 3600;
    if (interval > 1) {
      return Math.floor(interval) + " hours ago";
    }
    
    interval = seconds / 60;
    if (interval > 1) {
      return Math.floor(interval) + " minutes ago";
    }
    
    return Math.floor(seconds) + " seconds ago";
  } catch (error) {
    console.error('Error calculating time ago:', error, date);
    return 'Invalid date';
  }
}

export function truncateString(str: string, length: number = 10): string {
  if (str.length <= length) return str;
  return `${str.substring(0, length)}...`;
}

export function truncateMiddle(str: string, startLength: number = 6, endLength: number = 4): string {
  if (str.length <= startLength + endLength) return str;
  return `${str.substring(0, startLength)}...${str.substring(str.length - endLength)}`;
}

export function maskApiKey(key: string): string {
  if (!key) return '';
  const prefix = key.substring(0, 7); // Usually api_xxx
  const suffix = key.substring(key.length - 4);
  return `${prefix}...${suffix}`;
}
