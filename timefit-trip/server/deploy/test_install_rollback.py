"""Exercise the installer's rollback branch with every system command mocked."""
from pathlib import Path
import subprocess
import unittest

INSTALLER = (Path(__file__).resolve().parent / "install-pastelinkers.sh").read_text()
ROLLBACK = "rollback_on_exit() {" + INSTALLER.split("rollback_on_exit() {", 1)[1].split("\ntrap rollback_on_exit EXIT", 1)[0]


class RollbackTests(unittest.TestCase):
    def test_unit_is_removed_only_after_verified_stop_and_disable(self):
        for scenario, removable in [("stopped", True), ("stop_failed", False),
                                    ("still_active", False), ("disable_failed", False)]:
            with self.subTest(scenario=scenario):
                # No installer main code runs. All filesystem and systemd operations
                # reachable in this branch are functions, so no real service is touched.
                harness = r'''
scenario="$1"
unit=/mock/tribble-api.service
unit_hash=reviewed
unit_installed=1
unit_temporary=''
nginx_changed=0
backup_dir=''
sha256() { printf reviewed; }
rm() { echo MOCK_REMOVE >&2; }
systemctl() {
  case "$1" in
    stop) [[ $scenario != stop_failed ]] ;;
    show)
      if [[ $* == *ActiveState* ]]; then
        if [[ $scenario == still_active ]]; then printf active; else printf inactive; fi
      else
        if [[ $scenario == still_active ]]; then printf 123; else printf 0; fi
      fi ;;
    disable) [[ $scenario != disable_failed ]] ;;
    daemon-reload|reset-failed) return 0 ;;
    *) echo UNEXPECTED_SYSTEMCTL >&2; return 1 ;;
  esac
}
''' + ROLLBACK + "\nfalse\nrollback_on_exit\n"
                result = subprocess.run(["bash", "-c", harness, "rollback-test", scenario], capture_output=True, text=True)
                self.assertEqual(result.returncode, 1)
                self.assertNotIn("UNEXPECTED_SYSTEMCTL", result.stderr)
                self.assertEqual("MOCK_REMOVE" in result.stderr, removable)
                self.assertEqual("Rollback was incomplete" in result.stderr, not removable)


if __name__ == "__main__":
    unittest.main()
