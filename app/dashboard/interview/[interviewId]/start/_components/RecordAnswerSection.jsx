"use client"

import Webcam from 'react-webcam'
import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Mic, Eye, EyeOff, Volume2, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { chatSession } from '@/utils/GeminiAIModel'
import { UserAnswer } from '@/utils/schema'
import { useUser } from '@clerk/nextjs'
import { db } from '@/utils/db'
import moment from 'moment'
import { Textarea } from '@/components/ui/textarea'

function RecordAnswerSection({ mockInterviewQuestion, activeQuestionIndex, interviewData }) {
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [userAnswer, setUserAnswer] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const wasRecordingRef = useRef(false)

  // Dynamic Eye Contact Percentage State (0 - 100%)
  const [eyeContactPercentage, setEyeContactPercentage] = useState(98)
  const [isLookingAtCamera, setIsLookingAtCamera] = useState(true)
  const webcamRef = useRef(null)
  const recognitionRef = useRef(null)
  const lookAwayTimerRef = useRef(null)

  // Real-time Audio Volume & Quality states
  const [volumeLevel, setVolumeLevel] = useState(0) // 0 to 100
  const [voiceQuality, setVoiceQuality] = useState('Mic Inactive')
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animFrameRef = useRef(null)
  const micStreamRef = useRef(null)

  // Reset user answer draft when switching active question
  useEffect(() => {
    setUserAnswer('')
  }, [activeQuestionIndex])

  // Soft warning beep when looking away for extended period
  const playWarningBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime)
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4)

      osc.connect(gain)
      gain.connect(audioCtx.destination)

      osc.start()
      osc.stop(audioCtx.currentTime + 0.4)
    } catch (err) {
      console.error('Audio playback error:', err)
    }
  }

  const handleFocused = () => {
    setIsLookingAtCamera(true)
    if (lookAwayTimerRef.current) {
      clearTimeout(lookAwayTimerRef.current)
      lookAwayTimerRef.current = null
    }
  }

  const handleLookAway = () => {
    setIsLookingAtCamera(false)
    if (!lookAwayTimerRef.current) {
      lookAwayTimerRef.current = setTimeout(() => {
        playWarningBeep()
      }, 1200)
    }
  }

  // Dynamically load MediaPipe FaceMesh scripts for Eye Contact Percentage tracking
  useEffect(() => {
    let cameraInstance = null
    let active = true

    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve()
          return
        }
        const script = document.createElement('script')
        script.src = src
        script.crossOrigin = 'anonymous'
        script.onload = () => resolve()
        script.onerror = (err) => reject(err)
        document.body.appendChild(script)
      })
    }

    Promise.all([
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'),
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js'),
    ])
      .then(() => {
        if (!active) return
        if (window.FaceMesh && window.Camera) {
          const faceMesh = new window.FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
          })

          faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          })

          faceMesh.onResults((results) => {
            if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
              setEyeContactPercentage((prev) => Math.max(0, Math.round(prev * 0.7)))
              setIsLookingAtCamera(false)
              handleLookAway()
              return
            }

            const landmarks = results.multiFaceLandmarks[0]
            const leftCorner = landmarks[33]
            const rightCorner = landmarks[133]
            const iris = landmarks[468]

            if (leftCorner && rightCorner && iris) {
              const eyeWidth = Math.abs(rightCorner.x - leftCorner.x)
              const irisPos = Math.abs(iris.x - leftCorner.x)
              const ratioX = irisPos / (eyeWidth || 1)

              // Ideal center ratio looking directly into camera lens is ~0.50
              const deviation = Math.abs(ratioX - 0.50)

              // Calculate dynamic percentage: high percentage when aligned, dropping when eyes move away
              let rawScore = 100
              if (deviation > 0.05) {
                rawScore = Math.max(15, Math.min(100, Math.round(100 - (deviation - 0.05) * 350)))
              }

              setEyeContactPercentage((prev) => {
                const smoothed = Math.round(prev * 0.65 + rawScore * 0.35)
                const finalScore = Math.min(100, Math.max(0, smoothed))
                setIsLookingAtCamera(finalScore >= 60)
                return finalScore
              })

              if (deviation <= 0.15) {
                handleFocused()
              } else {
                handleLookAway()
              }
            }
          })

          if (webcamRef.current && webcamRef.current.video) {
            cameraInstance = new window.Camera(webcamRef.current.video, {
              onFrame: async () => {
                if (webcamRef.current?.video) {
                  await faceMesh.send({ image: webcamRef.current.video })
                }
              },
              width: 640,
              height: 480,
            })
            cameraInstance.start()
          }
        }
      })
      .catch((err) => console.error('Error loading MediaPipe scripts:', err))

    return () => {
      active = false
      if (cameraInstance) {
        cameraInstance.stop()
      }
      if (lookAwayTimerRef.current) {
        clearTimeout(lookAwayTimerRef.current)
      }
    }
  }, [])

  // Audio Volume Monitoring
  const startVolumeMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStreamRef.current = stream

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      audioContextRef.current = audioCtx

      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser

      const source = audioCtx.createMediaStreamSource(stream)
      source.connect(analyser)

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i]
        }
        const average = sum / dataArray.length
        const vol = Math.min(100, Math.round((average / 128) * 100))
        setVolumeLevel(vol)

        if (vol < 8) {
          setVoiceQuality('Too Quiet')
        } else if (vol > 80) {
          setVoiceQuality('Too Loud')
        } else {
          setVoiceQuality('Optimal Voice')
        }

        animFrameRef.current = requestAnimationFrame(updateVolume)
      }

      updateVolume()
    } catch (err) {
      console.error('Error starting audio volume monitoring:', err)
    }
  }

  const stopVolumeMonitoring = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop())
      micStreamRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
    }
    setVolumeLevel(0)
    setVoiceQuality('Mic Inactive')
  }

  // Speech-to-Text Recognition Setup
  const startSpeechToText = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let finalTranscript = ''
      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' '
        }
      }
      if (finalTranscript.trim()) {
        setUserAnswer((prev) => (prev + ' ' + finalTranscript).trim())
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      toast.error('Voice recognition error. You can also type your answer below.')
    }

    recognition.onend = () => {
      if (wasRecordingRef.current) {
        try {
          recognition.start()
        } catch (e) {}
      }
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
    wasRecordingRef.current = true
    startVolumeMonitoring()
  }

  const stopSpeechToText = () => {
    wasRecordingRef.current = false
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsRecording(false)
    stopVolumeMonitoring()
  }

  const StartStopRecording = async () => {
    if (isRecording) {
      stopSpeechToText()
    } else {
      wasRecordingRef.current = true
      startSpeechToText()
    }
  }

  const UpdateUserAnswer = async () => {
    if (!userAnswer || userAnswer.trim().length < 3) {
      toast.error('Please enter or record an answer before saving.')
      return
    }

    setLoading(true)

    const feedbackPrompt =
      "Question: " + mockInterviewQuestion[activeQuestionIndex]?.question +
      "\nUser Answer: " + userAnswer +
      "\nBased on the question and user's answer, evaluate the answer." +
      "\nGive a rating from 1 to 10 and provide feedback explaining the quality of the answer and areas for improvement." +
      "\nKeep the feedback concise, around 3 to 5 lines." +
      "\nReturn ONLY valid JSON in this exact format:" +
      '\n{"rating": 1, "feedback": "Your feedback here"}';

    try {
      const result = await chatSession.sendMessage(feedbackPrompt)
      const mockJsonResp = result.response
        .text()
        .replace('```json', '')
        .replace('```', '')
        .trim()

      const JsonFeedbackResp = JSON.parse(mockJsonResp)

      const resp = await db.insert(UserAnswer).values({
        mockIdRef: interviewData?.mockId,
        question: mockInterviewQuestion[activeQuestionIndex]?.question,
        correctAns: mockInterviewQuestion[activeQuestionIndex]?.answer,
        userAns: userAnswer,
        feedback: JsonFeedbackResp?.feedback,
        rating: JsonFeedbackResp?.rating,
        userEmail: user?.primaryEmailAddress?.emailAddress,
        createdAt: moment().format('DD-MM-yyyy'),
      })

      if (resp) {
        toast('Answer saved in database')
        setUserAnswer('')
      }
    } catch (error) {
      console.error('Error updating user answer:', error)
      toast.error('Failed to save answer feedback.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='flex items-center justify-center flex-col'>
      {/* Webcam & Eye Contact Box */}
      <div className='relative flex flex-col mt-10 justify-center items-center bg-black rounded-2xl p-4 shadow-xl border-2 transition-all duration-300 overflow-hidden min-w-[340px] sm:min-w-[440px]'>
        
        {/* Real-time Dynamic Eye Contact Percentage Badge */}
        <div className='absolute top-6 left-6 z-20'>
          {eyeContactPercentage >= 75 ? (
            <div className='flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/90 text-white text-xs font-bold backdrop-blur-md shadow-md animate-in fade-in transition-all'>
              <span className='w-2 h-2 rounded-full bg-white animate-pulse' />
              <Eye size={15} />
              <span>{eyeContactPercentage}% Eye Contact (Good Focus)</span>
            </div>
          ) : eyeContactPercentage >= 45 ? (
            <div className='flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/90 text-white text-xs font-bold backdrop-blur-md shadow-md animate-in fade-in transition-all'>
              <span className='w-2 h-2 rounded-full bg-white animate-pulse' />
              <Eye size={15} />
              <span>{eyeContactPercentage}% Eye Contact (Fair Focus)</span>
            </div>
          ) : (
            <div className='flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/90 text-white text-xs font-bold backdrop-blur-md shadow-md animate-in fade-in animate-bounce transition-all'>
              <span className='w-2 h-2 rounded-full bg-white animate-ping' />
              <EyeOff size={15} />
              <span>{eyeContactPercentage}% Eye Contact (Looking Away)</span>
            </div>
          )}
        </div>

        {/* Dynamic Webcam Glow Border based on Eye Contact Percentage */}
        <div
          className={`absolute inset-0 pointer-events-none z-10 border-4 transition-all duration-300 rounded-2xl ${
            eyeContactPercentage >= 75
              ? 'border-emerald-500/50 shadow-[inset_0_0_15px_rgba(16,185,129,0.3)]'
              : eyeContactPercentage >= 45
              ? 'border-amber-500/70 shadow-[inset_0_0_15px_rgba(245,158,11,0.4)]'
              : 'border-red-500/90 shadow-[inset_0_0_25px_rgba(239,68,68,0.7)]'
          }`}
        />

        <Image
          src={'/webcam.png'}
          width={180}
          height={180}
          className='absolute opacity-40'
          alt='Webcam Placeholder'
        />

        <Webcam
          ref={webcamRef}
          mirrored={true}
          style={{
            height: 320,
            width: '100%',
            zIndex: 10,
            borderRadius: '12px',
          }}
        />
      </div>

      {/* Real-Time Voice Volume & Quality Meter */}
      {isRecording && (
        <div className='mt-6 w-full max-w-xs bg-gray-900/90 border border-gray-800 p-4 rounded-xl shadow-lg backdrop-blur-md text-white flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-2'>
          <div className='flex items-center justify-between text-xs font-semibold'>
            <span className='flex items-center gap-1.5 text-gray-300'>
              <Volume2 size={15} className='text-emerald-400 animate-pulse' /> Voice Level
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                voiceQuality === 'Optimal Voice'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : voiceQuality === 'Too Quiet'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              {voiceQuality}
            </span>
          </div>

          <div className='w-full bg-gray-800 rounded-full h-2.5 overflow-hidden p-0.5 border border-gray-700/50'>
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                volumeLevel > 80
                  ? 'bg-red-500'
                  : volumeLevel < 8
                  ? 'bg-amber-400'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.max(5, volumeLevel)}%` }}
            />
          </div>
        </div>
      )}

      {/* Record Answer Action Button */}
      <Button
        disabled={loading}
        className="my-6 px-8 py-3 rounded-full border border-gray-300 bg-white text-gray-800 shadow-sm hover:bg-gray-100 transition-all duration-200 cursor-pointer font-medium"
        onClick={StartStopRecording}
      >
        {isRecording ? (
          <span className="flex items-center gap-2 text-red-600 font-semibold">
            <Mic size={18} className="animate-pulse" />
            Stop Recording...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Mic size={18} />
            Record Answer
          </span>
        )}
      </Button>

      {/* Type Answer Section */}
      <div className="w-full max-w-md my-2 px-4 flex flex-col items-center">
        <div className="relative flex py-2 items-center w-full">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="flex-shrink mx-4 text-gray-400 text-xs font-semibold uppercase tracking-wider">OR TYPE ANSWER</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        <div className="w-full mt-2 flex flex-col gap-3">
          <label className="text-sm font-semibold text-gray-700">
            Type your answer:
          </label>
          <Textarea
            rows={4}
            placeholder="Type your answer here..."
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 text-sm resize-none"
          />
          <div className="flex justify-end">
            <Button
              disabled={loading || !userAnswer.trim()}
              onClick={() => UpdateUserAnswer()}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-all duration-200 cursor-pointer font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving Answer...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Typed Answer
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RecordAnswerSection