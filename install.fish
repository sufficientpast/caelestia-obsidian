#!/usr/bin/env fish

# Pretty stuffs
function _out -a colour text
    set_color $colour
    echo ":: $text"
    set_color normal
end

function log -a text
    _out cyan "$text"
end

function confirm-overwrite -a path
    if test -e "$path" -o -L "$path"
        read -l -p "echo -n '$path already exists. Overwrite? [Y/n] ' " confirm </dev/tty || exit 1

        if test "$confirm" = n -o "$confirm" = N
            log 'Skipping...'
            return 1
        else
            log 'Removing...'
            rm -rf "$path"
        end
    end
    return 0
end

# Variables
set -l PLUGIN_ID caelestia-obsidian
set -l GITHUB_REPO sufficientpast/caelestia-obsidian

# If obsidian is available
log 'Checking if Obsidian is running...'
if not pgrep -f obsidian >/dev/null
    log 'Obsidian is not running. Launching in the background...'
    obsidian &>/dev/null &
    sleep 4 # Give Obsidian time to initialize its internal services
end

# Path finding
set -l VAULT_PATH ""
if command -q obsidian
    set VAULT_PATH (obsidian vault info=path 2>/dev/null | string trim)
end

if test -z "$VAULT_PATH" -o "$VAULT_PATH" = null
    log '[ERROR] Could not detect active vault path. Make sure Obsidian is open and CLI is enabled under general settings.'
    exit 1
end

set -l TARGET_DIR "$VAULT_PATH/.obsidian/plugins/$PLUGIN_ID"
log "Target directory: $TARGET_DIR"

# Installer uh confirm and install
if confirm-overwrite "$TARGET_DIR"
    log 'Fetching latest release from GitHub...'

    set -l DOWNLOAD_URL (curl -s -H "User-Agent: fish-installer" "https://api.github.com/repos/$GITHUB_REPO/releases" | jq -r '[sort_by(.published_at) | last | .assets[]? | select(.name and (.name | endswith(".tar.gz")) and (.name | contains("source") | not)) | .browser_download_url] | .[0]' 2>/dev/null)

    if test -z "$DOWNLOAD_URL" -o "$DOWNLOAD_URL" = null
        log '[ERROR] Could not find a .tar.gz release asset.'
        exit 1
    end

    set -l TMP_TAR (mktemp /tmp/obsidian-plugin.XXXXXX.tar.gz)

    log 'Downloading plugin archive...'
    curl -sL -H "User-Agent: fish-installer" "$DOWNLOAD_URL" -o "$TMP_TAR" || { log '[ERROR] Download failed.'; rm -f "$TMP_TAR"; exit 1; }

    log 'Extracting plugin files...'
    mkdir -p "$TARGET_DIR"

    if not tar -xzf "$TMP_TAR" -C "$TARGET_DIR" --strip-components=1
        log '[ERROR] Extraction failed.'
        rm -f "$TMP_TAR"
        exit 1
    end

    rm -f "$TMP_TAR"
    log 'Plugin successfully installed!'
end
