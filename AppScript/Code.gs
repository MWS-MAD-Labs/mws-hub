// ===============================
// MWS HUB GPT CODE API + UI
// ===============================
//
// One project, two deployments:
//   - UI  (existing URL): Execute as "Me", Who has access "millennia21.id".
//   - API (Hub backend):  Execute as "Me", Who has access "Anyone".
//
// The API deployment is public, so doGet and getVerificationCode check the
// signed-in Google account themselves; anonymous visitors get nothing. Every
// other helper ends with "_" so google.script.run cannot call it.
//
// Request (POST JSON), sent by backend/src/service/gpt-code-service.ts:
//   { action, cardId, timestamp, nonce, signature }
//   signature = hex(HMAC-SHA256(secret, "action|cardId|timestamp|nonce"))
//
// Script Properties:
//   HUB_HMAC_SECRET  same value as GPT_CODE_APPS_SCRIPT_SECRET in Hub

const ACCOUNTS_ = {
  A1: 'ai1@millennia21.id',
  A2: 'ai2@millennia21.id',
  A3: 'ai03@millennia21.id',
  A4: 'ai4@millennia21.id',
  A5: 'ai5@millennia21.id'
};

const VALID_ACCOUNTS_ = Object.keys(ACCOUNTS_).map(function (id) {
  return ACCOUNTS_[id];
});

const ACTIONS_ = ['getAccounts', 'getAccount', 'getCode'];

const MAX_CLOCK_SKEW_SECONDS_ = 300;
const NONCE_TTL_SECONDS_ = 600;

const ALLOWED_DOMAIN_ = '@millennia21.id';


// ===============================
// UI (google.script.run)
// ===============================

function doGet() {
  if (!isDomainUser_()) {
    return HtmlService.createHtmlOutput('Access denied.');
  }

  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('OpenAI Code Fetcher')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}


function getVerificationCode(accountEmail) {
  if (!isDomainUser_()) {
    throw new Error('Access denied.');
  }

  const account = String(accountEmail || '').trim().toLowerCase();

  if (!VALID_ACCOUNTS_.includes(account)) {
    throw new Error('Unsupported account: ' + accountEmail);
  }

  try {
    return getVerificationCode_(account);
  }

  catch (error) {
    if (error instanceof ApiError_) {
      throw new Error('No recent verification code found for ' + account);
    }
    throw error;
  }
}


function isDomainUser_() {
  // Blank for anonymous visitors of the "Anyone" deployment.
  const email = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  return email.endsWith(ALLOWED_DOMAIN_);
}


// ===============================
// API ENTRY POINT
// ===============================

function doPost(e) {
  try {
    const request = parseRequest_(e);
    verifySignature_(request);
    return json_({ ok: true, data: dispatch_(request) });
  }

  catch (error) {
    if (error instanceof ApiError_) {
      return json_({
        ok: false,
        error: { code: error.code, message: error.message }
      });
    }

    console.error(error);

    return json_({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'GPT Code request failed.' }
    });
  }
}


function dispatch_(request) {
  if (request.action === 'getAccounts') {
    return Object.keys(ACCOUNTS_).map(function (id) {
      return { cardId: id, email: ACCOUNTS_[id] };
    });
  }

  const email = ACCOUNTS_[request.cardId];

  if (!email) {
    throw new ApiError_('INVALID_CARD_ID', 'Unknown GPT card id.');
  }

  if (request.action === 'getAccount') {
    return { cardId: request.cardId, email: email };
  }

  const result = getVerificationCode_(email);

  return {
    cardId: request.cardId,
    code: result.code,
    timestamp: result.timestamp,
    subject: result.subject
  };
}


// ===============================
// REQUEST VALIDATION
// ===============================

function ApiError_(code, message) {
  this.code = code;
  this.message = message;
}


