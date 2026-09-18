import React, { useState, useEffect, useRef, useCallback } from "react";
import { Timer as TimerIcon, BarChart3, Moon, Sun, CalendarDays, LineChart, Heart, Settings as SettingsIcon } from "lucide-react";
import { MODES, THEMES, TASK_COLORS } from "./theme";
import { uid, fmt, todayKey, minutesSinceMidnight, addDays } from "./utils/dates";
import { playSound, DEFAULT_WORK_END_SOUND, DEFAULT_BREAK_END_SOUND } from "./lib/sounds";
import { enableBackgroundMode, disableBackgroundMode } from "./lib/backgroundMode";

import TimerScreen from "./components/TimerScreen";
import PlannerScreen from "./components/PlannerScreen";
import ChartConsistencyScreen from "./components/ChartConsistencyScreen";
import ProgressScreen from "./components/ProgressScreen";
import MotivationScreen from "./components/MotivationScreen";
import SettingsScreen from "./components/SettingsScreen";
import LogTimeModal from "./components/LogTimeModal";
import { saveActiveTimer, loadActiveTimer, clearActiveTimer, remainingFromEnd, elapsedStopwatch, resolveElapsedPhases } from "./lib/timerEngine";
import { initNotifications, scheduleSessionEnd, cancelSessionEnd, TIMER_NOTIFICATION_ID } from "./lib/notifications";
import { getQueuedWrites, clearQueuedWrite } from "./lib/offlineQueue";

const localStorageAdapter = {
  async get(key) {
    try {
      const value = window.localStorage.getItem(key);
      return value ? { value } : null;
    } catch (error) {
      console.error("Storage get failed", error);
      return null;
    }
  },
  async set(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      console.error("Storage set failed", error);
    }
  }
};

