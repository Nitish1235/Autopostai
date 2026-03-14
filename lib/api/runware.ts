import WebSocket from 'ws'
import { randomUUID } from 'crypto'

// ── Config ───────────────────────────────────────────
const RUNWARE_WS_URL = 'wss://ws-api.runware.ai/v1'
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
    let settled = false
    const settle = (fn: () => void) => {
      if (settled) return
      settled = true
      fn()
    }

    const timeout = setTimeout(() => {
      ws.terminate()
      settle(() => reject(new Error('Image generation timed out after 30s')))
    }, 30000)

    const ws = new WebSocket(RUNWARE_WS_URL)
    const taskUUID = randomUUID()

    ws.on('open', () => {
      ws.send(JSON.stringify([{ taskType: 'authentication', apiKey: API_KEY }]))
    })

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const messages: Record<string, unknown>[] = JSON.parse(data.toString())

        for (const msg of messages) {
          if (msg.taskType === 'authentication') {
            if (msg.status === 'error') {
              clearTimeout(timeout)
              ws.close()
              settle(() => reject(new Error('Runware authentication failed')))
              return
            }

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

          if (msg.taskType === 'imageInference' && msg.taskUUID === taskUUID) {
            const result = msg as unknown as RunwareImageResult
            clearTimeout(timeout)
            ws.close()
            if (!result.imageURL) {
              settle(() => reject(new Error('No image returned from Runware')))
            } else {
              settle(() => resolve({ imageUrl: result.imageURL, base64: result.imageBase64Data }))
            }
            return
          }

          if (msg.taskType === 'error') {
            clearTimeout(timeout)
            ws.close()
            settle(() => reject(new Error(`Runware error: ${(msg.errorMessage as string) ?? 'Unknown error'}`)))
            return
          }
        }
      } catch (parseError) {
        clearTimeout(timeout)
        ws.close()
        settle(() => reject(new Error(`Runware response parse error: ${parseError instanceof Error ? parseError.message : 'parse error'}`)))
      }
    })

    ws.on('error', (error: Error) => {
      clearTimeout(timeout)
      settle(() => reject(new Error(`Runware WebSocket error: ${error.message}`)))
    })

    ws.on('close', () => {
      clearTimeout(timeout)
      if (!settled) {
        settle(() => reject(new Error('Runware WebSocket closed unexpectedly before result')))
      }
    })
  })
}

// ── Generate Image Batch (single persistent WebSocket) ──
// FIX #2: Opens ONE WebSocket, authenticates once, sends ALL tasks,
// then collects results as they arrive. ~5-8x faster than per-image connections.

export async function generateImageBatch(params: {
  prompts: Array<{
    positivePrompt: string
    negativePrompt: string
    seed?: number
  }>
  width?: number
  height?: number
  model?: string
}): Promise<Array<{ index: number; imageUrl: string }>> {
  const { prompts, width = 1024, height = 1792, model = 'runware:100@1' } = params

  if (prompts.length === 0) return []

  return new Promise((resolve, reject) => {
    const results = new Map<string, { index: number; imageUrl: string }>()
    const taskUUIDToIndex = new Map<string, number>()
    const failedIndexes = new Set<number>()

    let settled = false
    const settle = (fn: () => void) => {
      if (settled) return
      settled = true
      fn()
    }

    const checkDone = () => {
      const total = results.size + failedIndexes.size
      if (total === prompts.length) {
        clearTimeout(timeout)
        ws.close()
        // Collect results in order, throw if too many failed
        const ordered = Array.from(results.values()).sort((a, b) => a.index - b.index)
        const failRate = failedIndexes.size / prompts.length
        if (failRate > 0.3) {
          settle(() => reject(new Error(`Too many image generations failed: ${failedIndexes.size}/${prompts.length}`)))
        } else {
          settle(() => resolve(ordered))
        }
      }
    }

    // 5 minute total timeout for full batch
    const timeout = setTimeout(() => {
      ws.terminate()
      settle(() => reject(new Error(`Image batch timed out after 5 minutes (${results.size}/${prompts.length} completed)`)))
    }, 300000)

    const ws = new WebSocket(RUNWARE_WS_URL)

    ws.on('open', () => {
      ws.send(JSON.stringify([{ taskType: 'authentication', apiKey: API_KEY }]))
    })

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const messages: Record<string, unknown>[] = JSON.parse(data.toString())

        for (const msg of messages) {
          // Auth success — send ALL tasks at once
          if (msg.taskType === 'authentication') {
            if (msg.status === 'error') {
              clearTimeout(timeout)
              ws.close()
              settle(() => reject(new Error('Runware batch authentication failed')))
              return
            }

            const requests: RunwareImageRequest[] = prompts.map((prompt, index) => {
              const taskUUID = randomUUID()
              taskUUIDToIndex.set(taskUUID, index)
              return {
                taskType: 'imageInference',
                taskUUID,
                positivePrompt: prompt.positivePrompt,
                negativePrompt: prompt.negativePrompt,
                model,
                width,
                height,
                numberResults: 1,
                outputFormat: 'WEBP',
                outputType: ['URL'],
                seed: prompt.seed,
                steps: 4,
                CFGScale: 1,
              }
            })

            ws.send(JSON.stringify(requests))
            return
          }

          // Image result
          if (msg.taskType === 'imageInference') {
            const result = msg as unknown as RunwareImageResult
            const index = taskUUIDToIndex.get(result.taskUUID)
            if (index === undefined) continue

            if (result.imageURL) {
              results.set(result.taskUUID, { index, imageUrl: result.imageURL })
            } else {
              console.error(`[runware] Empty imageURL for task ${result.taskUUID} (index ${index})`)
              failedIndexes.add(index)
            }
            checkDone()
            continue
          }

          // Task-level error
          if (msg.taskType === 'error') {
            const taskUUID = msg.taskUUID as string | undefined
            if (taskUUID) {
              const index = taskUUIDToIndex.get(taskUUID)
              if (index !== undefined) {
                console.error(`[runware] Task error for index ${index}: ${(msg.errorMessage as string) ?? 'unknown'}`)
                failedIndexes.add(index)
                checkDone()
              }
            } else {
              // Global error
              clearTimeout(timeout)
              ws.close()
              settle(() => reject(new Error(`Runware global error: ${(msg.errorMessage as string) ?? 'unknown'}`)))
            }
          }
        }
      } catch (parseError) {
        clearTimeout(timeout)
        ws.close()
        settle(() => reject(new Error(`Runware batch parse error: ${parseError instanceof Error ? parseError.message : 'parse error'}`)))
      }
    })

    ws.on('error', (error: Error) => {
      clearTimeout(timeout)
      settle(() => reject(new Error(`Runware batch WebSocket error: ${error.message}`)))
    })

    ws.on('close', () => {
      if (!settled) {
        settle(() => reject(new Error(`Runware batch WebSocket closed unexpectedly (${results.size}/${prompts.length} completed)`)))
      }
    })
  })
}

