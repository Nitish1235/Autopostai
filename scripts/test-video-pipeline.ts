import { buildMegaRenderCommand } from '../lib/ffmpeg/transitions'

const command = buildMegaRenderCommand({
  imagePaths: ['img0.webp', 'img1.webp', 'img2.webp'],
  durations: [5, 5, 5],
  motions: ['zoom_in', 'pan_left', 'zoom_out'],
  audioPath: 'mixed_audio.aac',
  outputPath: 'output.mp4',
  transitionType: 'crossfade',
  transitionDuration: 0.5,
  imageStyle: 'cinematic',
  assSubtitlePath: 'subtitles.ass',
  fps: 30
})

console.log(command.join(' '));
