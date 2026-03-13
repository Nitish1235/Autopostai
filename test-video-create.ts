import { POST } from './app/api/video/create/route.ts';
import { NextRequest } from 'next/server';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Mock Clerk auth
jest.mock('@clerk/nextjs/server', () => ({
  auth: () => Promise.resolve({ userId: 'user_2te_dummy' })
}));

async function run() {
  const payload = {
    topic: "History of Rome",
    niche: "history",
    format: "30s",
    imageStyle: "cinematic",
    voiceId: "ryan",
    voiceSpeed: 1,
    musicMood: "motivational",
    musicVolume: 0.15,
    subtitleConfig: {
      font: "inter",
      fontSize: 48,
      primaryColor: "#FFFFFF",
      activeColor: "#FFD700",
      spokenColor: "#AAAAAA",
      firstWordAccent: false,
      accentColor: "#FF0000",
      strokeColor: "#000000",
      strokeWidth: 2,
      backgroundBox: true,
      bgColor: "#000000",
      bgOpacity: 50,
      bgRadius: 8,
      shadow: true,
      glow: false,
      animation: "pop",
      animationDuration: 0.2,
      position: 80,
      alignment: "center",
      maxWordsPerLine: 2,
      uppercase: true
    },
    platforms: ["youtube"],
    generationMode: "image_stack"
  };

  const req = new NextRequest('http://localhost:3000/api/video/create', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  try {
    const res = await POST(req);
    console.log("Response status:", res.status);
    const text = await res.text();
    console.log("Response body:", text);
  } catch (err) {
    console.error("Stack trace:", err);
  }
}

run();
