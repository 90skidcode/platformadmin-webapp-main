import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Button } from "../button/button";

function renderMenu(onSignOut = vi.fn()) {
  render(
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>Priya S.</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSignOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>,
  );
  return onSignOut;
}

describe("DropdownMenu", () => {
  it("is closed until the trigger is clicked", () => {
    renderMenu();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens on trigger click and shows its items", async () => {
    renderMenu();
    await userEvent.click(screen.getByRole("button", { name: "Priya S." }));
    expect(
      screen.getByRole("menuitem", { name: "Sign out" }),
    ).toBeInTheDocument();
  });

  it("selecting an item fires onSelect and closes the menu", async () => {
    const onSignOut = renderMenu();
    await userEvent.click(screen.getByRole("button", { name: "Priya S." }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(onSignOut).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
