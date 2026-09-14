import { supabase } from "./supabaseClient";

// Implements the same shape FocusApp already expects from `storageApi`:
//   get(key, shared) -> { key, value } | null
//   set(key, value, shared) -> { key, value, shared } | null
// `value` is always stored/returned as a JSON string, same as the old
// localStorage adapter, so App.jsx's JSON.parse(...) calls keep working
// completely unchanged.
export function createSupabaseStorageAdapter(userId) {
  return {
    async get(key, shared = false) {
      const { data, error } = await supabase
        .from("user_data")
        .select("value")
        .eq("user_id", userId)
        .eq("key", key)
        .eq("shared", shared)
        .maybeSingle();

      if (error) {
        console.error("Storage get failed", key, error);
        throw error;
      }
      if (!data) return null;
      // value is stored as jsonb; the app expects a JSON *string* back
      return { key, value: JSON.stringify(data.value) };
    },

    async set(key, value, shared = false) {
      // `value` arrives already JSON.stringify'd from App.jsx; parse it
      // back so it's stored as native jsonb (queryable, smaller).
      let parsed;
      try {
        parsed = JSON.parse(value);
      } catch {
        parsed = value;
      }

      const { error } = await supabase
        .from("user_data")
        .upsert(
          { user_id: userId, key, value: parsed, shared },
          { onConflict: "user_id,key" }
        );

      if (error) {
        console.error("Storage set failed", key, error);
        throw error;
      }
      return { key, value, shared };
    },

    async delete(key, shared = false) {
      const { error } = await supabase
        .from("user_data")
        .delete()
        .eq("user_id", userId)
        .eq("key", key)
        .eq("shared", shared);
      if (error) {
        console.error("Storage delete failed", key, error);
        throw error;
      }
      return { key, deleted: true, shared };
    },

    async list(prefix = "", shared = false) {
      let query = supabase
        .from("user_data")
        .select("key")
        .eq("user_id", userId)
        .eq("shared", shared);
      if (prefix) query = query.like("key", `${prefix}%`);
      const { data, error } = await query;
      if (error) {
        console.error("Storage list failed", error);
        return null;
      }
      return { keys: data.map((r) => r.key), prefix, shared };
    },
  };
}
export function createSessionsAdapter(userId) {
  return {
    async upsertSession(session) {
      const { error } = await supabase.from("sessions").upsert({
        id: session.id,
        user_id: userId,
        date: session.date,
        start_minutes: session.startMinutes,
        minutes: session.minutes,
        mode: session.mode,
        manual: session.manual,
        note: session.note,
        task_id: session.taskId,
      });
      if (error) throw error;
    },
    async listSessions() {
      const { data, error } = await supabase.from("sessions").select("*").eq("user_id", userId);
      if (error) throw error;
      return data.map((r) => ({ id: r.id, date: r.date, startMinutes: r.start_minutes, minutes: r.minutes, mode: r.mode, manual: r.manual, note: r.note, taskId: r.task_id }));
    },
  };
}