# DeepRAG Lab — Security Guidelines & Architecture

## Security Layers

1. **Authentication & Authorization**:
   - Industry-standard JWT tokens with HS256 signature
   - Passwords hashed using bcrypt with salt rounds
   - Short-lived access tokens (30 minutes) and long-lived refresh tokens (7 days)

2. **Rate Limiting Middleware**:
   - In-memory token-bucket rate limiter per IP address
   - Default limit: 60 requests per 60-second window
   - Automatic HTTP 429 response on limit breach

3. **File Upload Security**:
   - File extension whitelist (`.pdf`, `.docx`, `.txt`, `.csv`, `.md`)
   - Maximum upload file size guard (50 MB default)
   - Magic bytes / file signature validation to prevent extension spoofing
   - Filename sanitization against path traversal attacks (`../`)

4. **Input Sanitization & Prompt-Injection Guards**:
   - Query length truncation (4000 char max)
   - HTML and script tag stripping
   - Pattern-matching detection against adversarial prompt override attempts

5. **Secrets & Environment Isolation**:
   - Zero hardcoded credentials in source code
   - Environment variable management using Pydantic Settings
   - Production Docker container runs under a non-root `appuser`
