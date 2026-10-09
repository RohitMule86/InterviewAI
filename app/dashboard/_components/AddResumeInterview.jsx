"use client"
import React, { useState } from 'react'
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
import { LoaderCircle, FileText, Upload, Sparkles, CheckCircle2, X } from 'lucide-react'
import { db } from '@/utils/db'
import { MockInterview } from '@/utils/schema'
import { v4 as uuidv4 } from 'uuid'
import { useUser } from '@clerk/nextjs'
import moment from 'moment'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

function AddResumeInterview() {
  const [openDialog, setOpenDialog] = useState(false)
  const [file, setFile] = useState(null)
  const [extracting, setExtracting] = useState(false)
  const [extractedSuccess, setExtractedSuccess] = useState(false)

  const [jobPosition, setJobPosition] = useState('')
  const [jobDesc, setJobDesc] = useState('')
  const [jobExperience, setJobExperience] = useState('')

  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { user } = useUser()

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setExtractedSuccess(false)
    await processResume(selectedFile)
  }

  const processResume = async (resumeFile) => {
    setExtracting(true)
    try {
      let promptParts = []

      const prompt = `You are an expert resume parser and technical recruiter.
Analyze the provided resume document or text carefully and extract the following 3 fields:

1. "jobPosition": The primary job role or title best fitting the candidate's experience or target role (e.g. "Full Stack Developer", "Frontend Engineer", "Data Scientist", "DevOps Engineer", "Software Engineer").
2. "jobDesc": A concise summary of the key technical skills, frameworks, programming languages, and core job responsibilities extracted from the resume (e.g. "React, Node.js, Express, MongoDB, TypeScript, REST APIs"). Keep it concise under 100 words.
3. "jobExperience": The total estimated numerical years of relevant professional experience as a number or string (e.g. "3", "5", "1", "0").

Return ONLY a valid JSON object without any markdown code blocks or extra text. Format:
{
  "jobPosition": "...",
  "jobDesc": "...",
  "jobExperience": "..."
}`

      const isText = resumeFile.type === 'text/plain' || resumeFile.name.endsWith('.txt') || resumeFile.name.endsWith('.md')

      if (isText) {
        const textContent = await resumeFile.text()
        promptParts = [prompt, `Resume Content:\n${textContent}`]
      } else {
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            const resultStr = reader.result
            const base64 = resultStr.split(',')[1] || resultStr
            resolve(base64)
          }
          reader.onerror = (err) => reject(err)
          reader.readAsDataURL(resumeFile)
        })

        const mimeType = resumeFile.type || (resumeFile.name.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream')

        promptParts = [
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          }
        ]
      }

      const result = await model.generateContent(promptParts)
      const responseText = result.response.text()
      const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim()
      
      const parsed = JSON.parse(cleanedText)

      if (parsed) {
        if (parsed.jobPosition) setJobPosition(parsed.jobPosition)
        if (parsed.jobDesc) setJobDesc(parsed.jobDesc)
        if (parsed.jobExperience !== undefined) setJobExperience(String(parsed.jobExperience))
        setExtractedSuccess(true)
        toast.success("Resume data extracted successfully!")
      }
    } catch (error) {
      console.error("Resume Extraction Error:", error)
      toast.error("Failed to extract details automatically. You can fill them in manually.")
    } finally {
      setExtracting(false)
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const InputPrompt = `Job Position: ${jobPosition}, Job Description: ${jobDesc}, Years of Experience: ${jobExperience}, Depends on this information please give me ${process.env.NEXT_PUBLIC_INTERVIEW_QUESTION_COUNT || 5} Interview question with Answered in Json Format,Give Question and Answered as field in JSON`

      const result = await chatSession.sendMessage(InputPrompt)
      const MockJsonResp = (result.response.text()).replace('```json', '').replace('```', '')

      if (MockJsonResp) {
        const resp = await db.insert(MockInterview).values({
          mockId: uuidv4(),
          jsonMockResp: MockJsonResp,
          jobPosition: jobPosition,
          jobDesc: jobDesc,
          jobExperience: jobExperience,
          createdBy: user?.primaryEmailAddress?.emailAddress,
          createdAt: moment().format('DD-MM-yyyy')
        }).returning({ mockId: MockInterview.mockId })

        if (resp && resp[0]?.mockId) {
          setOpenDialog(false)
          router.push('/dashboard/interview/' + resp[0]?.mockId)
        }
      }
    } catch (error) {
      console.error("Error creating interview:", error)
      toast.error("Something went wrong while generating interview questions.")
    } finally {
      setLoading(false)
    }
  }

  const resetModal = () => {
    setOpenDialog(false)
    setFile(null)
    setExtractedSuccess(false)
    setJobPosition('')
    setJobDesc('')
    setJobExperience('')
  }

  return (
    <div>
      <div 
        className='p-10 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 border-blue-200 dark:border-slate-700 hover:scale-105 hover:shadow-md cursor-pointer transition-all'
        onClick={() => setOpenDialog(true)}
      >
        <div className='flex flex-col items-center justify-center gap-2'>
          <div className='flex items-center gap-2 text-primary font-semibold text-lg'>
            <FileText className='w-5 h-5 text-blue-600' />
            <h2>Resume Interview</h2>
          </div>
          <p className='text-xs text-gray-500 text-center'>Upload Resume to Auto-Extract Details & Start</p>
        </div>
      </div>

      <Dialog open={openDialog} onOpenChange={(open) => { if (!open) resetModal(); else setOpenDialog(true); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-600" />
              Start Interview from Resume
            </DialogTitle>
            <DialogDescription asChild>
              <div className="pt-2">
                {/* File Upload Area */}
                <div className="border-2 border-dashed border-blue-200 rounded-lg p-5 bg-blue-50/50 flex flex-col items-center justify-center gap-3 relative mb-4">
                  {!file ? (
                    <>
                      <Upload className="w-8 h-8 text-blue-500 animate-bounce" />
                      <div className="text-center">
                        <p className="font-medium text-sm text-gray-700">Click to upload or drag & drop your resume</p>
                        <p className="text-xs text-gray-500">Supports PDF, DOCX, TXT, PNG, JPG</p>
                      </div>
                      <input 
                        type="file" 
                        accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg" 
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </>
                  ) : (
                    <div className="flex items-center justify-between w-full bg-white p-3 rounded-md border border-blue-200 shadow-sm">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText className="w-6 h-6 text-blue-600 shrink-0" />
                        <div className="truncate">
                          <p className="font-medium text-sm text-gray-800 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {extracting && (
                          <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                            <LoaderCircle className="w-4 h-4 animate-spin" />
                            Extracting...
                          </div>
                        )}
                        {extractedSuccess && (
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded">
                            <CheckCircle2 className="w-4 h-4" />
                            Extracted
                          </span>
                        )}
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setFile(null)
                            setExtractedSuccess(false)
                          }}
                          className="h-8 w-8 p-0 rounded-full"
                        >
                          <X className="w-4 h-4 text-gray-500" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={onSubmit}>
                  <div>
                    <h2 className="text-sm font-medium text-gray-700 mb-3">
                      Review or edit the details extracted from your resume:
                    </h2>

                    <div className='my-3'>
                      <label className="text-sm font-medium text-gray-700">Job Role / Job Position</label>
                      <Input 
                        placeholder="Ex. Full Stack Developer" 
                        required 
                        value={jobPosition}
                        onChange={(event) => setJobPosition(event.target.value)} 
                      />
                    </div>

                    <div className='my-3'>
                      <label className="text-sm font-medium text-gray-700">Job Description / Tech Stack (In Short)</label>
                      <Textarea 
                        placeholder="Ex. React, Angular, Node.js, MySQL, etc." 
                        required 
                        value={jobDesc}
                        onChange={(event) => setJobDesc(event.target.value)} 
                      />
                    </div>

                    <div className='my-3'>
                      <label className="text-sm font-medium text-gray-700">Years of Experience</label>
                      <Input 
                        placeholder="Ex. 5" 
                        type="number" 
                        max="100" 
                        required 
                        value={jobExperience}
                        onChange={(event) => setJobExperience(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className='flex gap-4 justify-end mt-6'>
                    <Button type="button" variant="ghost" onClick={resetModal}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading || extracting}>
                      {loading ? (
                        <>
                          <LoaderCircle className='animate-spin mr-2' /> Generating from AI
                        </>
                      ) : (
                        'Start Interview'
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AddResumeInterview
