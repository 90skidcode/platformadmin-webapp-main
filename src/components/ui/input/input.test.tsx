import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Input } from "./input";

describe("Input", () => {
  describe("typing", () => {
    it("accepts typed input", async () => {
      render(<Input aria-label="email" />);
      const input = screen.getByLabelText("email");
      await userEvent.type(input, "hi@example.com");
      expect(input).toHaveValue("hi@example.com");
    });

    it("calls onChange as the user types", async () => {
      const onChange = vi.fn();
      render(<Input aria-label="email" onChange={onChange} />);
      await userEvent.type(screen.getByLabelText("email"), "a");
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe("state props", () => {
    it("sets aria-invalid when invalid is true", () => {
      render(<Input aria-label="email" invalid />);
      expect(screen.getByLabelText("email")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });

    it("respects the disabled prop", () => {
      render(<Input aria-label="email" disabled />);
      expect(screen.getByLabelText("email")).toBeDisabled();
    });

    it("blocks e and E when blockE is true", async () => {
      render(<Input aria-label="username" blockE />);
      const input = screen.getByLabelText("username");
      await userEvent.type(input, "tEst");
      expect(input).toHaveValue("tst");
    });

    it("toggles password visibility when clicking eye button", async () => {
      render(<Input aria-label="password" type="password" />);
      const input = screen.getByLabelText("password");
      expect(input).toHaveAttribute("type", "password");

      const toggleButton = screen.getByRole("button", {
        name: "Show password",
      });
      await userEvent.click(toggleButton);

      expect(input).toHaveAttribute("type", "text");
      expect(
        screen.getByRole("button", { name: "Hide password" }),
      ).toBeInTheDocument();

      await userEvent.click(
        screen.getByRole("button", { name: "Hide password" }),
      );
      expect(input).toHaveAttribute("type", "password");
    });
  });
});
