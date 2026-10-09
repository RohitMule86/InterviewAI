import { Lightbulb, Volume2 } from 'lucide-react'
import React from 'react'

function QuestionsSection({
    mockInterviewQuestion,
    activeQuestionIndex,
    setActiveQuestionIndex
}) {
  const questions = Array.isArray(mockInterviewQuestion) ? mockInterviewQuestion : []

  const textToSpeech = (text) => {
    if (!text) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const speech = new SpeechSynthesisUtterance(text);

      speech.onend = () => {
        window.speechSynthesis.cancel();
      };

      window.speechSynthesis.speak(speech);
    } else {
      alert('Sorry, your browser does not support text to speech')
    }
  }

  return questions.length > 0 && (
    <div className='p-5 border rounded-lg my-10'>

      <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5'>

        {questions.map((question, index) => (
          <h2
            key={index}
            onClick={() => setActiveQuestionIndex(index)}
            className={`p-2 rounded-full text-xs md:text-sm text-center cursor-pointer transition-all ${
              activeQuestionIndex === index
                ? 'bg-blue-600 text-white font-semibold'
                : 'bg-secondary text-black hover:bg-gray-200'
            }`}
          >
            Question #{index + 1}
          </h2>
        ))}

      </div>

      {/* Current Question */}
      <h2 className='my-5 text-md md:text-lg font-medium text-gray-800'>
        {questions[activeQuestionIndex]?.question}
      </h2>

      <Volume2 
        className='cursor-pointer text-blue-600 hover:text-blue-800 transition-colors' 
        onClick={() => textToSpeech(questions[activeQuestionIndex]?.question)} 
      />

      <div className='border rounded-lg p-5 bg-blue-50 border-blue-200 mt-20'>

        <h2 className='flex gap-2 items-center text-blue-700 font-semibold'>
          <Lightbulb className="w-5 h-5" />
          <strong>Note:</strong>
        </h2>

        <h2 className='text-sm text-blue-900 my-2 leading-relaxed'>
          {process.env.NEXT_PUBLIC_QUESTION_NOTE || "Click on Record Answer when you want to answer the question. At the end of interview we will give you the feedback along with correct answer for each question and your answer to compare it."}
        </h2>

      </div>

    </div>
  )
}

export default QuestionsSection