#!/bin/bash
set -e

cd "$(dirname "$0")/.."

notify_failure() {
    local exit_code=$?
    local failed_cmd="$BASH_COMMAND"

    if [ -f envs/.env ]; then
        set -a
        source envs/.env
        set +a
    fi

    local ntfy_message
    ntfy_message="Storcale API reload failed on $(hostname) (reload.sh).
Failed command: ${failed_cmd}
Exit code: ${exit_code}"

    if [ -n "$NOTIFY_URL" ]; then
        curl -s \
            -H "Title: TNIV API | Reload failed" \
            -H "Priority: urgent" \
            -d "$ntfy_message" \
            "https://ntfy.sh/${NOTIFY_URL}" >/dev/null || true
    else
        echo "NOTIFY_URL not set in envs/.env, skipping ntfy notification" >&2
    fi

    if [ -n "$WEBHOOK" ]; then
        payload=$(cat <<EOF
{"embeds":[{"title":"Deployment - failure","description":"Storcale API reload failed on $(hostname) (reload.sh).\n\n**Failed command:** \`$(echo "$failed_cmd" | sed 's/"/\\"/g')\`\n**Exit code:** ${exit_code}","color":15158332,"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%SZ)"}]}
EOF
)
        curl -s -X POST "$WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "$payload" >/dev/null || true
    else
        echo "WEBHOOK not set in envs/.env, skipping discord notification" >&2
    fi
}

trap notify_failure ERR

git pull

# make sure bind-mounted runtime files exist as files (not dirs) before compose starts
touch access.log
touch routes/tniv/DB/match/matches.log
touch routes/tniv/group/membercount/store.json

docker compose build
docker compose up -d
docker image prune -f