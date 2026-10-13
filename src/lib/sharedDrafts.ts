import { useEffect, useRef, useState } from "react";
import { local } from "./storage";

/** A committee's draft event in the almanac. */
export type Draft = { id: string; date: string; title: string; soc: string; eve: boolean; by: string | null; at: number };

export type ShareMode = "connecting" | "shared" | "readonly" | "local";

// Minimal shapes of the claude.ai artifact runtime that this page uses.
type Snap = { id: string; data(): Record<string, unknown> | undefined };
type Collection = {
  doc(id?: string): { set(d: Record<string, unknown>): Promise<void>; delete(): Promise<void> };
  onSnapshot(next: (s: { docs: Snap[] }) => void, err?: (e: { code: string }) => void): () => void;
};
type Db = { collection(path: string): Collection };
type User = { id(): Promise<string | null>; isOwner(): Promise<boolean>; can(c: string): Promise<boolean | null> };
type ClaudeRuntime = { use(name: "db"): Promise<Db | null>; use(name: "user"): Promise<User | null> };

const runtime = () => (window as unknown as { claude?: ClaudeRuntime }).claude;

const isDraft = (x: Record<string, unknown> | undefined): x is Omit<Draft, "id"> =>
  !!x && typeof x.date === "string" && typeof x.title === "string" && typeof x.soc === "string";

/**
 * Drafts live in the artifact's shared `db` (collection "drafts") when the page runs on
 * claude.ai, so every committee sees the same almanac live. Anywhere else (local dev, a
 * viewer without access) they fall back to this browser's storage.
 */
export function useSharedDrafts() {
  const [drafts, setDrafts] = useState<Draft[]>(() => local.get<Draft[]>("drafts", []));
  const [mode, setMode] = useState<ShareMode>(runtime() ? "connecting" : "local");
  const [me, setMe] = useState<{ id: string | null; owner: boolean }>({ id: null, owner: false });
  const col = useRef<Collection | null>(null);

  useEffect(() => {
    const claude = runtime();
    if (!claude) return;
    let unsub: (() => void) | undefined;
    let dead = false;
    (async () => {
      const [db, user] = await Promise.all([claude.use("db"), claude.use("user")]);
      if (dead) return;
      if (!db) {
        setMode("local");
        return;
      }
      const [id, owner, canWrite] = await Promise.all([user?.id() ?? null, user?.isOwner() ?? false, user?.can("data.write") ?? null]);
      if (dead) return;
      setMe({ id, owner });
      col.current = db.collection("drafts");
      setMode(canWrite === false ? "readonly" : "shared");
      unsub = col.current.onSnapshot(
        (s) => {
          const rows: Draft[] = [];
          for (const d of s.docs) {
            const v = d.data();
            if (isDraft(v)) rows.push({ id: d.id, date: v.date, title: v.title.slice(0, 60), soc: v.soc, eve: v.eve !== false, by: (v.by as string) ?? null, at: Number(v.at) || 0 });
          }
          setDrafts(rows.sort((a, b) => a.at - b.at));
        },
        () => setMode("local"),
      );
    })();
    return () => {
      dead = true;
      unsub?.();
    };
  }, []);

  async function add(d: Omit<Draft, "id" | "by" | "at">): Promise<string | null> {
    const row = { ...d, by: me.id, at: Date.now() };
    if (mode === "shared" && col.current) {
      try {
        await col.current.doc().set(row);
        return null;
      } catch (e) {
        const code = (e as { code?: string }).code;
        if (code === "invalid_argument") setMode("readonly");
        return code === "quota_exceeded" ? "The almanac is full. Remove some old drafts first." : "That draft didn't save. Try again in a moment.";
      }
    }
    const next = [...drafts, { ...row, id: "l" + row.at }];
    setDrafts(next);
    local.set("drafts", next);
    return null;
  }

  async function remove(id: string) {
    if (mode === "shared" && col.current) {
      try {
        await col.current.doc(id).delete();
      } catch {
        /* the snapshot keeps showing it; nothing else to do */
      }
      return;
    }
    const next = drafts.filter((d) => d.id !== id);
    setDrafts(next);
    local.set("drafts", next);
  }

  /** Anyone can remove their own drafts; the artifact owner can tidy any of them. */
  const canRemove = (d: Draft) => mode === "local" || me.owner || (d.by != null && d.by === me.id);

  return { drafts, mode, add, remove, canRemove };
}
