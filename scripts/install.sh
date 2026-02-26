#!/usr/bin/env sh
# blitz install script
# Usage: curl -fsSL https://raw.githubusercontent.com/YOUR_USER/blitz-cli/main/scripts/install.sh | sh

set -e

REPO="yash-srivastava19/blitz-cli"
BIN_DIR="${HOME}/.local/bin"
BIN_NAME="blitz"

# Detect OS + arch
OS="$(uname -s)"
ARCH="$(uname -m)"

case "${OS}" in
  Linux)  OS_TAG="linux" ;;
  Darwin) OS_TAG="darwin" ;;
  *) echo "Unsupported OS: ${OS}"; exit 1 ;;
esac

case "${ARCH}" in
  x86_64)  ARCH_TAG="x64" ;;
  aarch64|arm64) ARCH_TAG="arm64" ;;
  *) echo "Unsupported arch: ${ARCH}"; exit 1 ;;
esac

ASSET="${BIN_NAME}-${OS_TAG}-${ARCH_TAG}"
LATEST=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
  | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')

URL="https://github.com/${REPO}/releases/download/${LATEST}/${ASSET}"

mkdir -p "${BIN_DIR}"
echo "Downloading blitz ${LATEST} for ${OS_TAG}-${ARCH_TAG}..."
curl -fsSL "${URL}" -o "${BIN_DIR}/${BIN_NAME}"
chmod +x "${BIN_DIR}/${BIN_NAME}"

echo ""
echo "✓ blitz installed to ${BIN_DIR}/${BIN_NAME}"
echo ""
echo "Make sure ${BIN_DIR} is in your PATH:"
echo '  export PATH="$HOME/.local/bin:$PATH"'
echo ""
echo "Then run:  blitz \"My first task\" 25m"
