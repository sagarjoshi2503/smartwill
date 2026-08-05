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

  it("Contact Us is a standalone page like Home/About Us, not a footer-scroll", async () => {
    render(<App/>);

    // The header nav's "Contact Us" button renders before any page content
    // in the DOM (Home's plan cards also have a same-labelled "Contact Us"
    // button for the consultation-only plans), so it's the first match.
    fireEvent.click(screen.getAllByRole("button", { name: "Contact Us" })[0]);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Contact Us" })).toBeInTheDocument());
  });
});
