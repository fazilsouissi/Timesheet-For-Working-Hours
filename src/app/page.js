// pages/index.js (or app/page.jsx)
"use client";
import {useEffect, useRef, useState} from "react";
import {addDays, format, isValid, parseISO, startOfWeek} from "date-fns";
import {signIn, signOut, useSession} from "next-auth/react";
import {useRouter} from "next/navigation";

const LS_KEY = "qanova_weeklySessions";
const LS_KEY_NAME = "qanova_userName";

export default function TimesheetPage() {
  // 1) Auth hook
  const {data: session, status} = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    },
  });

  // Helpers
  const formatISO = (date) => format(date, "yyyy-MM-dd");
  const getMonday = (refDate) => {
    const d = refDate ? new Date(refDate) : new Date();
    const mon = startOfWeek(d, {weekStartsOn: 1});
    mon.setHours(0, 0, 0, 0);
    return mon;
  };

  const router = useRouter();
  const isFirstSave = useRef(true);


  // whenever we discover we're NOT signed in, send to register
  // useEffect(() => {
  //     if (status === "unauthenticated") {
  //         router.push("/auth/register");
  //       }
  //   }, [status, router]);

  // 2) All your state hooks
  // const [weeklySessions, setWeeklySessions] = useState({}); // HERE CHANGE THIS
  const [weeklySessions, setWeeklySessions] = useState(null);
  const [weeksList, setWeeksList] = useState([]);
  const [weekStart, setWeekStart] = useState("");
  const defaultRow = Array(5)
      .fill()
      .map(() => [{start: "", end: ""}]);
  const sessions = weeklySessions ? weeklySessions[weekStart] : defaultRow;
  const [log, setLog] = useState("");
  const [name, setName] = useState("");
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const [menuOpen, setMenuOpen] = useState(false);

