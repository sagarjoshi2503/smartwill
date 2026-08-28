import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DateOfBirthInput from "../../../components/shared/DateOfBirthInput";

// Controlled-input harness — DateOfBirthInput takes value/onChange from its
// parent (like every real call site: WizardForms.tsx/TestatorStep.tsx), so
// exercising blur-driven validation against a *changed* value needs
// something that actually re-renders it with the new value, same as those
// real parents do.
function Harness({requireAdult}: {requireAdult?: boolean}){
  const [value,setValue]=useState("");
  return <DateOfBirthInput label="Date of Birth" value={value} onChange={setValue} requireAdult={requireAdult}/>;
}

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const yearsAgoISO = (years: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear()-years);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

describe("DateOfBirthInput", () => {
  it("renders the label and forwards typed value changes via onChange", () => {
    const onChange = vi.fn();
    render(<DateOfBirthInput label="Date of Birth" value="" onChange={onChange}/>);
    expect(screen.getByText("Date of Birth")).toBeInTheDocument();
    fireEvent.change(document.querySelector("input")!, {target:{value: "2000-01-01"}});
    expect(onChange).toHaveBeenCalledWith("2000-01-01");
  });

  it("sets the native max attribute to today, blocking future-date picking", () => {
    render(<DateOfBirthInput label="Date of Birth" value="" onChange={() => {}}/>);
    expect(document.querySelector("input")).toHaveAttribute("max", todayISO());
  });

  it("shows a future-date error on blur, for any field (requireAdult or not)", () => {
    render(<Harness/>);
    const input = document.querySelector("input")!;
    const future = yearsAgoISO(-1); // one year in the future
    fireEvent.change(input, {target:{value: future}});
    fireEvent.blur(input);
    expect(screen.getByText("Date of birth cannot be a future date")).toBeInTheDocument();
  });

  it("flags an under-18 date of birth only when requireAdult is set", () => {
    render(<Harness requireAdult/>);
    const input = document.querySelector("input")!;
    fireEvent.change(input, {target:{value: yearsAgoISO(10)}});
    fireEvent.blur(input);
    expect(screen.getByText("Must be at least 18 years old")).toBeInTheDocument();
  });

  it("does not flag an under-18 date of birth when requireAdult is omitted (e.g. Beneficiary)", () => {
    render(<Harness/>);
    const input = document.querySelector("input")!;
    fireEvent.change(input, {target:{value: yearsAgoISO(10)}});
    fireEvent.blur(input);
    expect(screen.queryByText("Must be at least 18 years old")).not.toBeInTheDocument();
    expect(screen.queryByText("Date of birth cannot be a future date")).not.toBeInTheDocument();
  });

  it("accepts a valid adult date of birth with requireAdult set — no error", () => {
    render(<Harness requireAdult/>);
    const input = document.querySelector("input")!;
    fireEvent.change(input, {target:{value: yearsAgoISO(30)}});
    fireEvent.blur(input);
    expect(screen.queryByText(/Must be at least/)).not.toBeInTheDocument();
    expect(screen.queryByText(/cannot be a future date/)).not.toBeInTheDocument();
  });

  it("shows no error when the field is blurred while still empty", () => {
    render(<Harness requireAdult/>);
    fireEvent.blur(document.querySelector("input")!);
    expect(screen.queryByText(/Must be at least/)).not.toBeInTheDocument();
    expect(screen.queryByText(/cannot be a future date/)).not.toBeInTheDocument();
  });

  it("clears a shown error as soon as the value changes again", () => {
    render(<Harness requireAdult/>);
    const input = document.querySelector("input")!;
    fireEvent.change(input, {target:{value: yearsAgoISO(10)}});
    fireEvent.blur(input);
    expect(screen.getByText("Must be at least 18 years old")).toBeInTheDocument();

    fireEvent.change(input, {target:{value: yearsAgoISO(30)}});
    expect(screen.queryByText("Must be at least 18 years old")).not.toBeInTheDocument();
  });

  it("passes through the disabled prop", () => {
    render(<DateOfBirthInput label="Date of Birth" value="" onChange={() => {}} disabled/>);
    expect(document.querySelector("input")).toBeDisabled();
  });
});
