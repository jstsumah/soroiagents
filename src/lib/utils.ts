import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatWebsiteDisplay(url: string | undefined | null) {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
}

export function ensureHttps(url: string | undefined | null) {
  if (!url) return '';
  let formatted = url.trim().toLowerCase();
  if (!formatted.startsWith('http')) {
    formatted = `https://${formatted}`;
  }
  return formatted;
}
