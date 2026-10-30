import hashlib
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest

DIRECTORY = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("prepare_nginx", DIRECTORY / "prepare-nginx.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
ANCHOR = "    # The new image serves static files; health routes reach Django and its DB.\n"
SOURCE = ("# existing config\nserver {\n    listen 443 ssl;\n"
          "    server_name pastelinkers.com;\n    client_max_body_size 6m;\n\n"
          + ANCHOR + "    location / { proxy_pass http://127.0.0.1:8002; }\n}\n").encode()
SNIPPET = (DIRECTORY / "nginx-tribble-location.conf").read_text()


def digest(value):
    return hashlib.sha256(value).hexdigest()


class PrepareTests(unittest.TestCase):
    def test_only_new_location_is_inserted(self):
        result = module.prepare(SOURCE, SNIPPET, digest(SOURCE))
        self.assertEqual(result, SOURCE.replace(ANCHOR.encode(), (SNIPPET.rstrip() + "\n\n" + ANCHOR).encode()))
        self.assertEqual(result.count(b"location ^~ /tribble/"), 1)

    def test_hash_mismatch_refuses_changed_original(self):
        with self.assertRaisesRegex(ValueError, "hash changed"):
            module.prepare(SOURCE + b"\n", SNIPPET, digest(SOURCE))

    def test_already_installed_or_ambiguous_config_is_refused(self):
        for source in [SOURCE + b"# /tribble/\n", SOURCE + SOURCE]:
            with self.assertRaises(ValueError):
                module.prepare(source, SNIPPET, digest(source))

    def test_anchor_in_another_server_is_refused(self):
        source = SOURCE.replace(ANCHOR.encode(), b"}\nserver {\n" + ANCHOR.encode())
        with self.assertRaises(ValueError):
            module.prepare(source, SNIPPET, digest(source))

    def test_cli_never_overwrites_an_existing_destination(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source.conf"
            output = Path(directory) / "output.conf"
            source.write_bytes(SOURCE)
            output.write_text("keep existing output")
            result = subprocess.run(["python3", str(DIRECTORY / "prepare-nginx.py"),
                "--source", str(source), "--output", str(output), "--expected-sha256", digest(SOURCE)], capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(output.read_text(), "keep existing output")
            self.assertEqual(source.read_bytes(), SOURCE)

    def test_cli_hash_mismatch_creates_no_output(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source.conf"
            output = Path(directory) / "output.conf"
            source.write_bytes(SOURCE)
            result = subprocess.run(["python3", str(DIRECTORY / "prepare-nginx.py"),
                "--source", str(source), "--output", str(output), "--expected-sha256", "0" * 64], capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
