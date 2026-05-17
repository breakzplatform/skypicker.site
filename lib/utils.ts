import { clsx, type ClassValue } from "clsx"
import { parse as pslParse, type ParsedDomain } from "psl"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDomain(host: string): ParsedDomain {
  const parsed = pslParse(host)
  if ("error" in parsed) {
    throw new Error(String(parsed.error.message))
  }
  return parsed
}
