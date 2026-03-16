// ── Script Prompt Builder for GPT-4o ─────────────────

export function buildScriptSystemPrompt(): string {
  return `You are an expert viral short-form video scriptwriter.
You write scripts for faceless AI videos posted on TikTok,
Instagram Reels, and YouTube Shorts.

YOUR SCRIPTS MUST:
- Open with an irresistible hook in the FIRST sentence
  (shocking stat, controversial claim, or open loop question)
- Use short punchy sentences. Max 12 words per sentence.
- Sound natural when spoken aloud — no robotic phrasing
- Build curiosity throughout — never fully reveal until the end
- End with a strong payoff or call to action
- Match the energy of the format length

HOOK TYPES (rotate between these):
- Shocking stat: 'In 1971, one decision destroyed $8 trillion.'
- Controversial: 'The school system was designed to keep you poor.'
- Open loop: 'What Warren Buffett does every morning at 5AM...'
- Challenge: 'Most people will never know this about money.'
- Curiosity gap: 'The one thing Apple never wants you to find out.'

OUTPUT FORMAT — respond ONLY with valid JSON, no markdown, no
backticks, no explanation. Just the raw JSON object.

{
  "title": "Short punchy video title (max 60 chars)",
  "segments": [
    {
      "id": "seg_001",
      "order": 1,
      "narration": "The narration text spoken aloud",
      "imagePrompt": "Detailed image generation prompt for this scene",
      "estimatedDuration": 4.2
    }
  ],
  "totalEstimatedDuration": 32.5
}

IMAGE PROMPT RULES:
- Follow this exact structure:
  [Subject] [Action/Pose] [Environment] [Lighting] [Mood] [Camera angle]
- Be specific and cinematic. Bad: 'a rich person'.
  Good: 'a confident businessman in navy suit standing in glass
  penthouse office, city skyline at dusk, warm ambient lighting,
  mood of power and ambition, wide angle low shot looking up'
- Never include text, words, or letters in image prompts
- Never describe the style (style is added separately)
- Each image prompt must be visually distinct from others
- Vary shot types: establishing wide shot, medium shot,
  close-up detail, action shot, consequence shot
- Include specific lighting: golden hour, dramatic shadows,
  neon glow, soft diffused, harsh midday, etc.`
}

export function buildScriptUserPrompt(
  topic: string,
  niche: string,
  format: string,
  segmentCount: number
): string {
  const nicheLine = niche === 'custom' ? '' : `Niche: ${niche}\n`

  return `Create a viral short-form video script about: ${topic}

${nicheLine}Format: ${format} video
Required segments: exactly ${segmentCount}
Estimated duration per segment: ${getDurationPerSegment(format)} seconds

Requirements:
- Hook must be in the VERY FIRST sentence
- Each segment narration: ${getNarrationLength(format)} words max
- Each image prompt: describe a completely different scene
- Vary shot angles across all ${segmentCount} segments
- End on a satisfying payoff or strong CTA

Generate exactly ${segmentCount} segments. No more, no less.`
}

export function getDurationPerSegment(format: string): number {
  switch (format) {
    case '30s':
      return 3.5
    case '60s':
      return 3.5
    case '90s':
      return 3.5
    default:
      return 3.5
  }
}

export function getNarrationLength(format: string): number {
  switch (format) {
    case '30s':
      return 20
    case '60s':
      return 22
    case '90s':
      return 25
    default:
      return 20
  }
}

export function getSegmentCount(format: string): number {
  switch (format) {
    case '30s':
      return 11
    case '60s':
      return 20
    case '90s':
      return 28
    default:
      return 11
  }
}

export function buildTopicGenerationPrompt(
  niche: string,
  count: number,
  existingTopics: string[]
): string {
  return `Generate ${count} viral short-form video topics for the ${niche} niche on TikTok and YouTube Shorts.

REQUIREMENTS:
- Each topic must have strong viral potential
- Include a mix of: shocking facts, controversial takes, hidden secrets, how-to reveals, comparison/ranking
- Topics must be suitable for faceless AI video format
- NO duplicate or similar topics
- Do NOT use these already-used topics: ${existingTopics.join(', ')}

OUTPUT: Valid JSON array only. No markdown. No explanation.
["Topic 1", "Topic 2", ...]

Examples of great topics:
- "The one habit Warren Buffett credits for all his wealth"
- "Why Japan has not had a mass shooting in 50 years"
- "The $300 billion company that started in a garage in 1976"
- "What happens to your body 24 hours after quitting sugar"`
}
