import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfileView from "../../../features/client-profile/ProfileView";
import { setAuthToken, getAuthToken } from "../../../utils/auth";
import { ROLE_TESTATOR } from "../../../constants";

const jsonResponse = (body: unknown, ok = true) => ({
  ok, status: ok ? 200 : 400,
  headers: { get: () => "application/json" },
  json: async () => body,
} as unknown as Response);

describe("ProfileView", () => {
  beforeEach(() => {
    localStorage.clear();
    setAuthToken(ROLE_TESTATOR, "fake.jwt.token");
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads and displays the email and current mobile number", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ email: "jane@example.com", mobileNumber: "9876543210" }),
    );
    render(<ProfileView onBack={() => {}}/>);

    expect(await screen.findByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("+91 9876543210")).toBeInTheDocument();
  });

  it("shows \"Not set\" when there is no mobile number on file", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ email: "jane@example.com", mobileNumber: null }));
    render(<ProfileView onBack={() => {}}/>);

    expect(await screen.findByText("Not set")).toBeInTheDocument();
  });

  it("changes the mobile number through the full request-otp / verify-otp flow", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ email: "jane@example.com", mobileNumber: "9876543210" }))
      .mockResolvedValueOnce(jsonResponse({ mobileNumber: "9111111111", expiresInSeconds: 300 }))
      .mockResolvedValueOnce(jsonResponse({ mobileNumber: "9111111111", verified: true }));

    render(<ProfileView onBack={() => {}}/>);
    await screen.findByText("+91 9876543210");

    fireEvent.click(screen.getByText("Change Mobile Number"));
    fireEvent.change(screen.getByPlaceholderText("10-digit number"), { target: { value: "9111111111" } });
    fireEvent.click(screen.getByText("Send Code"));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    const [requestUrl, requestInit] = fetchSpy.mock.calls[1];
    expect(String(requestUrl)).toContain("/api/client/profile/mobile/request-otp");
    expect(JSON.parse(String((requestInit as RequestInit).body))).toEqual({ mobileNumber: "9111111111" });

    const boxes = await screen.findAllByRole("textbox");
    // 6 OTP boxes appear once the code-entry step renders.
    const otpBoxes = boxes.filter(b => b.getAttribute("maxlength") === "1");
    expect(otpBoxes).toHaveLength(6);
    "123456".split("").forEach((d, i) => fireEvent.change(otpBoxes[i], { target: { value: d } }));

    fireEvent.click(screen.getByText("Verify & Save"));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(3));
    const [verifyUrl, verifyInit] = fetchSpy.mock.calls[2];
    expect(String(verifyUrl)).toContain("/api/client/profile/mobile/verify-otp");
    expect(JSON.parse(String((verifyInit as RequestInit).body))).toEqual({ code: "123456" });

    expect(await screen.findByText("+91 9111111111")).toBeInTheDocument();
    expect(screen.getByText("Mobile number updated.")).toBeInTheDocument();
  });

  it("shows an error and does not advance when the entered code is wrong", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ email: "jane@example.com", mobileNumber: "9876543210" }))
      .mockResolvedValueOnce(jsonResponse({ mobileNumber: "9111111111", expiresInSeconds: 300 }))
      .mockResolvedValueOnce(jsonResponse({ error: "The OTP you entered is incorrect." }, false));

    render(<ProfileView onBack={() => {}}/>);
    await screen.findByText("+91 9876543210");

    fireEvent.click(screen.getByText("Change Mobile Number"));
    fireEvent.change(screen.getByPlaceholderText("10-digit number"), { target: { value: "9111111111" } });
    fireEvent.click(screen.getByText("Send Code"));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));

    const otpBoxes = (await screen.findAllByRole("textbox")).filter(b => b.getAttribute("maxlength") === "1");
    expect(otpBoxes).toHaveLength(6);
    "000000".split("").forEach((d, i) => fireEvent.change(otpBoxes[i], { target: { value: d } }));
    fireEvent.click(screen.getByText("Verify & Save"));

    expect(await screen.findByText("The OTP you entered is incorrect.")).toBeInTheDocument();
    // Still on the old number — the change was never applied.
    expect(screen.queryByText("+91 9111111111")).not.toBeInTheDocument();
  });

  it("attaches the testator bearer token to every request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ email: "jane@example.com", mobileNumber: "9876543210" }),
    );
    render(<ProfileView onBack={() => {}}/>);
    await screen.findByText("jane@example.com");

    const [, init] = fetchSpy.mock.calls[0];
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.get("Authorization")).toBe(`Bearer ${getAuthToken(ROLE_TESTATOR)}`);
  });
});
