import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { OtpInput } from "./otp-input";

interface TestWrapperProps {
  initialValue?: string;
  onComplete?: (v: string) => void;
}

function TestOtpWrapper({ initialValue = "", onComplete }: TestWrapperProps) {
  const [val, setVal] = React.useState(initialValue);
  return (
    <OtpInput
      length={5}
      value={val}
      onChange={setVal}
      onComplete={onComplete}
      autoFocus={false}
    />
  );
}

describe("OTP Input Component (Business Acceptance Tests)", () => {
  describe("Display and Structure", () => {
    it("renders exactly 5 separate input boxes for a 5-digit OTP", () => {
      render(<OtpInput length={5} />);
      const inputs = screen.getAllByRole("textbox");
      expect(inputs).toHaveLength(5);
      expect(screen.getByLabelText("Digit 1 of 5")).toBeInTheDocument();
      expect(screen.getByLabelText("Digit 5 of 5")).toBeInTheDocument();
    });
  });

  describe("User Typing and Input Filtering", () => {
    it("accepts numeric digits and reports the updated OTP to the parent", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <OtpInput length={5} value="" onChange={onChange} autoFocus={false} />,
      );

      const inputs = screen.getAllByRole("textbox");
      await user.type(inputs[0], "4");

      expect(onChange).toHaveBeenCalledWith("4");
    });

    it("rejects non-numeric characters such as letters and symbols", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <OtpInput length={5} value="" onChange={onChange} autoFocus={false} />,
      );

      const inputs = screen.getAllByRole("textbox");
      await user.type(inputs[0], "a");
      await user.type(inputs[0], "$");

      expect(onChange).not.toHaveBeenCalledWith("a");
      expect(onChange).not.toHaveBeenCalledWith("$");
    });

    it("automatically advances cursor focus to the next box after a digit is entered", async () => {
      const user = userEvent.setup();
      render(<TestOtpWrapper />);

      const inputs = screen.getAllByRole("textbox");
      inputs[0].focus();
      expect(inputs[0]).toHaveFocus();

      await user.keyboard("1");
      expect(inputs[1]).toHaveFocus();

      await user.keyboard("2");
      expect(inputs[2]).toHaveFocus();
    });

    it("automatically triggers completion callback when the 5th digit is typed", async () => {
      const onComplete = vi.fn();
      const user = userEvent.setup();
      render(<TestOtpWrapper onComplete={onComplete} />);
      const inputs = screen.getAllByRole("textbox");

      inputs[0].focus();
      await user.keyboard("12345");

      expect(onComplete).toHaveBeenCalledWith("12345");
    });
  });

  describe("Keyboard Navigation and Corrections", () => {
    it("handles backspace to clear the current digit or step back to the previous digit", async () => {
      const user = userEvent.setup();
      render(<TestOtpWrapper initialValue="123" />);
      const inputs = screen.getAllByRole("textbox");

      // Focus box 3 (value "3"), pressing backspace clears box 3
      inputs[2].focus();
      await user.keyboard("{Backspace}");
      expect(inputs[2]).toHaveValue("");
      expect(inputs[2]).toHaveFocus();

      // Now box 3 is empty, pressing backspace again moves to box 2 and clears it
      await user.keyboard("{Backspace}");
      expect(inputs[1]).toHaveFocus();
      expect(inputs[1]).toHaveValue("");
    });

    it("clears the current digit upon delete key without shifting focus backwards", async () => {
      const user = userEvent.setup();
      render(<TestOtpWrapper initialValue="1" />);
      const inputs = screen.getAllByRole("textbox");

      inputs[0].focus();
      await user.keyboard("{Delete}");
      expect(inputs[0]).toHaveValue("");
      expect(inputs[0]).toHaveFocus();
    });

    it("allows the user to navigate left and right between digit boxes using arrow keys", async () => {
      const user = userEvent.setup();
      render(<OtpInput length={5} autoFocus={false} />);
      const inputs = screen.getAllByRole("textbox");

      inputs[1].focus();
      expect(inputs[1]).toHaveFocus();

      await user.keyboard("{ArrowRight}");
      expect(inputs[2]).toHaveFocus();

      await user.keyboard("{ArrowLeft}");
      expect(inputs[1]).toHaveFocus();
    });
  });

  describe("Paste Operation", () => {
    it("extracts 5 numeric digits from clipboard paste, ignores non-digits, and triggers completion", async () => {
      const onComplete = vi.fn();
      const user = userEvent.setup();
      render(<TestOtpWrapper onComplete={onComplete} />);
      const inputs = screen.getAllByRole("textbox");

      // User pastes text with letters and digits into any OTP box
      inputs[2].focus();
      await user.paste("OTP-98765-CODE");

      expect(inputs[0]).toHaveValue("9");
      expect(inputs[1]).toHaveValue("8");
      expect(inputs[2]).toHaveValue("7");
      expect(inputs[3]).toHaveValue("6");
      expect(inputs[4]).toHaveValue("5");
      expect(onComplete).toHaveBeenCalledWith("98765");
      expect(inputs[4]).toHaveFocus();
    });
  });

  describe("Disabled State", () => {
    it("disables all input boxes during submission/loading so user cannot edit", () => {
      render(<OtpInput length={5} disabled autoFocus={false} />);
      const inputs = screen.getAllByRole("textbox");
      inputs.forEach((input) => {
        expect(input).toBeDisabled();
      });
    });
  });
});
