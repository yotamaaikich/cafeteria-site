const SHARED_ADMIN_ID = "cafeteria";
const SHARED_ADMIN_EMAIL = "cafeteria@aikichin.example";

export function resolveLoginEmail(loginId) {
    const value = String(loginId).trim();
    if (value.toLowerCase() === SHARED_ADMIN_ID) return SHARED_ADMIN_EMAIL;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return value;
    throw new Error("ログインIDまたはメールアドレスを入力してください。");
}

export function loginDisplayName(email) {
    return email === SHARED_ADMIN_EMAIL ? SHARED_ADMIN_ID : email ?? "管理者";
}
