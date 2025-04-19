// pages/index.js (or app/page.jsx)
"use client";
import { useEffect, useState } from "react";
import {
  addDays,
  format,
  isValid,
  parseISO,
  startOfWeek,
} from "date-fns";

const LS_KEY = "qanova_weeklySessions";
const LS_KEY_NAME = "qanova_userName";

export default function TimesheetPage() {
  const [weeklySessions, setWeeklySessions] = useState({});
  const [weeksList, setWeeksList] = useState([]);
  const [weekStart, setWeekStart] = useState("");
  const defaultRow = Array(5).fill().map(() => [{ start: "", end: "" }]);
  const sessions = weeklySessions[weekStart] || defaultRow;
  const [log, setLog] = useState("");
  const [name, setName] = useState("");
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  // Helpers
  const formatISO = (date) => format(date, "yyyy-MM-dd");
  const getMonday = (refDate) => {
    const d = refDate ? new Date(refDate) : new Date();
    const mon = startOfWeek(d, { weekStartsOn: 1 });
    mon.setHours(0, 0, 0, 0);
    return mon;
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!e.ctrlKey) return;

      // find current position
      const idx = weeksList.indexOf(weekStart);
      if (e.key === "ArrowRight") {
        // next week is the one *older* in your sorted array
        const next = weeksList[idx + 1];
        if (next) setWeekStart(next);
      }
      if (e.key === "ArrowLeft") {
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
    const getHours = ({ start, end }) => {
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
        d.reduce((sum, sess) => sum + getHours(sess), 0)
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
        (h, i) => h > 0 && lines.push(`\t[${dayNames[i].padEnd(12)} ${fmt(h)}]`)
    );
    lines.push("", `Total: ${fmt(total)}`, "", "Kind Regards", "", name || "");
    setLog(lines.join("\n"));
  }, [weekStart, sessions, name]);

  // 2) Initialize from localStorage
  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY);
    const stored = raw ? JSON.parse(raw) : {};
    if (Object.keys(stored).length === 0) {
      const iso = formatISO(getMonday());
      stored[iso] = defaultRow;
    }
    setWeeklySessions(stored);
    setName(localStorage.getItem(LS_KEY_NAME) || "");
  }, []);

  // 3) Keep weeksList & weekStart in sync when weeklySessions changes
  useEffect(() => {
    const keys = Object.keys(weeklySessions).sort((a, b) =>
        b.localeCompare(a)
    );
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

  // Ensure the picked week is also added to weeklySessions
  const handleWeekChange = (e) => {
    let iso = e.target.value;
    const parsed = parseISO(iso);
    const monday =
        parsed.getDay() === 1 ? parsed : getMonday(parsed);
    iso = formatISO(monday);

    // Merge in an empty week if not already present
    setWeeklySessions((prev) =>
        prev[iso] ? prev : { [iso]: defaultRow, ...prev }
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
    setWeeklySessions((prev) => ({ [iso]: defaultRow, ...prev }));
    setWeekStart(iso);
  };

  const handleDeleteWeek = (iso) => {
    if (
        weeklySessions[iso].some((day) =>
            day.some((sess) => sess.start || sess.end)
        )
    ) {
      if (!window.confirm("Delete this week? You worked some hours here.")) {
        return;
      }
    }
    setWeeklySessions((prev) => {
      const copy = { ...prev };
      delete copy[iso];
      return copy;
    });
  };

  function updateSession(di, si, field, val) {
    setWeeklySessions((prev) => {
      const week = prev[weekStart] || defaultRow;
      const newWeek = week.map((day, i) =>
          i === di
              ? day.map((sess, j) =>
                  j === si ? { ...sess, [field]: val } : sess
              )
              : day
      );
      return { ...prev, [weekStart]: newWeek };
    });
  }
  function addSession(di) {
    setWeeklySessions((prev) => {
      const week = prev[weekStart] || defaultRow;
      const newWeek = week.map((day, i) =>
          i === di ? [...day, { start: "", end: "" }] : day
      );
      return { ...prev, [weekStart]: newWeek };
    });
  }

  function removeSession(di, si) {
    setWeeklySessions((prev) => {
      const week = prev[weekStart] || defaultRow;
      const newWeek = week.map((day, i) =>
          i === di ? day.filter((_, j) => j !== si) : day
      );
      return { ...prev, [weekStart]: newWeek };
    });
  }

  // Calculations
  const getHours = ({ start, end }) => {
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
    lines.push(
        "",
        `Total: ${fmt(total)}`,
        "",
        "Kind Regards",
        "",
        name || "",
    );
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
      const times = Array.from(
          document.querySelectorAll('input[type="time"]')
      );
      const idx = times.indexOf(e.target);
      if (idx >= 0 && idx < times.length - 1) {
        times[idx + 1].focus();
      }
      e.preventDefault();
    }
  };

  const handleEnter = (e) => {
    if (e.key !== "Enter") return;
    const times = Array.from(
        document.querySelectorAll('input[type="time"]')
    );
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

  return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen flex flex-col md:flex-row">
        <aside className="w-full md:w-64 mb-4 md:mb-0 md:mr-6 transition-all duration-200">
          <button
              onClick={handleNewWeek}
              className="mb-4 w-full py-2 bg-blue-600 text-white rounded-lg transition-colors duration-200 hover:bg-blue-700 cursor-pointer"
          >
            Next Week
          </button>

          <h2 className="text-lg font-semibold mb-2">Months</h2>

          <ul className="space-y-4 max-h-64 overflow-y-auto">
            {/** 1) Build a month→weeks map */}
            {(() => {
              // group weekStart keys by month label
              const monthMap = {};
              weeksList.forEach(iso => {
                const dt = parseISO(iso);
                const monthLabel = format(dt, 'LLLL yyyy'); // e.g. "April 2025"
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
                      <div className="px-2 py-1 bg-gray-100 rounded-md flex justify-between items-center">
              <span className="font-medium">
                {monthLabel}
              </span>
                        <span className="text-sm text-gray-600">
                {Math.round(monthHours * 100) / 100} h&nbsp;–&nbsp;CHF {monthPay}
              </span>
                      </div>
                      <ul className="pl-4 mt-2 space-y-1">
                        {isoArray.map(iso => (
                            <li
                                key={iso}
                                className="flex justify-between items-center transition-colors duration-200 hover:bg-gray-100 rounded"
                            >
                              <button
                                  onClick={() => setWeekStart(iso)}
                                  className={`
                      ${iso === weekStart ? 'font-bold text-blue-700' : 'text-gray-700'}
                      transition-colors duration-200 hover:text-blue-600
                    `}
                              >
                                {format(parseISO(iso), 'dd LLL')}
                              </button>
                              <button
                                  onClick={() => handleDeleteWeek(iso)}
                                  className="
                      flex items-center justify-center self-center
                      w-5 h-5 leading-none
                      rounded-full
                      text-red-600
                      transition duration-200
                      hover:bg-red-600 hover:text-white
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
          <h1 className="text-2xl font-bold mb-4 transition-colors duration-200">
            Timesheet
          </h1>
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:gap-4">
            <label className="mb-2 sm:mb-0 transition-colors duration-200">
              Select a week: (the Monday of the week will be used)
            </label>
            <input
                type="date"
                value={weekStart}
                onChange={handleWeekChange}
                className="border rounded p-2 w-full sm:w-auto transition-colors duration-200 focus:ring focus:ring-blue-200"
            />
          </div>
          {weekStart && (
              <div className="overflow-x-auto mb-6">
                <table className="min-w-full table-auto border-collapse border border-gray-300 transition-all duration-200">
                  <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 border-b border-gray-300 text-left text-sm font-medium text-gray-700 uppercase transition-colors duration-200">
                      Day
                    </th>
                    <th className="px-4 py-2 border-b border-gray-300 text-left text-sm font-medium text-gray-700 uppercase transition-colors duration-200">
                      Date
                    </th>
                    <th className="px-4 py-2 border-b border-gray-300 text-left text-sm font-medium text-gray-700 uppercase transition-colors duration-200">
                      Sessions
                    </th>
                    <th className="px-4 py-2 border-b border-gray-300 text-left text-sm font-medium text-gray-700 uppercase transition-colors duration-200">
                      Total
                    </th>
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
                            className="odd:bg-white even:bg-gray-50 transition-colors duration-200 hover:bg-gray-100"
                        >
                          <td className="px-4 py-2 border-b border-gray-200 align-top w-24 text-sm transition-colors duration-200">
                            {d}
                          </td>
                          <td className="px-4 py-2 border-b border-gray-200 align-top w-24 text-sm transition-colors duration-200">
                            {date}
                          </td>
                          <td className="px-4 py-2 border-b border-gray-200 transition-colors duration-200">
                            {(sessions[i] || []).map((sess, j) => (
                                <div
                                    key={j}
                                    className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1"
                                >
                                  <input
                                      type="time"
                                      value={sess.start || ""}
                                      onChange={(e) =>
                                          updateSession(i, j, "start", e.target.value)
                                      }
                                      onKeyDown={(e) => handleKeyDown(e, i, j, "start")}
                                      className="border rounded p-1 w-full sm:w-24 transition-colors duration-200 focus:ring focus:ring-blue-200"
                                  />
                                  —
                                  <input
                                      type="time"
                                      value={sess.end || ""}
                                      onChange={(e) =>
                                          updateSession(i, j, "end", e.target.value)
                                      }
                                        onKeyDown={(e) => handleKeyDown(e, i, j, "end")}
                                      className="border rounded p-1 w-full sm:w-24 transition-colors duration-200 focus:ring focus:ring-blue-200"
                                  />
                                  <button
                                      onClick={() => removeSession(i, j)}
                                      className="flex items-center justify-center
                                w-3 h-3 leading-none
                                rounded-full
                                text-red-600
                                transition duration-200
                                hover:bg-red-600 hover:text-white cursor-pointer
                              "
                                  >
                                    ×
                                  </button>
                                </div>
                            ))}
                            <button
                                onClick={() => addSession(i)}
                                className="text-blue-600 text-sm hover:text-blue-800 transition-colors duration-200 hover:underline cursor-pointer"
                            >
                              + Session
                            </button>
                          </td>
                          <td className="px-4 py-2 border-b border-gray-200 align-top font-semibold w-24 text-sm transition-colors duration-200">
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
                <div className="flex gap-4 flex-row items-center mb-2">
                  <label className="font-semibold transition-colors duration-200">
                    Generated Log:
                  </label>
                  <input
                      type="text"
                      placeholder="Your Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="border rounded-lg p-2 w-48 transition-colors duration-200 focus:ring focus:ring-blue-200"
                  />
                  <button
                      onClick={() => {
                        navigator.clipboard.writeText(log);
                        const button = document.getElementById("copyButton");
                        button.textContent = "Copied!";
                        setTimeout(() => {
                          button.textContent = "Copy to Clipboard";
                        }, 2000);
                      }}
                      id="copyButton"
                      className="py-2 px-4 bg-indigo-600 text-white rounded-lg transition-colors duration-200 hover:bg-indigo-700 cursor-pointer"
                  >
                    Copy to Clipboard
                  </button>
                </div>
                <textarea
                    readOnly
                    value={log}
                    className="w-full h-64 border rounded p-2 font-mono mt-2 transition-colors duration-200 focus:ring focus:ring-blue-200"
                />
              </div>
          )}
        </main>
      </div>
  );
}
