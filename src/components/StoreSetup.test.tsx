import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import StoreSetup from './StoreSetup';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: 'http://example.com/file.jpg' },
        })),
      })),
    },
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseMock,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
  }),
}));

describe('StoreSetup', () => {
  it('builds a slug from the store name and location on submit', async () => {
    const onComplete = vi.fn();

    render(<StoreSetup onComplete={onComplete} />);

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: 'Ravi Kumar' },
    });
    fireEvent.change(screen.getByLabelText(/contact number/i), {
      target: { value: '+91 9999999999' },
    });

    // Using getByLabelText as suggested
    fireEvent.change(screen.getByLabelText(/location/i), {
      target: { value: 'Hyderabad' },
    });

    fireEvent.change(screen.getByLabelText(/store name/i), {
      target: { value: "Ravi's Boutique" },
    });
    fireEvent.change(screen.getByLabelText(/store description/i), {
      target: { value: 'Festival collection' },
    });
    fireEvent.change(screen.getByLabelText(/shop \/ store number/i), {
      target: { value: '12A' },
    });
    fireEvent.change(screen.getByLabelText(/legal business name/i), {
      target: { value: 'Ravi Retail Pvt Ltd' },
    });

    // Need to upload a file because it's required in handleSubmit
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(
      /verification documents/i,
    ) as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.submit(
      screen.getByRole('button', { name: /create/i }).closest('form')!,
    );

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'Ravi Kumar',
          store_name: "Ravi's Boutique",
          store_slug: 'ravi-s-boutique-hyderabad',
          location: 'Hyderabad',
        }),
      );
    });
  });
});
