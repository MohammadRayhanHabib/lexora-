/**
 * Security utilities for IELTS mock test environment.
 * - Browser fingerprinting
 * - Incognito / private mode detection
 * - Copy / paste / screenshot prevention
 * - Watermark overlay
 */

/* ── Fingerprint ────────────────────────────────────── */
export async function getFingerprint(): Promise<string> {
  // Collect browser characteristics
  const components: string[] = [];

  // Canvas fingerprint
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = 200;
    canvas.height = 50;
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("Lexora FP", 2, 15);
    components.push(canvas.toDataURL());
  } catch {
    components.push("no-canvas");
  }

  // Screen info
  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Languages
  components.push(navigator.languages?.join(",") || navigator.language);

  // Platform
  components.push(navigator.platform || "unknown");

  // Hardware concurrency
  components.push(String(navigator.hardwareConcurrency || 0));

  // Generate hash
  const raw = components.join("|||");
  const isSecureContext =
    typeof globalThis.isSecureContext === "boolean"
      ? globalThis.isSecureContext
      : true;
  const subtleCrypto = isSecureContext ? globalThis.crypto?.subtle : undefined;
  let hash = "";

  // Prefer Web Crypto when available and fully supported (digest must be a function).
  if (subtleCrypto && typeof subtleCrypto.digest === "function") {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(raw);
      const hashBuffer = await subtleCrypto.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (err) {
      // If something goes wrong (rare), fall back to JS implementation below.
      // eslint-disable-next-line no-console
      console.warn("subtle.digest failed, using fallback hash", err);
    }
  }

  if (!hash) {
    // Fallback for insecure origins or browsers where Web Crypto is missing/partial.
    let fallbackHash = 0;
    for (let i = 0; i < raw.length; i++) {
      fallbackHash = (fallbackHash * 31 + raw.charCodeAt(i)) >>> 0;
    }
    hash = fallbackHash.toString(16).padStart(8, "0");
  }

  try {
    localStorage.setItem("lexora_fp", hash);
  } catch {
    /* ignore storage failures */
  }
  return hash;
}

/* ── Incognito detection ────────────────────────────── */
export async function detectIncognito(): Promise<boolean> {
  // Try storage quota estimation (Chrome)
  if ("storage" in navigator && "estimate" in navigator.storage) {
    const { quota } = await navigator.storage.estimate();
    // In incognito Chrome limits quota significantly
    if (quota && quota < 120_000_000) return true;
  }

  // Try writing to IndexedDB (Firefox private mode blocks it)
  try {
    const db = indexedDB.open("lexora_private_test");
    return await new Promise<boolean>((resolve) => {
      db.onerror = () => resolve(true);
      db.onsuccess = () => {
        db.result.close();
        indexedDB.deleteDatabase("lexora_private_test");
        resolve(false);
      };
    });
  } catch {
    return true;
  }
}

/* ── Mobile device detection ────────────────────────── */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

/* ── Copy / Paste / Right-click prevention ──────────── */
export function enableTestSecurity() {
  // Disable right-click
  document.addEventListener("contextmenu", preventDefault);

  // Disable copy / cut / paste
  document.addEventListener("copy", preventDefault);
  document.addEventListener("cut", preventDefault);
  document.addEventListener("paste", preventDefault);

  // Disable print screen & common screenshot shortcuts
  document.addEventListener("keydown", blockScreenshotKeys);

  // Disable text selection via CSS
  document.body.classList.add("test-container");
}

export function disableTestSecurity() {
  document.removeEventListener("contextmenu", preventDefault);
  document.removeEventListener("copy", preventDefault);
  document.removeEventListener("cut", preventDefault);
  document.removeEventListener("paste", preventDefault);
  document.removeEventListener("keydown", blockScreenshotKeys);
  document.body.classList.remove("test-container");
}

function preventDefault(e: Event) {
  e.preventDefault();
}

function blockScreenshotKeys(e: KeyboardEvent) {
  // PrintScreen
  if (e.key === "PrintScreen") {
    e.preventDefault();
  }
  // Ctrl+Shift+S (Windows snipping), Cmd+Shift+3/4/5 (Mac screenshots)
  if (
    (e.ctrlKey || e.metaKey) &&
    e.shiftKey &&
    ["s", "S", "3", "4", "5"].includes(e.key)
  ) {
    e.preventDefault();
  }
  // Ctrl+P (print)
  if ((e.ctrlKey || e.metaKey) && e.key === "p") {
    e.preventDefault();
  }
  // F12 (devtools)
  if (e.key === "F12") {
    e.preventDefault();
  }
  // Ctrl+Shift+I/J/C (devtools)
  if (
    (e.ctrlKey || e.metaKey) &&
    e.shiftKey &&
    ["i", "I", "j", "J", "c", "C"].includes(e.key)
  ) {
    e.preventDefault();
  }
}

/* ── Screen recording detection (visibility-based) ─── */
export function onVisibilityChange(
  callback: (hidden: boolean) => void,
): () => void {
  const handler = () => callback(document.hidden);
  document.addEventListener("visibilitychange", handler);
  return () => document.removeEventListener("visibilitychange", handler);
}

/* ── Watermark overlay ──────────────────────────────── */
export function createWatermark(text: string): HTMLDivElement {
  const overlay = document.createElement("div");
  overlay.className = "watermark-overlay";
  const count = 30;
  for (let i = 0; i < count; i++) {
    const span = document.createElement("span");
    span.textContent = text;
    overlay.appendChild(span);
  }
  document.body.appendChild(overlay);
  return overlay;
}

export function removeWatermark(overlay: HTMLDivElement) {
  overlay.remove();
}
