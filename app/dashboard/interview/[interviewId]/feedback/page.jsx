"use client"
import { db } from '@/utils/db'
import { UserAnswer, MockInterview } from '@/utils/schema'
import React, { useEffect, useState } from 'react'
import { eq } from 'drizzle-orm'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { 
  ChevronsUpDown, 
  Mic, 
  Zap, 
  BookOpen, 
  Cpu, 
  MessageSquare, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Home, 
  ArrowLeft,
  Award
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

function Feedback({ params }) {
  const router = useRouter()
  const [feedbackList, setFeedbackList] = useState([])
  const [performanceReport, setPerformanceReport] = useState(null)
  const [overallRating, setOverallRating] = useState(0)
  const [jobInfo, setJobInfo] = useState(null)

  const { interviewId } = React.use(params)

  useEffect(() => {
    GetFeedback()
  }, [interviewId])

  const GetFeedback = async () => {
    try {
      // 1. Fetch UserAnswer rows for question-by-question breakdown
      const result = await db
        .select()
        .from(UserAnswer)
        .where(eq(UserAnswer.mockIdRef, interviewId))
        .orderBy(UserAnswer.id)

      setFeedbackList(result)

      // 2. Fetch MockInterview record to check for voice performance evaluation object
      const mockResult = await db
        .select()
        .from(MockInterview)
        .where(eq(MockInterview.mockId, interviewId))

      if (mockResult.length > 0) {
        setJobInfo(mockResult[0])
        try {
          const parsedObj = JSON.parse(mockResult[0].jsonMockResp)
          if (parsedObj && typeof parsedObj === 'object') {
            setPerformanceReport(parsedObj)

            // Dynamically calculate overall average rating from individual criteria scores
            const scores = [
              parsedObj.voiceQuality?.score,
              parsedObj.confidenceLevel?.score,
              parsedObj.languageGrammar?.score,
              parsedObj.technicalAccuracy?.score,
              parsedObj.communicationStructure?.score
            ].filter(s => s !== undefined && s !== null && !isNaN(Number(s))).map(Number)

            if (scores.length > 0) {
              const calculatedAvg = scores.reduce((sum, s) => sum + s, 0) / scores.length
              setOverallRating(Number(calculatedAvg.toFixed(1)))
              return
            } else if (parsedObj.overallScore !== undefined) {
              setOverallRating(Number(Number(parsedObj.overallScore).toFixed(1)))
              return
            }
          }
        } catch (e) {
          console.log("MockResp is standard questions array, not call report")
        }
      }

      // Calculate dynamic average rating from UserAnswer rows if report object not present
      const validRatings = result
        .map(item => Number(item.rating))
        .filter(r => !isNaN(r) && r > 0)

      if (validRatings.length > 0) {
        const avg = validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length
        setOverallRating(Number(avg.toFixed(1)))
      } else {
        setOverallRating(0)
      }
    } catch (err) {
      console.error("Error loading feedback:", err)
    }
  }

  const getScoreColor = (score) => {
    const num = Number(score)
    if (num >= 8) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
    if (num >= 6) return 'text-blue-600 bg-blue-50 border-blue-200'
    return 'text-amber-600 bg-amber-50 border-amber-200'
  }

  const getProgressWidth = (score) => {
    const num = Number(score)
    return `${Math.min(100, Math.max(0, num * 10))}%`
  }

  return (
    <div className='p-6 md:p-10 max-w-6xl mx-auto'>
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="outline" 
          onClick={() => router.replace('/dashboard')}
          className="flex items-center gap-2 text-sm text-gray-600"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>
      </div>

      {feedbackList?.length === 0 && !performanceReport ? (
        <div className="text-center py-16 border rounded-xl bg-gray-50/50">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h2 className='font-bold text-xl text-gray-600'>No Interview Feedback Record Found</h2>
          <p className="text-sm text-gray-500 mt-1">Start a new interview session to generate your feedback report.</p>
        </div>
      ) : (
        <>
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 md:p-8 text-white shadow-lg mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-blue-200 text-sm font-semibold mb-2">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  AI Interview Performance Analytics
                </div>
                <h1 className='text-3xl font-extrabold tracking-tight'>Congratulations!</h1>
                <p className='text-blue-100 mt-1 text-sm md:text-base'>
                  Here is your comprehensive evaluation report for your {jobInfo?.jobPosition || 'Software Engineer'} interview.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 text-center min-w-[160px]">
                <div className="text-xs uppercase tracking-wider text-blue-200 font-semibold mb-1">Overall Rating</div>
                <div className="text-4xl font-black text-white flex items-center justify-center gap-1">
                  <span>{overallRating.toFixed(1)}</span>
                  <span className="text-lg font-medium text-blue-200">/10</span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Voice & Multi-Criteria Performance Metrics */}
          {performanceReport && (
            <div className="mb-10 space-y-6">
              <div className="flex items-center gap-2 border-b pb-3">
                <Award className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Detailed Performance Breakdown</h2>
              </div>

              {performanceReport.summary && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-900 text-sm leading-relaxed flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block mb-0.5">AI Interviewer Summary:</strong>
                    {performanceReport.summary}
                  </div>
                </div>
              )}

              {/* 5 Dimension Metric Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* 1. Voice Quality & Tone */}
                {performanceReport.voiceQuality && (
                  <div className="p-5 border rounded-xl bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5 font-semibold text-sm text-gray-800">
                          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                            <Mic className="w-4 h-4" />
                          </div>
                          Voice Quality & Tone
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getScoreColor(performanceReport.voiceQuality.score)}`}>
                          {Number(performanceReport.voiceQuality.score).toFixed(1)}/10
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-3">
                        <div 
                          className="bg-emerald-500 h-full rounded-full" 
                          style={{ width: getProgressWidth(performanceReport.voiceQuality.score) }} 
                        />
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{performanceReport.voiceQuality.feedback}</p>
                    </div>
                  </div>
                )}

                {/* 2. Confidence Level */}
                {performanceReport.confidenceLevel && (
                  <div className="p-5 border rounded-xl bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5 font-semibold text-sm text-gray-800">
                          <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                            <Zap className="w-4 h-4" />
                          </div>
                          Confidence & Delivery
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getScoreColor(performanceReport.confidenceLevel.score)}`}>
                          {Number(performanceReport.confidenceLevel.score).toFixed(1)}/10
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-3">
                        <div 
                          className="bg-amber-500 h-full rounded-full" 
                          style={{ width: getProgressWidth(performanceReport.confidenceLevel.score) }} 
                        />
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{performanceReport.confidenceLevel.feedback}</p>
                    </div>
                  </div>
                )}

                {/* 3. Language & Grammar */}
                {performanceReport.languageGrammar && (
                  <div className="p-5 border rounded-xl bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5 font-semibold text-sm text-gray-800">
                          <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          Language & Grammar
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getScoreColor(performanceReport.languageGrammar.score)}`}>
                          {Number(performanceReport.languageGrammar.score).toFixed(1)}/10
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-3">
                        <div 
                          className="bg-purple-500 h-full rounded-full" 
                          style={{ width: getProgressWidth(performanceReport.languageGrammar.score) }} 
                        />
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{performanceReport.languageGrammar.feedback}</p>
                    </div>
                  </div>
                )}

                {/* 4. Technical Accuracy */}
                {performanceReport.technicalAccuracy && (
                  <div className="p-5 border rounded-xl bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5 font-semibold text-sm text-gray-800">
                          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                            <Cpu className="w-4 h-4" />
                          </div>
                          Technical Accuracy
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getScoreColor(performanceReport.technicalAccuracy.score)}`}>
                          {Number(performanceReport.technicalAccuracy.score).toFixed(1)}/10
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-3">
                        <div 
                          className="bg-blue-500 h-full rounded-full" 
                          style={{ width: getProgressWidth(performanceReport.technicalAccuracy.score) }} 
                        />
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{performanceReport.technicalAccuracy.feedback}</p>
                    </div>
                  </div>
                )}

                {/* 5. Communication & Structure */}
                {performanceReport.communicationStructure && (
                  <div className="p-5 border rounded-xl bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5 font-semibold text-sm text-gray-800">
                          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          Answer Structure
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getScoreColor(performanceReport.communicationStructure.score)}`}>
                          {Number(performanceReport.communicationStructure.score).toFixed(1)}/10
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-3">
                        <div 
                          className="bg-indigo-500 h-full rounded-full" 
                          style={{ width: getProgressWidth(performanceReport.communicationStructure.score) }} 
                        />
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{performanceReport.communicationStructure.feedback}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Strengths & Improvements Side-by-Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                {/* Strengths */}
                {performanceReport.strengths && performanceReport.strengths.length > 0 && (
                  <div className="p-5 border border-emerald-200 bg-emerald-50/40 rounded-xl">
                    <h3 className="font-bold text-sm text-emerald-900 flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      Key Strengths
                    </h3>
                    <ul className="space-y-2">
                      {performanceReport.strengths.map((str, idx) => (
                        <li key={idx} className="text-xs text-emerald-800 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                          {str}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Improvements */}
                {performanceReport.improvements && performanceReport.improvements.length > 0 && (
                  <div className="p-5 border border-amber-200 bg-amber-50/40 rounded-xl">
                    <h3 className="font-bold text-sm text-amber-900 flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      Areas for Improvement
                    </h3>
                    <ul className="space-y-2">
                      {performanceReport.improvements.map((imp, idx) => (
                        <li key={idx} className="text-xs text-amber-800 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 shrink-0" />
                          {imp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Question-by-Question Breakdown Section */}
          <div className="mb-10">
            <h3 className="font-bold text-xl text-gray-900 mb-2">Question-by-Question Analysis</h3>
            <p className="text-xs text-gray-500 mb-4">Click on any question below to inspect your answer, ideal response, and detailed feedback.</p>

            <div className="space-y-3">
              {feedbackList && feedbackList.map((item, index) => (
                <Collapsible key={index} className="border rounded-xl bg-white shadow-sm overflow-hidden">
                  <CollapsibleTrigger className='p-4 hover:bg-gray-50 flex justify-between items-center text-left gap-4 w-full transition-colors'>
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <span className="font-medium text-sm text-gray-800">{item.question}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-gray-100 text-gray-700">
                        Score: {item.rating}/10
                      </span>
                      <ChevronsUpDown className='h-4 w-4 text-gray-400'/>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="p-4 border-t bg-gray-50/50 space-y-3 text-xs">
                    <div>
                      <span className="font-semibold text-gray-700 block mb-1">Your Spoken Answer:</span>
                      <div className="p-3 rounded-lg bg-white border text-gray-800 italic">
                        "{item.userAns}"
                      </div>
                    </div>

                    <div>
                      <span className="font-semibold text-emerald-800 block mb-1">Recommended Ideal Answer:</span>
                      <div className="p-3 rounded-lg bg-emerald-50/80 border border-emerald-200 text-emerald-900 leading-relaxed">
                        {item.correctAns}
                      </div>
                    </div>

                    <div>
                      <span className="font-semibold text-blue-800 block mb-1">Feedback & Tips:</span>
                      <div className="p-3 rounded-lg bg-blue-50/80 border border-blue-200 text-blue-900 leading-relaxed">
                        {item.feedback}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Action Footer */}
      <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
        <Button 
          onClick={() => router.replace('/dashboard')}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
        >
          <Home className="w-4 h-4" /> Go to Dashboard
        </Button>
      </div>
    </div>
  )
}

export default Feedback
