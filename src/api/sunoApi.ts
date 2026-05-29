export async function generateSunoMusic(prompt: string, makeInstrumental: boolean): Promise<string> {
  const res = await fetch('/api/suno/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      make_instrumental: makeInstrumental,
      wait_audio: false
    })
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || 'Failed to generate music');
  }
  
  const data = await res.json();
  // returns taskId or an array of items, typically a taskId or track IDs
  if (data && data.length > 0) {
     return data[0].id;
  }
  return data.id || Date.now().toString(); // Mock id fallback
}

export async function pollSunoMusic(taskId: string): Promise<any[]> {
  const res = await fetch(`/api/suno/poll?ids=${taskId}`);
  if (!res.ok) {
    throw new Error('Failed to poll music');
  }
  const data = await res.json();
  
  // Parse the data format from suno-api
  // Typically returns array of song objects
  if (Array.isArray(data)) {
    return data.map(song => ({
      id: song.id,
      title: song.title,
      image_url: song.image_url,
      audio_url: song.audio_url,
      video_url: song.video_url,
      status: song.status, // "streaming", "complete", "error"
      tags: song.tags
    }));
  }
  return [];
}
