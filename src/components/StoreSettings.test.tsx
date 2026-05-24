import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import StoreSettings from "./StoreSettings";

const { toastMock } = vi.hoisted(() => ({
  toastMock: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

const seller = {
  id: "seller-1",
  user_id: "user-1",
  full_name: "Ravi",
  store_name: "Ravi Boutique",
  store_slug: "ravi-boutique",
  store_description: "Classic styles",
  location: "Mumbai",
  phone: null,
  contact_number: "+91 9999999999",
  store_number: "12",
  maps_url: "",
  created_at: "2026-03-15T00:00:00.000Z",
};

describe("StoreSettings", () => {
  it("extracts iframe src values before saving", async () => {
    const onUpdate = vi.fn().mockResolvedValue({ error: null });

    render(
        <StoreSettings seller={seller} onUpdate={onUpdate} />
    );

    fireEvent.change(screen.getByPlaceholderText("https://www.google.com/maps/embed?pb=..."), {
      target: {
        value:
          '<iframe src="https://www.google.com/maps/embed?pb=test-map"></iframe>',
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          maps_url: "https://www.google.com/maps/embed?pb=test-map",
          store_slug: "ravi-boutique-mumbai",
        }),
      );
    });
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Saved" }),
    );
  });

  it("shows an error toast when saving fails", async () => {
    const onUpdate = vi.fn().mockResolvedValue({ error: new Error("failed") });

    render(
        <StoreSettings seller={seller} onUpdate={onUpdate} />
    );

    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "destructive" }),
      );
    });
  });
});
