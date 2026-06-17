export type VisionInitStage = 'model' | 'camera' | 'video'

export class VisionInitError extends Error {
  readonly stage: VisionInitStage
  readonly cause: unknown

  constructor(stage: VisionInitStage, cause: unknown) {
    super(formatVisionInitError(stage, cause))
    this.name = 'VisionInitError'
    this.stage = stage
    this.cause = cause
  }
}

function domExceptionDetail(err: DOMException): string {
  switch (err.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return [
        'Camera permission was denied.',
        'Likely fix: Windows Settings → Privacy → Camera → allow desktop apps;',
        'or macOS System Settings → Privacy & Security → Camera → enable StudyLens.',
        'Then fully quit and restart the app.'
      ].join('\n')
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return [
        'No camera device was found.',
        'Likely fix: connect a webcam, disable "camera off" on laptops,',
        'or check Device Manager / System Information.'
      ].join('\n')
    case 'NotReadableError':
    case 'TrackStartError':
      return [
        'The camera exists but could not be opened.',
        'Likely fix: close Zoom, Teams, OBS, or other apps using the camera,',
        'then restart StudyLens.'
      ].join('\n')
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return [
        'The requested resolution or facingMode is not supported.',
        'Likely fix: we can relax video constraints in code (already attempted on retry).'
      ].join('\n')
    case 'SecurityError':
      return 'Camera access requires a secure context. In Electron this usually means a misconfigured window or CSP.'
    case 'AbortError':
      return 'Camera request was aborted (often due to rapid mount/unmount in React StrictMode). Try refreshing or restarting the app.'
    default:
      return `Browser error (${err.name}): ${err.message}`
  }
}

function modelErrorDetail(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  const lines = [`MediaPipe / Face Landmarker failed: ${msg}`]

  if (/fetch|network|Failed to load|ECONNREFUSED|ENOTFOUND/i.test(msg)) {
    lines.push(
      'Likely fix: check internet access (WASM loads from cdn.jsdelivr.net).',
      'If offline, bundle WASM locally or use a VPN/firewall exception.'
    )
  }
  if (/face_landmarker|model|404|not found/i.test(msg)) {
    lines.push(
      'Likely fix: ensure public/models/face_landmarker.task exists.',
      'Re-download: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
    )
  }
  if (/webgl|gpu|GL|delegate/i.test(msg)) {
    lines.push(
      'Likely fix: GPU/WebGL issue — the app will retry with CPU delegate.',
      'Update graphics drivers or run: npm run dev again after the CPU fallback patch.'
    )
  }
  if (/wasm|WebAssembly/i.test(msg)) {
    lines.push('Likely fix: CSP must allow wasm-unsafe-eval (see src/renderer/index.html).')
  }

  return lines.join('\n')
}

export function formatVisionInitError(stage: VisionInitStage, err: unknown): string {
  const stageLabel =
    stage === 'model'
      ? '[Step 1/3] Face model'
      : stage === 'camera'
        ? '[Step 2/3] Camera'
        : '[Step 3/3] Video playback'

  let detail: string
  if (stage === 'model') {
    detail = modelErrorDetail(err)
  } else if (stage === 'camera' && err instanceof DOMException) {
    detail = domExceptionDetail(err)
  } else if (stage === 'camera') {
    detail =
      err instanceof Error
        ? `getUserMedia failed: ${err.name ? `${err.name}: ` : ''}${err.message}`
        : `getUserMedia failed: ${String(err)}`
    if (!navigator.mediaDevices?.getUserMedia) {
      detail += '\nLikely fix: mediaDevices API unavailable in this environment.'
    }
  } else {
    detail =
      err instanceof Error
        ? `Video element failed to play: ${err.message}`
        : `Video element failed to play: ${String(err)}`
    detail += '\nLikely fix: camera stream was obtained but attaching to <video> failed; restart the app.'
  }

  return `${stageLabel}\n${detail}`
}

export async function requestCameraStream(): Promise<MediaStream> {
  const constraints: MediaStreamConstraints[] = [
    { video: { width: 640, height: 480, facingMode: 'user' }, audio: false },
    { video: true, audio: false }
  ]

  let lastError: unknown
  for (const c of constraints) {
    try {
      return await navigator.mediaDevices.getUserMedia(c)
    } catch (e) {
      lastError = e
      if (e instanceof DOMException && e.name === 'OverconstrainedError') continue
      throw e
    }
  }
  throw lastError
}