export default function FocusApp() {
  const [dark, setDark] = useState(false);
  const [themeName, setThemeName] = useState("sage");
  const [screen, setScreen] = useState("timer");
  const [loaded, setLoaded] = useState(false);

  const [modeKey, setModeKey] = useState("pomodoro");
  const [phase, setPhase] = useState("work");
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(MODES.pomodoro.work);
  const [stopwatchSecs, setStopwatchSecs] = useState(0);

  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [activeTaskId, setActiveTaskId] = useState(null);

  // A. New state
  const [breakTasks, setBreakTasks] = useState([]);
  const [newBreakTask, setNewBreakTask] = useState("");
  const [procrastinateTasks, setProcrastinateTasks] = useState([]); // {id, text, done} — Matrix tab's Procrastinate column

  const [sessions, setSessions] = useState([]);
  const [customDurations, setCustomDurations] = useState({ pomodoro: { work: 25, rest: 5 }, deepwork: { work: 40, rest: 10 } });
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(180);
  const [sleepSettings, setSleepSettings] = useState({ enabled: true, start: "23:00", end: "07:00" });
  const [dayStartHour, setDayStartHour] = useState(0);
  const [showLogModal, setShowLogModal] = useState(false);
  const [autoContinue, setAutoContinue] = useState(true);
  const [workEndSoundId, setWorkEndSoundId] = useState(DEFAULT_WORK_END_SOUND);
  const [breakEndSoundId, setBreakEndSoundId] = useState(DEFAULT_BREAK_END_SOUND);

  const [eisenhower, setEisenhower] = useState([]); // {id,text,quadrant,done,notes,subtasks:[{id,text,done}]}
  const [planner, setPlanner] = useState({});
  const [consistencyTasks, setConsistencyTasks] = useState([]); // {id, text, completedDates: string[]}
  const [whyText, setWhyText] = useState("");
  const [motivationLog, setMotivationLog] = useState([]);
  const [challengesLog, setChallengesLog] = useState([]); // {id, date, challenge, solution}
  const [compareDates, setCompareDates] = useState([]);

  const intervalRef = useRef(null);
  const sessionStartRef = useRef(null);
  const saveTimeout = useRef({});
  const stoppingRef = useRef(false);

  const storageApi = typeof window !== "undefined" && window.storage ? window.storage : localStorageAdapter;
  const deviceId = localStorage.getItem("deviceId") || (() => {
    const id = uid();
    localStorage.setItem("deviceId", id);
    return id;
  })();

  const flushQueuedWrites = useCallback(async () => {
    const pending = getQueuedWrites();
    for (const [key, value] of Object.entries(pending)) {
      try {
        await storageApi.set(key, JSON.stringify(value), false);
        clearQueuedWrite(key);
      } catch (e) {
        // still offline (or Supabase still unreachable) — leave it queued, try again next time
      }
    }
  }, [storageApi]);

  // B. Load on startup
  useEffect(() => {
    (async () => {
      try {
        const keys = ["tasks", "sessions", "durations", "theme", "themeName", "goal", "eisenhower", "planner", "whyText", "motivationLog", "compareDates", "challengesLog", "sleepSettings", "dayStartHour", "consistencyTasks", "autoContinue", "workEndSoundId", "breakEndSoundId", "breakTasks", "activeTaskId", "procrastinateTasks"];
        const results = await Promise.allSettled(keys.map((k) => storageApi.get(k, false)));
        const [t, s, c, th, tn, g, ei, pl, why, mo, cd, ch, sl, dsh, ct, ac, wes, bes, bt, atid, pt] = results;

        if (t.status === "fulfilled" && t.value) setTasks(JSON.parse(t.value.value));
        if (s.status === "fulfilled" && s.value) setSessions(JSON.parse(s.value.value));
        if (c.status === "fulfilled" && c.value) {
          const parsed = JSON.parse(c.value.value);
          setCustomDurations(parsed);
          setSecondsLeft(parsed.pomodoro.work * 60);
        }
        if (th.status === "fulfilled" && th.value) setDark(JSON.parse(th.value.value));
        if (tn.status === "fulfilled" && tn.value) setThemeName(JSON.parse(tn.value.value));
        if (g.status === "fulfilled" && g.value) setDailyGoalMinutes(JSON.parse(g.value.value));
        if (ei.status === "fulfilled" && ei.value) setEisenhower(JSON.parse(ei.value.value));
        if (pl.status === "fulfilled" && pl.value) setPlanner(JSON.parse(pl.value.value));
        if (why.status === "fulfilled" && why.value) setWhyText(JSON.parse(why.value.value));
        if (mo.status === "fulfilled" && mo.value) setMotivationLog(JSON.parse(mo.value.value));
        if (cd.status === "fulfilled" && cd.value) setCompareDates(JSON.parse(cd.value.value));
        if (ch.status === "fulfilled" && ch.value) setChallengesLog(JSON.parse(ch.value.value));
        if (sl.status === "fulfilled" && sl.value) setSleepSettings(JSON.parse(sl.value.value));
        if (dsh.status === "fulfilled" && dsh.value) setDayStartHour(JSON.parse(dsh.value.value));
        if (ct.status === "fulfilled" && ct.value) setConsistencyTasks(JSON.parse(ct.value.value));
        if (ac.status === "fulfilled" && ac.value) setAutoContinue(JSON.parse(ac.value.value));
        if (wes.status === "fulfilled" && wes.value) setWorkEndSoundId(JSON.parse(wes.value.value));
        if (bes.status === "fulfilled" && bes.value) setBreakEndSoundId(JSON.parse(bes.value.value));
        if (bt && bt.status === "fulfilled" && bt.value) setBreakTasks(JSON.parse(bt.value.value));
        if (atid && atid.status === "fulfilled" && atid.value) setActiveTaskId(JSON.parse(atid.value.value));
        if (pt && pt.status === "fulfilled" && pt.value) setProcrastinateTasks(JSON.parse(pt.value.value));
      } catch (e) {
        console.error("Load error", e);
      } finally {
        setLoaded(true);
        flushQueuedWrites();
      }
    })();

    initNotifications();
  }, [storageApi, flushQueuedWrites]);

  useEffect(() => {
    window.addEventListener("online", flushQueuedWrites);
    return () => window.removeEventListener("online", flushQueuedWrites);
  }, [storageApi, flushQueuedWrites]);

  // Resume an in-progress timer after the app was backgrounded/killed and
  // reopened, by recomputing from stored wall-clock timestamps instead of
  // trusting a JS interval that Android may have frozen while backgrounded.
  useEffect(() => {
    if (!loaded) return;

    const active = loadActiveTimer();
    if (!active) return;

    if (active.modeKey === "stopwatch") {
      setModeKey("stopwatch");

      if (active.running && active.stopwatchStartTimestamp) {
        setStopwatchSecs(elapsedStopwatch(active.stopwatchStartTimestamp, active.stopwatchBaseSecs));
        sessionStartRef.current = active.stopwatchStartTimestamp - active.stopwatchBaseSecs * 1000;
        setRunning(true);
      } else {
        setStopwatchSecs(active.stopwatchBaseSecs || 0);
      }

      return;
    }

    setModeKey(active.modeKey);
    setPhase(active.phase);

    if (active.running && active.endTimestamp) {
      const remaining = remainingFromEnd(active.endTimestamp);

      if (remaining <= 0) {
        const durs = customDurations[active.modeKey];
        const resolved = resolveElapsedPhases({
          phase: active.phase,
          endTimestamp: active.endTimestamp,
          durations: durs
        });

        resolved.completedWorkPhases.forEach((cwp) => {
          logSession(cwp.minutes, active.modeKey, new Date(cwp.startTimestamp), "", activeTaskId);
        });

        if (resolved.completedWorkPhases.length > 0 && activeTaskId) {
          setTasks((prev) =>
            prev.map((tk) =>
              tk.id === activeTaskId ? { ...tk, done: true } : tk
            )
          );
        }

        setPhase(resolved.phase);

        if (!autoContinue || resolved.hitCap) {
          const fullSecs = (resolved.phase === "work" ? durs.work : durs.rest) * 60;

          setSecondsLeft(fullSecs);
          setRunning(false);

          saveActiveTimer({
            modeKey: active.modeKey,
            phase: resolved.phase,
            running: false,
            endTimestamp: null,
            remainingSeconds: fullSecs,
            stopwatchStartTimestamp: null,
            stopwatchBaseSecs: 0
          });
        } else {
          setSecondsLeft(resolved.remainingSeconds);
          setRunning(true);

          sessionStartRef.current =
            resolved.endTimestamp -
            (resolved.phase === "work" ? durs.work : durs.rest) * 60 * 1000;

          saveActiveTimer({
            modeKey: active.modeKey,
            phase: resolved.phase,
            running: true,
            endTimestamp: resolved.endTimestamp,
            remainingSeconds: null,
            stopwatchStartTimestamp: null,
            stopwatchBaseSecs: 0
          });

          scheduleSessionEnd(
            TIMER_NOTIFICATION_ID,
            new Date(resolved.endTimestamp),
            resolved.phase === "work" ? "Break's over" : "Focus session complete",
            resolved.phase === "work" ? "Back to work." : "Nice work — time for a break.",
            resolved.phase === "work" ? workEndSoundId : breakEndSoundId
          );
        }
      } else {
        setSecondsLeft(remaining);
        setRunning(true);
      }
    } else if (active.remainingSeconds != null) {
      setSecondsLeft(active.remainingSeconds);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // Re-sync from the stored end timestamp whenever the app/tab becomes visible again
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible" || !running) return;

      const active = loadActiveTimer();
      if (!active) return;

      if (active.modeKey === "stopwatch" && active.stopwatchStartTimestamp) {
        setStopwatchSecs(
          elapsedStopwatch(
            active.stopwatchStartTimestamp,
            active.stopwatchBaseSecs
          )
        );
      } else if (active.endTimestamp) {
        const remaining = remainingFromEnd(active.endTimestamp);

        if (remaining <= 0) {
          const durs = customDurations[modeKey];

          const resolved = resolveElapsedPhases({
            phase,
            endTimestamp: active.endTimestamp,
            durations: durs
          });

          resolved.completedWorkPhases.forEach((cwp) => {
            logSession(cwp.minutes, modeKey, new Date(cwp.startTimestamp), "", activeTaskId);
          });

          if (resolved.completedWorkPhases.length > 0 && activeTaskId) {
            setTasks((prev) =>
              prev.map((tk) =>
                tk.id === activeTaskId ? { ...tk, done: true } : tk
              )
            );
          }

          beep(phase);
          clearInterval(intervalRef.current);
          setPhase(resolved.phase);

          if (!autoContinue || resolved.hitCap) {
            const fullSecs =
              (resolved.phase === "work" ? durs.work : durs.rest) * 60;

            setSecondsLeft(fullSecs);
            setRunning(false);
            cancelSessionEnd(TIMER_NOTIFICATION_ID);

            saveActiveTimer({
              modeKey,
              phase: resolved.phase,
              running: false,
              endTimestamp: null,
              remainingSeconds: fullSecs,
              stopwatchStartTimestamp: null,
              stopwatchBaseSecs: 0
            });
          } else {
            setSecondsLeft(resolved.remainingSeconds);
            setRunning(true);

            sessionStartRef.current =
              resolved.endTimestamp -
              (resolved.phase === "work" ? durs.work : durs.rest) *
                60 *
                1000;

            saveActiveTimer({
              modeKey,
              phase: resolved.phase,
              running: true,
              endTimestamp: resolved.endTimestamp,
              remainingSeconds: null,
              stopwatchStartTimestamp: null,
              stopwatchBaseSecs: 0
            });

            scheduleSessionEnd(
              TIMER_NOTIFICATION_ID,
              new Date(resolved.endTimestamp),
              resolved.phase === "work"
                ? "Break's over"
                : "Focus session complete",
              resolved.phase === "work"
                ? "Back to work."
                : "Nice work — time for a break.",
              resolved.phase === "work"
                ? workEndSoundId
                : breakEndSoundId
            );
          }
        } else {
          setSecondsLeft(remaining);
        }
      }
    }

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [running, modeKey, phase, customDurations, activeTaskId, autoContinue, workEndSoundId, breakEndSoundId]);

  const persist = useCallback(
    (key, value) => {
      clearTimeout(saveTimeout.current[key]);

      saveTimeout.current[key] = setTimeout(async () => {
        try {
          await storageApi.set(key, JSON.stringify(value), false);
          clearQueuedWrite(key);
        } catch (e) {
          console.error("Save error", e);
          queueWrite(key, value);
        }
      }, 300);
    },
    [storageApi]
  );

  useEffect(() => { if (loaded) persist("tasks", tasks); }, [tasks, loaded, persist]);

  // C. Persist on change
  useEffect(() => {
    if (loaded) persist("breakTasks", breakTasks);
  }, [breakTasks, loaded, persist]);

  useEffect(() => { if (loaded) persist("sessions", sessions); }, [sessions, loaded, persist]);
  useEffect(() => { if (loaded) persist("activeTaskId", activeTaskId); }, [activeTaskId, loaded, persist]);
  useEffect(() => { if (loaded) persist("durations", customDurations); }, [customDurations, loaded, persist]);
  useEffect(() => { if (loaded) persist("theme", dark); }, [dark, loaded, persist]);
  useEffect(() => { if (loaded) persist("themeName", themeName); }, [themeName, loaded, persist]);
  useEffect(() => { if (loaded) persist("goal", dailyGoalMinutes); }, [dailyGoalMinutes, loaded, persist]);
  useEffect(() => { if (loaded) persist("eisenhower", eisenhower); }, [eisenhower, loaded, persist]);
  useEffect(() => { if (loaded) persist("planner", planner); }, [planner, loaded, persist]);
  useEffect(() => { if (loaded) persist("whyText", whyText); }, [whyText, loaded, persist]);
  useEffect(() => { if (loaded) persist("motivationLog", motivationLog); }, [motivationLog, loaded, persist]);
  useEffect(() => { if (loaded) persist("compareDates", compareDates); }, [compareDates, loaded, persist]);
  useEffect(() => { if (loaded) persist("challengesLog", challengesLog); }, [challengesLog, loaded, persist]);
  useEffect(() => { if (loaded) persist("sleepSettings", sleepSettings); }, [sleepSettings, loaded, persist]);
  useEffect(() => { if (loaded) persist("dayStartHour", dayStartHour); }, [dayStartHour, loaded, persist]);
  useEffect(() => { if (loaded) persist("consistencyTasks", consistencyTasks); }, [consistencyTasks, loaded, persist]);
  useEffect(() => { if (loaded) persist("autoContinue", autoContinue); }, [autoContinue, loaded, persist]);
  useEffect(() => { if (loaded) persist("workEndSoundId", workEndSoundId); }, [workEndSoundId, loaded, persist]);
  useEffect(() => { if (loaded) persist("breakEndSoundId", breakEndSoundId); }, [breakEndSoundId, loaded, persist]);
  useEffect(() => { if (loaded) persist("procrastinateTasks", procrastinateTasks); }, [procrastinateTasks, loaded, persist]);

  useEffect(() => {
    if (!running) return;

    intervalRef.current = setInterval(() => {
      if (modeKey === "stopwatch") {
        setStopwatchSecs((s) => s + 1);
      } else {
        setSecondsLeft((s) => {
          if (s <= 1) {
            handlePhaseEnd();
            return 0;
          }

          return s - 1;
        });
      }
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [running, modeKey, phase]);

  function beep(justFinishedPhase) {
    playSound(justFinishedPhase === "work" ? workEndSoundId : breakEndSoundId);
  }

  function logSession(minutes, mode, startDate, note, taskId) {
    if (minutes <= 0) return;

    const sd = startDate || new Date();

    setSessions((prev) => [
      ...prev,
      {
        id: uid(),
        date: todayKey(sd),
        startMinutes: minutesSinceMidnight(sd),
        minutes,
        mode,
        manual: false,
        note: note || "",
        taskId: taskId || null
      }
    ]);
  }

  function startPhaseAuto(nextPhase, forModeKey, durs) {
    const durationMinutes = nextPhase === "work" ? durs.work : durs.rest;

    const endTimestamp = Date.now() + durationMinutes * 60 * 1000;

    sessionStartRef.current = Date.now();
    setPhase(nextPhase);
    setSecondsLeft(durationMinutes * 60);
    setRunning(true);

    saveActiveTimer({
      modeKey: forModeKey,
      phase: nextPhase,
      running: true,
      endTimestamp,
      remainingSeconds: null,
      stopwatchStartTimestamp: null,
      stopwatchBaseSecs: 0
    });

    scheduleSessionEnd(
      TIMER_NOTIFICATION_ID,
      new Date(endTimestamp),
      nextPhase === "work" ? "Break's over" : "Focus session complete",
      nextPhase === "work" ? "Back to work." : "Nice work — time for a break.",
      nextPhase === "work" ? workEndSoundId : breakEndSoundId
    );
  }

  function handlePhaseEnd() {
    beep(phase);
    clearInterval(intervalRef.current);

    const durs = customDurations[modeKey];
    const activeTask = tasks.find((tk) => tk.id === activeTaskId);

    if (phase === "work") {
      logSession(
        durs.work,
        modeKey,
        sessionStartRef.current ? new Date(sessionStartRef.current) : new Date(),
        activeTask ? activeTask.text : "",
        activeTask ? activeTask.id : null
      );

      if (activeTaskId) {
        setTasks((prev) =>
          prev.map((tk) =>
            tk.id === activeTaskId ? { ...tk, done: true } : tk
          )
        );
      }

      if (autoContinue) {
        startPhaseAuto("rest", modeKey, durs);
      } else {
        setRunning(false);
        disableBackgroundMode();
        cancelSessionEnd(TIMER_NOTIFICATION_ID);
        setPhase("rest");
        setSecondsLeft(durs.rest * 60);

        saveActiveTimer({
          modeKey,
          phase: "rest",
          running: false,
          endTimestamp: null,
          remainingSeconds: durs.rest * 60,
          stopwatchStartTimestamp: null,
          stopwatchBaseSecs: 0
        });
      }
    } else {
      if (autoContinue) {
        startPhaseAuto("work", modeKey, durs);
      } else {
        setRunning(false);
        disableBackgroundMode();
        cancelSessionEnd(TIMER_NOTIFICATION_ID);
        setPhase("work");
        setSecondsLeft(durs.work * 60);

        saveActiveTimer({
          modeKey,
          phase: "work",
          running: false,
          endTimestamp: null,
          remainingSeconds: durs.work * 60,
          stopwatchStartTimestamp: null,
          stopwatchBaseSecs: 0
        });
      }
    }
  }

  async function startPause() {
    if (!running) {
      const lockRaw = await storageApi.get("activeLock", false);
      const lock = lockRaw ? JSON.parse(lockRaw.value) : null;
      if (lock && lock.deviceId !== deviceId && Date.now() - lock.startedAt < 3 * 60 * 60 * 1000) {
        const proceed = window.confirm("A timer looks like it's already running on another device. Start here anyway?");
        if (!proceed) return;
      }
      await storageApi.set("activeLock", JSON.stringify({ deviceId, startedAt: Date.now(), modeKey, activeTaskId }), false);

      sessionStartRef.current = Date.now();
      setRunning(true);
      enableBackgroundMode();

      if (modeKey === "stopwatch") {
        saveActiveTimer({
          modeKey,
          phase,
          running: true,
          endTimestamp: null,
          remainingSeconds: null,
          stopwatchStartTimestamp: Date.now(),
          stopwatchBaseSecs: stopwatchSecs
        });
      } else {
        const endTimestamp = Date.now() + secondsLeft * 1000;

        saveActiveTimer({
          modeKey,
          phase,
          running: true,
          endTimestamp,
          remainingSeconds: null,
          stopwatchStartTimestamp: null,
          stopwatchBaseSecs: 0
        });

        scheduleSessionEnd(
          TIMER_NOTIFICATION_ID,
          new Date(endTimestamp),
          phase === "work" ? "Focus session complete" : "Break's over",
          phase === "work" ? "Nice work — time for a break." : "Ready to get back to it?",
          phase === "work" ? workEndSoundId : breakEndSoundId
        );
      }
    } else {
      setRunning(false);
      disableBackgroundMode();
      clearInterval(intervalRef.current);
      cancelSessionEnd(TIMER_NOTIFICATION_ID);

      if (modeKey === "stopwatch") {
        if (stopwatchSecs > 0) {
          const activeTask = tasks.find((tk) => tk.id === activeTaskId);

          logSession(
            Math.round(stopwatchSecs / 60),
            "stopwatch",
            new Date(sessionStartRef.current),
            activeTask ? activeTask.text : "",
            activeTask?.id
          );
        }

        saveActiveTimer({
          modeKey,
          phase,
          running: false,
          endTimestamp: null,
          remainingSeconds: null,
          stopwatchStartTimestamp: null,
          stopwatchBaseSecs: stopwatchSecs
        });
      } else {
        saveActiveTimer({
          modeKey,
          phase,
          running: false,
          endTimestamp: null,
          remainingSeconds: secondsLeft,
          stopwatchStartTimestamp: null,
          stopwatchBaseSecs: 0
        });
      }
    }
  }

  function reset() {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    setTimeout(() => { stoppingRef.current = false; }, 500);
    setRunning(false);
    clearInterval(intervalRef.current);
    cancelSessionEnd(TIMER_NOTIFICATION_ID);
    storageApi.set("activeLock", JSON.stringify(null), false);

    if (modeKey === "stopwatch") {
      if (stopwatchSecs > 0) {
        const activeTask = tasks.find((tk) => tk.id === activeTaskId);

        logSession(
          Math.round(stopwatchSecs / 60),
          "stopwatch",
          sessionStartRef.current ? new Date(sessionStartRef.current) : new Date(),
          activeTask ? activeTask.text : "",
          activeTask?.id
        );
      }

      setStopwatchSecs(0);
      clearActiveTimer();
    } else {
      const durs = customDurations[modeKey];
      const totalSecs = (phase === "work" ? durs.work : durs.rest) * 60;
      const elapsedMinutes = Math.round((totalSecs - secondsLeft) / 60);

      if (elapsedMinutes > 0 && phase === "work") {
        const activeTask = tasks.find((tk) => tk.id === activeTaskId);

        logSession(
          elapsedMinutes,
          modeKey,
          sessionStartRef.current ? new Date(sessionStartRef.current) : new Date(),
          activeTask ? activeTask.text : "",
          activeTask?.id
        );
      }

      setPhase("work");
      setSecondsLeft(durs.work * 60);

      saveActiveTimer({
        modeKey,
        phase: "work",
        running: false,
        endTimestamp: null,
        remainingSeconds: durs.work * 60,
        stopwatchStartTimestamp: null,
        stopwatchBaseSecs: 0
      });
    }
  }

  function stopSession() {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    setTimeout(() => { stoppingRef.current = false; }, 500);
    setRunning(false);
    clearInterval(intervalRef.current);
    cancelSessionEnd(TIMER_NOTIFICATION_ID);
    storageApi.set("activeLock", JSON.stringify(null), false);

    if (modeKey === "stopwatch") {
      if (stopwatchSecs > 0) {
        const activeTask = tasks.find((tk) => tk.id === activeTaskId);

        logSession(
          Math.round(stopwatchSecs / 60),
          "stopwatch",
          new Date(sessionStartRef.current),
          activeTask ? activeTask.text : "",
          activeTask?.id
        );
      }

      setStopwatchSecs(0);
      clearActiveTimer();
    } else {
      const durs = customDurations[modeKey];
      const totalSecs = (phase === "work" ? durs.work : durs.rest) * 60;
      const elapsedMinutes = Math.round((totalSecs - secondsLeft) / 60);

      if (elapsedMinutes > 0 && phase === "work") {
        const activeTask = tasks.find((tk) => tk.id === activeTaskId);

        logSession(
          elapsedMinutes,
          modeKey,
          sessionStartRef.current ? new Date(sessionStartRef.current) : new Date(),
          activeTask ? activeTask.text : "",
          activeTask?.id
        );
      }

      setPhase("work");
      setSecondsLeft(durs.work * 60);

      saveActiveTimer({
        modeKey,
        phase: "work",
        running: false,
        endTimestamp: null,
        remainingSeconds: durs.work * 60,
        stopwatchStartTimestamp: null,
        stopwatchBaseSecs: 0
      });
    }
  }

  function switchMode(key) {
    setRunning(false);
    clearInterval(intervalRef.current);
    cancelSessionEnd(TIMER_NOTIFICATION_ID);

    setModeKey(key);
    setPhase("work");
    setStopwatchSecs(0);

    if (key !== "stopwatch") {
      setSecondsLeft(customDurations[key].work * 60);

      saveActiveTimer({
        modeKey: key,
        phase: "work",
        running: false,
        endTimestamp: null,
        remainingSeconds: customDurations[key].work * 60,
        stopwatchStartTimestamp: null,
        stopwatchBaseSecs: 0
      });
    } else {
      clearActiveTimer();
    }
  }

  function addTask() {
    const text = newTask.trim();
    if (!text) return;

    setTasks((p) => [
      ...p,
      {
        id: uid(),
        text,
        done: false,
        color: TASK_COLORS[p.length % TASK_COLORS.length],
        targetHours: null
      }
    ]);

    setNewTask("");
  }

  function setTaskTarget(id, hours) {
    setTasks((p) => p.map((tk) => tk.id === id ? { ...tk, targetHours: hours } : tk));
  }

  function toggleTask(id) {
    setTasks((p) => p.map((tk) => tk.id === id ? { ...tk, done: !tk.done } : tk));
  }

  function removeTask(id) {
    setTasks((p) => p.filter((tk) => tk.id !== id));
    if (activeTaskId === id) {
      setActiveTaskId(null);
    }
  }

  // D. New handler functions
  function addBreakTask() {
    const text = newBreakTask.trim();
    if (!text) return;
    setBreakTasks((p) => [...p, { id: uid(), text, done: false }]);
    setNewBreakTask("");
  }
  function toggleBreakTask(id) {
    setBreakTasks((p) => p.map((tk) => (tk.id === id ? { ...tk, done: !tk.done } : tk)));
  }
  function removeBreakTask(id) {
    setBreakTasks((p) => p.filter((tk) => tk.id !== id));
  }

  function addManualSession({ date, startTime, hours, minutes, note }) {
    const total = Math.round((Number(hours) || 0) * 60 + (Number(minutes) || 0));
    if (total <= 0) return;

    const [h2, m2] = (startTime || "09:00").split(":").map(Number);
    const newSession = {
      id: uid(),
      date,
      startMinutes: h2 * 60 + m2,
      minutes: total,
      mode: "manual",
      manual: true,
      note: note || ""
  };

  setSessions((prev) => {
    const next = [...prev, newSession];
    writeCache("sessions", JSON.stringify(next));
    return next;
  });

  persistSession(newSession);
  setShowLogModal(false);
}
  const today = todayKey();
  const totalToday = sessions.filter((s) => s.date === today).reduce((a, s) => a + s.minutes, 0);
  const totalAll = sessions.reduce((a, s) => a + s.minutes, 0);
  const todayFocusedMinutes = totalToday;
  const todayMinutesByTaskId = tasks.reduce((acc, tk) => {
    acc[tk.id] = sessions
      .filter((s) => s.date === today && s.taskId === tk.id)
      .reduce((a, s) => a + s.minutes, 0);
    return acc;
  }, {});

  const durs = customDurations[modeKey];
  const inProgressMinutes = modeKey === "stopwatch" ? Math.round(stopwatchSecs / 60) : phase === "work" ? Math.round((durs.work * 60 - secondsLeft) / 60) : 0;
  const sessionCountToday = sessions.filter((s) => s.date === today).length;

  function computeStreak() {
    let streak = 0;
    let d = new Date();

    while (true) {
      const key = todayKey(d);
      const has = sessions.some((s) => s.date === key);

      if (!has) {
        if (streak === 0 && key === todayKey()) {
          d = addDays(d, -1);
          continue;
        }
        break;
      }

      streak++;
      d = addDays(d, -1);
    }

    return streak;
  }

  const streak = computeStreak();
  const palette = THEMES[themeName] || THEMES.sage;
  const t = dark
    ? { bg: "#1B1E1A", surface: "#22261F", surface2: "#282C24", ink: "#E9E6DD", sub: "#A7A99C", moss: palette.mossD, clay: palette.clayD, line: "#33372E" }
    : { bg: "#EDEAE3", surface: "#F7F5F0", surface2: "#F1EEE6", ink: "#2B2A28", sub: "#7C7A72", moss: palette.moss, clay: palette.clay, line: "#D8D3C8" };

  const durationTotal = modeKey === "stopwatch" ? null : customDurations[modeKey][phase === "work" ? "work" : "rest"] * 60;
  const progress = modeKey === "stopwatch" ? 0 : 1 - secondsLeft / durationTotal;

  const R = 120;
  const CIRC = 2 * Math.PI * R;

  if (!loaded) {
    return (
      <div style={{ minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center", background: t.bg, fontFamily: "system-ui" }}>
        <span style={{ color: t.sub, fontSize: 14 }}>Loading your focus data…</span>
      </div>
    );
  }

  const NAV = [
    { key: "timer", icon: TimerIcon, label: "Timer" },
    { key: "planner", icon: CalendarDays, label: "Planner" },
    { key: "matrix", icon: LineChart, label: "Chart" },
    { key: "progress", icon: BarChart3, label: "Progress" },
    { key: "motivation", icon: Heart, label: "Why" }
  ];

  return (
    <div style={{ fontFamily: "system-ui", display: "flex", justifyContent: "center", padding: "0 4px", height: "100%" }}>
      <style>{`* { box-sizing: border-box; } html, body, #root { margin: 0; height: 100%; overflow: hidden; } .sf-page { height: 100%; } .sf-scroll::-webkit-scrollbar { height: 6px; width: 6px; } .sf-scroll::-webkit-scrollbar-thumb { background: ${t.line}; border-radius: 4px; } input[type="date"], input[type="time"] { color-scheme: ${dark ? "dark" : "light"}; } @media (max-width: 420px) { .sf-navlabel { font-size: 9.5px !important; } .sf-title { font-size: 18px !important; } }`}</style>
      <div
        className="sf-page"
        style={{
          width: "100%",
          maxWidth: 720,
          minWidth: 0,
          background: t.bg,
          color: t.ink,
          fontFamily: "'Iowan Old Style','Palatino Linotype',Georgia,serif",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: dark ? "0 20px 60px rgba(0,0,0,0.5)" : "0 20px 60px rgba(43,42,40,0.12)",
          position: "relative",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 22px 8px",
            flexShrink: 0
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="sf-title" style={{ fontSize: 20, fontWeight: 600, letterSpacing: "0.02em" }}>
              Still
            </span>
            <span style={{ fontSize: 12, color: t.sub, fontFamily: "system-ui", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              focus
            </span>
          </div>

          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={() => setScreen("settings")}
              style={{ background: "none", border: "none", color: screen === "settings" ? t.moss : t.sub, cursor: "pointer", padding: 6, display: "flex" }}
              aria-label="Settings"
            >
              <SettingsIcon size={17} />
            </button>
            <button
              onClick={() => setDark((d) => !d)}
              style={{ background: "none", border: "none", color: t.sub, cursor: "pointer", padding: 6, display: "flex" }}
              aria-label="Toggle theme"
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </div>

        <div
          className="sf-scroll"
          style={{ padding: "6px 22px 22px", fontFamily: "system-ui", flex: 1, minHeight: 0, overflow: "auto" }}
        >
          {/* E. Pass props down */}
          {screen === "timer" && (
            <TimerScreen
              t={t}
              modeKey={modeKey}
              customDurations={customDurations}
              switchMode={switchMode}
              phase={phase}
              running={running}
              secondsLeft={secondsLeft}
              stopwatchSecs={stopwatchSecs}
              startPause={startPause}
              reset={reset}
              stopSession={stopSession}
              R={R}
              CIRC={CIRC}
              progress={progress}
              tasks={tasks}
              newTask={newTask}
              setNewTask={setNewTask}
              addTask={addTask}
              toggleTask={toggleTask}
              removeTask={removeTask}
              activeTaskId={activeTaskId}
              setActiveTaskId={setActiveTaskId}
              setTaskTarget={setTaskTarget}
              todayFocusedMinutes={todayFocusedMinutes}
              todayMinutesByTaskId={todayMinutesByTaskId}
              inProgressMinutes={inProgressMinutes}
              breakTasks={breakTasks}
              newBreakTask={newBreakTask}
              setNewBreakTask={setNewBreakTask}
              addBreakTask={addBreakTask}
              toggleBreakTask={toggleBreakTask}
              removeBreakTask={removeBreakTask}
            />
          )}

          {screen === "planner" && (
            <PlannerScreen
              t={t}
              planner={planner}
              setPlanner={setPlanner}
              eisenhower={eisenhower}
              setEisenhower={setEisenhower}
              dayStartHour={dayStartHour}
              procrastinateTasks={procrastinateTasks}
              setProcrastinateTasks={setProcrastinateTasks}
              breakTasks={breakTasks}
              setBreakTasks={setBreakTasks}
            />
          )}

          {screen === "matrix" && (
            <ChartConsistencyScreen
              t={t}
              sessions={sessions}
              totalAll={totalAll}
              dailyGoalMinutes={dailyGoalMinutes}
              tasks={tasks}
              consistencyTasks={consistencyTasks}
              setConsistencyTasks={setConsistencyTasks}
            />
          )}

          {screen === "progress" && (
            <ProgressScreen
              t={t}
              sessions={sessions}
              setSessions={setSessions}
              tasks={tasks}
              totalToday={totalToday}
              totalAll={totalAll}
              streak={streak}
              sessionCountToday={sessionCountToday}
              dailyGoalMinutes={dailyGoalMinutes}
              setDailyGoalMinutes={setDailyGoalMinutes}
              onLogTime={() => setShowLogModal(true)}
              compareDates={compareDates}
              setCompareDates={setCompareDates}
              sleepSettings={sleepSettings}
            />
          )}

          {screen === "motivation" && (
            <MotivationScreen
              t={t}
              whyText={whyText}
              setWhyText={setWhyText}
              motivationLog={motivationLog}
              setMotivationLog={setMotivationLog}
              challengesLog={challengesLog}
              setChallengesLog={setChallengesLog}
            />
          )}

          {screen === "settings" && (
            <SettingsScreen
              t={t}
              customDurations={customDurations}
              setCustomDurations={setCustomDurations}
              sessions={sessions}
              setSessions={setSessions}
              dailyGoalMinutes={dailyGoalMinutes}
              setDailyGoalMinutes={setDailyGoalMinutes}
              themeName={themeName}
              setThemeName={setThemeName}
              dark={dark}
              sleepSettings={sleepSettings}
              setSleepSettings={setSleepSettings}
              dayStartHour={dayStartHour}
              setDayStartHour={setDayStartHour}
              autoContinue={autoContinue}
              setAutoContinue={setAutoContinue}
              workEndSoundId={workEndSoundId}
              setWorkEndSoundId={setWorkEndSoundId}
              breakEndSoundId={breakEndSoundId}
              setBreakEndSoundId={setBreakEndSoundId}
            />
          )}
        </div>

        <div
          style={{
            display: "flex",
            borderTop: `1px solid ${t.line}`,
            fontFamily: "system-ui",
            flexShrink: 0,
            background: t.bg
          }}
        >
          {NAV.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setScreen(key)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "10px 2px 12px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: screen === key ? t.moss : t.sub,
                minWidth: 0
              }}
            >
              <Icon size={17} strokeWidth={screen === key ? 2.4 : 1.8} />
              <span className="sf-navlabel" style={{ fontSize: 10.5, letterSpacing: "0.01em" }}>
                {label}
              </span>
            </button>
          ))}
        </div>

        {showLogModal && (
          <LogTimeModal
            t={t}
            eisenhower={eisenhower}
            onClose={() => setShowLogModal(false)}
            onSave={addManualSession}
          />
        )}
      </div>
    </div>
  );
}
