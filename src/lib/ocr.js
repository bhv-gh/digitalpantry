/**
 * Optional OCR via tesseract.js. The library (~3MB) is loaded on demand
 * so the initial bundle stays lean.
 */
let workerPromise = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const mod = await import("tesseract.js");
      const worker = await mod.createWorker("eng");
      return worker;
    })();
  }
  return workerPromise;
}

export async function runOcr(fileOrUrl, onProgress) {
  const worker = await getWorker();
  const { data } = await worker.recognize(fileOrUrl, {}, (m) => {
    if (m?.status && onProgress) onProgress(m);
  });
  return (data?.text || "").trim();
}

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function toIso(y, m, d) {
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Heuristically find an expiry date in OCR text.
 * Looks for labels like "best before", "use by", "exp", and tries common
 * date formats (dd/mm/yyyy, dd-Mon-yy, mm/yyyy, etc).
 */
export function findExpiryDate(text) {
  if (!text) return null;
  const lower = text.toLowerCase();

  const labelMatch = lower.match(
    /(best\s*before|use\s*by|exp(?:iry|ires)?(?:\s*date)?|bb|bbe)[\s.:-]*([a-z0-9 .,/-]+)/i
  );
  const scope = (labelMatch ? labelMatch[2] : lower).slice(0, 80);

  // dd/mm/yyyy or dd-mm-yyyy or dd.mm.yyyy
  let m = scope.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/);
  if (m) {
    const d = +m[1], mo = +m[2];
    let y = +m[3]; if (y < 100) y += 2000;
    const iso = toIso(y, mo, d);
    if (iso) return iso;
  }

  // dd Mon yyyy (Mon = 3-4 letters)
  m = scope.match(/\b(\d{1,2})\s*([a-z]{3,4})\s*(\d{2,4})\b/);
  if (m) {
    const d = +m[1], mo = MONTHS[m[2].toLowerCase()];
    let y = +m[3]; if (y < 100) y += 2000;
    if (mo) {
      const iso = toIso(y, mo, d);
      if (iso) return iso;
    }
  }

  // mm/yyyy → end of month
  m = scope.match(/\b(\d{1,2})[/\-.](\d{4})\b/);
  if (m) {
    const mo = +m[1], y = +m[2];
    if (mo >= 1 && mo <= 12) {
      return `${y}-${String(mo).padStart(2, "0")}-${String(lastDayOfMonth(y, mo)).padStart(2, "0")}`;
    }
  }

  // Mon yyyy
  m = scope.match(/\b([a-z]{3,4})\s*(\d{4})\b/);
  if (m) {
    const mo = MONTHS[m[1].toLowerCase()];
    const y = +m[2];
    if (mo) {
      return `${y}-${String(mo).padStart(2, "0")}-${String(lastDayOfMonth(y, mo)).padStart(2, "0")}`;
    }
  }

  return null;
}
