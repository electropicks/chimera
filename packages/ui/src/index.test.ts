import { describe, expect, test, vi } from "vitest";

import {
  createStoryLogShell,
  createTimeControls,
  resolveTimeControlHotkey,
  TIME_CONTROL_OPTIONS,
} from "./index";

describe("time controls", () => {
  test("exposes pause, 1x, 4x, and 16x control options", () => {
    expect(TIME_CONTROL_OPTIONS).toEqual([
      { hotkey: "Space", label: "Pause", speed: 0 },
      { hotkey: "Digit1", label: "1x", speed: 1 },
      { hotkey: "Digit2", label: "4x", speed: 4 },
      { hotkey: "Digit3", label: "16x", speed: 16 },
    ]);
  });

  test("maps keyboard shortcuts to time speeds", () => {
    expect(resolveTimeControlHotkey(" ")).toBe(0);
    expect(resolveTimeControlHotkey("1")).toBe(1);
    expect(resolveTimeControlHotkey("2")).toBe(4);
    expect(resolveTimeControlHotkey("3")).toBe(16);
    expect(resolveTimeControlHotkey("x")).toBeNull();
  });

  test("renders speed controls and updates the visible selected speed", () => {
    const document = new TestDocument();
    const host = document.createElement("div");
    const onSpeedChange = vi.fn();
    const controls = createTimeControls(host as unknown as HTMLElement, {
      onSpeedChange,
      speed: 1,
    });

    expect(controls.currentSpeed.textContent).toBe("1x");
    expect(controls.buttons.map((button) => button.textContent)).toEqual([
      "Pause",
      "1x",
      "4x",
      "16x",
    ]);
    expect(controls.buttons.map((button) => button.getAttribute("aria-pressed"))).toEqual([
      "false",
      "true",
      "false",
      "false",
    ]);

    controls.setSpeed(4);

    expect(controls.currentSpeed.textContent).toBe("4x");
    expect(controls.buttons.map((button) => button.getAttribute("aria-pressed"))).toEqual([
      "false",
      "false",
      "true",
      "false",
    ]);

    controls.buttons[3]?.click();

    expect(onSpeedChange).toHaveBeenCalledWith(16);
  });
});

describe("story log shell", () => {
  test("renders an empty story log panel shell", () => {
    const document = new TestDocument();
    const host = document.createElement("div");
    const shell = createStoryLogShell(host as unknown as HTMLElement);

    expect(shell.root.tagName).toBe("SECTION");
    expect(shell.root.getAttribute("aria-label")).toBe("Story log");
    expect(shell.entries.children).toEqual([]);
    expect(shell.emptyState.textContent).toBe("Story events will appear here.");
    expect(host.children).toContain(shell.root);
  });
});

class TestElement {
  ownerDocument: TestDocument | null = null;
  readonly attributes = new Map<string, string>();
  readonly children: TestElement[] = [];
  className = "";
  readonly style: Record<string, string> = {};
  textContent = "";
  type = "";

  constructor(readonly tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  append(...children: TestElement[]): void {
    this.children.push(...children);
  }

  appendChild(child: TestElement): TestElement {
    this.children.push(child);
    return child;
  }

  click(): void {
    this.listeners.get("click")?.();
  }

  addEventListener(type: string, listener: () => void): void {
    this.listeners.set(type, listener);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  private readonly listeners = new Map<string, () => void>();
}

class TestDocument {
  createElement(tagName: string): TestElement {
    const element = new TestElement(tagName);
    element.ownerDocument = this;
    return element;
  }
}
