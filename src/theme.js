export const MODES = {
  pomodoro: { label: "25 / 5", work: 25 * 60, rest: 5 * 60 },
  deepwork: { label: "40 / 10", work: 40 * 60, rest: 10 * 60 },
  stopwatch: { label: "Stopwatch", work: null, rest: null },
};

export const RANGES = [
  { key: "7d", label: "7d" },
  { key: "1m", label: "1m" },
  { key: "3m", label: "3m" },
  { key: "6m", label: "6m" },
];

export const QUADRANTS = [
  { key: "do", title: "Do now", sub: "Urgent & important" },
  { key: "schedule", title: "Schedule", sub: "Important, not urgent" },
  { key: "delegate", title: "Delegate", sub: "Urgent, not important" },
  { key: "eliminate", title: "Eliminate", sub: "Neither" },
];

export const THEMES = {
  sage: { name: "Sage & Clay", moss: "#5E7350", clay: "#C08A42", mossD: "#8FB37A", clayD: "#E0A354" },
  ocean: { name: "Ocean & Coral", moss: "#2A7A8C", clay: "#E0714F", mossD: "#5FC4DB", clayD: "#FF8F68" },
  plum: { name: "Plum & Gold", moss: "#7A4E82", clay: "#D9A431", mossD: "#C48FCB", clayD: "#F0C158" },
  forest: { name: "Forest & Rust", moss: "#2F5B33", clay: "#B5502F", mossD: "#6FBF74", clayD: "#E08A5C" },
  slate: { name: "Slate & Amber", moss: "#3A5578", clay: "#D19137", mossD: "#7FA3D9", clayD: "#F0AE5C" },
  azure: { name: "Azure & Sunset", moss: "#2E6FBF", clay: "#E8963D", mossD: "#5FA0F0", clayD: "#FFB05F" },
  berry: { name: "Berry & Mint", moss: "#A33F63", clay: "#3F9E7D", mossD: "#E87CA0", clayD: "#68D9AE" },
};

export const SLEEP_COLOR = "#D9A62B";
