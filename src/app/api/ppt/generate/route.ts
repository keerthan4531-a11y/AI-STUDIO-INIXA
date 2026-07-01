import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { prompt, theme = 'royal_blue', n_slides = 8 } = await req.json();

    // The endpoint of our self-hosted Presenton docker container running on port 5000
    const PRESENTON_API_URL = 'http://127.0.0.1:5000/api/v1/ppt/presentation/generate';

    // Build JSON request body
    const requestBody = {
      content: prompt,
      n_slides: Number(n_slides),
      export_as: 'pptx'
    };

    console.log(`[Next.js API] Requesting Presenton at ${PRESENTON_API_URL} with payload:`, requestBody);

    const authHeader = 'Basic ' + Buffer.from('admin:adminpassword').toString('base64');
    const res = await fetch(PRESENTON_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[Next.js API] Presenton backend returned error:', res.status, errorText);
      return NextResponse.json({ error: `Presenton error: ${errorText || res.statusText}` }, { status: 502 });
    }

    // Read the returned presentation file as arrayBuffer and convert to Buffer
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save PPTX file to public/exports directory
    const filename = `Presentation_${Date.now()}.pptx`;
    const exportPath = path.join(process.cwd(), 'public', 'exports', filename);

    fs.writeFileSync(exportPath, buffer);

    console.log(`[Next.js API] PPTX generated and saved to ${exportPath}`);

    return NextResponse.json({ 
      success: true, 
      downloadUrl: `/exports/${filename}`,
      filename: filename
    });

  } catch (error: any) {
    console.error('[Next.js API] Error generating PPTX via Presenton:', error);
    return NextResponse.json({ 
      error: `Failed to connect to Presenton container: ${error.message}. Please make sure Presenton is running on port 5000.` 
    }, { status: 500 });
  }
}
