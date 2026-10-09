"use client"

import { db } from '@/utils/db';
import { MockInterview } from '@/utils/schema';
import { eq } from 'drizzle-orm';
import React, { use, useEffect, useState } from 'react';
import QuestionsSection from './_components/QuestionsSection';
import RecordAnswerSection from './_components/RecordAnswerSection';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function StartInterview({ params }) {

    const { interviewId } = use(params);

    const [interviewData, setInterviewData] = useState();
    const [mockInterviewQuestion, setMockInterviewQuestion] = useState([]);
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

    useEffect(() => {
        GetInterviewDetails();
    }, [interviewId]);

    /*
    Used to get interview details by mock id and normalize questions array
    */
    const GetInterviewDetails = async () => {
        try {
            const result = await db
                .select()
                .from(MockInterview)
                .where(eq(MockInterview.mockId, interviewId));

            if (result.length === 0) {
                console.log("Interview not found");
                return;
            }

            const rawJson = result[0].jsonMockResp;
            const parsedJson = JSON.parse(rawJson);

            let questionsArray = [];

            if (Array.isArray(parsedJson)) {
                questionsArray = parsedJson;
            } else if (parsedJson && typeof parsedJson === 'object') {
                if (Array.isArray(parsedJson.questions)) {
                    questionsArray = parsedJson.questions;
                } else if (Array.isArray(parsedJson.interviewQuestions)) {
                    questionsArray = parsedJson.interviewQuestions;
                } else if (Array.isArray(parsedJson.interview_questions)) {
                    questionsArray = parsedJson.interview_questions;
                } else if (Array.isArray(parsedJson.qaBreakdown)) {
                    questionsArray = parsedJson.qaBreakdown;
                } else if (Array.isArray(parsedJson.mockQuestions)) {
                    questionsArray = parsedJson.mockQuestions;
                } else {
                    const foundArray = Object.values(parsedJson).find(v => Array.isArray(v));
                    if (foundArray) {
                        questionsArray = foundArray;
                    }
                }
            }

            setMockInterviewQuestion(questionsArray);
            setInterviewData(result[0]);
        } catch (error) {
            console.error("Error parsing interview questions:", error);
            setMockInterviewQuestion([]);
        }
    }

    return (
        <div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-10'>

                {/* Questions Section */}
                <QuestionsSection
                    mockInterviewQuestion={mockInterviewQuestion}
                    activeQuestionIndex={activeQuestionIndex}
                    setActiveQuestionIndex={setActiveQuestionIndex}
                />

                {/* Video / Audio Recording */}
                <RecordAnswerSection 
                    mockInterviewQuestion={mockInterviewQuestion}
                    activeQuestionIndex={activeQuestionIndex}
                    setActiveQuestionIndex={setActiveQuestionIndex}
                    interviewData={interviewData}
                />

            </div>
            <div className='flex justify-end gap-6 my-6'>
                {activeQuestionIndex > 0 &&
                <Button onClick={() => setActiveQuestionIndex(activeQuestionIndex - 1)}>Previous Question</Button>}
                
                {mockInterviewQuestion && activeQuestionIndex < mockInterviewQuestion.length - 1 &&
                <Button onClick={() => setActiveQuestionIndex(activeQuestionIndex + 1)}>Next Question</Button>}
                
                {mockInterviewQuestion && activeQuestionIndex >= mockInterviewQuestion.length - 1 &&
                <Link href={'/dashboard/interview/' + interviewData?.mockId + "/feedback"}>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">End Interview</Button>
                </Link>}
            </div>
        </div>
    )
}

export default StartInterview