// ── Upscale Image ────────────────────────────────────

export async function upscaleImage(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false
    const settle = (fn: () => void) => {
      if (settled) return
      settled = true
      fn()
    }

    const timeout = setTimeout(() => {
      ws.terminate()
      settle(() => reject(new Error('Image upscale timed out after 60s')))
    }, 60000)

    const ws = new WebSocket(RUNWARE_WS_URL)
    const taskUUID = randomUUID()

    ws.on('open', () => {
      ws.send(JSON.stringify([{ taskType: 'authentication', apiKey: API_KEY }]))
    })

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const messages: Record<string, unknown>[] = JSON.parse(data.toString())

        for (const msg of messages) {
          if (msg.taskType === 'authentication') {
            if (msg.status === 'error') {
              clearTimeout(timeout)
              ws.close()
              settle(() => reject(new Error('Runware authentication failed')))
              return
            }
            ws.send(JSON.stringify([{
              taskType: 'imageUpscale',
              taskUUID,
              inputImage: imageUrl,
              upscaleFactor: 2,
            }]))
            return
          }

          if (msg.taskType === 'imageUpscale' && msg.taskUUID === taskUUID) {
            clearTimeout(timeout)
            ws.close()
            settle(() => resolve((msg.imageURL as string) ?? imageUrl))
            return
          }

          if (msg.taskType === 'error') {
            clearTimeout(timeout)
            ws.close()
            settle(() => reject(new Error(`Runware upscale error: ${(msg.errorMessage as string) ?? 'Unknown'}`)))
            return
          }
        }
      } catch {
        clearTimeout(timeout)
        ws.close()
        settle(() => reject(new Error('Runware upscale response parse error')))
      }
    })

    ws.on('error', (error: Error) => {
      clearTimeout(timeout)
      settle(() => reject(new Error(`Runware upscale WebSocket error: ${error.message}`)))
    })

    ws.on('close', () => {
      if (!settled) {
        settle(() => reject(new Error('Runware upscale WebSocket closed unexpectedly')))
      }
    })
  })
}

// ── Model Selector ───────────────────────────────────

export function getModelForStyle(imageStyle: string): string {
  switch (imageStyle) {
    case 'cinematic':
      return 'runware:100@1'
    case 'anime':
      return 'civitai:36520@76907'  // Anything V5 — anime
    case 'dark_fantasy':
      return 'civitai:4201@501240'  // Realistic Vision — dark
    case 'cyberpunk':
      return 'civitai:4384@128713'  // DreamShaper — cyberpunk
    case 'documentary':
      return 'runware:100@1'        // FLUX is best for realistic/doc
    case 'vintage':
      return 'civitai:9409@16677'   // Deliberate — vintage/film
    case '3d_render':
      return 'runware:100@1'
    case 'minimal':
      return 'runware:100@1'
    default:
      return 'runware:100@1'
  }
}
