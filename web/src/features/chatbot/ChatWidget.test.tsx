import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ChatWidget from "./ChatWidget";

const fakeChatResponse = (reply: string) =>
  ({
    ok: true,
    headers: { get: () => "application/json" },
    json: async () => ({ reply, unavailable: false, retrieval_mode: "mcp" }),
  }) as unknown as Response;

const sendMessage = async (text: string) => {
  const input = screen.getByPlaceholderText(/ask a question/i);
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: "Enter" });
};

describe("ChatWidget", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the same threadId across multiple messages in one conversation", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(fakeChatResponse("first reply"))
      .mockResolvedValueOnce(fakeChatResponse("second reply"));

    render(<ChatWidget onContactSupport={() => {}} />);
    fireEvent.click(screen.getByLabelText(/open chat assistant/i));

    await sendMessage("hello");
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    await screen.findByText("first reply");

    await sendMessage("how are you");
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));

    const firstThreadId = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body)).threadId;
    const secondThreadId = JSON.parse(String(fetchSpy.mock.calls[1][1]?.body)).threadId;
    expect(firstThreadId).toBeTruthy();
    expect(secondThreadId).toBe(firstThreadId);
  });

  it("generates a new threadId after Clear Chat is clicked, used by the next message sent", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(fakeChatResponse("first reply"))
      .mockResolvedValueOnce(fakeChatResponse("second reply"));

    render(<ChatWidget onContactSupport={() => {}} />);
    fireEvent.click(screen.getByLabelText(/open chat assistant/i));

    await sendMessage("hello");
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    await screen.findByText("first reply");
    const firstThreadId = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body)).threadId;

    fireEvent.click(screen.getByLabelText(/clear chat messages/i));

    await sendMessage("hello again");
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    const secondThreadId = JSON.parse(String(fetchSpy.mock.calls[1][1]?.body)).threadId;

    expect(secondThreadId).toBeTruthy();
    expect(secondThreadId).not.toBe(firstThreadId);
  });
});
