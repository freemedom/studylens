import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from '@mediapipe/tasks-vision'

let landmarker: FaceLandmarker | null = null

export async function initFaceLandmarker(): Promise<FaceLandmarker> {
  if (landmarker) return landmarker

  const wasmPath = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  const vision = await FilesetResolver.forVisionTasks(wasmPath)

  landmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: '/models/face_landmarker.task',
      delegate: 'GPU'
    },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFaceBlendshapes: true
  })

  return landmarker
}

export function detectFace(video: HTMLVideoElement, timestampMs: number): FaceLandmarkerResult | null {
  if (!landmarker) return null
  return landmarker.detectForVideo(video, timestampMs)
}
