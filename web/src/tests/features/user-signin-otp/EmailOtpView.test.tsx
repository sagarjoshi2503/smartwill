import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EmailOtpView from "../../../features/user-signin-otp/EmailOtpView";
import { getAuthToken } from "../../../utils/auth";
import { ROLE_TESTATOR } from "../../../constants";

const makeOtpRefs = () => ({ current: [] as (HTMLInputElement | null)[] });

describe("EmailOtpView", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("verifies the email code and stores the returned session token", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ phone: "9876543210", email: "user@example.com", verified: true, token: "fake.jwt.token" }),
    } as unknown as Response);
    const onNext = vi.fn();

    render(
      <EmailOtpView emailOtp={["1","2","3","4","5","6"]} handleEmailOtp={() => {}} emailOtpRefs={makeOtpRefs()}
        phone="9876543210" email="user@example.com" onNext={onNext}/>,
    );
    fireEvent.click(screen.getByText("Verify & Continue"));

    await waitFor(() => expect(onNext).toHaveBeenCalled());
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("/api/auth/otp/verify-email");
    // Only phone + code are ever sent here — never a client-supplied email,
    // since the server always uses the email it captured during the phone
    // OTP step (see verify_email_otp's docstring/comment on the backend).
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ phone: "9876543210", code: "123456" });
    expect(getAuthToken(ROLE_TESTATOR)).toBe("fake.jwt.token");
  });

  it("shows an error and does not store a token when the email code is wrong", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false, status: 400,
      headers: { get: () => "application/json" },
      json: async () => ({ error: "The verification code you entered is incorrect." }),
    } as unknown as Response);
    const onNext = vi.fn();

    render(
      <EmailOtpView emailOtp={["1","2","3","4","5","6"]} handleEmailOtp={() => {}} emailOtpRefs={makeOtpRefs()}
        phone="9876543210" email="user@example.com" onNext={onNext}/>,
    );
    fireEvent.click(screen.getByText("Verify & Continue"));

    expect(await screen.findByText("The verification code you entered is incorrect.")).toBeInTheDocument();
    expect(onNext).not.toHaveBeenCalled();
    expect(getAuthToken(ROLE_TESTATOR)).toBeNull();
  });
});