function parseRequest_(e) {
  let body;

  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '');
  }

  catch (error) {
    throw new ApiError_('INVALID_REQUEST', 'Request body must be JSON.');
  }

  if (!body || typeof body !== 'object') {
    throw new ApiError_('INVALID_REQUEST', 'Request body must be JSON.');
  }

  const action = body.action;
  const cardId = body.cardId === undefined ? '' : body.cardId;
  const timestamp = body.timestamp;
  const nonce = body.nonce;
  const signature = body.signature;

  if (
    ACTIONS_.indexOf(action) === -1 ||
    typeof cardId !== 'string' ||
    cardId.length > 2 ||
    typeof timestamp !== 'number' ||
    !Number.isInteger(timestamp) ||
    typeof nonce !== 'string' ||
    !/^[A-Za-z0-9-]{16,64}$/.test(nonce) ||
    typeof signature !== 'string' ||
    !/^[0-9a-f]{64}$/.test(signature)
  ) {
    throw new ApiError_('INVALID_REQUEST', 'Invalid request.');
  }

  return {
    action: action,
    cardId: cardId,
    timestamp: timestamp,
    nonce: nonce,
    signature: signature
  };
}


function verifySignature_(request) {
  const secret = PropertiesService
    .getScriptProperties()
    .getProperty('HUB_HMAC_SECRET');

  if (!secret || secret.length < 32) {
    throw new ApiError_('API_NOT_CONFIGURED', 'GPT Code API is not configured.');
  }

  const now = Math.floor(Date.now() / 1000);

  if (Math.abs(now - request.timestamp) > MAX_CLOCK_SKEW_SECONDS_) {
    throw new ApiError_('UNAUTHORIZED', 'Unauthorized.');
  }

  const canonical = [
    request.action,
    request.cardId,
    request.timestamp,
    request.nonce
  ].join('|');

  const expected = toHex_(
    Utilities.computeHmacSha256Signature(canonical, secret)
  );

  if (!constantTimeEquals_(expected, request.signature)) {
    throw new ApiError_('UNAUTHORIZED', 'Unauthorized.');
  }

  // Only a correctly signed request may claim a nonce, so attackers cannot
  // fill the cache. The lock makes check-and-set atomic for parallel calls.
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);

  try {
    const cache = CacheService.getScriptCache();
    const key = 'nonce:' + request.nonce;

    if (cache.get(key)) {
      throw new ApiError_('UNAUTHORIZED', 'Unauthorized.');
    }

    cache.put(key, '1', NONCE_TTL_SECONDS_);
  }

  finally {
    lock.releaseLock();
  }
}


function toHex_(bytes) {
  return bytes.map(function (b) {
    return ('0' + (b & 0xff).toString(16)).slice(-2);
  }).join('');
}


function constantTimeEquals_(a, b) {
  if (a.length !== b.length) return false;

  let diff = 0;

  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return diff === 0;
}


function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}


// ===============================
// MAIN FUNCTION
// ===============================

function getVerificationCode_(account) {

  // Fast search: exact account + OpenAI + last 2 days
  let query =
    'newer_than:2d from:noreply@tm.openai.com ' +
    '{to:' + account + ' cc:' + account + '}';

  let result = findCode_(query, account, 10);

  if (result) return result;


  // Fallback for forwarded emails
  query = 'newer_than:2d from:noreply@tm.openai.com';

  result = findCode_(query, account, 20);

  if (result) return result;


  // Wider fallback
  query =
    'newer_than:7d ' +
    '{subject:"your chatgpt code" ' +
    'subject:"chatgpt login code" ' +
    'subject:"kode masuk chatgpt"}';

  result = findCode_(query, account, 30);

  if (result) return result;


  // Hub maps this message to 404.
  throw new ApiError_(
    'INTERNAL_ERROR',
    'No recent verification code found.'
  );
}


// ===============================
// SEARCH EMAIL
// ===============================

