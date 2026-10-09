// inside app/dashboard/interview/[interviewId]/start/_components/RecordAnswerSection.jsx

import EyeContactMonitor from './EyeContactMonitor';

function RecordAnswerSection({ mockInterviewQuestion, activeQuestionIndex, interviewData }) {
  // ... your existing speech-to-text logic ...

  return (
    <div className='flex items-center justify-center flex-col'>
      {/* Eye Contact Monitor replacing or wrapping webcam */}
      <div className='mt-10'>
        <EyeContactMonitor />
      </div>

      <Button
        disabled={loading}
        className="my-10 px-8 py-3 rounded-full border border-gray-300 bg-white text-gray-800 shadow-sm hover:bg-gray-100 transition-all cursor-pointer"
        onClick={StartStopRecording}
      >
        {isRecording ? (
          <span className="flex items-center gap-2 text-red-600">
            <Mic size={18} />
            Stop Recording...
          </span>
        ) : (
          'Record Answer'
        )}
      </Button>
    </div>
  );
}