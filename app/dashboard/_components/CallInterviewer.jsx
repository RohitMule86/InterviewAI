"use client"
import React, { useState, useEffect, useRef } from 'react'
import Webcam from 'react-webcam'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from '@/components/ui/textarea'
import { chatSession, model } from '@/utils/GeminiAIModel'
import { 
  PhoneCall, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  LoaderCircle, 
  User, 
  Bot, 
  Sparkles, 
  Clock, 
  Radio, 
  Send,
  Eye,
  EyeOff
} from 'lucide-react'
import { db } from '@/utils/db'
import { MockInterview, UserAnswer } from '@/utils/schema'
import { v4 as uuidv4 } from 'uuid'
import { useUser } from '@clerk/nextjs'
import moment from 'moment'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

function CallInterviewer() {
  const [openSetupDialog, setOpenSetupDialog] = useState(false)
  const [isCallActive, setIsCallActive] = useState(false)
  
  // Call States: 'connecting' | 'talking' | 'listening' | 'thinking' | 'ended'
  const [callState, setCallState] = useState('connecting')
  
  const [jobPosition, setJobPosition] = useState('Full Stack Developer')
  const [jobDesc, setJobDesc] = useState('React, Node.js, Express, PostgreSQL, REST APIs')
  const [jobExperience, setJobExperience] = useState('3')

  const [transcriptHistory, setTranscriptHistory] = useState([])
  const [currentCandidateSpeech, setCurrentCandidateSpeech] = useState('')
  const [manualText, setManualText] = useState('')
  
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [loading, setLoading] = useState(false)

  // Live Eye Contact Percentage Tracking State (0 - 100%)
  const [eyeContactPercentage, setEyeContactPercentage] = useState(96)
  const webcamRef = useRef(null)

  const router = useRouter()
  const { user } = useUser()

  const recognitionRef = useRef(null)
  const timerRef = useRef(null)
  const transcriptEndRef = useRef(null)
  const isSpeechEndingRef = useRef(false)
  const callStateRef = useRef(callState)

  const silenceTimerRef = useRef(null)
  const accumulatedTextRef = useRef('')
  const isSendingRef = useRef(false)

  useEffect(() => {
    callStateRef.current = callState
  }, [callState])

  // Cleanup audio/mic on unmount
  useEffect(() => {
    return () => {
      stopAllAudioAndMic()
    }
  }, [])

  // Dynamically load MediaPipe FaceMesh for live Eye Contact Percentage tracking during voice calls
  useEffect(() => {
    if (!isCallActive) return

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

              // Deviation from center ratio (0.50) looking directly into camera
              const deviation = Math.abs(ratioX - 0.50)

              let rawScore = 100
              if (deviation > 0.05) {
                rawScore = Math.max(15, Math.min(100, Math.round(100 - (deviation - 0.05) * 350)))
              }

              setEyeContactPercentage((prev) => {
                const smoothed = Math.round(prev * 0.65 + rawScore * 0.35)
                return Math.min(100, Math.max(0, smoothed))
              })
            }
          })

          if (webcamRef.current && webcamRef.current.video) {
            cameraInstance = new window.Camera(webcamRef.current.video, {
              onFrame: async () => {
                if (webcamRef.current?.video) {
                  await faceMesh.send({ image: webcamRef.current.video })
                }
              },
              width: 320,
              height: 240,
            })
            cameraInstance.start()
          }
        }
      })
      .catch((err) => console.error('Error loading MediaPipe in CallInterviewer:', err))

    return () => {
      active = false
      if (cameraInstance) {
        cameraInstance.stop()
      }
    }
  }, [isCallActive])

  // Call Duration Timer
  useEffect(() => {
    if (isCallActive && callState !== 'ended' && callState !== 'connecting') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [isCallActive, callState])

  // Scroll to bottom of transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcriptHistory, currentCandidateSpeech, callState])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Turn off microphone listening & AI speech speaker output completely
  const stopAllAudioAndMic = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }

    isSpeechEndingRef.current = true
    isSendingRef.current = true

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
        recognitionRef.current.stop()
      } catch (e) {}
      recognitionRef.current = null
    }

    setIsMuted(true)
  }

  // Text-To-Speech (AI Voice Output)
  const speakText = (text, onEndCallback) => {
    if (!('speechSynthesis' in window)) {
      if (onEndCallback) onEndCallback()
      return
    }

    window.speechSynthesis.cancel()

    if (isSpeakerMuted) {
      if (onEndCallback) onEndCallback()
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.0
    utterance.pitch = 1.0

    const voices = window.speechSynthesis.getVoices()
    const englishVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Alex')))
    if (englishVoice) {
      utterance.voice = englishVoice
    }

    utterance.onend = () => {
      if (onEndCallback) onEndCallback()
    }

    utterance.onerror = (err) => {
      console.error("Speech synthesis error:", err)
      if (onEndCallback) onEndCallback()
    }

    window.speechSynthesis.speak(utterance)
  }

  // Start Speech Recognition (Candidate Audio Input with persistent accumulation & 2.5s silence timer)
  const startListening = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    isSendingRef.current = false

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser. You can type your answers.")
      return
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch (e) {}
      }

      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setCallState('listening')
      }

      recognition.onresult = (event) => {
        if (isSendingRef.current) return

        let currentFinal = ''
        let currentInterim = ''

        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            currentFinal += event.results[i][0].transcript + ' '
          } else {
            currentInterim += event.results[i][0].transcript
          }
        }

        const fullSpeech = (accumulatedTextRef.current + ' ' + currentFinal + ' ' + currentInterim).replace(/\s+/g, ' ').trim()

        if (fullSpeech) {
          setCurrentCandidateSpeech(fullSpeech)

          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
          }

          silenceTimerRef.current = setTimeout(() => {
            if (!isSendingRef.current && fullSpeech.trim()) {
              isSendingRef.current = true
              handleSendCandidateResponse(fullSpeech)
            }
          }, 2500)
        }
      }

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error)
      }

      recognition.onend = () => {
        if (currentCandidateSpeech) {
          accumulatedTextRef.current = currentCandidateSpeech
        }

        if (callStateRef.current === 'listening' && !isSpeechEndingRef.current && !isSendingRef.current) {
          try {
            recognition.start()
          } catch (e) {}
        }
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (err) {
      console.error("Error starting speech recognition:", err)
    }
  }

  const stopListening = () => {
    stopAllAudioAndMic()
  }

  // Initiate the Voice Call
  const startCall = async () => {
    if (!jobPosition || !jobDesc) {
      toast.error("Please fill in Job Position and Tech Stack.")
      return
    }

    setOpenSetupDialog(false)
    setIsCallActive(true)
    setCallState('connecting')
    setTranscriptHistory([])
    setCallDuration(0)
    setCurrentCandidateSpeech('')
    accumulatedTextRef.current = ''
    isSendingRef.current = false
    setIsMuted(false)
    setEyeContactPercentage(96)

    try {
      // Prompt Gemini to start the call as interviewer Alex
      const prompt = `You are Alex, a senior engineering hiring manager conducting a live 1-on-1 phone interview for a ${jobPosition} role.
Candidate's Experience: ${jobExperience} years. Tech Stack: ${jobDesc}.

Instruction:
Greet the candidate warmly as if picking up a phone call. Introduce yourself briefly as Alex, mention the role, and ask your first opening interview question (e.g. asking them to introduce themselves or talk about their relevant experience).
Keep your spoken greeting natural, friendly, professional, and short (under 45 words). Do not include markdown or formatting.`

      const result = await model.generateContent(prompt)
      const aiGreeting = result.response.text().trim()

      const newHistory = [{ role: 'interviewer', text: aiGreeting, time: moment().format('hh:mm A') }]
      setTranscriptHistory(newHistory)
      setCallState('talking')

      // Speak greeting aloud, then start listening for candidate answer
      speakText(aiGreeting, () => {
        isSpeechEndingRef.current = false
        startListening()
      })
    } catch (error) {
      console.error("Error starting call:", error)
      toast.error("Failed to connect call with AI Interviewer.")
      setIsCallActive(false)
    }
  }

  // Submit Candidate's Answer (via Voice or Manual Send)
  const handleSendCandidateResponse = async (overrideText) => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
    }

    const textToSend = overrideText || currentCandidateSpeech || manualText
    if (!textToSend || !textToSend.trim()) {
      toast.error("Please say something or type your answer.")
      return
    }

    stopListening()
    accumulatedTextRef.current = ''
    setCurrentCandidateSpeech('')
    setManualText('')
    setCallState('thinking')

    const updatedHistory = [
      ...transcriptHistory,
      { role: 'candidate', text: textToSend.trim(), time: moment().format('hh:mm A') }
    ]
    setTranscriptHistory(updatedHistory)

    try {
      // Build conversation context for Gemini AI
      const contextPrompt = `You are Alex, a real human technical interviewer conducting a live voice phone interview for a ${jobPosition} candidate (${jobExperience} years exp, stack: ${jobDesc}).

Here is the conversation history so far:
${updatedHistory.map(h => `${h.role === 'interviewer' ? 'Alex (Interviewer)' : 'Candidate'}: "${h.text}"`).join('\n')}

Instruction for Alex's next spoken response:
1. Briefly acknowledge the candidate's answer naturally in 1 short sentence (e.g., "Got it, that makes sense!", "Great point on state management!", "Thanks for sharing that background.").
2. Ask a relevant follow-up question OR transition to a new technical interview question based on their tech stack.
3. Keep your total response under 50 words so it sounds natural on a phone call. Do NOT use markdown, bullet points, or lists.`

      const result = await model.generateContent(contextPrompt)
      const aiReply = result.response.text().trim()

      const finalHistory = [
        ...updatedHistory,
        { role: 'interviewer', text: aiReply, time: moment().format('hh:mm A') }
      ]
      setTranscriptHistory(finalHistory)
      setCallState('talking')

      speakText(aiReply, () => {
        isSpeechEndingRef.current = false
        startListening()
      })
    } catch (error) {
      console.error("Error getting AI response:", error)
      toast.error("Connection glitch. Continuing call...")
      setCallState('listening')
      isSpeechEndingRef.current = false
      startListening()
    }
  }

  // End Call & Save Comprehensive Performance Evaluation (Strictly Dynamic Scoring)
  const handleEndCall = async () => {
    stopAllAudioAndMic()
    
    setCallState('ended')
    setLoading(true)

    try {
      if (transcriptHistory.length <= 1) {
        toast.info("Call ended.")
        setIsCallActive(false)
        setLoading(false)
        return
      }

      toast.info("Analyzing voice quality, confidence, grammar & generating dynamic performance report...")

      const newMockId = uuidv4()

      const reportPrompt = `You are a strict, objective senior hiring manager and speech evaluator analyzing a live interview call transcript for a candidate applying for a ${jobPosition} position (${jobExperience} years exp, stack: ${jobDesc}).

TRANSCRIPT TO EVALUATE:
${transcriptHistory.map(h => `${h.role === 'interviewer' ? 'Interviewer Alex' : 'Candidate'}: "${h.text}"`).join('\n')}

INSTRUCTIONS FOR CRITICAL DYNAMIC EVALUATION:
Carefully read every response spoken by the Candidate in the transcript above.
Score the Candidate's performance dynamically from 1.0 to 10.0 for each of the 5 criteria below based STRICTLY on their actual words, technical accuracy, conciseness, grammar, and fluency.
Do NOT use fixed or generic scores. Evaluate the candidate's real response quality objectively.

1. "voiceQuality": { "score": <number 1-10>, "feedback": "<concise feedback on volume, clarity, and pacing>" }
2. "confidenceLevel": { "score": <number 1-10>, "feedback": "<concise feedback on pauses, hesitations, filler words, and assertiveness>" }
3. "languageGrammar": { "score": <number 1-10>, "feedback": "<concise feedback on grammar, sentence fluency, and technical vocabulary>" }
4. "technicalAccuracy": { "score": <number 1-10>, "feedback": "<concise feedback on technical correctness and depth of answer>" }
5. "communicationStructure": { "score": <number 1-10>, "feedback": "<concise feedback on answer structure and clarity>" }

Calculate "overallScore" as the exact mathematical average of these 5 scores.

Return ONLY a valid JSON object matching this exact schema:
{
  "overallScore": <calculated average number>,
  "summary": "<2-sentence summary of overall performance>",
  "voiceQuality": { "score": <number 1-10>, "feedback": "<text>" },
  "confidenceLevel": { "score": <number 1-10>, "feedback": "<text>" },
  "languageGrammar": { "score": <number 1-10>, "feedback": "<text>" },
  "technicalAccuracy": { "score": <number 1-10>, "feedback": "<text>" },
  "communicationStructure": { "score": <number 1-10>, "feedback": "<text>" },
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "qaBreakdown": [
    {
      "question": "<question asked>",
      "userAns": "<candidate spoken answer>",
      "correctAns": "<ideal technical answer>",
      "feedback": "<specific feedback>",
      "rating": "<individual question rating 1-10>"
    }
  ]
}`

      const summaryResult = await model.generateContent(reportPrompt)
      const cleanJsonStr = summaryResult.response.text().replace(/```json/g, '').replace(/```/g, '').trim()

      let reportData = {}
      try {
        reportData = JSON.parse(cleanJsonStr)
      } catch (e) {
        console.error("JSON parse error:", e)
      }

      const dimensionScores = [
        reportData.voiceQuality?.score,
        reportData.confidenceLevel?.score,
        reportData.languageGrammar?.score,
        reportData.technicalAccuracy?.score,
        reportData.communicationStructure?.score
      ].filter(s => s !== undefined && s !== null && !isNaN(Number(s))).map(Number)

      if (dimensionScores.length > 0) {
        const calculatedOverall = dimensionScores.reduce((a, b) => a + b, 0) / dimensionScores.length
        reportData.overallScore = Number(calculatedOverall.toFixed(1))
      }

      // Save into DB MockInterview table
      const resp = await db.insert(MockInterview).values({
        mockId: newMockId,
        jsonMockResp: JSON.stringify(reportData),
        jobPosition: jobPosition,
        jobDesc: jobDesc,
        jobExperience: jobExperience,
        createdBy: user?.primaryEmailAddress?.emailAddress || 'User',
        createdAt: moment().format('DD-MM-yyyy')
      }).returning({ mockId: MockInterview.mockId })

      // Save QA items into UserAnswer table for detailed view
      if (reportData.qaBreakdown && reportData.qaBreakdown.length > 0) {
        for (const item of reportData.qaBreakdown) {
          await db.insert(UserAnswer).values({
            mockIdRef: newMockId,
            question: item.question || "Interview Question",
            correctAns: item.correctAns || "Recommended technical explanation.",
            userAns: item.userAns || "Spoken response.",
            feedback: item.feedback || "Good response.",
            rating: String(item.rating || (reportData.overallScore ? Math.round(reportData.overallScore) : 7)),
            userEmail: user?.primaryEmailAddress?.emailAddress || 'User',
            createdAt: moment().format('DD-MM-yyyy')
          })
        }
      }

      if (resp && resp[0]?.mockId) {
        toast.success("Dynamic interview performance report generated!")
        setIsCallActive(false)
        router.push('/dashboard/interview/' + resp[0]?.mockId + '/feedback')
      } else {
        setIsCallActive(false)
      }
    } catch (err) {
      console.error("Error saving call summary:", err)
      toast.error("Call ended. Failed to save report.")
      setIsCallActive(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Dashboard Trigger Card */}
      <div 
        className='p-10 border rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-emerald-950 border-emerald-200 dark:border-emerald-800 hover:scale-105 hover:shadow-md cursor-pointer transition-all'
        onClick={() => setOpenSetupDialog(true)}
      >
        <div className='flex flex-col items-center justify-center gap-2'>
          <div className='flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-lg'>
            <PhoneCall className='w-5 h-5 text-emerald-600 animate-pulse' />
            <h2>Call Interviewer</h2>
          </div>
          <p className='text-xs text-gray-500 text-center'>Live Interactive 1-on-1 AI Voice Call Interview</p>
        </div>
      </div>

      {/* Setup Modal */}
      <Dialog open={openSetupDialog} onOpenChange={setOpenSetupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-emerald-600" />
              Call AI Interviewer (Alex)
            </DialogTitle>
            <DialogDescription asChild>
              <div className="pt-2">
                <p className="text-xs text-gray-500 mb-4">
                  Set up your target role before placing the voice call. Alex will call you and conduct a human-like 1-on-1 interview.
                </p>

                <div className="my-3">
                  <label className="text-sm font-medium text-gray-700">Job Role / Position</label>
                  <Input 
                    placeholder="Ex. Full Stack Developer" 
                    value={jobPosition}
                    onChange={(e) => setJobPosition(e.target.value)}
                  />
                </div>

                <div className="my-3">
                  <label className="text-sm font-medium text-gray-700">Tech Stack / Skills</label>
                  <Textarea 
                    placeholder="Ex. React, Node.js, Express, PostgreSQL"
                    value={jobDesc}
                    onChange={(e) => setJobDesc(e.target.value)}
                  />
                </div>

                <div className="my-3">
                  <label className="text-sm font-medium text-gray-700">Years of Experience</label>
                  <Input 
                    type="number"
                    placeholder="Ex. 3"
                    value={jobExperience}
                    onChange={(e) => setJobExperience(e.target.value)}
                  />
                </div>

                <div className="flex gap-3 justify-end mt-6">
                  <Button type="button" variant="ghost" onClick={() => setOpenSetupDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    onClick={startCall}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                  >
                    <PhoneCall className="w-4 h-4" /> Start Voice Call
                  </Button>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Interactive Voice Call Window */}
      <Dialog open={isCallActive} onOpenChange={() => { stopAllAudioAndMic(); setIsCallActive(false); }}>
        <DialogContent className="max-w-3xl h-[85vh] p-0 overflow-hidden bg-slate-950 text-white border-slate-800 flex flex-col">
          {/* Header Bar */}
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                  Alex (AI Technical Interviewer)
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </h3>
                <p className="text-xs text-slate-400">{jobPosition} Role • {jobExperience} Yrs Exp</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              {/* Eye Contact Live Percentage Badge in Call Header */}
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                eyeContactPercentage >= 75
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : eyeContactPercentage >= 45
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-red-500/20 text-red-400 border border-red-500/40'
              }`}>
                {eyeContactPercentage >= 45 ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{eyeContactPercentage}% Eye Contact</span>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-full text-slate-300 font-mono">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                {formatTime(callDuration)}
              </div>
            </div>
          </div>

          {/* Hidden Webcam Element for MediaPipe FaceMesh Tracking */}
          <div className="hidden">
            <Webcam ref={webcamRef} mirrored={true} width={320} height={240} />
          </div>

          {/* Central Call Visualizer Section */}
          <div className="p-6 bg-gradient-to-b from-slate-950 to-slate-900 border-b border-slate-800/80 flex flex-col items-center justify-center shrink-0 min-h-[160px]">
            {callState === 'connecting' && (
              <div className="flex flex-col items-center gap-3">
                <LoaderCircle className="w-10 h-10 text-emerald-500 animate-spin" />
                <p className="text-sm text-slate-300 font-medium animate-pulse">Dialing AI Interviewer Alex...</p>
              </div>
            )}

            {callState === 'talking' && (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-1.5 h-12">
                  <span className="w-1.5 h-8 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-12 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-10 bg-emerald-500 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-6 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.2s]"></span>
                </div>
                <p className="text-xs text-emerald-400 font-medium bg-emerald-950/60 border border-emerald-800/50 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 animate-pulse" /> Alex is speaking...
                </p>
              </div>
            )}

            {callState === 'listening' && (
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-blue-600/20 border-2 border-blue-500 flex items-center justify-center animate-pulse">
                  <Mic className="w-8 h-8 text-blue-400" />
                </div>
                <p className="text-xs text-blue-400 font-medium bg-blue-950/60 border border-blue-800/50 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 animate-pulse text-blue-400" /> Listening... (Auto-sends after 2.5s pause)
                </p>
              </div>
            )}

            {callState === 'thinking' && (
              <div className="flex flex-col items-center gap-3">
                <Sparkles className="w-8 h-8 text-amber-400 animate-spin" />
                <p className="text-xs text-amber-400 font-medium">Alex is evaluating & thinking...</p>
              </div>
            )}
          </div>

          {/* Real-time Subtitle & Transcript Chat Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-sm font-sans bg-slate-950">
            {transcriptHistory.length === 0 && callState === 'connecting' && (
              <div className="text-center text-slate-500 text-xs py-10">
                Establishing encrypted voice connection...
              </div>
            )}

            {transcriptHistory.map((item, index) => (
              <div 
                key={index}
                className={`flex gap-3 max-w-[85%] ${item.role === 'candidate' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  item.role === 'interviewer' 
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {item.role === 'interviewer' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <div>
                  <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                    item.role === 'interviewer'
                      ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                      : 'bg-blue-600 text-white rounded-tr-none'
                  }`}>
                    {item.text}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1 px-1">{item.time}</span>
                </div>
              </div>
            ))}

            {/* Current Spoken Speech Preview */}
            {currentCandidateSpeech && (
              <div className="flex gap-3 max-w-[85%] ml-auto flex-row-reverse">
                <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="p-3 rounded-xl text-xs leading-relaxed bg-blue-900/40 border border-blue-700/50 text-blue-200 italic rounded-tr-none">
                    "{currentCandidateSpeech}..."
                  </div>
                  <span className="text-[10px] text-blue-400 block mt-1 px-1">Speaking live...</span>
                </div>
              </div>
            )}

            <div ref={transcriptEndRef} />
          </div>

          {/* Action Bar & Controls */}
          <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col gap-3 shrink-0">
            {/* Optional Manual Text Backup */}
            {callState === 'listening' && (
              <div className="flex gap-2">
                <Input 
                  placeholder="Or type response here if mic isn't available..." 
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendCandidateResponse()
                  }}
                  className="bg-slate-950 border-slate-800 text-white text-xs"
                />
                <Button 
                  size="sm"
                  onClick={() => handleSendCandidateResponse()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (isMuted) {
                      setIsMuted(false)
                      startListening()
                    } else {
                      stopAllAudioAndMic()
                    }
                  }}
                  className={`border-slate-800 text-xs gap-1.5 ${isMuted ? 'bg-red-950/50 text-red-400 border-red-800' : 'bg-slate-950 text-slate-300'}`}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {isMuted ? 'Unmute Mic' : 'Mute Mic'}
                </Button>

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const newSpeakerState = !isSpeakerMuted
                    setIsSpeakerMuted(newSpeakerState)
                    if (newSpeakerState && typeof window !== 'undefined' && window.speechSynthesis) {
                      window.speechSynthesis.cancel()
                    }
                  }}
                  className={`border-slate-800 text-xs gap-1.5 ${isSpeakerMuted ? 'bg-amber-950/50 text-amber-400 border-amber-800' : 'bg-slate-950 text-slate-300'}`}
                >
                  {isSpeakerMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  {isSpeakerMuted ? 'Unmute AI' : 'Mute AI'}
                </Button>
              </div>

              <div className="flex items-center gap-3">
                {callState === 'listening' && currentCandidateSpeech && (
                  <Button 
                    size="sm"
                    onClick={() => handleSendCandidateResponse()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Submit Now
                  </Button>
                )}

                <Button 
                  onClick={handleEndCall}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-5 flex items-center gap-2"
                >
                  {loading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <PhoneOff className="w-4 h-4" />}
                  End Call
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CallInterviewer
