import { describe, expect, it, vi } from 'vitest';

const { renderMock, createRootMock } = vi.hoisted(() => ({
  renderMock: vi.fn(),
  createRootMock: vi.fn(() => ({ render: renderMock })),
}));

vi.mock('react-dom/client', () => ({
  createRoot: createRootMock,
}));

vi.mock('@/App', () => ({
  default: () => null,
}));

describe('main entry', () => {
  it('mounts the app into the root element', async () => {
    document.body.innerHTML = '<div id="root"></div>';

    await import('@/main');

    expect(createRootMock).toHaveBeenCalledWith(
      document.getElementById('root'),
    );
    expect(renderMock).toHaveBeenCalled();
  }, 20000);
});
