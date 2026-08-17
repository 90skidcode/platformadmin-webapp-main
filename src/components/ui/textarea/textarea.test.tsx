import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Textarea } from "./textarea";

describe("Textarea", () => {
  describe("typing", () => {
    it("accepts multiline typed input", async () => {
      render(<Textarea aria-label="notes" />);
      const textarea = screen.getByLabelText("notes");
      await userEvent.type(textarea, "line one{enter}line two");
      expect(textarea).toHaveValue("line one\nline two");
    });
  });

  describe("state props", () => {
    it("sets aria-invalid when invalid is true", () => {
      render(<Textarea aria-label="notes" invalid />);
      expect(screen.getByLabelText("notes")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });

    it("respects the disabled prop", () => {
      render(<Textarea aria-label="notes" disabled />);
      expect(screen.getByLabelText("notes")).toBeDisabled();
    });
  });
});
