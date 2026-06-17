import { useEffect, useRef } from 'react'
import { FATIGUE_BREAK_SECONDS } from '../constants/thresholds'
import { useSessionStore } from '../store/sessionStore'
import type { DistanceStatus, Mood } from '../types/metrics'
import { BlinkDetector } from '../vision/blinkDetector'
import { estimateDistanceStatus, estimateFaceRatio } from '../vision/distanceEstimator'
import { ExpressionEstimator } from '../vision/expressionEstimator'
import { detectFace, initFaceLandmarker } from '../vision/faceLandmarker'

function computeFatigueLevel(
  blinksPerMinute: number,
  mood: Mood,
  distanceStatus: DistanceStatus
): number {
  let level = 0
  if (blinksPerMinute < 10) level += 0.4
  if (mood === 'tired') level += 0.4
  if (distanceStatus === 'too_near') level += 0.2
  return Math.min(level, 1)
}

function buildAlert(
  distanceStatus: DistanceStatus,
  mood: Mood,
  blinksPerMinute: number
): string | null {
  if (distanceStatus === 'too_near') return '请远离屏幕，保持一臂距离'
  if (distanceStatus === 'too_far') return '请靠近摄像头或调整坐姿'
  if (mood === 'tired' || blinksPerMinute < 10) return '眨眼偏少，注意休息'
  if (mood === 'restless') return '状态烦躁，试试深呼吸'
  return null
}

export function useVisionLoop(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>
): { loading: boolean } {
  const blinkDetector = useRef(new BlinkDetector())
  const expressionEstimator = useRef(new ExpressionEstimator())
  const breakEndTime = useRef<number | null>(null)
  const lastTimestamp = useRef(0)
  const prevDistance = useRef<DistanceStatus>('none')
  const prevMood = useRef<Mood>('unknown')
  const loadingRef = useRef(true)

  const isRunning = useSessionStore((s) => s.isRunning)
  const showMesh = useSessionStore((s) => s.showMesh)
  const updateMetrics = useSessionStore((s) => s.updateMetrics)
  const setReady = useSessionStore((s) => s.setReady)
  const setError = useSessionStore((s) => s.setError)

  useEffect(() => {
    if (isRunning) {
      blinkDetector.current.reset()
      expressionEstimator.current.reset()
      prevDistance.current = 'none'
      prevMood.current = 'unknown'
    }
  }, [isRunning])

  useEffect(() => {
    let rafId = 0
    let stream: MediaStream | null = null
    let cancelled = false

    async function setup(): Promise<void> {
      try {
        await initFaceLandmarker()
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false
        })

        const video = videoRef.current
        if (!video || cancelled) return

        video.srcObject = stream
        await video.play()
        setReady(true)
        loadingRef.current = false

        const loop = (): void => {
          if (cancelled || !videoRef.current) return

          const video = videoRef.current
          const canvas = canvasRef.current
          const now = performance.now()

          if (video.readyState >= 2 && now !== lastTimestamp.current) {
            lastTimestamp.current = now
            const result = detectFace(video, now)

            if (result?.faceLandmarks?.[0]) {
              const landmarks = result.faceLandmarks[0]
              const blendshapes = result.faceBlendshapes?.[0]?.categories
              const nose = landmarks[1]

              const blink = blinkDetector.current.update(landmarks, Date.now())
              const faceRatio = estimateFaceRatio(landmarks)
              const distanceStatus = estimateDistanceStatus(faceRatio)
              const mood = expressionEstimator.current.update(
                blendshapes,
                nose,
                blink.blinksPerMinute,
                blink.ear,
                Date.now()
              )
              const fatigueLevel = computeFatigueLevel(
                blink.blinksPerMinute,
                mood,
                distanceStatus
              )
              const alertMessage = buildAlert(distanceStatus, mood, blink.blinksPerMinute)

              if (
                isRunning &&
                distanceStatus !== 'good' &&
                distanceStatus !== 'none' &&
                prevDistance.current !== distanceStatus
              ) {
                useSessionStore.setState((s) => ({
                  distanceAlerts: s.distanceAlerts + 1
                }))
              }
              prevDistance.current = distanceStatus

              if (isRunning && mood === 'tired' && prevMood.current !== 'tired') {
                useSessionStore.setState((s) => ({
                  tiredSamples: s.tiredSamples + 1
                }))
              }
              prevMood.current = mood

              let showBreak = false
              let breakSecondsLeft = 0
              if (
                isRunning &&
                fatigueLevel >= 0.6 &&
                distanceStatus === 'too_near' &&
                blink.blinksPerMinute < 12
              ) {
                if (!breakEndTime.current) {
                  breakEndTime.current = Date.now() + FATIGUE_BREAK_SECONDS * 1000
                }
                showBreak = true
                breakSecondsLeft = Math.max(
                  0,
                  Math.ceil((breakEndTime.current - Date.now()) / 1000)
                )
                if (breakSecondsLeft <= 0) breakEndTime.current = null
              } else {
                breakEndTime.current = null
              }

              updateMetrics({
                blinkCount: blink.blinkCount,
                blinksPerMinute: blink.blinksPerMinute,
                ear: blink.ear,
                mood,
                faceRatio,
                distanceStatus,
                fatigueLevel,
                alertMessage,
                showBreak,
                breakSecondsLeft
              })

              if (canvas && showMesh) {
                const ctx = canvas.getContext('2d')
                if (ctx) {
                  canvas.width = video.videoWidth
                  canvas.height = video.videoHeight
                  ctx.clearRect(0, 0, canvas.width, canvas.height)
                  ctx.strokeStyle = '#4ade80'
                  ctx.lineWidth = 1
                  for (const p of landmarks) {
                    const x = p.x * canvas.width
                    const y = p.y * canvas.height
                    ctx.beginPath()
                    ctx.arc(x, y, 1.2, 0, Math.PI * 2)
                    ctx.fillStyle = '#4ade80'
                    ctx.fill()
                  }
                }
              } else if (canvas) {
                const ctx = canvas.getContext('2d')
                ctx?.clearRect(0, 0, canvas.width, canvas.height)
              }
            } else {
              updateMetrics({
                blinkCount: blinkDetector.current.getCount(),
                blinksPerMinute: 0,
                ear: 0,
                mood: 'unknown',
                faceRatio: 0,
                distanceStatus: 'none',
                fatigueLevel: 0,
                alertMessage: '未检测到人脸',
                showBreak: false,
                breakSecondsLeft: 0
              })
            }
          }

          rafId = requestAnimationFrame(loop)
        }

        loop()
      } catch (err) {
        setError(err instanceof Error ? err.message : '摄像头初始化失败')
      }
    }

    setup()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [videoRef, canvasRef, isRunning, showMesh, updateMetrics, setReady, setError])

  return { loading: loadingRef.current }
}
