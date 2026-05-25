import localforage from 'localforage';

export const vibrate = async (ms = 40) => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  } catch {}
};

export const saveMediaToGallery = async (item: { id: number, type: 'image'|'video', prompt: string, blob: Blob | string }) => {
  try {
    const items: any[] = (await localforage.getItem('inixa_gallery')) || [];
    items.unshift({ ...item, date: new Date().toISOString() });
    await localforage.setItem('inixa_gallery', items);
    return true;
  } catch (err) {
    console.error('Gallery Save Error:', err);
    return false;
  }
};
