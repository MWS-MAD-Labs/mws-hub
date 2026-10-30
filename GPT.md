# Implement GPT-Code Gmail API Integration — Single Mailbox Testing Phase

Implement the initial Gmail API integration for GPT-Code in Hub.

## Objective

Build and test a working end-to-end OTP retrieval flow using only one Gmail account:

`asror@millennia21.id`

This is an initial testing phase. The goal is to verify that Hub can authenticate with Gmail API, retrieve an actual OTP email, parse the message, and return the OTP securely.

**Do not implement A1–A5 account support yet.**

## 1. Scope: Single Gmail Account Only

For this phase:

- Use only `asror@millennia21.id`.
- Do not use A1–A5 mappings.
- Do not implement recipient identification for A1–A5.
- Do not implement multi-mailbox support.
- Do not configure forwarding rules.
- Do not assume any other Gmail account is involved.
- Keep the implementation simple and isolated so multi-account support can be added later.

The integration mailbox must be configurable through an environment variable, with `asror@millennia21.id` as the initial expected value.

## 2. Preserve Existing Hub Architecture

Reuse the existing GPT-Code implementation wherever possible.

Preserve:

- Existing Hub session authentication.
- Existing Central identity validation.
- Existing admin authorization.
- Existing API conventions and response formats.
- Existing security practices.
- Existing audit handling.

Do not rebuild GPT-Code or make unrelated changes.

If existing A1–A5-specific logic prevents a safe single-account testing flow, isolate the new testing flow rather than weakening or breaking the existing production flow.

## 3. Gmail OAuth Integration

Implement a dedicated Gmail OAuth integration, separate from ordinary Hub Google login.

Requirements:

- Gmail OAuth scope: `https://www.googleapis.com/auth/gmail.readonly`
- Support offline access and refresh tokens.
- Use `access_type=offline`.
- Use `prompt=consent` when initial authorization requires a refresh token.
- Read credentials from environment variables or the existing secure configuration mechanism.
- Store refresh tokens securely outside source control.
- Never expose credentials or tokens through API responses or logs.

Do not use ordinary Hub login tokens as Gmail API credentials.

## 4. OTP Retrieval

Implement retrieval from the configured integration mailbox.

Requirements:

1. Search for recent OpenAI verification emails.
2. Retrieve candidate messages using Gmail API.
3. Decode MIME content, including multipart plain-text and HTML messages.
4. Validate the sender and email context.
5. Extract exactly six digits as the OTP.
6. Select the newest valid message using Gmail `internalDate`.
7. Reject stale OTPs using a configurable freshness window, defaulting to 15 minutes.
8. Handle missing, malformed, ambiguous, or expired messages safely.
9. Return only the OTP and necessary metadata.

For this phase, recipient validation must only confirm that the message belongs to the configured integration mailbox. Do not introduce A1–A5 recipient logic.

Treat email content as untrusted input.

Never return email bodies, subjects, or unrelated mailbox data.

## 5. Testing API Flow

Provide a secure testing flow using the existing Hub session and authorization conventions.

The flow should allow an authorized user to:

1. Request an OTP from the configured Gmail mailbox.
2. Have Hub retrieve the latest valid OTP.
3. Receive the OTP in a structured JSON response.

Do not expose a public endpoint.

Do not allow the client to submit arbitrary Gmail addresses, search queries, or mailbox identifiers.

If a separate admin-only Gmail connection or authorization endpoint is required, implement it using existing Hub admin authorization conventions.

## 6. Provider Configuration

- Add explicit Gmail provider configuration.
- Keep the existing Apps Script provider available for rollback.
- Do not remove existing Apps Script code or environment variables.
- Do not change the existing production provider automatically.
- Make the new Gmail testing flow selectable through configuration.
- Invalid or missing configuration must fail safely.

## 7. Tests

Add automated tests covering:

- Gmail API message retrieval.
- OAuth token refresh.
- Missing configuration.
- Gmail API errors.
- Multipart MIME decoding.
- Plain-text and HTML OTP extraction.
- Invalid sender.
- Missing OTP.
- Multiple OTP candidates.
- Newest message selection.
- Stale OTP rejection.
- Malformed email messages.
- Unauthorized access.
- Existing session and Central validation.

Mock Gmail API calls for automated tests. Do not require real Gmail credentials to run the test suite.

## 8. External Configuration and Coordination

I will handle all external configuration on my side.

If anything requires configuration outside the repository, notify me with:

1. What needs to be configured.
2. Where to configure it.
3. Exact setup steps.
4. Required OAuth scopes and redirect URIs.
5. Required environment variables.
6. Which values are safe to share and which must remain secret.
7. How to verify that the configuration works.

Possible external requirements:

- Enable Gmail API in the MWS Google Cloud project.
- Create a dedicated OAuth client.
- Configure OAuth consent screen as Internal.
- Authorize `asror@millennia21.id`.
- Configure the OAuth redirect URI.
- Obtain and securely store the refresh token.
- Configure Hub environment variables.
- Obtain any required Workspace administrator approval.

Important:

- Do not access or modify Google Cloud, Google Workspace, Gmail, or production settings.
- Do not create or authorize the mailbox yourself.
- Do not fabricate credentials or configuration values.
- Do not ask me to share refresh tokens or secrets in chat.
- Provide a secure way to supply credentials.
- Pause only the implementation parts that depend on external configuration.
- Continue independent implementation and testing where possible.
- Notify me as soon as external configuration is needed.

## 9. Implementation Workflow

1. Reuse the previous investigation findings.
2. Inspect only files needed for this implementation.
3. Implement the single-mailbox Gmail integration.
4. Keep existing Apps Script functionality intact.
5. Add automated tests with mocked Gmail API calls.
6. Run relevant tests, typecheck, lint, and build checks where available.
7. Review the final diff for unrelated changes.

Do not perform database migrations unless technically necessary.

Do not start implementing A1–A5 support in this phase.

Start implementation now. Do not stop at another investigation report.

## 10. Final Report

Report:

- Files changed.
- Implementation completed.
- API flow and endpoints added or reused.
- Tests and checks performed with actual results.
- Required Google Cloud configuration.
- Required environment variables.
- Required Workspace configuration.
- External configuration still pending.
- Exact next steps to test a real OTP using `asror@millennia21.id`.

Clearly distinguish between local implementation, mocked testing, and successful real Gmail API testing.

Do not claim production readiness until a real OTP has been successfully retrieved from `asror@millennia21.id`.
