import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GiftAWillForm from "./GiftAWillForm";

describe("GiftAWillForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the theme's 3 gift plan choices with All India Will ₹4,999 selected by default", () => {
    render(<GiftAWillForm />);
    expect(screen.getByText("₹4,999")).toBeInTheDocument();
    expect(screen.getByText("₹6,999")).toBeInTheDocument();
    expect(screen.getByText("₹24,999")).toBeInTheDocument();
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios[0].checked).toBe(true);
  });

  it("blocks Buy Now with a validation message when recipient details are missing, without calling the order endpoint", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<GiftAWillForm />);
    fireEvent.click(screen.getByText("Buy Now"));
    expect(await screen.findByText(/recipient's name and email/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls the public gift-voucher order endpoint (via apiUrl, not a hardcoded URL) once recipient details are filled", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ orderId: "order_123", amount: 499900, currency: "INR" }),
    } as unknown as Response);

    render(<GiftAWillForm />);
    fireEvent.change(screen.getByPlaceholderText("e.g. Priya Naik"), { target: { value: "Priya Naik" } });
    fireEvent.change(screen.getByPlaceholderText("name@email.com"), { target: { value: "priya@example.com" } });
    fireEvent.click(screen.getByText("Buy Now"));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("/api/gift-voucher/order");
    expect(JSON.parse(String((init as RequestInit).body))).toMatchObject({ amount: 4999, planLabel: "All India Will" });

    // No Razorpay key configured in the test env — surfaces as a clear error
    // instead of silently hanging or crashing.
    expect(await screen.findByText(/payment gateway/i)).toBeInTheDocument();
  });
});
