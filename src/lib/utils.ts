import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function truncate(text: string, length = 180) {
  if (text.length <= length) return text;
  return `${text.slice(0, length)}...`;
}
