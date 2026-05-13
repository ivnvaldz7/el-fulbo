export type ShareImageResult = 'shared' | 'downloaded' | 'cancelled';

type ShareNavigator = Navigator & {
  canShare?: (data?: ShareData) => boolean;
};

export function supportsFileShare(targetNavigator: ShareNavigator, file: File) {
  if (typeof targetNavigator.share !== 'function') {
    return false;
  }

  if (typeof targetNavigator.canShare !== 'function') {
    return false;
  }

  return targetNavigator.canShare({ files: [file] });
}

export async function shareImageBlob(input: {
  blob: Blob;
  fileName: string;
  title: string;
  text: string;
}): Promise<ShareImageResult> {
  const file = new File([input.blob], input.fileName, { type: 'image/png' });
  const targetNavigator = navigator as ShareNavigator;

  try {
    if (supportsFileShare(targetNavigator, file)) {
      await targetNavigator.share({
        title: input.title,
        text: input.text,
        files: [file],
      });
      return 'shared';
    }

    const objectUrl = URL.createObjectURL(input.blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = input.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
    return 'downloaded';
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      return 'cancelled';
    }

    throw error;
  }
}
