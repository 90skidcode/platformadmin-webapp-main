import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { dismissAllToasts, Toaster } from "@/components/toast";
import { triggerToastFromConfig } from "./action-result";

afterEach(() => {
  dismissAllToasts();
});

function renderToaster() {
  render(<Toaster />);
}

describe("triggerToastFromConfig", () => {
  describe("with no config", () => {
    it("does nothing", () => {
      renderToaster();
      triggerToastFromConfig(undefined);
      expect(screen.queryByRole("region")?.textContent ?? "").toBe("");
    });
  });

  describe("showing a toast", () => {
    it("uses plain title/message when no titleKey/messageKey is set", async () => {
      renderToaster();
      triggerToastFromConfig({
        toast: {
          variant: "success",
          title: "Saved",
          message: "Employee created.",
        },
      });
      expect(await screen.findByText("Saved")).toBeInTheDocument();
      expect(screen.getByText("Employee created.")).toBeInTheDocument();
    });

    it("resolves titleKey/messageKey through the translate function when provided", async () => {
      renderToaster();
      const translate = vi.fn((key: string) =>
        key === "toast.saved" ? "Saved" : key,
      );
      triggerToastFromConfig(
        { toast: { titleKey: "toast.saved" } },
        { translate },
      );

      expect(await screen.findByText("Saved")).toBeInTheDocument();
      expect(translate).toHaveBeenCalledWith("toast.saved");
    });

    it("falls back to the raw key when no translate function is given", async () => {
      renderToaster();
      triggerToastFromConfig({ toast: { titleKey: "toast.saved" } });
      expect(await screen.findByText("toast.saved")).toBeInTheDocument();
    });
  });

  describe("redirecting", () => {
    it("calls router.push on redirect", () => {
      const push = vi.fn();
      triggerToastFromConfig({ redirect: "/employees" }, { router: { push } });
      expect(push).toHaveBeenCalledWith("/employees");
    });
  });

  describe("refetching", () => {
    it("calls refetch when refetch is true", () => {
      const refetch = vi.fn();
      triggerToastFromConfig({ refetch: true }, { refetch });
      expect(refetch).toHaveBeenCalledOnce();
    });

    it("does not call refetch when refetch is falsy", () => {
      const refetch = vi.fn();
      triggerToastFromConfig({ toast: { title: "Saved" } }, { refetch });
      expect(refetch).not.toHaveBeenCalled();
    });
  });
});
