import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "./App";

describe("site nav", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network disabled in test")));
  });

  it("can navigate away from Partner with Us back to Home", async () => {
    render(<App/>);

    fireEvent.click(screen.getByRole("button", { name: "Partner with Us" }));
    await waitFor(() => expect(screen.getByText("Let's get you onboarded")).toBeInTheDocument());

    const homeButtons = screen.getAllByRole("button", { name: "Home" });
    fireEvent.click(homeButtons[0]);

    await waitFor(() => expect(screen.getByText(/All your legacy planning needs/i)).toBeInTheDocument());
  });
});
