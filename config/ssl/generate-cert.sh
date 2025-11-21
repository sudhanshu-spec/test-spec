#!/bin/bash
#
# SSL Certificate Generation Script for Development Environment
#
# This script generates self-signed SSL certificates for HTTPS development.
# These certificates are suitable for local development only and will trigger
# browser security warnings (which can be safely bypassed in development).
#
# For production environments, use certificates from a trusted Certificate Authority:
# - Let's Encrypt (free, automated)
# - DigiCert, Comodo, or other commercial CA
# - Cloud provider certificate services (AWS ACM, GCP Certificate Manager, etc.)
#
# Usage:
#   cd config/ssl
#   bash generate-cert.sh
#
# Generated Files:
#   - key.pem: Private key (4096-bit RSA) - NEVER commit to version control
#   - cert.pem: Self-signed certificate valid for 365 days
#
# Security Notes:
#   - Private key is generated with 4096-bit RSA for strong encryption
#   - Certificate is valid for 1 year (365 days)
#   - Certificate is self-signed (not from a trusted CA)
#   - Subject is set to localhost for local development
#   - These files are excluded from git via .gitignore

echo "=========================================="
echo "SSL Certificate Generation for Development"
echo "=========================================="
echo ""

# Check if OpenSSL is installed
if ! command -v openssl &> /dev/null; then
    echo "ERROR: OpenSSL is not installed."
    echo "Install with: sudo apt-get install openssl (Debian/Ubuntu)"
    echo "           or: brew install openssl (macOS)"
    exit 1
fi

# Check if certificates already exist
if [ -f "key.pem" ] || [ -f "cert.pem" ]; then
    echo "WARNING: Existing certificates found."
    read -p "Do you want to regenerate them? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Certificate generation cancelled."
        exit 0
    fi
    echo "Removing existing certificates..."
    rm -f key.pem cert.pem
fi

echo "Generating 4096-bit RSA private key and self-signed certificate..."
echo ""

# Generate self-signed certificate with 4096-bit RSA key
# -x509: Output a self-signed certificate instead of a certificate request
# -newkey rsa:4096: Generate a new 4096-bit RSA private key
# -keyout key.pem: Save private key to key.pem
# -out cert.pem: Save certificate to cert.pem
# -days 365: Certificate valid for 1 year
# -nodes: Don't encrypt the private key (no passphrase required)
# -subj: Certificate subject information (CN=localhost for local development)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem \
  -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=Development/CN=localhost"

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✓ SSL certificates generated successfully"
    echo "=========================================="
    echo ""
    echo "Generated files:"
    echo "  • key.pem  - Private key (4096-bit RSA)"
    echo "  • cert.pem - Self-signed certificate (valid 365 days)"
    echo ""
    echo "Security reminders:"
    echo "  • These certificates are for DEVELOPMENT ONLY"
    echo "  • Browsers will show security warnings (expected behavior)"
    echo "  • Private key is excluded from git via .gitignore"
    echo "  • Use trusted CA certificates for production"
    echo ""
    echo "Next steps:"
    echo "  1. Return to project root: cd ../.."
    echo "  2. Start the server: npm start"
    echo "  3. Access HTTPS: https://localhost:3443/"
    echo "  4. Accept browser security warning (development only)"
    echo ""
    
    # Set restrictive permissions on private key
    chmod 600 key.pem
    chmod 644 cert.pem
    
    echo "File permissions set:"
    ls -la key.pem cert.pem
else
    echo ""
    echo "ERROR: Certificate generation failed."
    echo "Check the error messages above for details."
    exit 1
fi
