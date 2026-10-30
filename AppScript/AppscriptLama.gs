const VALID_ACCOUNTS = [
  'ai1@millennia21.id',
  'ai2@millennia21.id',
  'ai03@millennia21.id',
  'ai4@millennia21.id',
  'ai5@millennia21.id'
];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('OpenAI Code Fetcher')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}


// ===============================
// MAIN FUNCTION
// ===============================

function getVerificationCode(accountEmail) {
  const account = String(accountEmail || '').trim().toLowerCase();

  if (!VALID_ACCOUNTS.includes(account)) {
    throw new Error('Unsupported account: ' + accountEmail);
  }

  // Fast search: exact account + OpenAI + last 2 days
  let query =
    'newer_than:2d from:noreply@tm.openai.com ' +
    '{to:' + account + ' cc:' + account + '}';

  let result = findCode(query, account, 10);

  if (result) return result;


  // Fallback for forwarded emails
  query = 'newer_than:2d from:noreply@tm.openai.com';

  result = findCode(query, account, 20);

  if (result) return result;


  // Wider fallback
  query =
    'newer_than:7d ' +
    '{subject:"your chatgpt code" ' +
    'subject:"chatgpt login code" ' +
    'subject:"kode masuk chatgpt"}';

  result = findCode(query, account, 30);

  if (result) return result;


  throw new Error(
    'No recent verification code found for ' + account
  );
}


// ===============================
// SEARCH EMAIL
// ===============================

function findCode(query, requestedAccount, limit) {
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
        !isOtpSubject(subject)
      ) {
        continue;
      }


      const to = (message.getTo() || '').toLowerCase();
      const cc = (message.getCc() || '').toLowerCase();

      let detected = detectAccount(to, cc, '');


      // Clearly another account
      if (detected && detected !== requestedAccount) {
        continue;
      }


      // Only read body when needed
      let body = message.getPlainBody() || '';


      if (!detected) {
        detected = detectAccount(to, cc, body);
      }


      // Raw email fallback for forwarded messages
      if (!detected) {
        const raw = safeRaw(message);
        detected = detectAccount(to, cc, body + '\n' + raw);
      }


      if (detected !== requestedAccount) {
        continue;
      }


      let code = extractCode(subject + '\n' + body);


      // HTML fallback
      if (!code) {
        code = extractCode(message.getBody());
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

function detectAccount(to, cc, text) {

  const direct = (to + ' ' + cc).toLowerCase();


  // Actual Gmail recipient
  for (const account of VALID_ACCOUNTS) {

    if (direct.includes(account)) {
      return account;
    }
  }


  text = String(text || '').toLowerCase();


  // Forwarding headers / account address
  for (const account of VALID_ACCOUNTS) {

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

function isOtpSubject(subject) {

  const s = String(subject || '').toLowerCase();

  return (
    s.includes('chatgpt code') ||
    s.includes('chatgpt login code') ||
    s.includes('kode masuk chatgpt') ||
    s.includes('kode verifikasi chatgpt')
  );
}


function extractCode(text) {

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

function safeRaw(message) {

  try {
    return message.getRawContent() || '';
  }

  catch (e) {
    return '';
  }
}
