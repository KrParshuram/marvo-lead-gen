// queueHelpers.js
// Defensive sanitizer + safeAdd wrapper for BullMQ queue.add

const isObjectIdLike = (v) =>
  v && (v._bsontype === "ObjectID" || v.constructor?.name === "ObjectID" || v.constructor?.name === "ObjectId");

function sanitizeValue(v) {
  if (v === undefined) return undefined; // we'll drop undefined fields
  if (v === null) return null;

  const t = typeof v;
  if (t === "string" || t === "number" || t === "boolean") return v;

  if (v instanceof Date) return v.toISOString();

  // Buffer / Uint8Array not allowed
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(v)) {
    throw new Error("Buffers are not allowed in job data");
  }
  if (v instanceof Uint8Array) {
    throw new Error("Uint8Array is not allowed in job data");
  }

  // Mongoose ObjectId-like -> string
  if (isObjectIdLike(v)) return v.toString();

  if (Array.isArray(v)) {
    return v.map((x) => sanitizeValue(x));
  }

  if (t === "object") {
    // plain object -> sanitize recursively
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      const sv = sanitizeValue(val);
      if (sv !== undefined) out[k] = sv; // drop undefined keys
    }
    return out;
  }

  // functions, symbols etc are invalid
  throw new Error(`Unsupported job data type: ${t}`);
}

export function sanitizeJobData(obj) {
  if (obj == null) return obj;
  // We only accept objects at top-level (or primitives)
  if (typeof obj !== "object") return sanitizeValue(obj);
  return sanitizeValue(obj);
}

function safeNumber(n, fallback = 0) {
  const x = Number(n);
  return Number.isFinite(x) && x >= 0 ? Math.floor(x) : fallback;
}

/**
 * Safely add to a BullMQ queue. This wrapper:
 * - sanitizes the data (ObjectId -> string, Date -> ISO, no Buffer)
 * - enforces numeric options for delay/attempts/backoff
 * - logs full sanitized payload on error for debugging
 *
 * @param {Queue} queue - bullmq Queue instance
 * @param {object} data - job data (will be sanitized)
 * @param {object} opts - job options (e.g. { delay })
 */
export async function safeAdd(queue, data = {}, opts = {}) {
  const safeData = sanitizeJobData(data);

  // normalize numeric opts
  const safeOpts = { ...opts };
  if ("delay" in safeOpts) safeOpts.delay = safeNumber(safeOpts.delay, 0);
  if ("attempts" in safeOpts) safeOpts.attempts = safeNumber(safeOpts.attempts, 0);

  // check JSON-serializability
  try {
    JSON.stringify(safeData);
  } catch (err) {
    console.error("❌ safeAdd: job data not JSON-serializable", { safeData, err });
    throw err;
  }

  try {
    // ✅ Always pass a string job name
    return await queue.add("default", safeData, safeOpts);
  } catch (err) {
    console.error("❌ safeAdd: failed to add job", {
      queueName: queue.name ?? queue?.opts?.name,
      safeData,
      safeOpts,
      err,
    });
    throw err;
  }
}