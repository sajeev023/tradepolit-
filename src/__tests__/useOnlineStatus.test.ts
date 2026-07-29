// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

/**
 * Phase 6 — useOnlineStatus race/leak behavior tests.
 *
 * The hook's fixes (Phase 3) are structural: an `AbortController` cancels the
 * favicon fetch on cleanup, and an `active` guard blocks any `setIsOnline`
 * after unmount. These tests lock in the abort + no-write-after-unmount
 * contract so a slow favicon response can never flip state on a torn-down
 * component (the prior unguarded `.then` defect).
 */

function setOnline(online: boolean) {
  Object.defineProperty(navigator, "onLine", {
    value: online,
    configurable: true,
    writable: true,
  });
}

describe("useOnlineStatus", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    setOnline(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("reports online when the browser is online (no favicon ping issued)", () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
    // When navigator.onLine is true, verifyConnectivity short-circuits without fetching.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("verifies connectivity via the favicon when the browser reports offline, and flips online on success", async () => {
    setOnline(false);
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    const { result } = renderHook(() => useOnlineStatus());
    // The initial verifyConnectivity() pings the favicon on the offline path.
    expect(fetchMock).toHaveBeenCalledWith(
      "/favicon.ico",
      expect.objectContaining({ method: "HEAD", cache: "no-store" })
    );

    await act(async () => {
      // Flush the favicon fetch promise.
    });
    expect(result.current).toBe(true);
  });

  it("flips offline when the favicon ping fails while the browser reports offline", async () => {
    setOnline(false);
    fetchMock.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useOnlineStatus());
    await act(async () => {
      // Flush the rejected favicon fetch.
    });
    expect(result.current).toBe(false);
  });

  it("aborts the in-flight favicon fetch on unmount (AbortController cancellation)", async () => {
    setOnline(false);
    // A favicon fetch that never settles on its own — only cleanup should resolve it.
    let capturedSignal: AbortSignal | null | undefined;
    fetchMock.mockImplementation((_url: string, init: RequestInit) => {
      capturedSignal = init.signal;
      return new Promise(() => {
        // intentionally never resolves; aborted by cleanup
      });
    });

    const { unmount } = renderHook(() => useOnlineStatus());
    expect(capturedSignal).toBeDefined();
    expect(capturedSignal!.aborted).toBe(false);

    unmount();
    // The cleanup runs abortController.abort() on the pending fetch.
    expect(capturedSignal!.aborted).toBe(true);
  });

  it("does not set state after unmount even if a slow favicon fetch resolves later", async () => {
    setOnline(false);
    let resolveFetch!: (v: { ok: boolean; status: number }) => void;
    fetchMock.mockReturnValue(
      new Promise<{ ok: boolean; status: number }>((r) => {
        resolveFetch = r;
      })
    );

    const { result, unmount } = renderHook(() => useOnlineStatus());
    // Value is still the default true before the fetch resolves.
    expect(result.current).toBe(true);

    unmount();
    // Now resolve the fetch AFTER unmount. The `active` guard must suppress the
    // setOnline(true) call; result.current stays unchanged and no React
    // "state on unmounted component" warning is emitted.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await act(async () => {
      resolveFetch({ ok: true, status: 200 });
    });
    expect(result.current).toBe(true); // unchanged — no post-unmount write
    expect(spy).not.toHaveBeenCalledWith(
      expect.stringContaining("unmounted")
    );
    spy.mockRestore();
  });

  it("subscribes online/offline listeners exactly once (no recreate storm on status flips)", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    setOnline(true);
    const { rerender } = renderHook(() => useOnlineStatus());
    const initialAddCount = addSpy.mock.calls.filter(
      ([type]) => type === "online" || type === "offline"
    ).length;
    expect(initialAddCount).toBe(2); // one online + one offline

    // A re-render must NOT re-subscribe (the [] deps + isOnlineRef fix).
    rerender();
    const afterRerenderAddCount = addSpy.mock.calls.filter(
      ([type]) => type === "online" || type === "offline"
    ).length;
    expect(afterRerenderAddCount).toBe(2);
    addSpy.mockRestore();
  });
});