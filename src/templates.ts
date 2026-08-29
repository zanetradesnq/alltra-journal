/**
 * Ready-to-use journal templates. Each is plain editor HTML (headings, lists,
 * callouts, quotes, dividers) inserted into the entry when applied. These are
 * starter content — names/structure can be refined later.
 */
export interface JournalTemplate {
  id: string;
  name: string;
  description: string;
  accent: string; // card tint
  html: string;
}

/**
 * The two Notion-style "content table" grids. Exported on their own so the
 * command center (the "/" menu) can drop the bare grid at the cursor, while the
 * template gallery wraps the same grid in a heading + description.
 *
 * Horizontal — column headers across the top, one record per row.
 * Vertical    — field labels down the left column, content on the right.
 * Both start with sample values in the first record and empty cells to fill.
 */
export const HORIZONTAL_TABLE_HTML =
  `<table><tbody>` +
  `<tr><th><p>Trade</p></th><th><p>Day</p></th><th><p>Model</p></th><th><p>L/S</p></th><th><p>W/L</p></th></tr>` +
  `<tr><td><p>Test</p></td><td><p>Monday</p></td><td><p>BNQ</p></td><td><p>Long</p></td><td><p>Win</p></td></tr>` +
  `<tr><td><p></p></td><td><p></p></td><td><p></p></td><td><p></p></td><td><p></p></td></tr>` +
  `<tr><td><p></p></td><td><p></p></td><td><p></p></td><td><p></p></td><td><p></p></td></tr>` +
  `<tr><td><p></p></td><td><p></p></td><td><p></p></td><td><p></p></td><td><p></p></td></tr>` +
  `</tbody></table>`;

export const VERTICAL_TABLE_HTML =
  `<table><tbody>` +
  `<tr><th><p>Trade</p></th><td><p>Test</p></td></tr>` +
  `<tr><th><p>Day</p></th><td><p>Monday</p></td></tr>` +
  `<tr><th><p>Model</p></th><td><p>BNQ</p></td></tr>` +
  `<tr><th><p>L/S</p></th><td><p>Long</p></td></tr>` +
  `<tr><th><p>W/L</p></th><td><p>Win</p></td></tr>` +
  `</tbody></table>`;

