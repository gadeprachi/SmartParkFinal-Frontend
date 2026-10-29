// backend/sse/sseManager.js
// ============================================================
// Server-Sent Events (SSE) Manager
// ============================================================
// Maintains a registry of active SSE connections keyed by
// sessionId. The controller calls `sendToSession()` to push
// real-time slot-available notifications to the browser.
// ============================================================

/** @type {Map<string, import('express').Response[]>} */
const clients = new Map();

/**
 * Register a new SSE client response for a session.
 * @param {string} sessionId
 * @param {import('express').Response} res
 */
const addClient = (sessionId, res) => {
  if (!clients.has(sessionId)) clients.set(sessionId, []);
  clients.get(sessionId).push(res);
};

/**
 * Remove a specific response from a session's client list.
 * @param {string} sessionId
 * @param {import('express').Response} res
 */
const removeClient = (sessionId, res) => {
  if (!clients.has(sessionId)) return;
  const remaining = clients.get(sessionId).filter((r) => r !== res);
  if (remaining.length === 0) clients.delete(sessionId);
  else clients.set(sessionId, remaining);
};

/**
 * Push a JSON event to all open SSE connections for a session.
 * @param {string} sessionId
 * @param {string} event  – SSE event name (e.g. "notification")
 * @param {object} data   – Payload serialised as JSON
 */
const sendToSession = (sessionId, event, data) => {
  if (!clients.has(sessionId)) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients.get(sessionId)) {
    try {
      res.write(payload);
    } catch (_) {
      // Connection already closed; will be cleaned up on 'close'
    }
  }
};

/**
 * Broadcast to ALL connected sessions (e.g. general slot updates).
 * @param {string} event
 * @param {object} data
 */
const broadcast = (event, data) => {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const responses of clients.values()) {
    for (const res of responses) {
      try {
        res.write(payload);
      } catch (_) {
        // ignore closed connections
      }
    }
  }
};

module.exports = { addClient, removeClient, sendToSession, broadcast };
