import type { BootMessage } from '../types';

// Session storage key for boot state (persists across open/close, resets on page reload)
export const BOOT_SESSION_KEY = 'rag-terminal-booted';

/**
 * Generate dynamic boot sequence with forensic data
 */
export function generateBootSequence(nodeId?: string): BootMessage[] {
  const similarity = (0.95 + Math.random() * 0.049).toFixed(3);
  const node =
    nodeId ||
    `${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}_${String(Math.floor(Math.random() * 99) + 1).padStart(2, '0')}`;

  return [
    { text: '[SCAN] INITIALIZING_FORENSIC_READOUT...', delay: 0 },
    { text: `[SCAN] NODE_ID: ${node}`, delay: 120 },
    { text: `[SCAN] VECTOR_SIMILARITY: ${similarity}`, delay: 240 },
    { text: '[SCAN] SOURCE: NEON_DB_PROD', delay: 360 },
    { text: '[SYSTEM] EMBEDDING_INDEX: LOADED', delay: 480 },
    { text: '[SYSTEM] AI_GATEWAY: CONNECTED', delay: 600 },
    { text: '[SYSTEM] FORENSIC_READOUT_INITIALIZED...', delay: 720 },
  ];
}

/**
 * Check if we've booted this session using sessionStorage
 */
export function getHasBootedThisSession(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(BOOT_SESSION_KEY) === 'true';
}

/**
 * Set the boot state in sessionStorage
 */
export function setHasBootedThisSession(value: boolean): void {
  if (typeof window === 'undefined') return;
  if (value) {
    sessionStorage.setItem(BOOT_SESSION_KEY, 'true');
  } else {
    sessionStorage.removeItem(BOOT_SESSION_KEY);
  }
}
