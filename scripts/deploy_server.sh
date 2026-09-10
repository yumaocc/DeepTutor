#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_HOST="${DEEPTUTOR_DEPLOY_HOST:-8.137.175.31}"
DEPLOY_USER="${DEEPTUTOR_DEPLOY_USER:-root}"
DEPLOY_KEY="${DEEPTUTOR_DEPLOY_KEY:-$HOME/.ssh/deeptutor_deploy_ed25519}"
DEPLOY_TARGET="${DEPLOY_USER}@${DEPLOY_HOST}"
DEPLOY_PLATFORM="${DEEPTUTOR_DEPLOY_PLATFORM:-linux/amd64}"
REMOTE_ROOT="${DEEPTUTOR_REMOTE_ROOT:-/opt/deeptutor}"
REMOTE_DATA="${DEEPTUTOR_REMOTE_DATA:-$REMOTE_ROOT/data}"
CONTAINER_NAME="${DEEPTUTOR_CONTAINER_NAME:-deeptutor}"
IMAGE_NAME="${DEEPTUTOR_IMAGE_NAME:-deeptutor:local-production}"
RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)"
ARTIFACT_DIR="$PROJECT_ROOT/artifacts/server"
ARCHIVE_NAME="deeptutor-${RELEASE_ID}-linux-amd64.tar.gz"
ARCHIVE_PATH="$ARTIFACT_DIR/$ARCHIVE_NAME"
REMOTE_RELEASE_DIR="$REMOTE_ROOT/releases/$RELEASE_ID"
REMOTE_ARCHIVE="$REMOTE_RELEASE_DIR/$ARCHIVE_NAME"

SSH=(ssh -i "$DEPLOY_KEY" -o BatchMode=yes -o ServerAliveInterval=20)
SCP=(scp -i "$DEPLOY_KEY" -o BatchMode=yes)

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  }
}

require_command docker
require_command gzip
require_command scp
require_command ssh
require_command shasum

if [[ ! -f "$DEPLOY_KEY" ]]; then
  printf 'SSH key not found: %s\n' "$DEPLOY_KEY" >&2
  exit 1
fi

mkdir -p "$ARTIFACT_DIR"

printf 'Building %s for %s...\n' "$IMAGE_NAME" "$DEPLOY_PLATFORM"
build_succeeded=false
for build_attempt in 1 2 3; do
  if docker buildx build \
    --platform "$DEPLOY_PLATFORM" \
    --target production \
    --load \
    --tag "$IMAGE_NAME" \
    "$PROJECT_ROOT"; then
    build_succeeded=true
    break
  fi

  if [[ "$build_attempt" -lt 3 ]]; then
    printf 'Build attempt %s failed; retrying in 5 seconds...\n' "$build_attempt" >&2
    sleep 5
  fi
done

if [[ "$build_succeeded" != true ]]; then
  printf 'Docker build failed after 3 attempts.\n' >&2
  exit 1
fi

printf 'Exporting image to %s...\n' "$ARCHIVE_PATH"
docker save "$IMAGE_NAME" | gzip -1 > "$ARCHIVE_PATH"
LOCAL_SHA256="$(shasum -a 256 "$ARCHIVE_PATH" | awk '{print $1}')"

printf 'Checking remote deployment...\n'
"${SSH[@]}" "$DEPLOY_TARGET" \
  "docker version >/dev/null && test -d '$REMOTE_DATA' && mkdir -p '$REMOTE_RELEASE_DIR'"

printf 'Uploading %s...\n' "$ARCHIVE_NAME"
"${SCP[@]}" "$ARCHIVE_PATH" "$DEPLOY_TARGET:$REMOTE_ARCHIVE"

printf 'Installing release %s...\n' "$RELEASE_ID"
"${SSH[@]}" "$DEPLOY_TARGET" bash -s -- \
  "$REMOTE_ARCHIVE" \
  "$LOCAL_SHA256" \
  "$IMAGE_NAME" \
  "$CONTAINER_NAME" \
  "$REMOTE_DATA" \
  "$RELEASE_ID" <<'REMOTE_SCRIPT'
set -Eeuo pipefail

archive_path="$1"
expected_sha="$2"
image_name="$3"
container_name="$4"
data_dir="$5"
release_id="$6"
backup_name="${container_name}-backup-${release_id}"
failed_name="${container_name}-failed-${release_id}"

actual_sha="$(sha256sum "$archive_path" | awk '{print $1}')"
if [[ "$actual_sha" != "$expected_sha" ]]; then
  printf 'Image checksum mismatch. Expected %s, got %s.\n' \
    "$expected_sha" "$actual_sha" >&2
  exit 1
fi

gzip -dc "$archive_path" | docker load

if docker container inspect "$container_name" >/dev/null 2>&1; then
  docker stop --time 30 "$container_name"
  docker rename "$container_name" "$backup_name"
fi

rollback() {
  exit_code=$?
  printf 'Deployment failed; restoring previous container...\n' >&2
  if docker container inspect "$container_name" >/dev/null 2>&1; then
    docker stop --time 15 "$container_name" >/dev/null 2>&1 || true
    docker rename "$container_name" "$failed_name" >/dev/null 2>&1 || true
  fi
  if docker container inspect "$backup_name" >/dev/null 2>&1; then
    docker rename "$backup_name" "$container_name"
    docker start "$container_name"
  fi
  exit "$exit_code"
}
trap rollback ERR

docker run -d \
  --name "$container_name" \
  --restart unless-stopped \
  --label com.deeptutor.deployer=one-click \
  --label "com.deeptutor.release=$release_id" \
  -p 127.0.0.1:3782:3782 \
  -p 127.0.0.1:8001:8001 \
  -v "$data_dir:/app/data" \
  "$image_name"

health=""
for _attempt in $(seq 1 90); do
  health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_name")"
  if [[ "$health" == "healthy" ]]; then
    break
  fi
  if [[ "$health" == "exited" || "$health" == "dead" ]]; then
    break
  fi
  sleep 2
done

if [[ "$health" != "healthy" ]]; then
  docker logs --tail 160 "$container_name" >&2 || true
  false
fi

curl -fsS http://127.0.0.1:8001/health/ready >/dev/null
curl -fsS http://127.0.0.1:8001/api/auth/status >/dev/null
trap - ERR

printf 'Deployment healthy: %s (%s)\n' "$container_name" "$release_id"
printf 'Rollback container retained: %s\n' "$backup_name"
REMOTE_SCRIPT

printf 'Deployment complete.\n'
printf 'Local artifact: %s\n' "$ARCHIVE_PATH"
printf 'SHA-256: %s\n' "$LOCAL_SHA256"
printf 'Server: http://%s\n' "$DEPLOY_HOST"
