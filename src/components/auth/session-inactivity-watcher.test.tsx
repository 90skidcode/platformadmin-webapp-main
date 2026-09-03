import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";

import { SessionInactivityWatcher } from "./session-inactivity-watcher";
import { _resetSessionSyncChannel } from "@/lib/auth/session-sync";
import {
  INACTIVITY_TIMEOUT_MS,
  SESSION_EXPIRED_LOGIN_URL,
  SESSION_SYNC_EVENTS,
  SESSION_SYNC_STORAGE_KEY,
  WARNING_TIME_MS,
} from "@/lib/auth/session-constants";

let sessionData: unknown = null;
let sessionStatus = "authenticated";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: sessionData, status: sessionStatus }),
}));

const signOutMock = vi.fn();
vi.mock("@/lib/auth/sign-out", () => ({
  clearSessionCookiesAndSignOut: (...args: unknown[]) => signOutMock(...args),
}));

const messages = {
  auth: {
    session: {
      warningTitle: "Session Inactivity Warning",
      warningMessage:
        "Your session will expire soon due to inactivity. Select Continue Session to remain signed in.",
      continueSession: "Continue Session",
      signOut: "Sign out",
    },
  },
};

function renderWatcher(initialLastActiveAt?: number) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SessionInactivityWatcher initialLastActiveAt={initialLastActiveAt} />
    </NextIntlClientProvider>,
  );
}

describe("BRD: Inactivity Warning Modal & Session Lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    _resetSessionSyncChannel();
    signOutMock.mockClear();
    sessionStatus = "authenticated";
    sessionData = {
      user: { id: "u1", name: "Priya" },
      sessionCreatedAt: Date.now(),
      lastActiveAt: Date.now(),
    };
  });

  afterEach(() => {
    _resetSessionSyncChannel();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("remains hidden while the user is actively working within the active window", () => {
    renderWatcher();
    expect(
      screen.queryByText(/Your session will expire soon due to inactivity/),
    ).not.toBeInTheDocument();
  });

  it("displays the warning modal with a live countdown at warning threshold", async () => {
    renderWatcher();

    // Advance to warning threshold - 1s -> warning not yet shown
    act(() => {
      vi.advanceTimersByTime(WARNING_TIME_MS - 1000);
    });
    expect(
      screen.queryByText(/Your session will expire soon due to inactivity/),
    ).not.toBeInTheDocument();

    // Advance to warning threshold -> warning modal appears
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(
      await screen.findByText(
        "Your session will expire soon due to inactivity. Select Continue Session to remain signed in.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("Continue Session")).toBeInTheDocument();
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });

  it("dynamically ticks down the remaining time every second while the modal is displayed", async () => {
    renderWatcher();

    // Advance to warning threshold -> modal opens
    act(() => {
      vi.advanceTimersByTime(WARNING_TIME_MS);
    });

    const firstCountdown = await screen.findByText(/^\d+:[0-5]\d$/);
    expect(firstCountdown).toBeInTheDocument();
    const firstText = firstCountdown.textContent;

    // Tick 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const secondCountdown = screen.getByText(/^\d+:[0-5]\d$/);
    const secondText = secondCountdown.textContent;
    expect(secondText).not.toBe(firstText);

    // Tick another 60 seconds
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    const thirdCountdown = screen.getByText(/^\d+:[0-5]\d$/);
    expect(thirdCountdown.textContent).not.toBe(secondText);
  });

  it("automatically signs out the user and redirects to login with an expiration notice after 10 minutes of inactivity", () => {
    renderWatcher();

    act(() => {
      vi.advanceTimersByTime(INACTIVITY_TIMEOUT_MS);
    });

    expect(signOutMock).toHaveBeenCalledWith(SESSION_EXPIRED_LOGIN_URL);
  });

  it("keeps the user signed in and dismisses the warning modal when 'Continue Session' is selected", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const nextActiveAt = Date.now() + WARNING_TIME_MS + 1000;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: "S_200_SESSION_EXTENDED",
          data: { lastActiveAt: nextActiveAt },
        }),
      }),
    );

    renderWatcher();

    // Advance to 8m to show warning modal
    act(() => {
      vi.advanceTimersByTime(WARNING_TIME_MS);
    });

    const continueBtn = await screen.findByRole("button", {
      name: "Continue Session",
    });
    await user.click(continueBtn);

    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/session/extend",
      expect.objectContaining({ method: "POST" }),
    );

    // Warning modal should close
    await waitFor(() => {
      expect(
        screen.queryByText(/Your session will expire soon due to inactivity/),
      ).not.toBeInTheDocument();
    });
  });

  it("immediately signs out and redirects to login if session renewal is rejected by the server", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      }),
    );

    renderWatcher();

    // Advance to 8m to show warning modal
    act(() => {
      vi.advanceTimersByTime(WARNING_TIME_MS);
    });

    const continueBtn = await screen.findByRole("button", {
      name: "Continue Session",
    });
    await user.click(continueBtn);

    expect(signOutMock).toHaveBeenCalledWith(SESSION_EXPIRED_LOGIN_URL);
  });

  it("automatically dismisses the warning modal in this tab when user activity occurs in another open tab", async () => {
    renderWatcher();

    // Advance to 8m to show warning modal
    act(() => {
      vi.advanceTimersByTime(WARNING_TIME_MS);
    });

    expect(
      await screen.findByText(
        "Your session will expire soon due to inactivity. Select Continue Session to remain signed in.",
      ),
    ).toBeInTheDocument();

    // User interacts in another browser tab
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: SESSION_SYNC_STORAGE_KEY,
          newValue: JSON.stringify({
            type: SESSION_SYNC_EVENTS.ACTIVITY,
            lastActiveAt: Date.now(),
          }),
        }),
      );
    });

    // Warning modal closes automatically
    await waitFor(() => {
      expect(
        screen.queryByText(/Your session will expire soon due to inactivity/),
      ).not.toBeInTheDocument();
    });
  });
});
