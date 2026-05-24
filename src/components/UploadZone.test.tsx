import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import UploadZone from "./UploadZone";

const {
  toastMock,
  invokeMock,
  uploadMock,
  getPublicUrlMock,
  insertMock,
  updateMock,
  eqMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  invokeMock: vi.fn(),
  uploadMock: vi.fn(),
  getPublicUrlMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
  eqMock: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: uploadMock,
        getPublicUrl: getPublicUrlMock,
      })),
    },
    functions: {
      invoke: invokeMock,
    },
    from: vi.fn((table: string) => {
      if (table === "files" || table === "products") {
        return {
          insert: insertMock,
          update: updateMock,
        };
      }
      return {
        eq: eqMock,
      };
    }),

  },
}));

describe("UploadZone", () => {
  beforeEach(() => {
    toastMock.mockReset();
    invokeMock.mockReset();
    uploadMock.mockReset();
    getPublicUrlMock.mockReset();
    insertMock.mockReset();
    updateMock.mockReset();
    eqMock.mockReset();

    updateMock.mockReturnValue({ eq: eqMock });
    eqMock.mockResolvedValue({ error: null });
  });

  it("shows an error toast for files larger than 5MB", async () => {
    render(<UploadZone sellerId="seller-1" onComplete={vi.fn()} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const largeFile = new File(["x"], "large.png", { type: "image/png" });
    Object.defineProperty(largeFile, "size", { value: 6 * 1024 * 1024 });

    fireEvent.change(input, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "File too large",
          variant: "destructive",
        }),
      );
    });
  });

  it("uploads, digitizes, and completes a valid file batch", async () => {
    const onComplete = vi.fn();

    uploadMock.mockResolvedValue({ error: null });
    getPublicUrlMock.mockReturnValue({
      data: { publicUrl: "https://example.com/upload.png" },
    });
    insertMock
      .mockImplementationOnce(() => ({
        select: () => ({
          single: async () => ({ data: { id: "file-1" } }),
        }),
      }))
      .mockResolvedValueOnce({ error: null });
    invokeMock.mockResolvedValue({
      data: {
        product: {
          title: "Digitized Saree",
          description: "Silk blend",
          price: 1299,
          category: "Sarees",
          tags: ["festive"],
        },
      },
      error: null,
    });

    render(<UploadZone sellerId="seller-1" onComplete={onComplete} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["image"], "catalog.png", { type: "image/png" });

    fireEvent.change(input, { target: { files: [file] } });

    // Step 1: Review and Approve
    await screen.findByText("Review Products");
    fireEvent.click(screen.getByRole("button", { name: /Approve/i }));

    await screen.findByText("upload.complete");


    expect(uploadMock).toHaveBeenCalled();
    expect(invokeMock).toHaveBeenCalledWith("digitize", {
      body: {
        imageUrl: "https://example.com/upload.png",
        sellerId: "seller-1",
      },
    });
    expect(onComplete).toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith({
      title: "Digitization complete",
      description: "1 files processed.",
    });
  });
});