// derive initials:
  const initials = name
      .split(" ")
      .map(n => n[0]?.toUpperCase())
      .join("")
      .slice(0, 2);


  // 3) Effects for fetching & persisting
  // useEffect(() => {
  //   if (status !== "authenticated") return;
  //   fetch("/api/sessions")
  //       .then(r => r.json())
  //       .then(({ weeklySessions }) => {
  //         if (Object.keys(weeklySessions).length) {
  //           setWeeklySessions(weeklySessions);
  //         }
  //       });
  //   setName(session.user.name || "");
  // }, [status, session]);


  // 2) Fetch on mount (once authenticated)
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/sessions")
        .then((r) => r.json())
        .then(({weeklySessions}) => {
          // if the DB was empty, fall back to your defaultRow logic here
          setWeeklySessions(
              Object.keys(weeklySessions).length
                  ? weeklySessions
                  : {[formatISO(getMonday())]: defaultRow}
          );
        });
    setName(session.user.name || "");
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated" || weeklySessions === null) return;
    if (isFirstSave.current) {
      isFirstSave.current = false;
      return;
    }
    fetch("/api/sessions", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({weeklySessions}),
    });
  }, [weeklySessions, status]);

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const theme = saved === 'dark' ? 'dark' : saved === 'light' ? 'light' : (systemIsDark ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [])

  // Navigation logic between weeks (using Ctrl+Arrow left/right)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!e.ctrlKey) return;

      // find current position
      const idx = weeksList.indexOf(weekStart);
      if (e.key === "ArrowDown") {
        // next week is the one *older* in your sorted array
        const next = weeksList[idx + 1];
        if (next) setWeekStart(next);
      }
      if (e.key === "ArrowUp") {
        const prev = weeksList[idx - 1];
        if (prev) setWeekStart(prev);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [weeksList, weekStart]);

  // 1) Build the generated log only when weekStart is valid
  useEffect(() => {
    if (!weekStart) {
      setLog("");
      return;
    }
    const ws = parseISO(weekStart);
    if (!isValid(ws)) {
      setLog("");
      return;
    }
    const fr = addDays(ws, 4);
    const getHours = ({start, end}) => {
      if (!start || !end) return 0;
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);
      const diff = eh * 60 + em - (sh * 60 + sm);
      return diff > 0 ? diff / 60 : 0;
    };
    const fmt = (dec) => {
      const sec = Math.round(dec * 3600);
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      return `${h}h ${String(m).padStart(2, "0")}m 00s`;
    };
    const daily = sessions.map((d) =>
        d.reduce((sum, sess) => sum + getHours(sess), 0),
    );
    const total = daily.reduce((a, b) => a + b, 0);

    const lines = [
      "Hi Rita, Simone,",
      "",
      `Here are my hours for the week ending the ${format(fr, "do MMMM")}`,
      "",
      `${format(ws, "EEE dd MMMM yyyy")} -> ${format(fr, "EEE dd MMMM yyyy")}`,
      "",
      `QanovaTech - ${fmt(total)}`,
    ];
    daily.forEach(
        (h, i) => h > 0 && lines.push(`\t[${dayNames[i].padEnd(12)} ${fmt(h)}]`),
    );
    lines.push("", `Total: ${fmt(total)}`, "", "Kind Regards", "", name || "");
    setLog(lines.join("\n"));
  }, [weekStart, sessions, name]);

  // 2) Initialize from localStorage the first time
  // useEffect(() => {
  //   const raw = localStorage.getItem(LS_KEY);
  //   const stored = raw ? JSON.parse(raw) : {};
  //   if (Object.keys(stored).length === 0) {
  //     const iso = formatISO(getMonday());
  //     stored[iso] = defaultRow;
  //   }
  //   setWeeklySessions(stored);
  //   setName(localStorage.getItem(LS_KEY_NAME) || "");
  // }, []);

  // 3) When weeklySessions changes keep weeksList & weekStart in sync
  useEffect(() => {
    if (!weeklySessions) return
    const keys = Object.keys(weeklySessions).sort((a, b) => b.localeCompare(a));
    setWeeksList(keys);
    // if current weekStart was removed or not set, pick the newest
    if (!keys.includes(weekStart)) {
      setWeekStart(keys[0] || formatISO(getMonday()));
    }
  }, [weeklySessions]);

  // 4) Persist changes
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(weeklySessions));
  }, [weeklySessions]);
  useEffect(() => {
    localStorage.setItem(LS_KEY_NAME, name);
  }, [name]);

  // 5) Handlers
  // Ensure the picked week is also added to weeklySessions (logic when I pick a week from the picker)
  const handleWeekChange = (e) => {
    let iso = e.target.value;
    const parsed = parseISO(iso);
    const monday = parsed.getDay() === 1 ? parsed : getMonday(parsed);
    iso = formatISO(monday);

    // Merge in an empty week if not already present
    setWeeklySessions((prev) =>
        prev[iso] ? prev : {[iso]: defaultRow, ...prev},
    );
    setWeekStart(iso);
  };

  const handleNewWeek = () => {
    const baseISO = weeksList[0] || formatISO(getMonday());
    const nextMon = addDays(parseISO(baseISO), 7);
    const iso = formatISO(nextMon);
    if (weeklySessions[iso]) {
      setWeekStart(iso);
      return;
    }
    setWeeklySessions((prev) => ({[iso]: defaultRow, ...prev}));
    setWeekStart(iso);
  };

  const handleDeleteWeek = (iso) => {
    if (
        weeklySessions[iso].some((day) =>
            day.some((sess) => sess.start || sess.end),
        )
    ) {
      if (!window.confirm("Delete this week? You worked some hours here.")) {
        return;
      }
    }
    setWeeklySessions((prev) => {
      const copy = {...prev};
      delete copy[iso];
      return copy;
    });
  };

  function updateSession(di, si, field, val) {
    setWeeklySessions((prev) => {
      const week = prev[weekStart] || defaultRow;
      const newWeek = week.map((day, i) =>
          i === di
              ? day.map((sess, j) => (j === si ? {...sess, [field]: val} : sess))
              : day,
      );
      return {...prev, [weekStart]: newWeek};
    });
  }

  function addSession(di) {
    setWeeklySessions((prev) => {
      const week = prev[weekStart] || defaultRow;
      const newWeek = week.map((day, i) =>
          i === di ? [...day, {start: "", end: ""}] : day,
      );
      return {...prev, [weekStart]: newWeek};
    });
  }

  function removeSession(di, si) {
    setWeeklySessions((prev) => {
      const week = prev[weekStart] || defaultRow;
      const newWeek = week.map((day, i) =>
          i === di ? day.filter((_, j) => j !== si) : day,
      );
      return {...prev, [weekStart]: newWeek};
    });
  }

  // Calculations
  const getHours = ({start, end}) => {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    if ([sh, sm, eh, em].some((n) => isNaN(n))) return 0;
    const diff = eh * 60 + em - (sh * 60 + sm);
    return diff > 0 ? diff / 60 : 0;
  };
  const fmt = (dec) => {
    const sec = Math.round(dec * 3600);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${String(m).padStart(2, "0")}m 00s`;
  };

  // Build log
  useEffect(() => {
    if (!weekStart) {
      setLog("");
      return;
    }
    const ws = parseISO(weekStart);
    const fr = addDays(ws, 4);
    const daily = sessions.map((d) =>
        d.reduce((sum, sess) => sum + getHours(sess), 0),
    );
    const total = daily.reduce((a, b) => a + b, 0);
    const lines = [
      "Hi Rita, Simone,",
      "",
      `Here are my hours for the week ending the ${format(fr, "do MMMM")}`,
      "",
      `${format(ws, "EEE dd MMMM yyyy")} -> ${format(fr, "EEE dd MMMM yyyy")}`,
      "",
      `QanovaTech - ${fmt(total)}`,
    ];
    daily.forEach(
        (h, i) => h > 0 && lines.push(`\t[${dayNames[i].padEnd(12)} ${fmt(h)}]`),
    );
    lines.push("", `Total: ${fmt(total)}`, "", "Kind Regards", "", name || "");
    setLog(lines.join("\n"));
  }, [weekStart, sessions, name]);

  // Enter navigation
  const handleKeyDown = (e, di, si, field) => {
    // 1) Ctrl+Enter = add a new session on day `di`
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      addSession(di);
      return;
    }

    // 2) Plain Enter = normalize "--" → "00", then move focus
    if (e.key === "Enter" && !e.ctrlKey) {
      // now move focus to the next time input
      const times = Array.from(document.querySelectorAll('input[type="time"]'));
      const idx = times.indexOf(e.target);
      if (idx >= 0 && idx < times.length - 1) {
        times[idx + 1].focus();
      }
      e.preventDefault();
    }
  };

  const handleEnter = (e) => {
    if (e.key !== "Enter") return;
    const times = Array.from(document.querySelectorAll('input[type="time"]'));
    const idx = times.indexOf(e.target);
    if (idx >= 0 && idx < times.length - 1) {
      times[idx + 1].focus();
      e.preventDefault();
    }
  };

  if (!weekStart) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
        </div>
    );
  }
  // 4) Now you can safely early‐return while hooks have all been called
  if (status === "loading" || weeklySessions === null) {
    return <p>Loading your timesheet…</p>;
  }

  return (
      <div
          className="p-4 md:p-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen flex flex-col md:flex-row">

        <aside className="w-full md:w-64 mb-4 md:mb-0 md:mr-6 transition-all duration-200">
        <header className="w-full flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Welcome, {name}</h2>
          <div className="relative">
            <button
                onClick={() => setMenuOpen(o => !o)}
                className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center uppercase font-medium transition duration-200 cursor-pointer"
            >
              {initials}
            </button>
            {menuOpen && (
                <ul className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border rounded shadow-lg">
                  <li>
                    <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-200 cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </li>
                </ul>
            )}
          </div>
        </header>
          <button
              onClick={handleNewWeek}
              className="mb-4 w-full py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg transition-colors duration-200 hover:bg-blue-700 dark:hover:bg-blue-600 cursor-pointer"
          >
            Next Week
          </button>

          <h2 className="text-lg font-semibold mb-2">Months</h2>

          <ul className="space-y-4 max-h-64 overflow-y-auto">
            {/** 1) Build a month→weeks map */}
            {(() => {
              // group weekStart keys by month label
              const monthMap = {};
              weeksList.forEach((iso) => {
                const dt = parseISO(iso);
                const monthLabel = format(dt, "LLLL yyyy"); // e.g. "April 2025"
                if (!monthMap[monthLabel]) monthMap[monthLabel] = [];
                monthMap[monthLabel].push(iso);
              });

              return Object.entries(monthMap).map(([monthLabel, isoArray]) => {
                // compute total hours for this month
                const monthHours = isoArray.reduce((sumW, iso) => {
                  const weekSess = weeklySessions[iso] || [];
                  const weekTotal = weekSess
                      .flat()
                      .reduce((sumS, sess) => sumS + getHours(sess), 0);
                  return sumW + weekTotal;
                }, 0);

                let hourlyRate = 22.5; // CHF
                const monthPay = (monthHours * hourlyRate).toFixed(2);

                return (
                    <li key={monthLabel}>
                      <div
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md flex justify-between items-center">
                        <span className="font-medium">{monthLabel}</span>
                        <span className="text-base text-gray-600 dark:text-gray-400">
                      {Math.round(monthHours * 100) / 100} h&nbsp;–&nbsp;CHF{" "}
                          {monthPay}
                    </span>
                      </div>
                      <ul className="pl-4 mt-2 space-y-1">
                        {isoArray.map((iso) => (
                            <li
                                key={iso}
                                className="flex justify-between items-center transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                              <button
                                  onClick={() => setWeekStart(iso)}
                                  className={`
                      ${
                                      iso === weekStart
                                          ? "font-bold text-blue-700 dark:text-blue-300"
                                          : "text-gray-700 dark:text-gray-200"
                                  }
                      transition-colors duration-200 hover:text-blue-600 dark:hover:text-blue-400
                    `}
                              >
                                {format(parseISO(iso), "dd LLL")}
                              </button>
                              <button
                                  onClick={() => handleDeleteWeek(iso)}
                                  className="
                      flex items-center justify-center self-center
                      w-5 h-5 leading-none
                      rounded-full
                      text-red-600 dark:text-red-400
                      transition duration-200
                      hover:bg-red-600 dark:hover:bg-red-500 hover:text-white
                      cursor-pointer
                    "
                              >
                                ×
                              </button>
                            </li>
                        ))}
                      </ul>
                    </li>
                );
              });
            })()}
          </ul>
        </aside>

        <main className="flex-1 transition-all duration-200">
          <h1 className="text-2xl font-bold mb-4">Timesheet</h1>
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:gap-4">
            <label className="mb-2 sm:mb-0">
              Select a week: (the Monday of the week will be used)
            </label>
            <input
                type="date"
                value={weekStart}
                onChange={handleWeekChange}
                className="
    border border-gray-300 dark:border-gray-600
    bg-white dark:bg-gray-700
    text-gray-900 dark:text-gray-100
    rounded p-2 w-full sm:w-auto
    transition-colors duration-200
    focus:ring focus:ring-blue-200 dark:focus:ring-blue-800

    dark:[&::-webkit-calendar-picker-indicator]:invert
    dark:[&::-webkit-calendar-picker-indicator]:brightness-200
  "
            />
          </div>
          {weekStart && (
              <div className="overflow-x-auto mb-6">
                <table className="min-w-full table-auto border-collapse border border-gray-300 dark:border-gray-600">
                  <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    {["Day", "Date", "Sessions", "Total"].map((th) => (
                        <th
                            key={th}
                            className="px-4 py-2 border-b border-gray-300 dark:border-gray-700 text-left text-base font-medium text-gray-700 dark:text-gray-300 uppercase"
                        >
                          {th}
                        </th>
                    ))}
                  </tr>
                  </thead>
                  <tbody>
                  {dayNames.map((d, i) => {
                    const date = format(
                        addDays(parseISO(weekStart), i),
                        "dd/MM/yyyy",
                    );
                    const total =
                        sessions[i]?.reduce((s, sess) => s + getHours(sess), 0) ||
                        0;
                    return (
                        <tr
                            key={d}
                            className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800 dark:even:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 w-24 text-base">
                            {d}
                          </td>
                          <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 w-24 text-base">
                            {date}
                          </td>
                          <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                            {(sessions[i] || []).map((sess, j) => (
                                <div
                                    key={j}
                                    className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1 items-center"
                                >
                                  <input
                                      type="time"
                                      value={sess.start || ""}
                                      onChange={(e) =>
                                          updateSession(i, j, "start", e.target.value)
                                      }
                                      onKeyDown={(e) => handleKeyDown(e, i, j, "start")}
                                      className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded p-1 w-full sm:w-24 focus:ring focus:ring-blue-200 dark:focus:ring-blue-800"
                                  />
                                  <span className="hidden sm:inline">—</span>
                                  <input
                                      type="time"
                                      value={sess.end || ""}
                                      onChange={(e) =>
                                          updateSession(i, j, "end", e.target.value)
                                      }
                                      onKeyDown={(e) => handleKeyDown(e, i, j, "end")}
                                      className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded p-1 w-full sm:w-24 focus:ring focus:ring-blue-200 dark:focus:ring-blue-800"
                                  />
                                  <button
                                      onClick={() => removeSession(i, j)}
                                      className="sm:text-lg leading-none flex items-center justify-center w-3 h-3 rounded-full text-red-600 dark:text-red-400 hover:bg-red-600 dark:hover:bg-red-500 hover:text-white cursor-pointer"
                                  >
                                    ×
                                  </button>
                                </div>
                            ))}
                            <button
                                onClick={() => addSession(i)}
                                className="text-blue-600 dark:text-blue-400 text-base hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200 hover:underline cursor-pointer"
                            >
                              + Session
                            </button>
                          </td>
                          <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 font-semibold w-24 text-base">
                            {fmt(total)}
                          </td>
                        </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
          )}

          {log && (
              <div>
                <div className="flex gap-4 items-center mb-2">
                  <label className="font-semibold">Generated Email:</label>
                  <input
                      type="text"
                      placeholder="Your Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 w-48 focus:ring focus:ring-blue-200 dark:focus:ring-blue-800"
                  />
                  <button
                      onClick={() => {
                        navigator.clipboard.writeText(log);
                        const btn = document.getElementById("copyButton");
                        btn.textContent = "Copied!";
                        setTimeout(
                            () => (btn.textContent = "Copy to Clipboard"),
                            2000,
                        );
                      }}
                      id="copyButton"
                      className="py-2 px-4 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg transition-colors duration-200 hover:bg-indigo-700 dark:hover:bg-indigo-600 cursor-pointer"
                  >
                    Copy to Clipboard
                  </button>
                </div>
                <textarea
                    readOnly
                    value={log}
                    className="w-full h-64 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded p-2 font-mono focus:ring focus:ring-blue-200 dark:focus:ring-blue-800"
                />
              </div>
          )}
        </main>
      </div>
  );
}
