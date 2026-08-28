import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import OtpView from "../../../features/user-signin-otp/OtpView";
import { getAuthToken } from "../../../utils/auth";
import { ROLE_TESTATOR } from "../../../constants";

// A ref-object placeholder — OtpView only ever calls .focus() on entries,
// which the jsdom-rendered <input> elements provide for real once mounted.
const makeOtpRefs = () => ({ current: [] as (HTMLInputElement | null)[] });

describe("OtpView", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("verifies the phone code but does NOT issue a session token itself", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ phone: "9876543210", email: "user@example.com", verified: false, expiresInSeconds: 300 }),
    } as unknown as Response);
    const onNext = vi.fn();

    render(
      <OtpView otp={["1","2","3","4","5","6"]} handleOtp={() => {}} otpRefs={makeOtpRefs()}
        phone="9876543210" email="user@example.com" onNext={onNext}/>,
    );
    fireEvent.click(screen.getByText("Verify & Continue"));

    await waitFor(() => expect(onNext).toHaveBeenCalled());
    expect(fetchSpy).toHaveBeenCalled();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("/api/auth/otp/verify");
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      phone: "9876543210", code: "123456", email: "user@example.com",
    });
    // The vulnerability this two-step flow closes: phone verification alone
    // must never leave a usable session token behind.
    expect(getAuthToken(ROLE_TESTATOR)).toBeNull();
  });

  it("shows an error and does not advance when verification fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false, status: 400,
      headers: { get: () => "application/json" },
      json: async () => ({ error: "The OTP you entered is incorrect." }),
    } as unknown as Response);
    const onNext = vi.fn();

    render(
      <OtpView otp={["1","2","3","4","5","6"]} handleOtp={() => {}} otpRefs={makeOtpRefs()}
        phone="9876543210" email="user@example.com" onNext={onNext}/>,
    );
    fireEvent.click(screen.getByText("Verify & Continue"));

    expect(await screen.findByText("The OTP you entered is incorrect.")).toBeInTheDocument();
    expect(onNext).not.toHaveBeenCalled();
  });
});
