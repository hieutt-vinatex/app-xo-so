import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PrizeNavigation } from "./PrizeNavigation";

describe("PrizeNavigation", () => {
  it("selects an individual prize", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<PrizeNavigation value="all" onChange={onChange} />);

    const g3 = screen.getByRole("tab", { name: /Giải ba/ });
    await user.click(g3);

    expect(onChange).toHaveBeenCalledWith("g3");
    rerender(<PrizeNavigation value="g3" onChange={onChange} />);
    expect(g3).toHaveAttribute("aria-selected", "true");
  });
});
