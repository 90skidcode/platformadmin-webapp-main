import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { FieldError } from "./field-error";

/**
 * When a user submits a form with invalid data, they must see a clear,
 * human-readable error message in their language. The message must be
 * accurate and visible — never an internal code or a blank space.
 */

// A shared translator covering all keys used across tests in this file.
function translate(key: string): string {
  const messages: Record<string, string> = {
    "validation.emailRequired": "Email address is required.",
    // eslint-disable-next-line sonarjs/no-hardcoded-passwords
    "validation.passwordsDoNotMatch": "Passwords do not match.",
  };
  if (!(key in messages)) throw new Error(`No translation found for: ${key}`);
  return messages[key];
}

describe("FieldError", () => {
  describe("when there is no validation error", () => {
    it("shows no error to the user when the field is valid", () => {
      const { container } = render(<FieldError />);
      expect(container).toBeEmptyDOMElement();
    });

    it("shows no error when the field has not been touched yet", () => {
      const { container } = render(<FieldError message="" />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("when a validation error occurs", () => {
    it("shows the error message so the user knows what to correct", () => {
      render(<FieldError message="This field is required." />);
      expect(screen.getByRole("alert")).toHaveTextContent(
        "This field is required.",
      );
    });

    it("shows the error in the user's language when translations are available", () => {
      render(
        <FieldError message="validation.emailRequired" translate={translate} />,
      );
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Email address is required.",
      );
    });

    it("shows the password mismatch error in the user's language", () => {
      render(
        <FieldError
          message="validation.passwordsDoNotMatch"
          translate={translate}
        />,
      );
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Passwords do not match.",
      );
    });

    it("shows a server-returned error message verbatim without corrupting it", () => {
      // Server messages like "Email already in use." are already plain text.
      // They must be shown as-is, not looked up again as a translation key.
      render(
        <FieldError message="Email already in use." translate={translate} />,
      );
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Email already in use.",
      );
    });

    it("still shows the error key when a translation is missing, so the user is not left with a blank error", () => {
      render(
        <FieldError message="validation.unknownRule" translate={translate} />,
      );
      expect(screen.getByRole("alert")).toHaveTextContent(
        "validation.unknownRule",
      );
    });
  });

  describe("screen reader accessibility", () => {
    it("announces the error to screen readers automatically using the alert role", () => {
      render(<FieldError message="Required" />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("can be linked to its input field so assistive technology knows which field has the error", () => {
      render(<FieldError id="email-error" message="Required" />);
      expect(screen.getByRole("alert")).toHaveAttribute("id", "email-error");
    });
  });
});
