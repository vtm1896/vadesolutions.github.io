// Vade — KeyAuth proxy (Supabase Edge Function)
// Your KeyAuth admin credentials live in function secrets, never in the browser.
//
// Deploy:
//   supabase functions deploy keyauth-proxy
//   supabase secrets set KEYAUTH_NAME=... KEYAUTH_OWNERID=... KEYAUTH_ADMIN_USER=... KEYAUTH_ADMIN_PASS=...
//
// Requests must carry a valid user JWT (Authorization: Bearer <token>);
// only profiles with role staff/co_owner/owner are served.

import { createClient } from "npm:@supabase/supabase-js@2";

const KA_NAME = Deno.env.get("KEYAUTH_NAME") ?? "";
const KA_OWNER = Deno.env.get("KEYAUTH_OWNERID") ?? "";
const KA_USER = Deno.env.get("KEYAUTH_ADMIN_USER") ?? "";
const KA_PASS = Deno.env.get("KEYAUTH_ADMIN_PASS") ?? "";
const KA_URL = "https://api.keyauth.cc/api/1.2/";
const VER = "1.0";

const SUPA_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPA_ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPA_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

async function ka(fields: Record<string, string>): Promise<Record<string, unknown>> {
  const payload = new URLSearchParams({ name: KA_NAME, ownerid: KA_OWNER, ...fields });
  const res = await fetch(KA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
    },
    body: payload.toString(),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`KeyAuth HTTP ${res.status}: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`KeyAuth returned non-JSON: ${text.slice(0, 300)}`);
  }
}

function kaError(data: Record<string, unknown>): string {
  return String(data.error ?? data.message ?? "KeyAuth error");
}

function genKey(prefix: string): string {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++) {
    if (i > 0) out += "-";
    for (let j = 0; j < 4; j++) out += abc[Math.floor(Math.random() * abc.length)];
  }
  return (prefix || "VADE-") + out;
}

function digKeys(data: Record<string, unknown>): string[] {
  const found: string[] = [];
  const visit = (v: unknown, depth: number) => {
    if (depth > 4 || found.length > 64) return;
    if (typeof v === "string" && /^[A-Z0-9-]{10,}$/.test(v)) {
      if (v.length >= 16 && v !== "success") found.push(v);
    } else if (Array.isArray(v)) v.forEach((x) => visit(x, depth + 1));
    else if (v && typeof v === "object") Object.values(v).forEach((x) => visit(x, depth + 1));
  };
  visit(data, 0);
  return found;
}

async function assertStaff(req: Request): Promise<string | null> {
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    const userClient = createClient(SUPA_URL, SUPA_ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data } = await userClient.auth.getUser();
    const uid = data?.user?.id;
    if (!uid) return null;
    const admin = createClient(SUPA_URL, SUPA_SERVICE);
    const { data: prof } = await admin
      .from("profiles")
      .select("role")
      .eq("id", uid)
      .single();
    const role = prof?.role;
    return role === "staff" || role === "co_owner" || role === "owner" ? uid : null;
  } catch {
    return null;
  }
}

async function initSession(): Promise<string> {
  let data: Record<string, unknown>;
  try {
    data = await ka({ action: "init", ver: VER });
  } catch (e) {
    throw new Error("init failed: " + (e as Error).message);
  }
  if (data.success !== true && data.success !== "true") {
    throw new Error("init rejected: " + kaError(data));
  }
  return String(data.sessionid ?? data.token);
}

async function adminSession(): Promise<{ session: string; auth: string }> {
  const session = await initSession();
  let data: Record<string, unknown>;
  try {
    data = await ka({
      action: "login",
      username: KA_USER,
      pass: KA_PASS,
      sessionid: session,
    });
  } catch (e) {
    throw new Error("admin login transport error: " + (e as Error).message);
  }
  if (data.success !== true && data.success !== "true") {
    throw new Error("admin login rejected: " + kaError(data));
  }
  return {
    session: String(data.sessionid ?? session),
    auth: String(data.authentification ?? data.token ?? ""),
  };
}

async function handleCreate(count: number, prefix: string) {
  const { session, auth } = await adminSession();
  const keys: string[] = [];
  const errors: string[] = [];
  for (let i = 0; i < Math.min(25, Math.max(1, count)); i++) {
    const key = genKey(prefix);
    try {
      const data = await ka({
        action: "add",
        sessionid: session,
        authentification: auth,
        user: key,
        username: key,
        expires: "none",
        level: "1",
        note: "vade",
        mask: "1",
      });
      if (data.success === true || data.success === "true") keys.push(key);
      else errors.push(`add rejected: ${kaError(data)}`);
    } catch (e) {
      errors.push(`add transport: ${(e as Error).message}`);
    }
  }
  if (!keys.length) throw new Error(errors[0] ?? "KeyAuth created nothing");
  return { keys, errors };
}

async function handleCheck(key: string) {
  const session = await initSession();
  const data = await ka({ action: "license", key, sessionid: session });
  if (data.success !== true && data.success !== "true") {
    return { success: false, error: kaError(data) };
  }
  const auth = (data.auth ?? data.userdata ?? {}) as Record<string, unknown>;
  const info = (auth.info ?? auth) as Record<string, unknown>;
  const subs = (auth.subscriptions ?? []) as unknown[];
  return {
    success: true,
    user: {
      username: String(auth.username ?? info.username ?? key),
      created: String(auth.created_at ?? auth.created ?? info.created ?? "—"),
      expiry: String(auth.expiry ?? auth.subscriptions_expired_on ?? "never"),
      subscriptions: Array.isArray(subs) ? subs.length : 0,
      level: String(auth.level ?? info.level ?? "1"),
    },
  };
}

async function handleRevoke(key: string) {
  const { session, auth } = await adminSession();
  const data = await ka({
    action: "ban",
    sessionid: session,
    authentification: auth,
    target: key,
  });
  if (data.success !== true && data.success !== "true") {
    return { success: false, error: kaError(data) };
  }
  return { success: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ success: false, error: "POST only" }, 405);
  if (!KA_NAME || !KA_OWNER) return json({ success: false, error: "KeyAuth secrets not set on the function" }, 503);

  const uid = await assertStaff(req);
  if (!uid) return json({ success: false, error: "Not authorized (staff only)" }, 403);

  try {
    const body = await req.json();
    const action = String(body.action ?? "");

    if (action === "create") {
      const count = Number(body.count) || 1;
      const prefix = String(body.prefix ?? "VADE-").slice(0, 16);
      const out = await handleCreate(count, prefix);
      return json({ success: true, keys: out.keys, errors: out.errors });
    }

    if (action === "check") {
      const key = String(body.key ?? "").trim();
      if (!key) return json({ success: false, error: "key required" }, 400);
      return json(await handleCheck(key));
    }

    if (action === "revoke") {
      const key = String(body.key ?? "").trim();
      if (!key) return json({ success: false, error: "key required" }, 400);
      return json(await handleRevoke(key));
    }

    return json({ success: false, error: "unknown action" }, 400);
  } catch (e) {
    return json({ success: false, error: (e as Error).message }, 500);
  }
});
