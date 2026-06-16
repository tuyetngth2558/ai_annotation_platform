# Scripts

Script hỗ trợ dev/ops.

| File | Mục đích |
|---|---|
| `dev.ps1` | Task runner cho Windows (PowerShell). Tương đương `Makefile`. |
| `seed_dev.py` | Seed 3 user mock (admin/annotator/qa). |

## Dùng

```powershell
# Windows
.\scripts\dev.ps1 up
.\scripts\dev.ps1 seed
.\scripts\dev.ps1 logs api
```

```bash
# Unix / WSL / Git-bash
make up
make seed
make logs s=api
```

Các script khác (import/export sample, validation helper) thêm khi cần — xem `docs/`.
