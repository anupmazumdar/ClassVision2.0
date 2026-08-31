# ClassVision 2.0 Security Policy & Hardening Guide

## 🚨 Security Alert: Credential & Secret Rotation Policy

If this repository was ever public or shared with third parties, **all runtime secrets and default passwords must be immediately rotated** in your production deployment environment (e.g. Render, Railway, AWS, or local `.env`):

### 1. Mandatory Secrets to Rotate in `.env`:
- **`JWT_SECRET`**: Generate a fresh 256-bit cryptographically secure string (`python -c "import secrets; print(secrets.token_hex(32))"`).
- **`SESSION_CODE_SECRET`**: Rotate the 6-digit rolling TOTP seed key.
- **`ATTENDANCE_TICKET_SECRET`**: Rotate HMAC ticket signing key for geofenced self check-in.
- **`FACE_ENCRYPTION_KEY`**: Generate a new AES-256 Fernet encryption key (`python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`).
- **Default Administrator Password**: Change the initial `admin@classvision.local` password via the User Management portal.

---

## 🧹 Git History Purge Notice (Destructive History Rewrite)
All SQLite database runtime files (`*.db`, `*.db-wal`, `*.db-shm`, `*.db-journal`, `*.sqlite*`) are now strictly untracked and enforced in `.gitignore`.

If you wish to rewrite prior git history locally to purge old commit blobs:
```bash
# Recommended tool: git-filter-repo (Python-based)
pip install git-filter-repo
git filter-repo --path backend/classvision.db-wal --path backend/classvision.db-shm --invert-paths

# Or using BFG Repo-Cleaner:
bfg --delete-files "classvision.db*"
git reflog expire --expire=now --all && git gc --prune=now --aggressive
```
> [!CAUTION]
> Rewriting git history modifies past commit SHAs and requires a `git push origin --force --all`. All collaborating team members must re-clone the repository.

---

## 🛡️ Active Security Protections in ClassVision 2.0

1. **HttpOnly, Secure, SameSite Cookie Authentication**:
   - Access tokens are transmitted in `HttpOnly` and `SameSite=Strict/Lax` cookies, preventing token theft via XSS.
2. **Immutable Append-Only Audit Ledger (WORM)**:
   - Security and access events are cryptographically chained with SHA-256 digests. Deletion is completely blocked.
3. **Strict 1-Device = 1-Student Hardware Binding**:
   - Prevents proxy check-ins by locking one hardware fingerprint per registered student. Multi-student device switches require teacher/admin approval.
4. **Course & Department Isolation (RBAC)**:
   - Students only access notes, assignments, and test schedules for their designated program (e.g. BCA vs B.Tech).
5. **Anti-XSS Output Encoding**:
   - Assistant AI chatbot and markdown outputs sanitize all user inputs and prevent raw script injection.
