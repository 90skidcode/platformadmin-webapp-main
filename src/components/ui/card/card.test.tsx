import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

describe("Card", () => {
  describe("composing its parts", () => {
    it("renders title, description, content, and footer together", () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage platform users and roles.</CardDescription>
          </CardHeader>
          <CardContent>Body content</CardContent>
          <CardFooter>Footer content</CardFooter>
        </Card>,
      );
      expect(screen.getByText("User Management")).toBeInTheDocument();
      expect(
        screen.getByText("Manage platform users and roles."),
      ).toBeInTheDocument();
      expect(screen.getByText("Body content")).toBeInTheDocument();
      expect(screen.getByText("Footer content")).toBeInTheDocument();
    });

    it("renders the title as a heading element", () => {
      render(<CardTitle>User Management</CardTitle>);
      expect(
        screen.getByRole("heading", { name: "User Management" }),
      ).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("merges a custom className onto the root", () => {
      render(<Card className="max-w-sm" data-testid="card" />);
      expect(screen.getByTestId("card")).toHaveClass("max-w-sm");
    });
  });
});
