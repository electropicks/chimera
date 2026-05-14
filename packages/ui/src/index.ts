export const uiPackageName = "@creature/ui";
export const uiPackageResponsibility = "Reusable UI components and interface primitives.";

export type TimeControlSpeed = 0 | 1 | 4 | 16;

export interface TimeControlOption {
  readonly hotkey: "Space" | "Digit1" | "Digit2" | "Digit3";
  readonly label: string;
  readonly speed: TimeControlSpeed;
}

export interface TimeControlsOptions {
  readonly onSpeedChange: (speed: TimeControlSpeed) => void;
  readonly speed: TimeControlSpeed;
}

export interface TimeControlsView {
  readonly buttons: HTMLButtonElement[];
  readonly currentSpeed: HTMLElement;
  readonly root: HTMLElement;
  setSpeed(speed: TimeControlSpeed): void;
}

export interface StoryLogShell {
  readonly emptyState: HTMLElement;
  readonly entries: HTMLElement;
  readonly root: HTMLElement;
}

export const TIME_CONTROL_OPTIONS: readonly TimeControlOption[] = [
  { hotkey: "Space", label: "Pause", speed: 0 },
  { hotkey: "Digit1", label: "1x", speed: 1 },
  { hotkey: "Digit2", label: "4x", speed: 4 },
  { hotkey: "Digit3", label: "16x", speed: 16 },
];

export function resolveTimeControlHotkey(key: string): TimeControlSpeed | null {
  switch (key) {
    case " ":
    case "Space":
    case "Spacebar":
      return 0;
    case "1":
    case "Digit1":
      return 1;
    case "2":
    case "Digit2":
      return 4;
    case "3":
    case "Digit3":
      return 16;
    default:
      return null;
  }
}

export function formatTimeControlSpeed(speed: TimeControlSpeed): string {
  return speed === 0 ? "Paused" : `${speed}x`;
}

export function createTimeControls(
  host: HTMLElement,
  options: TimeControlsOptions,
): TimeControlsView {
  const document = getDocument(host);
  let currentSpeed = options.speed;

  const root = document.createElement("section");
  root.className = "time-controls";
  root.setAttribute("aria-label", "Time controls");

  const statusRow = document.createElement("div");
  statusRow.className = "time-controls-status";

  const statusLabel = document.createElement("span");
  statusLabel.className = "time-controls-label";
  statusLabel.textContent = "Speed";

  const currentSpeedElement = document.createElement("span");
  currentSpeedElement.className = "time-controls-current";

  const buttonGroup = document.createElement("div");
  buttonGroup.className = "time-controls-buttons";

  const buttons = TIME_CONTROL_OPTIONS.map((option) => {
    const button = document.createElement("button");
    button.className = "time-control-button";
    button.type = "button";
    button.textContent = option.label;
    button.setAttribute("aria-label", `${option.label} simulation speed`);
    button.addEventListener("click", () => {
      options.onSpeedChange(option.speed);
    });
    buttonGroup.appendChild(button);

    return button;
  });

  statusRow.append(statusLabel, currentSpeedElement);
  root.append(statusRow, buttonGroup);
  host.appendChild(root);

  const setSpeed = (speed: TimeControlSpeed): void => {
    currentSpeed = speed;
    currentSpeedElement.textContent = formatTimeControlSpeed(currentSpeed);

    for (const [index, button] of buttons.entries()) {
      const option = TIME_CONTROL_OPTIONS[index];
      button.setAttribute("aria-pressed", String(option?.speed === currentSpeed));
    }
  };

  setSpeed(currentSpeed);

  return {
    buttons,
    currentSpeed: currentSpeedElement,
    root,
    setSpeed,
  };
}

export function createStoryLogShell(host: HTMLElement): StoryLogShell {
  const document = getDocument(host);

  const root = document.createElement("section");
  root.className = "story-log";
  root.setAttribute("aria-label", "Story log");

  const heading = document.createElement("h2");
  heading.className = "story-log-title";
  heading.textContent = "Story Log";

  const entries = document.createElement("ol");
  entries.className = "story-log-entries";

  const emptyState = document.createElement("p");
  emptyState.className = "story-log-empty";
  emptyState.textContent = "Story events will appear here.";

  root.append(heading, entries, emptyState);
  host.appendChild(root);

  return {
    emptyState,
    entries,
    root,
  };
}

function getDocument(host: HTMLElement): Document {
  return host.ownerDocument;
}
