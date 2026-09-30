import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import App from "../App";
beforeEach(() => {
  vi.stubEnv("VITE_ENABLE_DEMO", "true");
  window.history.replaceState({}, "", "/login");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("workspace workflows", () => {
  it("redirects unauthenticated deep links to sign in", async () => {
    window.history.replaceState({}, "", "/team");
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "Your workspace awaits." }),
    ).toBeInTheDocument();
  });
  it("searches and paginates members, then previews an account update without network writes", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Admin preview" }));
    fireEvent.click(
      await screen.findByRole("link", { name: "Members" }),
    );
    await screen.findByRole("heading", { name: /People at the heart/ });
    expect(await screen.findByText("Amelia Thompson")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(await screen.findByText("Charlotte Lee")).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Search name or email…" }),
      { target: { value: "Amelia" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Search" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "View Amelia Thompson" }),
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("First name"), {
      target: { value: "Amelia Updated" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Save changes" }),
    );
    expect(
      await screen.findByText("Preview only — no member data was changed."),
    ).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("limits support UI and keeps support edits separate from content publishing", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Support preview" }));
    expect(
      await screen.findByRole("link", { name: "Support inbox" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Team & access" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Total members")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("link", { name: "Health content" }),
    );
    expect(
      await screen.findByText("Small steps, stronger habits"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Create health tip" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Read tip" })[0]);
    expect(
      within(screen.getByRole("dialog")).getByLabelText("Title"),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Save health tip" }),
    ).not.toBeInTheDocument();
  });
  it("accepts a staff invitation from the emailed link", async () => {
    const token = "t".repeat(43);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (url) =>
        Response.json({
          success: true,
          data: String(url).endsWith("/staff-invites/preview")
            ? {
                email: "sam@example.com",
                role: "support",
                expiresAt: "2026-10-07T00:00:00.000Z",
              }
            : { email: "sam@example.com", role: "support" },
        }),
      );
    window.history.replaceState({}, "", `/accept-invite#${token}`);
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "Join the Leira workspace." }),
    ).toBeInTheDocument();
    // The token is dropped from the address bar once read.
    expect(window.location.hash).toBe("");
    expect(screen.getByLabelText("Work email")).toHaveValue("sam@example.com");
    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Sam" },
    });
    fireEvent.change(screen.getByLabelText("Last name"), {
      target: { value: "Carter" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Str0ngPass!" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "Str0ngPass!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
    expect(
      await screen.findByRole("heading", { name: "Welcome to the team." }),
    ).toBeInTheDocument();
    const [, init] = fetchSpy.mock.calls[1];
    expect(JSON.parse(String(init?.body))).toEqual({
      token,
      firstName: "Sam",
      lastName: "Carter",
      password: "Str0ngPass!",
      confirmPassword: "Str0ngPass!",
    });
  });
  it("explains an invitation link without a token", async () => {
    window.history.replaceState({}, "", "/accept-invite");
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "This link can’t be used." }),
    ).toBeInTheDocument();
  });
  it("shows support case details and previews a resolution", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Admin preview" }));
    fireEvent.click(
      await screen.findByRole("link", { name: "Support inbox" }),
    );
    fireEvent.click(
      (await screen.findAllByRole("button", { name: "Review" }))[0],
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Status"), {
      target: { value: "resolved" },
    });
    fireEvent.change(within(dialog).getByLabelText("Resolution note"), {
      target: { value: "Connection restored." },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Save changes" }),
    );
    expect(
      await screen.findByText("Preview only — no support case was changed."),
    ).toBeInTheDocument();
  });
});
