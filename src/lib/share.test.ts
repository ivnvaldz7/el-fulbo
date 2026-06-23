import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shareImageBlob, supportsFileShare } from './share';

describe('share helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('detects file share support only when navigator.canShare accepts files', () => {
    const file = new File(['x'], 'card.png', { type: 'image/png' });
    expect(
      supportsFileShare(
        {
          share: vi.fn(),
          canShare: vi.fn(() => true),
        } as unknown as Navigator,
        file,
      ),
    ).toBe(true);

    expect(
      supportsFileShare(
        {
          share: vi.fn(),
          canShare: vi.fn(() => false),
        } as unknown as Navigator,
        file,
      ),
    ).toBe(false);
  });

  it('uses Web Share API with files when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        share,
        canShare: vi.fn(() => true),
      },
      configurable: true,
    });

    const result = await shareImageBlob({
      blob: new Blob(['png'], { type: 'image/png' }),
      fileName: 'mi-card.png',
      title: 'Mi card',
      text: 'Overall 89',
    });

    expect(result).toBe('shared');
    expect(share).toHaveBeenCalledOnce();
  });

  it('falls back to download when file share is unavailable', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        share: vi.fn(),
        canShare: vi.fn(() => false),
      },
      configurable: true,
    });

    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const appendChild = vi.spyOn(document.body, 'appendChild');
    const removeChild = vi.spyOn(document.body, 'removeChild');
    const anchor = document.createElement('a');
    const click = vi.fn();
    anchor.click = click;
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);

    const result = await shareImageBlob({
      blob: new Blob(['png'], { type: 'image/png' }),
      fileName: 'mi-card.png',
      title: 'Mi card',
      text: 'Overall 89',
    });

    expect(result).toBe('downloaded');
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(appendChild).toHaveBeenCalledOnce();
    expect(removeChild).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledOnce();
  });
});
