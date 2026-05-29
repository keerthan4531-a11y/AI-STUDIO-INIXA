import { NextResponse } from 'next/server';

const SUNO_API_URL = process.env.SUNO_API_URL || 'https://studio-api.suno.ai';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const ids = url.searchParams.get('ids');
    
    if (SUNO_API_URL.includes('api')) {
      const res = await fetch(`${SUNO_API_URL}/api/get?ids=${ids}`);
      const data = await res.json();
      return NextResponse.json(data);
    }

    // Mock response for demonstration
    // Simulate generation completion after 10 seconds
    const mockId = ids || "mock";
    const timeSinceId = parseInt(mockId.split('-')[1] || "0");
    const isReady = Date.now() - timeSinceId > 10000;
    
    return NextResponse.json([{
      id: mockId,
      title: "Tamil Fusion Beat",
      image_url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80",
      audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      video_url: "",
      status: isReady ? "complete" : "streaming",
      tags: "tamil, rock, fast, electronic"
    }]);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
