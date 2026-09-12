"""Create local Compose secret files without printing or overwriting their values."""

import os
from pathlib import Path
from secrets import token_urlsafe

_GENERATED_SECRET_NAMES = ("postgres_password", "redis_password")
_EMPTY_SECRET_NAMES = ("nebius_api_key",)


def create_dev_secrets(directory: Path) -> bool:
    """Create missing local secrets and return whether any value was generated."""
    if directory.exists() and (directory.is_symlink() or not directory.is_dir()):
        raise RuntimeError(f"Refusing to use non-directory secret path: {directory}")
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    directory.chmod(0o700)

    created = False
    for name in (*_GENERATED_SECRET_NAMES, *_EMPTY_SECRET_NAMES):
        secret_path = directory / name
        if secret_path.exists():
            if secret_path.is_symlink() or not secret_path.is_file():
                raise RuntimeError(f"Refusing to use non-file secret path: {secret_path}")
            secret_path.chmod(0o600)
            continue

        descriptor = os.open(secret_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8") as secret_file:
            if name in _GENERATED_SECRET_NAMES:
                secret_file.write(token_urlsafe(32))
                secret_file.write("\n")
        created = True

    return created


if __name__ == "__main__":
    did_create = create_dev_secrets(Path(".secrets"))
    message = (
        "Created missing local secret files."
        if did_create
        else "Local secret files already exist."
    )
    print(message)