function findCode_(query, requestedAccount, limit) {
  const threads = GmailApp.search(query, 0, limit);

  if (!threads.length) return null;

  const allMessages = GmailApp.getMessagesForThreads(threads);

  let newest = null;


  for (const messages of allMessages) {

    // newest message first
    for (let i = messages.length - 1; i >= 0; i--) {

      const message = messages[i];

      const subject = message.getSubject() || '';
      const from = (message.getFrom() || '').toLowerCase();


      // Skip unrelated emails
      if (
        !from.includes('openai.com') &&
        !isOtpSubject_(subject)
      ) {
        continue;
      }


      const to = (message.getTo() || '').toLowerCase();
      const cc = (message.getCc() || '').toLowerCase();

      let detected = detectAccount_(to, cc, '');


      // Clearly another account
      if (detected && detected !== requestedAccount) {
        continue;
      }


      // Only read body when needed
      let body = message.getPlainBody() || '';


      if (!detected) {
        detected = detectAccount_(to, cc, body);
      }


      // Raw email fallback for forwarded messages
      if (!detected) {
        const raw = safeRaw_(message);
        detected = detectAccount_(to, cc, body + '\n' + raw);
      }


      if (detected !== requestedAccount) {
        continue;
      }


      let code = extractCode_(subject + '\n' + body);


      // HTML fallback
      if (!code) {
        code = extractCode_(message.getBody());
      }


      if (!code) continue;


      const date = message.getDate();
      const dateMs = date.getTime();


      if (!newest || dateMs > newest.dateMs) {

        newest = {
          dateMs: dateMs,
          code: code,

          timestamp: Utilities.formatDate(
            date,
            Session.getScriptTimeZone() || 'Asia/Jakarta',
            'dd MMM yyyy, HH:mm:ss'
          ),

          subject: subject
        };
      }
    }
  }


  if (!newest) return null;


  return {
    code: newest.code,
    timestamp: newest.timestamp,
    subject: newest.subject
  };
}


// ===============================
// ACCOUNT DETECTION
// ===============================

function detectAccount_(to, cc, text) {

  const direct = (to + ' ' + cc).toLowerCase();


  // Actual Gmail recipient
  for (const account of VALID_ACCOUNTS_) {

    if (direct.includes(account)) {
      return account;
    }
  }


  text = String(text || '').toLowerCase();


  // Forwarding headers / account address
  for (const account of VALID_ACCOUNTS_) {

    if (text.includes(account)) {
      return account;
    }
  }


  // Fallback aliases
  if (
    text.includes('kindie') ||
    text.includes('kindy')
  ) {
    return 'ai1@millennia21.id';
  }


  if (text.includes('elementary')) {
    return 'ai2@millennia21.id';
  }


  if (
    text.includes('junior high') ||
    text.includes('jhs')
  ) {
    return 'ai03@millennia21.id';
  }


  if (text.includes('coordinator')) {
    return 'ai4@millennia21.id';
  }


  if (
    text.includes('directorate team') ||
    text.includes('directorate')
  ) {
    return 'ai5@millennia21.id';
  }


  return null;
}


// ===============================
// OTP DETECTION
// ===============================

function isOtpSubject_(subject) {

  const s = String(subject || '').toLowerCase();

  return (
    s.includes('chatgpt code') ||
    s.includes('chatgpt login code') ||
    s.includes('kode masuk chatgpt') ||
    s.includes('kode verifikasi chatgpt')
  );
}


function extractCode_(text) {

  const s = String(text || '');


  const patterns = [

    /(?:verification code|login code|chatgpt code)\D{0,40}(\d{6})/i,

    /(?:kode verifikasi|kode masuk|kode chatgpt)\D{0,40}(\d{6})/i,

    /\b(\d{6})\b/
  ];


  for (const pattern of patterns) {

    const match = s.match(pattern);

    if (match) {
      return match[1];
    }
  }


  return null;
}


// ===============================
// RAW EMAIL FALLBACK
// ===============================

function safeRaw_(message) {

  try {
    return message.getRawContent() || '';
  }

  catch (e) {
    return '';
  }
}
