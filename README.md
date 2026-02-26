# blitz

> Zero-friction timeboxing — a persistent terminal UI for focused work.

`blitz` is a full-screen TUI (like `lazygit` or `htop`) that lives in your terminal while you work. Open it, start a task, and a countdown timer begins. Accountability metrics stay visible at all times. Your streak, completion rate, and today's progress are always in the header — no need to ask.

```
┌─ blitz ──────────────────────── 🔥 3d · 2/4 today · 85% on-time ─┐
│                                                                    │
│   Thursday, Feb 26                                                │
│   Daily Goal   ████████░░░░  2 / 4 tasks  ·  45m focused         │
│                                                                    │
│   ✓  Write blog post       25m → 32m                             │
│   ✓  Review PRs            20m → 18m                             │
│                                                                    │
│   ── Start new task ─────────────────────────────────────────    │
│   Name: ▌                                                         │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│  [1] Today  [2] Log  [3] Stats                    n new  q quit   │
└────────────────────────────────────────────────────────────────────┘
```

---

## Features

- **Persistent full-screen TUI** — enters alternate screen buffer, restores your terminal on exit
- **Timer with time-boxing** — set a planned duration, get notified when time is up
- **Adaptive suggestions** — duration pre-filled from similar past tasks via fuzzy matching
- **Three views** — Today summary, scrollable 7-day Log, and Stats dashboard
- **Streak tracking** — consecutive days with completed tasks, always visible in the header
- **Completion + accuracy rates** — 7-day completion %, 20-task estimation accuracy
- **Timer survives TUI exit** — quit with `q`, timer keeps running via state file; reopen to reattach
- **Desktop notifications** — system notification when your timer expires

---

## Install

### One-liner (Linux / macOS)

```sh
curl -fsSL https://raw.githubusercontent.com/yash-srivastava19/blitz-cli/main/scripts/install.sh | sh
```

Installs a pre-built binary to `~/.local/bin/blitz`. Ensure that directory is in your `$PATH`:

```sh
export PATH="$HOME/.local/bin:$PATH"   # add to ~/.bashrc or ~/.zshrc
```

### From source (requires [Bun](https://bun.sh))

```sh
git clone https://github.com/yash-srivastava19/blitz-cli
cd blitz-cli
bun install
bun run src/cli.ts
```

---

## Usage

```sh
blitz
```

That's it. The TUI opens full-screen.

---

## Keybindings

| Key | Action |
|-----|--------|
| `1` | Switch to **Today** view |
| `2` | Switch to **Log** view |
| `3` | Switch to **Stats** view |
| `n` | New task (switches to Today, opens name input) |
| `d` | Mark current task **done** (timer active only) |
| `e` | **Extend** timer (enter extra duration, e.g. `10m`) |
| `a` | **Abandon** task with optional reason |
| `j` / `↓` | Scroll down (Log view) |
| `k` / `↑` | Scroll up (Log view) |
| `q` | Quit TUI (active timer keeps running in background) |

---

## Views

### Today (default)

Shows the date, your daily goal progress bar, completed tasks with planned vs. actual time, and a new task form.

While a task is active, the timer expands to full focus mode:

```
  ╭────────────────────────────────────────────────╮
  │  Write blog post                    [12:44]    │
  │  ██████████████░░░░░░░░░░░░░░░░░░░░           │
  │                                                │
  │  d done   e extend   a abandon   q quit        │
  ╰────────────────────────────────────────────────╯

  Today:  ✓ 2 done  ·  45m focused
```

When you mark a task done, you're asked to self-assess your estimate (accurate / needed more time / finished early). This feeds the accuracy rate metric.

### Log (`2`)

Scrollable history of the past 7 days, grouped by date. Each task shows planned vs. actual duration and a reflection arrow (`↑` underestimated, `↓` overestimated, `~` accurate).

```
  Task History — Last 7 days              j k / ↑↓ to scroll

  Thu Feb 26 ──────────────────── 2 done · 50m
    ✓  Write blog post     25m → 32m  ↑
    ✓  Review PRs          20m → 18m  ↓
```

### Stats (`3`)

Accountability dashboard:

```
  Accountability Dashboard

  Streak       🔥 5 days
  Today        ████████░░░░   2 / 4 tasks

  ── Last 7 days ─────────────────
    Mon Feb 24  ●●●        35m
    Tue Feb 25  ●●●●●     2h 10m

  Completion   ████████████  85% (7d)
  Accuracy     ██████░░░░░░  60% (last 20)
```

---

## Data

All data is stored locally — nothing leaves your machine.

| Path | Contents |
|------|----------|
| `~/.local/share/blitz/tasks.db` | SQLite database (all task history) |
| `~/.local/share/blitz/state.json` | Active timer state (cleared on task completion) |

---

## Development

```sh
bun install

# Run directly
bun run dev

# Type check
bun run typecheck

# Tests (28 unit tests)
bun run test
```

### Project structure

```
src/
├── cli.ts                  # Entry point — alternate screen + render App
├── ui/
│   ├── App.tsx             # Root TUI: header, view routing, global keys
│   └── views/
│       ├── HomeView.tsx    # Today summary + timer state machine
│       ├── LogView.tsx     # Scrollable task history
│       └── StatsView.tsx   # Accountability dashboard
├── db/
│   ├── index.ts            # SQLite connection (supports BLITZ_TEST_DB override)
│   ├── schema.ts           # CREATE TABLE statements
│   └── tasks.ts            # insertTask, completeTask, abandonTask, analytics
├── state/
│   └── index.ts            # readState / writeState / clearState (state.json)
└── utils/
    ├── time.ts             # parseDuration / formatDuration / formatDurationHuman
    ├── suggest.ts          # Fuzzy duration suggestions from history
    ├── notify.ts           # Desktop notifications
    └── paths.ts            # Data directory paths
```

### Running tests

Tests use an in-memory SQLite database (`BLITZ_TEST_DB=:memory:`) so they're fast and isolated:

```sh
bun run test
```

CI runs type-checking and tests on every push and pull request.

---

## License

MIT
