#!/usr/bin/env bash
# design-md one-line installer
# Usage: curl -sSL https://raw.githubusercontent.com/applego/design-md/main/install.sh | bash

set -e

REPO="https://github.com/applego/design-md.git"
DEFAULT_DIR="$HOME/Documents/workspace_dev/design-md"

# Allow custom install dir
INSTALL_DIR="${DESIGN_MD_DIR:-$DEFAULT_DIR}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  design-md installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Install dir: $INSTALL_DIR"
echo ""

# Check node
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js not found. Install Node 18+ first."
  exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18+ required (found v$NODE_VERSION)"
  exit 1
fi

# Clone or pull
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "📦 Updating existing installation..."
  cd "$INSTALL_DIR"
  git pull --ff-only
else
  echo "📥 Cloning repository..."
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone "$REPO" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# Install as global command via symlink (works with Volta / fnm / nvm)
echo ""
echo "🔗 Linking as global command..."

BIN_DIR="$HOME/.local/bin"
mkdir -p "$BIN_DIR"

LINK_PATH="$BIN_DIR/design-md"
if [ -L "$LINK_PATH" ] || [ -f "$LINK_PATH" ]; then
  rm "$LINK_PATH"
fi

ln -s "$INSTALL_DIR/cli/bin/design-md.mjs" "$LINK_PATH"
chmod +x "$INSTALL_DIR/cli/bin/design-md.mjs"

# Ensure ~/.local/bin is in PATH
if ! echo "$PATH" | tr ':' '\n' | grep -qx "$BIN_DIR"; then
  echo ""
  echo "⚠️  $BIN_DIR is not in your PATH."
  echo "    Add this to your shell config (~/.zshrc or ~/.bashrc):"
  echo ""
  echo "      export PATH=\"\$HOME/.local/bin:\$PATH\""
  echo ""
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Installed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Try:"
echo "    design-md list"
echo "    design-md search finance"
echo "    design-md preview stripe"
echo ""
echo "  Start Gallery + Live Preview:"
echo "    cd $INSTALL_DIR"
echo "    npm start"
echo ""
