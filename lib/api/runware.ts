import WebSocket from 'ws'
import { randomUUID } from 'crypto'

// ── Config ───────────────────────────────────────────
const RUNWARE_WS_URL = 'wss://ws.runware.ai/v1'
const API_KEY = process.env.RUNWARE_API_KEY!

// ── Interfaces ───────────────────────────────────────

interface RunwareImageRequest {
  taskType: 'imageInference'
  taskUUID: string
  positivePrompt: string
  negativePrompt: string
  model: string
  width: number
  height: number
  numberResults: number
  outputFormat: string
  seed?: number
  steps?: number
  CFGScale?: number
  outputType: string[]
}

interface RunwareImageResult {
  taskUUID: string
  imageURL: string
  imageBase64Data?: string
  imageSrc?: string
  taskType: string
}

// ── Generate Single Image ────────────────────────────

export async function generateImage(params: {
  positivePrompt: string
  negativePrompt: string
  width?: number
  height?: number
  seed?: number
  model?: string
}): Promise<{ imageUrl: string; base64?: string }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close()
      reject(new Error('Image generation timed out after 30s'))
    }, 30000)

    const ws = new WebSocket(RUNWARE_WS_URL)
    let authenticated = false
    const taskUUID = randomUUID()

    ws.on('open', () => {
      // Send authentication
      ws.send(
        JSON.stringify([
          {
            taskType: 'authentication',
            apiKey: API_KEY,
          },
        ])
      )
    })

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const messages: Record<string, unknown>[] = JSON.parse(data.toString())

        for (const msg of messages) {
          // Handle authentication response
          if (msg.taskType === 'authentication') {
            if (msg.status === 'error') {
              clearTimeout(timeout)
              ws.close()
              reject(new Error('Runware authentication failed'))
              return
            }
            authenticated = true

            // Send image generation task
            const request: RunwareImageRequest = {
              taskType: 'imageInference',
              taskUUID,
              positivePrompt: params.positivePrompt,
              negativePrompt: params.negativePrompt,
              model: params.model ?? 'runware:100@1',
              width: params.width ?? 1024,
              height: params.height ?? 1792,
              numberResults: 1,
              outputFormat: 'WEBP',
              outputType: ['URL'],
              seed: params.seed,
              steps: 4,
              CFGScale: 1,
            }
            ws.send(JSON.stringify([request]))
            return
          }

          // Handle image result
          if (msg.taskType === 'imageInference' && msg.taskUUID === taskUUID) {
            const result = msg as unknown as RunwareImageResult
            if (!result.imageURL) {
              clearTimeout(timeout)
              ws.close()
              reject(new Error('No image returned from Runware'))
              return
            }
            clearTimeout(timeout)
            ws.close()
            resolve({
              imageUrl: result.imageURL,
              base64: result.imageBase64Data,
            })
            return
          }

          // Handle errors
          if (msg.taskType === 'error') {
            clearTimeout(timeout)
            ws.close()
            reject(
              new Error(
                `Runware error: ${(msg.errorMessage as string) ?? 'Unknown error'}`
              )
            )
            return
          }
        }
      } catch (parseError) {
        clearTimeout(timeout)
        ws.close()
        const message =
          parseError instanceof Error ? parseError.message : 'Parse error'
        reject(new Error(`Runware response parse error: ${message}`))
      }
    })

    ws.on('error', (error: Error) => {
      clearTimeout(timeout)
      reject(new Error(`Runware WebSocket error: ${error.message}`))
    })

    ws.on('close', () => {
      clearTimeout(timeout)
      if (!authenticated) {
        reject(new Error('Runware WebSocket closed before authentication'))
      }
    })
  })
}

// ── Generate Image Batch ─────────────────────────────

