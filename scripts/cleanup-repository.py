"""Remove only audited legacy files whose contents have not changed."""
from pathlib import Path
import argparse, hashlib, json
ROOT = Path(__file__).resolve().parents[1]

def cleanup(apply=False):
    manifest = json.loads((ROOT / 'scripts/cleanup-manifest.json').read_text())
    removed = []
    for name, expected in manifest.items():
        target = ROOT / name
        if target.parent != ROOT or not target.is_file():
            continue
        if hashlib.sha256(target.read_bytes()).hexdigest() != expected:
            print(f'Kept modified file: {name}')
            continue
        print(('Removing: ' if apply else 'Would remove: ') + name)
        if apply:
            target.unlink()
        removed.append(name)
    return removed

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='Apply the audited removals')
    cleanup(parser.parse_args().apply)
