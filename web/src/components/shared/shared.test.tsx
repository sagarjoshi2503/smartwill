import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Clause from "./Clause";
import FormBlock from "./FormBlock";
import Nav from "./Nav";
import StepHeader from "./StepHeader";
import Toggle from "./Toggle";
import WillSection from "./WillSection";

describe("Clause", () => {
  it("renders the title and children", () => {
    render(<Clause title="Revocation"><p>Body text</p></Clause>);
    expect(screen.getByText("Revocation")).toBeInTheDocument();
    expect(screen.getByText("Body text")).toBeInTheDocument();
  });
});

describe("FormBlock", () => {
  it("renders the title when provided", () => {
    render(<FormBlock title="Testator Details"><span>child</span></FormBlock>);
    expect(screen.getByText("Testator Details")).toBeInTheDocument();
  });

  it("omits the title element when not provided", () => {
    render(<FormBlock><span>child only</span></FormBlock>);
    expect(screen.queryByText("Testator Details")).not.toBeInTheDocument();
    expect(screen.getByText("child only")).toBeInTheDocument();
  });
});

describe("Nav", () => {
  it("renders and fires the Back button's onClick", () => {
    const onPrev = vi.fn();
    render(<Nav onPrev={onPrev} />);
    fireEvent.click(screen.getByText("Back"));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("renders and fires the Next button's onClick", () => {
    const onNext = vi.fn();
    render(<Nav onNext={onNext} />);
    fireEvent.click(screen.getByText("Next"));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("renders neither button when no handlers are given", () => {
    render(<Nav />);
    expect(screen.queryByText("Back")).not.toBeInTheDocument();
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
  });
});

describe("StepHeader", () => {
  it("renders icon, title, and sub text", () => {
    render(<StepHeader icon={<span data-testid="icon" />} title="Testator" sub="Basic details" />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByText("Testator")).toBeInTheDocument();
    expect(screen.getByText("Basic details")).toBeInTheDocument();
  });
});

describe("Toggle", () => {
  it("renders unchecked state and calls onChange(true) when clicked", () => {
    const onChange = vi.fn();
    render(<Toggle label="Has minors" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByText("Has minors").parentElement!.querySelector("div")!);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("renders checked state and calls onChange(false) when clicked", () => {
    const onChange = vi.fn();
    render(<Toggle label="Has minors" checked={true} onChange={onChange} />);
    fireEvent.click(screen.getByText("Has minors").parentElement!.querySelector("div")!);
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe("WillSection", () => {
  it("renders the section number, title, and children", () => {
    render(<WillSection num="I" title="Testator Details"><p>content</p></WillSection>);
    expect(screen.getByText(/SECTION I:/)).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });
});
