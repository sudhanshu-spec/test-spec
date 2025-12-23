# SSL/TLS Certificate Management

This document provides comprehensive instructions for generating and managing SSL/TLS certificates for the Express HTTPS server. Follow the appropriate section based on your environment (development or production).

---

## Table of Contents

1. [Development Certificates](#development-certificates)
2. [Production Certificates](#production-certificates)
3. [Security Best Practices](#security-best-practices)
4. [Usage Notes](#usage-notes)
5. [TLS Configuration](#tls-configuration)

---

## Development Certificates

### Generating Self-Signed Certificates

For local development and testing, you can generate self-signed certificates using OpenSSL. These certificates are **not suitable for production** but allow HTTPS testing in development environments.

#### Quick Generation Command

Run the following command from the project root directory:

```bash
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/CN=localhost"
```

#### Command Flags Explained

| Flag | Description |
|------|-------------|
| `-x509` | Generates a self-signed certificate instead of a certificate signing request (CSR) |
| `-newkey rsa:4096` | Creates a new RSA private key with 4096-bit encryption strength |
| `-keyout certs/key.pem` | Specifies the output path for the private key file |
| `-out certs/cert.pem` | Specifies the output path for the certificate file |
| `-days 365` | Sets the certificate validity period to 365 days (1 year) |
| `-nodes` | Creates an unencrypted private key (no passphrase required at startup) |
| `-subj "/CN=localhost"` | Sets the certificate's Common Name to "localhost" for local development |

#### Alternative: Interactive Certificate Generation

For more detailed certificate information, omit the `-subj` flag for an interactive prompt:

```bash
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes
```

You will be prompted for:
- Country Name (2 letter code)
- State or Province Name
- Locality Name (city)
- Organization Name
- Organizational Unit Name
- Common Name (use `localhost` for development)
- Email Address

#### ECDSA Alternative (Faster Performance)

For development environments where performance is a concern, use ECDSA P-256:

```bash
openssl ecparam -genkey -name prime256v1 -out certs/key.pem
openssl req -new -x509 -key certs/key.pem -out certs/cert.pem -days 365 -subj "/CN=localhost"
```

### Browser Security Warnings

> ⚠️ **Important:** Self-signed certificates will trigger security warnings in web browsers because they are not issued by a trusted Certificate Authority.

**To bypass in development:**

- **Chrome/Edge:** Click "Advanced" → "Proceed to localhost (unsafe)"
- **Firefox:** Click "Advanced..." → "Accept the Risk and Continue"
- **Safari:** Click "Show Details" → "visit this website"

These warnings are expected behavior for self-signed certificates and do not indicate a problem with your implementation.

---

## Production Certificates

### Let's Encrypt (Recommended for Public Servers)

[Let's Encrypt](https://letsencrypt.org/) provides free, automated SSL/TLS certificates trusted by all major browsers.

#### Using Certbot

1. **Install Certbot:**

   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install -y certbot

   # macOS with Homebrew
   brew install certbot

   # CentOS/RHEL
   sudo yum install -y certbot
   ```

2. **Obtain Certificate (Standalone Mode):**

   Stop your server temporarily, then run:

   ```bash
   sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
   ```

3. **Certificate Location:**

   Certificates are stored at:
   - Certificate: `/etc/letsencrypt/live/yourdomain.com/fullchain.pem`
   - Private Key: `/etc/letsencrypt/live/yourdomain.com/privkey.pem`

4. **Configure Environment Variables:**

   ```bash
   SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
   SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
   ```

#### Automatic Renewal

Let's Encrypt certificates expire every 90 days. Set up automatic renewal:

```bash
# Test renewal process
sudo certbot renew --dry-run

# Add cron job for automatic renewal (runs twice daily)
echo "0 0,12 * * * root certbot renew --quiet --post-hook 'systemctl reload your-app'" | sudo tee -a /etc/crontab
```

### Commercial Certificate Authorities

For enterprise environments or extended validation (EV) certificates, consider commercial CAs:

| Provider | Website | Use Case |
|----------|---------|----------|
| DigiCert | [digicert.com](https://www.digicert.com) | Enterprise, EV certificates |
| Sectigo (Comodo) | [sectigo.com](https://sectigo.com) | Budget-friendly options |
| GlobalSign | [globalsign.com](https://www.globalsign.com) | High-volume issuance |
| GoDaddy | [godaddy.com/web-security/ssl-certificate](https://www.godaddy.com/web-security/ssl-certificate) | Small business |

#### Commercial Certificate Installation

1. Generate a Certificate Signing Request (CSR):

   ```bash
   openssl req -new -newkey rsa:4096 -nodes -keyout certs/key.pem -out certs/request.csr
   ```

2. Submit the CSR to your chosen CA
3. Complete domain validation as required
4. Download the issued certificate and any intermediate certificates
5. Combine into a full chain if necessary:

   ```bash
   cat your_certificate.crt intermediate.crt > certs/cert.pem
   ```

### Certificate Renewal Procedures

#### Manual Renewal Checklist

- [ ] Generate new CSR or use automatic renewal (Let's Encrypt)
- [ ] Submit renewal request 30 days before expiration
- [ ] Validate domain ownership
- [ ] Download new certificate
- [ ] Replace old certificate files
- [ ] Restart application to load new certificates
- [ ] Verify new certificate is active: `openssl s_client -connect yourdomain.com:443`

#### Monitoring Certificate Expiration

Set up expiration alerts:

```bash
# Check expiration date
openssl x509 -enddate -noout -in certs/cert.pem

# Example output: notAfter=Dec 19 00:00:00 2026 GMT
```

---

## Security Best Practices

### File Permissions

Protect your private key with restrictive file permissions:

```bash
# Set private key to owner read-only (critical security requirement)
chmod 600 certs/key.pem

# Set certificate to owner read-only (recommended)
chmod 644 certs/cert.pem

# Verify permissions
ls -la certs/
# Expected output for key.pem: -rw------- (600)
# Expected output for cert.pem: -rw-r--r-- (644)
```

> ⚠️ **Critical:** Private keys with permissions more permissive than `600` can be read by other users on the system, potentially compromising all encrypted communications.

### Version Control Security

**NEVER commit private keys or certificates to version control.**

This repository's `.gitignore` includes patterns to prevent accidental commits:

```gitignore
# SSL Certificates (keep private keys secure)
certs/*.pem
certs/*.key
certs/*.crt
*.p12
*.pfx
```

If you accidentally commit a private key:

1. Immediately revoke the compromised certificate
2. Generate a new key pair
3. Remove from Git history:
   ```bash
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch certs/key.pem' \
     --prune-empty --tag-name-filter cat -- --all
   ```
4. Force push to all remotes
5. Notify your security team

### Certificate Rotation Strategy

Implement regular certificate rotation to minimize exposure from potential key compromise:

| Environment | Rotation Frequency | Rationale |
|-------------|-------------------|-----------|
| Development | As needed | Self-signed certificates can be regenerated anytime |
| Staging | Every 90 days | Match production rotation cycle |
| Production | Every 90 days (Let's Encrypt) or annually (commercial) | Balance security with operational overhead |

#### Rotation Procedure

1. Generate new certificate before expiration (30+ days recommended)
2. Test new certificate in staging environment
3. Schedule maintenance window for production
4. Backup current certificates
5. Deploy new certificates
6. Verify HTTPS connectivity
7. Monitor for any certificate-related errors
8. Archive old certificates (do not delete immediately)

### Environment Variable Configuration

Store certificate paths in environment variables, never hardcode them:

```bash
# Recommended environment variables
SSL_KEY_PATH=./certs/key.pem
SSL_CERT_PATH=./certs/cert.pem
```

Benefits:
- Different paths for different environments
- No code changes required for certificate updates
- Secrets management integration (AWS Secrets Manager, HashiCorp Vault, etc.)

---

## Usage Notes

### Environment Configuration

Certificate configuration is managed through environment variables. Reference the `.env.example` file in the project root for all available options.

#### Required Environment Variables for HTTPS

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `HTTPS_ENABLED` | Enable/disable HTTPS server | `false` |
| `HTTPS_PORT` | Port for HTTPS server | `3443` |
| `SSL_KEY_PATH` | Path to private key file | `./certs/key.pem` |
| `SSL_CERT_PATH` | Path to certificate file | `./certs/cert.pem` |

#### Enabling HTTPS

1. Generate or obtain certificates (see sections above)
2. Create a `.env` file from the template:

   ```bash
   cp .env.example .env
   ```

3. Update the `.env` file:

   ```env
   HTTPS_ENABLED=true
   HTTPS_PORT=3443
   SSL_KEY_PATH=./certs/key.pem
   SSL_CERT_PATH=./certs/cert.pem
   ```

4. Start the server:

   ```bash
   npm start
   ```

5. Access via HTTPS:

   ```
   https://localhost:3443/
   ```

### Default Certificate Paths

The application expects certificates at these default locations:

```
project-root/
├── certs/
│   ├── key.pem      # Private key (RSA 4096-bit or ECDSA P-256)
│   ├── cert.pem     # X.509 certificate (PEM format)
│   ├── .gitkeep     # Placeholder for Git tracking
│   └── README.md    # This documentation file
```

### Verifying Certificate Installation

After generating certificates, verify they are correctly installed:

```bash
# Check certificate details
openssl x509 -in certs/cert.pem -text -noout

# Verify key matches certificate
openssl x509 -noout -modulus -in certs/cert.pem | openssl md5
openssl rsa -noout -modulus -in certs/key.pem | openssl md5
# Both outputs should match

# Test HTTPS connection (after starting server)
curl -k https://localhost:3443/
# Note: -k flag ignores certificate validation (for self-signed certs)
```

---

## TLS Configuration

### Supported TLS Versions

The HTTPS server is configured with secure TLS version requirements:

| Setting | Value | Purpose |
|---------|-------|---------|
| `minVersion` | `TLSv1.2` | Disables deprecated TLS 1.0 and TLS 1.1 protocols |
| `maxVersion` | `TLSv1.3` | Enables latest TLS protocol for improved security |

> **Note:** TLS 1.0 and TLS 1.1 are disabled because they have known security vulnerabilities (BEAST, POODLE, etc.) and are no longer considered secure by modern standards (PCI DSS 3.2+, NIST guidelines).

### Key Requirements

#### Supported Key Types

| Algorithm | Minimum Size | Recommended | Notes |
|-----------|-------------|-------------|-------|
| RSA | 2048-bit | 4096-bit | Widely compatible, proven security |
| ECDSA | P-256 (256-bit) | P-256 | Faster performance, smaller keys |

#### Key Generation Examples

**RSA 4096-bit (Recommended for compatibility):**

```bash
openssl genrsa -out certs/key.pem 4096
```

**ECDSA P-256 (Recommended for performance):**

```bash
openssl ecparam -genkey -name prime256v1 -out certs/key.pem
```

### Cipher Suite Configuration

The application uses Node.js default cipher suites, which prioritize:

1. **TLS 1.3 ciphers** (when available):
   - TLS_AES_256_GCM_SHA384
   - TLS_CHACHA20_POLY1305_SHA256
   - TLS_AES_128_GCM_SHA256

2. **TLS 1.2 ciphers** (fallback):
   - ECDHE-ECDSA-AES256-GCM-SHA384
   - ECDHE-RSA-AES256-GCM-SHA384
   - ECDHE-ECDSA-CHACHA20-POLY1305
   - ECDHE-RSA-CHACHA20-POLY1305

### Testing TLS Configuration

#### Local Testing

```bash
# Test TLS version support
openssl s_client -connect localhost:3443 -tls1_2
openssl s_client -connect localhost:3443 -tls1_3

# View negotiated cipher
openssl s_client -connect localhost:3443 -cipher 'ECDHE+AESGCM' < /dev/null
```

#### Production Testing (SSL Labs)

For production deployments, use [SSL Labs Server Test](https://www.ssllabs.com/ssltest/) to get a comprehensive security grade. Target: **A+ rating**.

### Compliance Standards

This TLS configuration aligns with:

| Standard | Requirement | Status |
|----------|-------------|--------|
| PCI DSS 3.2+ | TLS 1.1+ required, 1.2+ recommended | ✅ Compliant |
| NIST SP 800-52 Rev 2 | TLS 1.2 minimum for federal systems | ✅ Compliant |
| HIPAA | Encryption in transit required | ✅ Compliant |
| SOC 2 Type II | Secure transmission controls | ✅ Compliant |

---

## Troubleshooting

### Common Issues

#### "Unable to load certificate" Error

```
Error: ENOENT: no such file or directory, open './certs/key.pem'
```

**Solution:** Ensure certificates exist at the configured paths:

```bash
ls -la certs/
# Should show key.pem and cert.pem
```

#### "Certificate and key mismatch" Error

**Solution:** Verify the key matches the certificate:

```bash
openssl x509 -noout -modulus -in certs/cert.pem | openssl md5
openssl rsa -noout -modulus -in certs/key.pem | openssl md5
# Both MD5 hashes must match
```

#### "Permission denied" Error on Private Key

**Solution:** Check file permissions:

```bash
chmod 600 certs/key.pem
```

#### "Self-signed certificate" Warning in curl

**Expected for development.** Use `-k` flag:

```bash
curl -k https://localhost:3443/
```

---

## Quick Reference

### Development Setup (One Command)

```bash
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/CN=localhost" && chmod 600 certs/key.pem
```

### Environment Variables Summary

```env
HTTPS_ENABLED=true
HTTPS_PORT=3443
SSL_KEY_PATH=./certs/key.pem
SSL_CERT_PATH=./certs/cert.pem
```

### Verify Installation

```bash
npm start
curl -k https://localhost:3443/
# Expected: Hello, World!
```

---

## Support

For questions about certificate management or HTTPS configuration:

1. Review this documentation thoroughly
2. Check the [Node.js TLS documentation](https://nodejs.org/api/tls.html)
3. Consult [Let's Encrypt documentation](https://letsencrypt.org/docs/) for production certificates
4. Review OWASP [TLS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html)
