import { expect, test } from "bun:test";

const COMMENTS_SOURCE = await Bun.file(new URL("../src/comments.js", import.meta.url)).text();

function makeCommentsDocument() {
  return {
    documentElement: {},
    querySelectorAll(selector) {
      if (selector === "dst-forum") return [];
      return [];
    },
  };
}

function installComments({ document = makeCommentsDocument(), timers }) {
  const observers = [];
  class MutationObserver {
    constructor(callback) {
      this.callback = callback;
      this.disconnected = false;
      observers.push(this);
    }
    observe() {}
    disconnect() {
      this.disconnected = true;
    }
  }

  const window = {
    document,
    MutationObserver,
    setTimeout(callback, delay) {
      const timer = { callback, delay };
      timers.push(timer);
      return timer;
    },
    clearTimeout(timer) {
      const index = timers.indexOf(timer);
      if (index !== -1) timers.splice(index, 1);
    },
  };
  new Function("window", COMMENTS_SOURCE)(window);
  return { comments: window.DSUXComments, observers };
}

test("comment discovery retries stop after a finite controlled timer budget", () => {
  const timers = [];
  const { comments, observers } = installComments({ timers });
  const notifications = [];

  comments.init((payload) => notifications.push(payload));
  expect(timers).toHaveLength(1);
  expect(timers[0].delay).toBe(250);

  let attempts = 0;
  while (timers.length && attempts < 100) {
    const timer = timers.shift();
    timer.callback();
    attempts += 1;
  }

  expect(attempts).toBeGreaterThan(0);
  expect(attempts).toBeLessThanOrEqual(100);
  expect(timers).toHaveLength(0);
  expect(notifications.at(-1)).toEqual({ count: 0, mode: "native", available: false });

  comments.sort("positive");
  expect(comments.currentMode()).toBe("positive");
  comments.disconnect();
  expect(comments.currentMode()).toBe("positive");
  expect(timers).toHaveLength(0);
  expect(observers.every((observer) => observer.disconnected)).toBe(true);
});