export async function generateImageBatch(params: {
  prompts: Array<{
    positivePrompt: string
    negativePrompt: string
    seed?: number
  }>
  width?: number
  height?: number
  model?: string
  concurrency?: number
}): Promise<Array<{ index: number; imageUrl: string }>> {
  const { prompts, width, height, model, concurrency = 3 } = params
  const results: Array<{ index: number; imageUrl: string }> = []

  // Process in batches
  for (let i = 0; i < prompts.length; i += concurrency) {
    const batch = prompts.slice(i, i + concurrency)

    const batchResults = await Promise.allSettled(
      batch.map(async (prompt, batchIndex) => {
        const globalIndex = i + batchIndex

        try {
          const result = await generateImage({
            positivePrompt: prompt.positivePrompt,
            negativePrompt: prompt.negativePrompt,
            width,
            height,
            seed: prompt.seed,
            model,
          })
          return { index: globalIndex, imageUrl: result.imageUrl }
        } catch {
          // Retry once on failure
          try {
            const retryResult = await generateImage({
              positivePrompt: prompt.positivePrompt,
              negativePrompt: prompt.negativePrompt,
              width,
              height,
              seed: prompt.seed,
              model,
            })
            return { index: globalIndex, imageUrl: retryResult.imageUrl }
          } catch (retryError) {
            console.error(
              `Image generation failed for index ${globalIndex} after retry:`,
              retryError
            )
            return null
          }
        }
      })
    )

    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value !== null) {
        results.push(result.value)
      }
    }
  }

  return results.sort((a, b) => a.index - b.index)
}

// ── Upscale Image ────────────────────────────────────

export async function upscaleImage(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close()
      reject(new Error('Image upscale timed out after 60s'))
    }, 60000)

    const ws = new WebSocket(RUNWARE_WS_URL)
    const taskUUID = randomUUID()

    ws.on('open', () => {
      ws.send(
        JSON.stringify([
          {
            taskType: 'authentication',
            apiKey: API_KEY,
          },
        ])
      )
    })

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const messages: Record<string, unknown>[] = JSON.parse(data.toString())

        for (const msg of messages) {
          if (msg.taskType === 'authentication') {
            if (msg.status === 'error') {
              clearTimeout(timeout)
              ws.close()
              reject(new Error('Runware authentication failed'))
              return
            }

            // Send upscale task
            ws.send(
              JSON.stringify([
                {
                  taskType: 'imageUpscale',
                  taskUUID,
                  inputImage: imageUrl,
                  upscaleFactor: 2,
                },
              ])
            )
            return
          }

          if (msg.taskType === 'imageUpscale' && msg.taskUUID === taskUUID) {
            clearTimeout(timeout)
            ws.close()
            resolve((msg.imageURL as string) ?? imageUrl)
            return
          }

          if (msg.taskType === 'error') {
            clearTimeout(timeout)
            ws.close()
            reject(
              new Error(
                `Runware upscale error: ${(msg.errorMessage as string) ?? 'Unknown'}`
              )
            )
            return
          }
        }
      } catch {
        clearTimeout(timeout)
        ws.close()
        reject(new Error('Runware upscale response parse error'))
      }
    })

    ws.on('error', (error: Error) => {
      clearTimeout(timeout)
      reject(new Error(`Runware upscale WebSocket error: ${error.message}`))
    })

    ws.on('close', () => {
      clearTimeout(timeout)
    })
  })
}

// ── Model Selector ───────────────────────────────────

export function getModelForStyle(imageStyle: string): string {
  switch (imageStyle) {
    case 'cinematic':
      return 'runware:100@1'
    case 'anime':
      return 'civitai:36520@76907'
    case 'dark_fantasy':
      return 'runware:100@1'
    case 'cyberpunk':
      return 'runware:100@1'
    case 'documentary':
      return 'runware:100@1'
    case 'vintage':
      return 'runware:100@1'
    case '3d_render':
      return 'runware:100@1'
    case 'minimal':
      return 'runware:100@1'
    default:
      return 'runware:100@1'
  }
}
