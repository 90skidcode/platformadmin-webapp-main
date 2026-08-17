import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

describe("Avatar", () => {
  describe("without a loaded image", () => {
    it("renders the fallback initials", () => {
      render(
        <Avatar>
          <AvatarFallback>SG</AvatarFallback>
        </Avatar>,
      );
      expect(screen.getByText("SG")).toBeInTheDocument();
    });

    it("accepts an image src without throwing (jsdom never resolves image loads)", () => {
      render(
        <Avatar data-testid="avatar">
          <AvatarImage src="/avatar.png" alt="Priya" />
          <AvatarFallback>PS</AvatarFallback>
        </Avatar>,
      );
      expect(screen.getByTestId("avatar")).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("merges a custom className onto the root", () => {
      render(
        <Avatar className="size-8" data-testid="avatar">
          <AvatarFallback>SG</AvatarFallback>
        </Avatar>,
      );
      expect(screen.getByTestId("avatar")).toHaveClass("size-8");
    });
  });
});
