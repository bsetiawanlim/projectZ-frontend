import type { ApiClient } from "../api/client";

export interface SessionUser {
    id: string;
    email: string;
    name?: string;
    profileId?: number | null;
    roleId?: number | null;
    isSuperAdmin?: boolean;
}

export interface Session {
    user: SessionUser;
    session: { id: string; expiresAt: string };
}

/** Better Auth endpoints (see CONTRACT.md). */
export function createAuthApi(client: ApiClient) {
    return {
        async signIn(email: string, password: string): Promise<Session> {
            const res = await client.raw("/api/auth/sign-in/email", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            });
            if (!res.ok) {
                const b = await res.json().catch(() => ({}) as any);
                throw new Error((b as any).message ?? "Invalid email or password");
            }
            const session = await this.getSession();
            if (!session) throw new Error("Signed in but no session returned");
            return session;
        },
        async getSession(): Promise<Session | null> {
            const res = await client.raw("/api/auth/get-session");
            if (!res.ok) return null;
            const text = await res.text();
            return text && text !== "null" ? (JSON.parse(text) as Session) : null;
        },
        async signOut(): Promise<void> {
            await client.raw("/api/auth/sign-out", { method: "POST", body: "{}" });
        },
    };
}