export const TEMPLATES: JournalTemplate[] = [
  {
    id: "horizontal-content-table",
    name: "Horizontal content table",
    description: "Notion-style grid — columns across",
    accent: "#0066ff",
    html:
      `<h3>Content table</h3>` +
      `<p>Log entries side by side. Rename the column headers, then fill one row per record.</p>` +
      HORIZONTAL_TABLE_HTML,
  },
  {
    id: "vertical-content-table",
    name: "Vertical content table",
    description: "Label–value list — fields down the left",
    accent: "#8b51e0",
    html:
      `<h3>Content table</h3>` +
      `<p>A tidy label–value sheet. Name each field on the left, add its content on the right.</p>` +
      VERTICAL_TABLE_HTML,
  },
  {
    id: "tomorrow-prep",
    name: "Tommorw prep",
    description: "Pre-session trading checklist",
    accent: "#8b51e0",
    html: `<h3><span data-type="icon" class="jicon" data-icon="target" data-color="purple"></span> Tommorw Preperation</h3><p>Tomorrow's preparation is about trading with clarity, not reaction. Spend focused time before the session to align market context, define risk limits, and choose a single objective. A clean checklist removes guesswork, reduces emotional trading, and makes execution the priority — so you trade the plan, not the noise.</p><hr><div data-type="callout" data-color="violet" data-fg="#6f5d96"><p><strong>Pre-market Checklist</strong></p><hr><ul data-type="taskList" data-variant="checklist"><li data-type="taskItem" data-checked="false"><p>Economic calendar:</p></li><li data-type="taskItem" data-checked="false"><p>Overnight price action / gaps:</p></li><li data-type="taskItem" data-checked="false"><p><span data-type="icon" class="jicon" data-icon="star" data-color="orange"></span> Check correlated markets (futures, FX, bonds):</p></li><li data-type="taskItem" data-checked="false"><p>News headlines to monitor:</p></li></ul></div><h3>Risk &amp; Money Management</h3><hr><ul data-type="taskList" data-variant="checklist"><li data-type="taskItem" data-checked="false"><p>Daily max risk (dollars/%):</p></li><li data-type="taskItem" data-checked="false"><p>Max risk per trade (dollars/%):</p></li><li data-type="taskItem" data-checked="false"><p>Max consecutive loss rule (stops trading after):</p></li><li data-type="taskItem" data-checked="false"><p>Position sizing rule:</p></li></ul><hr><p><span data-type="tag" class="jtag" data-color="green">Rules</span> <span data-type="tag" class="jtag" data-color="blue">Plans</span> <span data-type="tag" class="jtag" data-color="purple">Prep</span></p>`,
  },
  {
    id: "daily-reflection",
    name: "Daily Reflection",
    description: "Trading day reflection",
    accent: "#0066ff",
    html: `<h3>Daily Reflection</h3><p><span data-type="tag" class="jtag" data-color="purple">Tag</span> <span data-type="tag" class="jtag" data-color="orange">Tag</span> <span data-type="tag" class="jtag" data-color="blue">Tag</span></p><p><strong>6/24/2026 11:35 pm</strong></p><hr><div data-type="callout" data-bg="rgba(140,140,140,0.13)"><p><strong>Introduction</strong></p><p>A quiet market rolled into the morning, price action leaving faint traces on my charts as liquidity slowly returned. The pre-open felt clean and clear, like the air after rain, and the subtle background noise of orders and volume rose like an orchestra tuning for the session.</p><p>I watched a small range form at the open, the tape reflecting each micro-movement like a trembling pool. Patterns and opportunities appeared and vanished — moments only my rules could spot. The scene was calm but alive, a reminder that steady, disciplined actions stitched together the rhythm of a profitable day.</p><p>Before trading, I set my intention and read the structure. During the session I moved only on confirmed signals, listening for the market's cues instead of forcing entries. After the close I'll review the subtle footprints I left on the chart and note what disrupted my focus, so tomorrow I trade the same morning with clearer rhythm and less noise.</p></div><h3><span data-type="icon" class="jicon">🎯</span> Daily Routine</h3><p>My trading day is filled with small yet meaningful routines. From scanning for setups to taking short breaks, each habit keeps my edge sharp and my risk controlled.</p><ul><li>Scanning the tape at market open for early directional bias.</li><li>Hunting for quiet setups along low-volatility edges and hidden liquidity.</li><li>Staying vigilant into the close, protecting gains as the market winds down.</li><li>Pausing mid-session to journal and reset under a cooling break.</li></ul>`,
  },
  {
    id: "a-moment-for-me",
    name: "A moment for me",
    description: "Capture a decisive moment",
    accent: "#9065b0",
    html: `<h3 style="text-align: center">A moment for me</h3><hr><p style="text-align: center">6/25/2026 2:15 am</p><div data-type="callout" data-color="violet"><p style="text-align: center">Introduction</p><p style="text-align: center">A moment of clarity arrived today — a quiet signal amid the noise that reminded me why rules matter. I paused, breathed, and let the setup form instead of forcing it. That brief stillness turned a potential mistake into a disciplined execution and kept my risk intact.</p></div><h3>Daily Routine</h3><ol><li>Pre-session: set single intention for the day (e.g., patience, execution, risk control)</li><li>Spot the moment: wait for clear confluence (structure + trigger + volume)</li><li>Act with purpose: enter only when price and plan align; use preset stop and target</li><li>Mid-session pause: take 2–5 minutes to log feelings after any loss or emotional spike</li><li>Close with calm: protect winners, reduce size if structure shifts, journal one insight</li></ol><hr><h3>Quick Notes</h3><ul><li>The decisive moment:</li><li>Emotion before/after:</li><li>What I did differently:</li><li>One action for next session:</li></ul>`,
  },
  {
    id: "gratitude",
    name: "Gratitude Journal",
    description: "Three good things",
    accent: "#22c55e",
    html: `<h3 style="text-align: center">Gratitude</h3><p style="text-align: center"><span data-type="tag" class="jtag" data-color="green">daily</span> <span data-type="tag" class="jtag" data-color="amber">mindset</span></p><hr><div data-type="callout" data-color="green"><p>✨ Three good things today — and <strong>why</strong> they mattered.</p></div><ol><li>I'm grateful for… because…</li><li>I'm grateful for… because…</li><li>I'm grateful for… because…</li></ol><h3>Someone to thank</h3><p>Who lifted me up today? <em>Jot a quick note to them.</em></p><hr><div data-type="toggle" data-open="false"><p><strong>Why this works</strong></p><p>Naming specifics rewires attention toward what's going right — keep each one concrete.</p></div>`,
  },
  {
    id: "morning-pages",
    name: "Morning Pages",
    description: "Free-write to clear your head",
    accent: "#cb912f",
    html: `<h3>Morning Pages</h3><p><em>Three pages, no editing, no stopping — just clear the mind onto the page.</em></p><div data-type="callout" data-color="amber"><p>🌅 Write whatever surfaces. Don't judge it. Fill the space.</p></div><blockquote><p>How am I feeling as I start the day?</p></blockquote><p></p><hr><h3>If you stall, riff on one of these</h3><ul><li>What am I avoiding?</li><li>What would make today a win?</li><li>What's taking up the most headspace?</li></ul>`,
  },
  {
    id: "goal-setting",
    name: "Goal Setting",
    description: "Define a clear goal + steps",
    accent: "#9065b0",
    html: `<h3>Goal Setting</h3><p><span data-type="tag" class="jtag" data-color="purple">goal</span> <span data-type="tag" class="jtag" data-color="blue">this quarter</span></p><div data-type="callout" data-color="purple"><p><strong>🎯 The goal:</strong> I want to…</p></div><h3>Why it matters</h3><p>This matters because…</p><h3>The plan</h3><ol><li>First step</li><li>Next step</li><li>Then…</li></ol><h3>Milestones</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Milestone 1</p></li><li data-type="taskItem" data-checked="false"><p>Milestone 2</p></li><li data-type="taskItem" data-checked="false"><p>Milestone 3</p></li></ul><hr><div data-type="callout" data-color="blue"><p><strong>Deadline:</strong>   ·   <strong>Reward:</strong> </p></div>`,
  },
  {
    id: "weekly-review",
    name: "Weekly Review",
    description: "Wins, lessons, next week",
    accent: "#337ea9",
    html: `<h3 style="text-align: center">Weekly Review</h3><p style="text-align: center"><strong>Week of </strong></p><hr><h3>🏆 Wins</h3><ul><li></li><li></li></ul><h3>📚 Lessons</h3><ul><li></li></ul><h3>🔧 To improve</h3><ul><li></li></ul><div data-type="callout" data-color="blue"><p><strong>Theme of the week:</strong> </p></div><h3>➡️ Next week</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Top priority</p></li><li data-type="taskItem" data-checked="false"><p>Second priority</p></li><li data-type="taskItem" data-checked="false"><p>Third priority</p></li></ul>`,
  },
  {
    id: "mood-tracker",
    name: "Mood Check-in",
    description: "Track how you feel",
    accent: "#c14c8a",
    html: `<h3>Mood Check-in</h3><p><span data-type="tag" class="jtag" data-color="pink">feelings</span></p><div data-type="callout" data-color="pink"><p>💗 Be honest, not perfect.</p></div><p><strong>Mood (1–10):</strong>      <strong>Energy (1–10):</strong> </p><h3>What's driving it</h3><ul><li></li><li></li></ul><div data-type="toggle" data-open="false"><p><strong>Ideas that help me reset</strong></p><p>Step outside · breathe for 2 minutes · message a friend · move for 10 minutes · write it out.</p></div>`,
  },
  {
    id: "brain-dump",
    name: "Brain Dump",
    description: "Get everything out of your head",
    accent: "#d9730d",
    html: `<h3>Brain Dump</h3><div data-type="callout" data-color="orange"><p>🧠 Everything on my mind right now — no order, no filter.</p></div><ul><li></li><li></li><li></li><li></li></ul><hr><h3>Turn it into action</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>One thing I'll do first</p></li><li data-type="taskItem" data-checked="false"><p>One thing I can drop</p></li></ul>`,
  },
  {
    id: "meeting-notes",
    name: "Meeting Notes",
    description: "Agenda, notes, action items",
    accent: "#0066ff",
    html: `<h3>Meeting Notes</h3><p><span data-type="tag" class="jtag" data-color="blue">meeting</span></p><p><strong>Date:</strong>   ·   <strong>Attendees:</strong> </p><hr><h3>Agenda</h3><ol><li></li><li></li></ol><h3>Notes</h3><ul><li></li></ul><h3>✅ Action items</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Who · what · by when</p></li><li data-type="taskItem" data-checked="false"><p></p></li></ul><div data-type="toggle" data-open="false"><p><strong>Decisions made</strong></p><p>Record anything agreed so it's easy to find later.</p></div>`,
  },
  {
    id: "reading-notes",
    name: "Reading Notes",
    description: "Capture takeaways from a book",
    accent: "#22c55e",
    html: `<h3>Reading Notes</h3><p><span data-type="tag" class="jtag" data-color="green">book</span> <span data-type="tag" class="jtag" data-color="amber">learning</span></p><p><strong>Title:</strong>   ·   <strong>Author:</strong> </p><div data-type="callout" data-color="green"><p>📖 The big idea in one sentence:</p></div><h3>Key takeaways</h3><ul><li></li><li></li><li></li></ul><h3>Favorite quote</h3><blockquote><p></p></blockquote><h3>How I'll use this</h3><p></p>`,
  },
  {
    id: "habit-tracker",
    name: "Habit Tracker",
    description: "Check off your daily habits",
    accent: "#9065b0",
    html: `<h3 style="text-align: center">Habit Tracker</h3><hr><div data-type="callout" data-color="violet"><p>🔁 Small reps, every day. Check them off.</p></div><ul data-type="taskList" data-variant="checklist"><li data-type="taskItem" data-checked="false"><p>Drink water</p></li><li data-type="taskItem" data-checked="false"><p>Move / exercise</p></li><li data-type="taskItem" data-checked="false"><p>Read</p></li><li data-type="taskItem" data-checked="false"><p>Sleep on time</p></li></ul><hr><div data-type="toggle" data-open="false"><p><strong>Notes &amp; streaks</strong></p><p>What made today easy or hard? Note it so tomorrow is smoother.</p></div>`,
  },
];
