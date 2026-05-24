import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import LanguageSwitcher from "./LanguageSwitcher";

const { changeLanguageMock } = vi.hoisted(() => ({
  changeLanguageMock: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === "auto.switch_language") return "Switch language";
      return key;
    },
    i18n: {
      language: "en",
      changeLanguage: changeLanguageMock,
    },
  }),
}));

describe("LanguageSwitcher", () => {
  it("opens the menu and switches the selected language", async () => {
    render(<LanguageSwitcher />);

    const trigger = screen.getByRole("button", { name: /switch language/i });
    fireEvent.pointerDown(trigger, {
      pointerId: 1,
      pointerType: 'mouse',
    });
    fireEvent.click(trigger);

    const item = await screen.findByRole("menuitem", { name: /తెలుగు/i });
    fireEvent.click(item);

    expect(changeLanguageMock).toHaveBeenCalledWith("te");
  });

  it("closes when clicking outside", async () => {
    render(<LanguageSwitcher />);

    const trigger = screen.getByRole("button", { name: /switch language/i });
    fireEvent.pointerDown(trigger, {
      pointerId: 1,
      pointerType: 'mouse',
    });
    fireEvent.click(trigger);

    expect(await screen.findByText("English")).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    fireEvent.pointerUp(document.body);

    await waitFor(() => {
      expect(screen.queryByText("English")).not.toBeInTheDocument();
    });
  });
});
