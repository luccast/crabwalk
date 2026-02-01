// Client-safe exports (no Node.js dependencies)
export * from './protocol'
export * from './parser'
export * from './collections'

// Shared validation utilities
export interface UrlValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validates a WebSocket URL format.
 * Safe for both client and server use.
 */
export function validateGatewayUrl(url: string): UrlValidationResult {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
      return { valid: false, error: 'Must use ws:// or wss:// protocol' }
    }
    if (!parsed.hostname) {
      return { valid: false, error: 'Hostname is required' }
    }
    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }
}

// Server-only exports are in ./client.ts - import directly from there
