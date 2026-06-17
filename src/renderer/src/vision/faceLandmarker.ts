import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from '@mediapipe/tasks-vision'

let landmarker: FaceLandmarker | null = null

async function createLandmarker(delegate: 'GPU' | 'CPU'): Promise<FaceLandmarker> {
  const wasmPath = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  const vision = await FilesetResolver.forVisionTasks(wasmPath)

  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: '/models/face_landmarker.task',
      delegate
    },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFaceBlendshapes: true
  })
}

export async function initFaceLandmarker(): Promise<FaceLandmarker> {
  if (landmarker) return landmarker

  try {
    landmarker = await createLandmarker('GPU')
  } catch (gpuErr) {
    console.warn('[StudyLens] GPU delegate failed, retrying with CPU:', gpuErr)
    landmarker = await createLandmarker('CPU')
  }

  return landmarker
}

export function detectFace(
  video: HTMLVideoElement,
  timestampMs: number
): FaceLandmarkerResult | null {
  if (!landmarker) return null
  return landmarker.detectForVideo(video, timestampMs)
}
