import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { createSupabaseStorageAdapter } from "../lib/supabaseStorageAdapter";
import AuthScreen from "./AuthScreen";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  // Gates rendering of `children` until window.storage is actually set, so
  // FocusApp's storageApi = window.storage ?? localStorageAdapter (a plain
  // const computed at render time in App.jsx) never wins the race and falls
  // back to localStorage on the first render right after login.
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      window.storage = createSupabaseStorageAdapter(session.user.id);
      setStorageReady(true);
    } else {
      delete window.storage;
      setStorageReady(false);
    }
  }, [session?.user?.id]);

  if (session === undefined) {
    return (
      <div style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", color: "#7C7A72" }}>
        Loading…
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (!storageReady) {
    // Brief single-frame gap between "we have a session" and "window.storage
    // is wired up" — same loading state, no flash of local (wrong) data.
    return (
      <div style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", color: "#7C7A72" }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <button
        type="button"
        onClick={() => supabase.auth.signOut()}
        title="Sign out"
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 10,
          fontSize: 11,
          padding: "5px 10px",
          borderRadius: 8,
          border: "1px solid #D8D3C8",
          background: "#F7F5F0",
          color: "#7C7A72",
          cursor: "pointer",
        }}
      >
        Sign out
      </button>
      {children}
    </div>
  );
}
