#!/usr/bin/env bash
# First installation only. Run manually with sudo after reviewing all deploy files.
set -Eeuo pipefail
umask 077

deploy_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
expected_hash="$(cat -- "$deploy_dir/expected-nginx.sha256")"
if [[ $# == 2 && $1 == --expected-nginx-sha256 ]]; then
  expected_hash="$2"
elif [[ $# != 0 ]]; then
  echo 'Usage: sudo bash install-pastelinkers.sh [--expected-nginx-sha256 REVIEWED_SHA256]' >&2
  exit 2
fi
[[ $EUID == 0 ]] || { echo 'Run this reviewed installer manually with sudo.' >&2; exit 1; }
[[ $expected_hash =~ ^[0-9a-f]{64}$ ]] || { echo 'Invalid expected SHA-256.' >&2; exit 1; }

site=/etc/nginx/sites-available/pastelinkers.com
unit=/etc/systemd/system/tribble-api.service
app=/home/pastelinkers/tribble/current
env_file=/home/pastelinkers/tribble/shared/server.env
backup_dir=''
unit_installed=0
nginx_changed=0
prepared_hash=''
unit_hash=''
unit_temporary=''

fail() { echo "Installation refused: $*" >&2; exit 1; }
sha256() { sha256sum -- "$1" | cut -d ' ' -f 1; }
atomic_copy() {
  local source="$1" target="$2" temporary
  temporary="$(mktemp "${target}.tribble.XXXXXX")" || return 1
  if ! cp --preserve=mode,ownership,timestamps -- "$source" "$temporary"; then
    rm -f -- "$temporary"; return 1
  fi
  if ! mv -fT -- "$temporary" "$target"; then rm -f -- "$temporary"; return 1; fi
}

rollback_on_exit() {
  local status=$? current_hash active_state main_pid rollback_failed=0
  trap - EXIT INT TERM
  [[ $status == 0 ]] && return
  set +e
  if [[ -n $unit_temporary ]]; then rm -f -- "$unit_temporary"; fi
  if [[ $nginx_changed == 1 ]]; then
    current_hash="$(sha256 "$site")"
    if [[ $current_hash == "$prepared_hash" || $current_hash == "$expected_hash" ]]; then
      if atomic_copy "$backup_dir/nginx-before.conf" "$site" && nginx -t && systemctl reload nginx; then
        echo 'Original Nginx configuration restored and reloaded.' >&2
      else rollback_failed=1; fi
    else
      echo 'Nginx changed concurrently; refusing to overwrite it during rollback.' >&2
      rollback_failed=1
    fi
  fi
  if [[ $unit_installed == 1 ]]; then
    current_hash="$(sha256 "$unit")"
    if [[ $current_hash == "$unit_hash" ]]; then
      if systemctl stop tribble-api.service; then
        active_state="$(systemctl show tribble-api.service --property=ActiveState --value)"
        main_pid="$(systemctl show tribble-api.service --property=MainPID --value)"
        if [[ ( $active_state == inactive || $active_state == failed ) && $main_pid == 0 ]]; then
          if systemctl disable tribble-api.service; then
            rm -f -- "$unit" || rollback_failed=1
            systemctl daemon-reload || rollback_failed=1
            systemctl reset-failed tribble-api.service >/dev/null 2>&1 || true
          else
            echo 'Could not disable Tribble; retaining its unit for administrator recovery.' >&2
            rollback_failed=1
          fi
        else
          echo 'Tribble stop could not be verified; retaining its unit for administrator recovery.' >&2
          rollback_failed=1
        fi
      else
        echo 'Tribble stop failed; retaining its unit for administrator recovery.' >&2
        rollback_failed=1
      fi
    else
      echo 'Tribble unit changed concurrently; refusing to remove it during rollback.' >&2
      rollback_failed=1
    fi
  fi
  if [[ -n $backup_dir ]]; then echo "Review/rollback files retained at: $backup_dir" >&2; fi
  if [[ $rollback_failed == 1 ]]; then echo 'Rollback was incomplete; manual administrator recovery is required.' >&2; fi
  exit "$status"
}
trap rollback_on_exit EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

for command in python3 nginx systemctl curl sha256sum stat getent runuser ss; do
  command -v "$command" >/dev/null || fail "Missing required command: $command"
done
getent passwd pastelinkers >/dev/null || fail 'The pastelinkers user does not exist.'
getent group pastelinkers >/dev/null || fail 'The pastelinkers group does not exist.'
[[ -x /usr/bin/node ]] || fail '/usr/bin/node is unavailable.'
[[ "$(/usr/bin/node -p 'process.versions.node.split(".")[0]')" == 22 ]] || fail 'Node 22 is required.'
[[ -f $site && ! -L $site ]] || fail 'Expected a regular sites-available/pastelinkers.com file.'
[[ "$(sha256 "$site")" == "$expected_hash" ]] || fail 'Nginx hash changed; review before installing.'
[[ ! -e $unit && ! -L $unit && ! -e "${unit}.d" ]] || fail 'An existing Tribble unit or override must be reviewed separately.'
[[ "$(systemctl show tribble-api.service --property=LoadState --value)" == not-found ]] || fail 'A Tribble unit already exists; this is a first-install-only script.'
[[ -f "$app/src/dev.mjs" ]] || fail 'Upload and select the server release first.'
runuser -u pastelinkers -- test -r "$app/src/dev.mjs" || fail 'The service user cannot read the release.'
[[ -f $env_file && ! -L $env_file ]] || fail 'Create a protected regular server.env file first.'
[[ "$(stat -c %a "$env_file")" == 600 || "$(stat -c %a "$env_file")" == 400 ]] || fail 'server.env must have mode 0600 or 0400.'
[[ -z "$(ss -H -ltn 'sport = :8787')" ]] || fail 'TCP port 8787 is already in use.'
systemctl is-active --quiet nginx || fail 'Nginx must already be running.'
nginx -t

install -d -m 0700 -o root -g root /var/backups/tribble-api
backup_dir="$(mktemp -d /var/backups/tribble-api/install-XXXXXXXX)"
cp -a -- "$site" "$backup_dir/nginx-before.conf"
printf '%s\n' "$expected_hash" > "$backup_dir/nginx-before.sha256"
python3 "$deploy_dir/prepare-nginx.py" --source "$site" --output "$backup_dir/nginx-after.conf" --expected-sha256 "$expected_hash"
chmod --reference="$site" "$backup_dir/nginx-after.conf"
chown --reference="$site" "$backup_dir/nginx-after.conf"
prepared_hash="$(sha256 "$backup_dir/nginx-after.conf")"
cp -- "$deploy_dir/tribble-api.service" "$backup_dir/tribble-api.service"
unit_hash="$(sha256 "$backup_dir/tribble-api.service")"

# Only this new service is started; existing services are never restarted.
[[ ! -e $unit && ! -L $unit ]] || fail 'A Tribble unit appeared concurrently.'
unit_temporary="$(mktemp "${unit}.tribble.XXXXXX")"
install -m 0644 -o root -g root "$backup_dir/tribble-api.service" "$unit_temporary"
# Hard-link creation is atomic and refuses any existing target, including symlinks.
ln -T -- "$unit_temporary" "$unit"
unit_installed=1
rm -f -- "$unit_temporary"
unit_temporary=''
systemctl daemon-reload
systemctl enable --now tribble-api.service
healthy=0
for attempt in {1..10}; do
  if systemctl is-active --quiet tribble-api.service \
    && [[ "$(curl --noproxy '*' --silent --fail --max-time 2 http://127.0.0.1:8787/healthz)" == '{"status":"ok"}' ]]; then
    healthy=1; break
  fi
  sleep 1
done
[[ $healthy == 1 ]] || fail 'Tribble localhost health check failed.'

[[ "$(sha256 "$site")" == "$expected_hash" ]] || fail 'Nginx changed during installation; no site replacement performed.'
nginx_changed=1
atomic_copy "$backup_dir/nginx-after.conf" "$site"
nginx -t
systemctl reload nginx
https_healthy=0
for attempt in {1..5}; do
  if [[ "$(curl --noproxy '*' --silent --fail --max-time 3 --resolve pastelinkers.com:443:127.0.0.1 https://pastelinkers.com/tribble/healthz)" == '{"status":"ok"}' ]]; then
    https_healthy=1; break
  fi
  # Reload completion does not guarantee that a new worker served the first probe.
  sleep 1
done
[[ $https_healthy == 1 ]] || fail 'HTTPS proxy health check failed.'

echo 'Tribble installed; the existing Nginx service was reloaded, not restarted.'
echo 'Health endpoint: https://pastelinkers.com/tribble/healthz'
echo "Original configuration and prepared files: $backup_dir"
echo 'Health checks verify liveness only and do not call Kakao.'
