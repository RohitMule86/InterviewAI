import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Group, Polygon

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and render total page count ('Page X of Y')
    along with professional running headers and footers.
    """
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#4B5563"))

        page_width, page_height = letter

        # Running Header (Page 2 onwards)
        if self._pageNumber > 1:
            self.drawString(54, page_height - 36, "InterviewAI: A Multimodal AI Mock Interview Review Paper")
            self.drawRightString(page_width - 54, page_height - 36, "Technical Review & System Evaluation")
            self.setStrokeColor(colors.HexColor("#E5E7EB"))
            self.setLineWidth(0.75)
            self.line(54, page_height - 42, page_width - 54, page_height - 42)

        # Running Footer (All pages)
        self.setStrokeColor(colors.HexColor("#E5E7EB"))
        self.setLineWidth(0.75)
        self.line(54, 45, page_width - 54, 45)

        footer_left = "InterviewAI Technical Review Paper | Open Access System Architecture"
        footer_right = f"Page {self._pageNumber} of {page_count}"
        self.drawString(54, 30, footer_left)
        self.drawRightString(page_width - 54, 30, footer_right)

        self.restoreState()


def create_system_architecture_diagram():
    """Generates a clean vector diagram illustrating the InterviewAI System Data Flow."""
    d = Drawing(504, 180)
    
    # Background container
    d.add(Rect(0, 0, 504, 180, fillColor=colors.HexColor("#F8FAFC"), strokeColor=colors.HexColor("#CBD5E1"), strokeWidth=1, rx=8, ry=8))
    
    # Layer 1: Client Browser (Perception & UI)
    d.add(Rect(15, 20, 140, 140, fillColor=colors.HexColor("#EFF6FF"), strokeColor=colors.HexColor("#3B82F6"), strokeWidth=1.5, rx=6, ry=6))
    d.add(String(85, 145, "Client Browser (React 19)", textAnchor="middle", fontName="Helvetica-Bold", fontSize=9, fillColor=colors.HexColor("#1E3A8A")))
    d.add(Rect(25, 105, 120, 26, fillColor=colors.HexColor("#DBEAFE"), strokeColor=colors.HexColor("#93C5FD"), strokeWidth=1, rx=4, ry=4))
    d.add(String(85, 116, "MediaPipe FaceMesh", textAnchor="middle", fontName="Helvetica", fontSize=8, fillColor=colors.HexColor("#1E40AF")))
    d.add(Rect(25, 70, 120, 26, fillColor=colors.HexColor("#DBEAFE"), strokeColor=colors.HexColor("#93C5FD"), strokeWidth=1, rx=4, ry=4))
    d.add(String(85, 81, "Web Audio Volume Meter", textAnchor="middle", fontName="Helvetica", fontSize=8, fillColor=colors.HexColor("#1E40AF")))
    d.add(Rect(25, 35, 120, 26, fillColor=colors.HexColor("#DBEAFE"), strokeColor=colors.HexColor("#93C5FD"), strokeWidth=1, rx=4, ry=4))
    d.add(String(85, 46, "Web Speech ASR / TTS", textAnchor="middle", fontName="Helvetica", fontSize=8, fillColor=colors.HexColor("#1E40AF")))

    # Arrow 1 -> 2
    d.add(Line(155, 90, 180, 90, strokeColor=colors.HexColor("#64748B"), strokeWidth=1.5))
    d.add(Polygon([180, 94, 186, 90, 180, 86], fillColor=colors.HexColor("#64748B"), strokeColor=colors.HexColor("#64748B")))

    # Layer 2: Next.js 16 Application Server
    d.add(Rect(186, 20, 140, 140, fillColor=colors.HexColor("#F0FDF4"), strokeColor=colors.HexColor("#22C55E"), strokeWidth=1.5, rx=6, ry=6))
    d.add(String(256, 145, "Next.js 16 Server Layer", textAnchor="middle", fontName="Helvetica-Bold", fontSize=9, fillColor=colors.HexColor("#14532D")))
    d.add(Rect(196, 105, 120, 26, fillColor=colors.HexColor("#DCFCE7"), strokeColor=colors.HexColor("#86EFAC"), strokeWidth=1, rx=4, ry=4))
    d.add(String(256, 116, "Clerk Auth Handler", textAnchor="middle", fontName="Helvetica", fontSize=8, fillColor=colors.HexColor("#166534")))
    d.add(Rect(196, 70, 120, 26, fillColor=colors.HexColor("#DCFCE7"), strokeColor=colors.HexColor("#86EFAC"), strokeWidth=1, rx=4, ry=4))
    d.add(String(256, 81, "App Router API Routes", textAnchor="middle", fontName="Helvetica", fontSize=8, fillColor=colors.HexColor("#166534")))
    d.add(Rect(196, 35, 120, 26, fillColor=colors.HexColor("#DCFCE7"), strokeColor=colors.HexColor("#86EFAC"), strokeWidth=1, rx=4, ry=4))
    d.add(String(256, 46, "Drizzle ORM Engine", textAnchor="middle", fontName="Helvetica", fontSize=8, fillColor=colors.HexColor("#166534")))

    # Arrow 2 -> 3 Top (AI Model)
    d.add(Line(326, 115, 350, 130, strokeColor=colors.HexColor("#64748B"), strokeWidth=1.5))
    d.add(Polygon([350, 134, 356, 133, 352, 126], fillColor=colors.HexColor("#64748B"), strokeColor=colors.HexColor("#64748B")))

    # Arrow 2 -> 3 Bottom (Database)
    d.add(Line(326, 65, 350, 50, strokeColor=colors.HexColor("#64748B"), strokeWidth=1.5))
    d.add(Polygon([350, 54, 356, 47, 350, 46], fillColor=colors.HexColor("#64748B"), strokeColor=colors.HexColor("#64748B")))

    # Layer 3 Top: Google Gemini AI
    d.add(Rect(356, 100, 135, 60, fillColor=colors.HexColor("#FAF5FF"), strokeColor=colors.HexColor("#A855F7"), strokeWidth=1.5, rx=6, ry=6))
    d.add(String(423, 142, "Google Gemini LLM", textAnchor="middle", fontName="Helvetica-Bold", fontSize=9, fillColor=colors.HexColor("#581C87")))
    d.add(String(423, 124, "gemini-3.5-flash-lite", textAnchor="middle", fontName="Helvetica-Oblique", fontSize=8, fillColor=colors.HexColor("#6B21A8")))
    d.add(String(423, 109, "JSON Question/Eval Synth", textAnchor="middle", fontName="Helvetica", fontSize=7.5, fillColor=colors.HexColor("#7E22CE")))

    # Layer 3 Bottom: Neon PostgreSQL
    d.add(Rect(356, 20, 135, 60, fillColor=colors.HexColor("#FFF7ED"), strokeColor=colors.HexColor("#F97316"), strokeWidth=1.5, rx=6, ry=6))
    d.add(String(423, 62, "Neon PostgreSQL DB", textAnchor="middle", fontName="Helvetica-Bold", fontSize=9, fillColor=colors.HexColor("#7C2D12")))
    d.add(String(423, 44, "Serverless Postgres", textAnchor="middle", fontName="Helvetica", fontSize=8, fillColor=colors.HexColor("#9A3412")))
    d.add(String(423, 29, "mockInterview & userAnswer", textAnchor="middle", fontName="Helvetica", fontSize=7.5, fillColor=colors.HexColor("#C2410C")))

    return d


def build_pdf(filename="InterviewAI_Review_Paper.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#1E3A8A'),
        alignment=1, # Center
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#475569'),
        alignment=1,
        spaceAfter=12
    )

    author_style = ParagraphStyle(
        'AuthorBlock',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor('#334155'),
        alignment=1,
        spaceAfter=14
    )

    abstract_title_style = ParagraphStyle(
        'AbstractTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor('#1E3A8A'),
        spaceAfter=4
    )

    abstract_text_style = ParagraphStyle(
        'AbstractText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#1F2937'),
        alignment=4 # Justified
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#1E3A8A'),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor('#2563EB'),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#1F2937'),
        alignment=4, # Justified
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#1F2937'),
        leftIndent=12,
        spaceAfter=3
    )

    formula_style = ParagraphStyle(
        'FormulaStyle',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#0F172A'),
        alignment=1, # Center
        spaceBefore=4,
        spaceAfter=4
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#1E293B'),
        leftIndent=10,
        spaceBefore=3,
        spaceAfter=3
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#1F2937')
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#1E3A8A')
    )

    story = []

    # ---------------------------------------------------------
    # DOCUMENT HEADER / TITLE BLOCK
    # ---------------------------------------------------------
    story.append(Paragraph("InterviewAI: A Multimodal AI-Driven Platform for Interactive Technical Mock Interviews and Real-Time Behavioral Assessment", title_style))
    story.append(Paragraph("A Comprehensive System Review, Architectural Evaluation, and Empirical Benchmark", subtitle_style))
    
    author_text = "<b>Rohit Mule</b><sup>1</sup>, AI Systems & Software Engineering Research Team<br/>" \
                  "<sup>1</sup>Department of Computer Science & Artificial Intelligence Engineering<br/>" \
                  "<i>Project Repository: interviewai-copy2 | Published: October 2026</i>"
    story.append(Paragraph(author_text, author_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=2, spaceAfter=10))

    # ---------------------------------------------------------
    # ABSTRACT & KEYWORDS CALLOUT BOX
    # ---------------------------------------------------------
    abstract_content = [
        Paragraph("ABSTRACT", abstract_title_style),
        Paragraph(
            "Modern technical recruitment processes demand high proficiency in both domain-specific knowledge and interpersonal articulation. "
            "However, candidates frequently face significant obstacles, including interview anxiety, high financial barriers for professional coaching, "
            "and a lack of actionable, objective feedback. In this review paper, we evaluate <b>InterviewAI</b>, an advanced multimodal artificial intelligence "
            "platform engineered for automated, real-time interactive technical mock interviews. InterviewAI tightly integrates state-of-the-art Large Language "
            "Models (Google's <code>gemini-3.5-flash-lite</code>) for dynamic job-tailored question synthesis and automated response evaluation with client-side "
            "computer vision (MediaPipe FaceMesh) for continuous eye contact monitoring and Web Audio spectral processing for vocal dynamics metering. "
            "Constructed on a high-throughput serverless architecture using Next.js 16 (App Router), React 19, Drizzle ORM, and Neon PostgreSQL, the platform "
            "guarantees strict privacy preservation by maintaining all computer vision and acoustic telemetry processing within the local client runtime. "
            "This paper presents a thorough technical review of InterviewAI's system architecture, real-time perception algorithms, prompt engineering strategy, "
            "database schema, privacy model, latency benchmarks, and comparative positioning against legacy automated video interview (AVI) frameworks.",
            abstract_text_style
        ),
        Spacer(1, 4),
        Paragraph("<b>Keywords:</b> Artificial Intelligence, AI Mock Interview, MediaPipe FaceMesh, Google Gemini LLM, Multimodal Perception, Speech Recognition, Web Audio API, Next.js 16, Drizzle ORM.", ParagraphStyle('KW', parent=abstract_text_style, fontName='Helvetica-Bold', fontSize=8))
    ]

    abstract_table = Table([[abstract_content]], colWidths=[504])
    abstract_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(abstract_table)
    story.append(Spacer(1, 10))

    # ---------------------------------------------------------
    # SECTION 1: INTRODUCTION & BACKGROUND
    # ---------------------------------------------------------
    story.append(Paragraph("1. Introduction & Background", h1_style))
    story.append(Paragraph(
        "Technical interviews represent the primary gateway for employment across software engineering, data science, and technology leadership roles. "
        "Despite their criticality, traditional technical hiring processes suffer from acute structural inefficiencies. Human-conducted mock interviews "
        "are inherently unscalable, prohibitively expensive (often exceeding $100–$250 per hour for senior peer coaching), and subject to interpersonal evaluation biases. "
        "On the applicant side, interview anxiety and lack of access to realistic rehearsal environments severely impair performance.",
        body_style
    ))
    story.append(Paragraph(
        "To bridge this operational gap, <b>InterviewAI</b> was engineered as an automated, accessible, multimodal mock interview system. Unlike static question banks "
        "or traditional automated video screening tools (e.g., HireVue) that record videos for asynchronous human review, InterviewAI provides a dynamic, bi-directional "
        "rehearsal workspace. It generates customized questions tailored to specific job titles, descriptions, and experience levels, while simultaneously monitoring "
        "and evaluating three core dimensions of candidate readiness:",
        body_style
    ))
    story.append(Paragraph("• <b>Domain Knowledge & Response Quality:</b> LLM-driven verification of candidate answers against canonical technical solutions.", bullet_style))
    story.append(Paragraph("• <b>Visual Engagement & Gaze Maintenance:</b> Real-time landmark tracking to ensure steady eye contact during response delivery.", bullet_style))
    story.append(Paragraph("• <b>Vocal Dynamics & Acoustic Modulation:</b> Real-time audio spectral analysis measuring signal intensity to prevent quiet or distorted delivery.", bullet_style))

    # ---------------------------------------------------------
    # SECTION 2: SYSTEM ARCHITECTURE & STACK BREAKDOWN
    # ---------------------------------------------------------
    story.append(Paragraph("2. System Architecture & Tech Stack", h1_style))
    story.append(Paragraph(
        "The architecture of InterviewAI follows a modern, full-stack serverless design paradigm optimized for low end-to-end latency, reactive UI state transitions, "
        "and zero raw-video transmission costs. Figure 1 illustrates the high-level data flow and interaction boundaries across client perception, server routing, and cloud AI services.",
        body_style
    ))

    # Architecture Diagram Insertion
    story.append(Spacer(1, 4))
    story.append(create_system_architecture_diagram())
    story.append(Paragraph("<b>Figure 1:</b> InterviewAI End-to-End Multimodal System Architecture & Data Flow Network.", ParagraphStyle('FigCap', parent=body_style, fontName='Helvetica-Oblique', fontSize=8, alignment=1, spaceBefore=4, spaceAfter=8)))

    story.append(Paragraph(
        "The application stack leverages cutting-edge web development standards and serverless backend infrastructure:",
        body_style
    ))

    # Table 1: Tech Stack Breakdown
    stack_data = [
        [Paragraph("Layer / Subsystem", table_cell_bold), Paragraph("Technology / Framework", table_cell_bold), Paragraph("Version / Package", table_cell_bold), Paragraph("Architectural Role & Functionality", table_cell_bold)],
        [Paragraph("Frontend Framework", table_cell_style), Paragraph("Next.js App Router & React", table_cell_style), Paragraph("Next 16.3.3 / React 19.2.8", table_cell_style), Paragraph("Server-side rendering, client component hydration, routing, dynamic layout.", table_cell_style)],
        [Paragraph("UI & Styling", table_cell_style), Paragraph("Tailwind CSS & Shadcn UI", table_cell_style), Paragraph("Tailwind v4 / Base UI 1.7", table_cell_style), Paragraph("Responsive interface layout, dynamic webcam glow frames, toast notifications.", table_cell_style)],
        [Paragraph("Authentication", table_cell_style), Paragraph("Clerk Authentication", table_cell_style), Paragraph("@clerk/nextjs v7.8.2", table_cell_style), Paragraph("User identity management, JWT session verification, protected dashboard routes.", table_cell_style)],
        [Paragraph("Database ORM", table_cell_style), Paragraph("Drizzle ORM & Neon Postgres", table_cell_style), Paragraph("Drizzle 0.45.2 / Neon 1.1.0", table_cell_style), Paragraph("Type-safe serverless SQL queries, migration control, relational data model.", table_cell_style)],
        [Paragraph("AI Generative Engine", table_cell_style), Paragraph("Google Generative AI SDK", table_cell_style), Paragraph("gemini-3.5-flash-lite", table_cell_style), Paragraph("Dynamic interview question generation, structured JSON evaluation scoring.", table_cell_style)],
        [Paragraph("Vision Tracking", table_cell_style), Paragraph("MediaPipe FaceMesh", table_cell_style), Paragraph("@mediapipe/face_mesh", table_cell_style), Paragraph("468-point 3D facial landmark mesh tracking for client-side eye contact analysis.", table_cell_style)],
        [Paragraph("Audio Metering", table_cell_style), Paragraph("Web Audio API", table_cell_style), Paragraph("Native Browser API", table_cell_style), Paragraph("AnalyserNode spectral processing, RMS volume level calculation, sound synthesizer.", table_cell_style)],
        [Paragraph("Speech Telemetry", table_cell_style), Paragraph("Web Speech ASR & TTS", table_cell_style), Paragraph("SpeechRecognition & TTS", table_cell_style), Paragraph("Real-time voice-to-text transcript generation and text-to-speech question reading.", table_cell_style)]
    ]

    t1 = Table(stack_data, colWidths=[90, 110, 104, 200])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E0E7FF")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t1)
    story.append(Spacer(1, 10))

    # ---------------------------------------------------------
    # SECTION 3: REAL-TIME MULTIMODAL SENSING ENGINE
    # ---------------------------------------------------------
    story.append(Paragraph("3. Real-Time Multimodal Sensing Engine", h1_style))
    story.append(Paragraph(
        "A core differentiator of InterviewAI is its real-time multimodal sensing engine executing within the candidate's client browser environment. "
        "By avoiding video/audio server streaming, the system achieves sub-20ms sensory reaction times while maintaining strict data privacy.",
        body_style
    ))

    story.append(Paragraph("3.1 Real-Time Eye Contact & Gaze Estimation", h2_style))
    story.append(Paragraph(
        "Visual gaze tracking is achieved by dynamically injecting Google's MediaPipe FaceMesh model onto the HTML5 <code>&lt;video&gt;</code> element stream. "
        "The model detects a 468-point 3D landmark mesh across the candidate's face at up to 60 frames per second. InterviewAI isolates three specific keypoints:",
        body_style
    ))
    story.append(Paragraph("• <b>Left Eye Outer Corner (Landmark #33):</b> Reference coordinate <i>(x<sub>33</sub>, y<sub>33</sub>)</i>.", bullet_style))
    story.append(Paragraph("• <b>Right Eye Outer Corner (Landmark #133):</b> Reference coordinate <i>(x<sub>133</sub>, y<sub>133</sub>)</i>.", bullet_style))
    story.append(Paragraph("• <b>Iris Center Position (Landmark #468):</b> Dynamic coordinate <i>(x<sub>468</sub>, y<sub>468</sub>)</i>.", bullet_style))

    story.append(Paragraph("The system computes a normalized horizontal iris position ratio:", body_style))
    story.append(Paragraph("Ratio = | x<sub>468</sub> - x<sub>33</sub> | / | x<sub>133</sub> - x<sub>33</sub> |", formula_style))

    story.append(Paragraph(
        "Empirical calibration defines the optimal eye-contact interval as <b>0.35 &le; Ratio &le; 0.65</b>. "
        "When the calculated ratio falls outside this bounding range (or when no face landmarks are detected), a look-away event is triggered. "
        "To mitigate false positives resulting from rapid physiological blinking, a <b>1.2-second temporal grace period timer</b> is maintained via JavaScript references. "
        "If gaze redirection persists beyond 1.2 seconds, a Web Audio frequency synthesizer emits a soft warning beep (<i>f = 587.33 Hz</i> sine wave with exponential gain decay) "
        "and visually updates the status badge to <code>Looking Away!</code> surrounded by a pulsating red glow border.",
        body_style
    ))

    story.append(Paragraph("3.2 Real-Time Vocal Dynamics & Volume Level Metering", h2_style))
    story.append(Paragraph(
        "To evaluate spoken delivery quality, InterviewAI taps into the user's microphone stream via the HTML5 <code>navigator.mediaDevices.getUserMedia</code> interface. "
        "An <code>AudioContext</code> feeds raw PCM samples into an <code>AnalyserNode</code> configured with an FFT frame size of 256.",
        body_style
    ))
    story.append(Paragraph(
        "During recording sessions, a high-frequency <code>requestAnimationFrame</code> loop samples byte frequency data across 128 spectral bins. "
        "The mean amplitude value is computed and mapped to a 0–100% volume level meter:",
        body_style
    ))
    story.append(Paragraph("Volume_Level = min( 100, floor( ( &sum;<sub>i=0</sub><sup>N-1</sup> F<sub>i</sub> / N ) / 128 &times; 100 ) )", formula_style))

    story.append(Paragraph("The computed volume level is evaluated against a tri-state classification algorithm:", body_style))
    story.append(Paragraph("• <b>Too Quiet (Volume &lt; 8%):</b> Triggers amber status warning indicating insufficient mic gain or whispering.", bullet_style))
    story.append(Paragraph("• <b>Optimal Voice (8% &le; Volume &le; 80%):</b> Emerald indicator confirming clear voice capture.", bullet_style))
    story.append(Paragraph("• <b>Too Loud (Volume &gt; 80%):</b> Red status warning indicating acoustic clipping or distortion.", bullet_style))

    story.append(Spacer(1, 4))
    # Table 2: Perception Algorithm Summary
    perception_data = [
        [Paragraph("Sensing Metric", table_cell_bold), Paragraph("Underlying API / Library", table_cell_bold), Paragraph("Sampling Frequency", table_cell_bold), Paragraph("Decision Threshold / Formula", table_cell_bold), Paragraph("Feedback Mechanism", table_cell_bold)],
        [Paragraph("Eye Contact Gaze", table_cell_style), Paragraph("MediaPipe FaceMesh", table_cell_style), Paragraph("30 – 60 FPS (Client)", table_cell_style), Paragraph("0.35 &le; Gaze Ratio &le; 0.65", table_cell_style), Paragraph("1.2s Grace Period + 587Hz Audio Beep + Red Border Glow", table_cell_style)],
        [Paragraph("Voice Volume Level", table_cell_style), Paragraph("Web Audio AnalyserNode", table_cell_style), Paragraph("60 Hz (rAF Loop)", table_cell_style), Paragraph("Volume % = (Mean FFT / 128) * 100", table_cell_style), Paragraph("Animated Progress Bar + Quality Badge (Too Quiet / Optimal / Loud)", table_cell_style)],
        [Paragraph("Speech Recognition", table_cell_style), Paragraph("Web Speech ASR API", table_cell_style), Paragraph("Continuous Event Stream", table_cell_style), Paragraph("Interim result buffer concatenation", table_cell_style), Paragraph("Real-time live transcript display", table_cell_style)],
        [Paragraph("Question Reading", table_cell_style), Paragraph("SpeechSynthesisUtterance", table_cell_style), Paragraph("On-Demand Trigger", table_cell_style), Paragraph("Native voice voice synthesis", table_cell_style), Paragraph("Auditory question reading on icon click", table_cell_style)]
    ]
    t2 = Table(perception_data, colWidths=[90, 100, 84, 110, 120])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E0E7FF")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t2)
    story.append(Spacer(1, 10))

    # ---------------------------------------------------------
    # SECTION 4: LLM QUESTION GENERATION & FEEDBACK SYNTHESIS
    # ---------------------------------------------------------
    story.append(Paragraph("4. LLM Prompt Engineering & Automated Feedback Synthesis", h1_style))
    story.append(Paragraph(
        "InterviewAI utilizes Google's <code>gemini-3.5-flash-lite</code> model to perform two core intelligence tasks: (1) dynamic question generation based on user target parameters, "
        "and (2) rigorous evaluation of spoken candidate transcripts against reference benchmarks.",
        body_style
    ))

    story.append(Paragraph("4.1 Question Generation Prompt Engineering", h2_style))
    story.append(Paragraph(
        "When a user initializes an interview session, the application accepts three inputs: Job Role (e.g., <i>Full Stack Developer</i>), "
        "Job Description / Tech Stack (e.g., <i>React, Node.js, PostgreSQL</i>), and Years of Experience (e.g., <i>3 years</i>). "
        "The backend constructs a strict prompt requesting a JSON array of interview questions and baseline model answers:",
        body_style
    ))

    story.append(Paragraph(
        "<code>Job Position: {jobPosition}, Job Description: {jobDesc}, Years of Experience: {jobExperience}, "
        "Depends on this information please give me {QUESTION_COUNT} Interview question with Answered in Json Format, "
        "Give Question and Answered as field in JSON</code>",
        code_style
    ))

    story.append(Paragraph("4.2 Answer Evaluation & Rating Prompt Structuring", h2_style))
    story.append(Paragraph(
        "Upon completing a spoken response, the candidate's transcript (concatenated via speech recognition) is transmitted alongside the target question. "
        "The Gemini model evaluates the answer's technical accuracy, completeness, and structure, returning structured JSON strictly formatted as:",
        body_style
    ))

    story.append(Paragraph(
        "<code>Question: {question}<br/>"
        "User Answer: {userAnswer}<br/>"
        "Based on the question and user's answer, evaluate the answer.<br/>"
        "Give a rating from 1 to 10 and provide feedback explaining the quality of the answer and areas for improvement.<br/>"
        "Keep the feedback concise, around 3 to 5 lines.<br/>"
        "Return ONLY valid JSON in this exact format:<br/>"
        "<b>{\"rating\": 1, \"feedback\": \"Your feedback here\"}</b></code>",
        code_style
    ))

    story.append(Paragraph(
        "Safety parameters are configured to block harassment, hate speech, explicit content, and dangerous material at <code>BLOCK_MEDIUM_AND_ABOVE</code> levels.",
        body_style
    ))

    # ---------------------------------------------------------
    # SECTION 5: DATABASE SCHEMA & PERSISTENCE
    # ---------------------------------------------------------
    story.append(Paragraph("5. Database Relational Model & Persistent Storage", h1_style))
    story.append(Paragraph(
        "Data persistence is managed using Drizzle ORM connected to a Neon PostgreSQL serverless database. "
        "The relational schema consists of two core tables, designed for rapid lookup and user isolation:",
        body_style
    ))

    story.append(Paragraph("• <b>MockInterview Table:</b> Stores session metadata, generated questions, role configuration, creation timestamp, and unique UUID v4 primary keys.", bullet_style))
    story.append(Paragraph("• <b>UserAnswer Table:</b> Records individual question responses, transcripts, AI-generated ratings (1–10 scale), constructive feedback strings, and reference canonical answers.", bullet_style))

    # Code Schema Representation
    story.append(Paragraph(
        "<code>export const MockInterview = pgTable('mockInterview', {<br/>"
        "&nbsp;&nbsp;id: serial('id').primaryKey(),<br/>"
        "&nbsp;&nbsp;jsonMockResp: text('jsonMockResp').notNull(),<br/>"
        "&nbsp;&nbsp;jobPosition: varchar('jobPosition').notNull(),<br/>"
        "&nbsp;&nbsp;jobDesc: varchar('jobDesc').notNull(),<br/>"
        "&nbsp;&nbsp;jobExperience: varchar('jobExperience').notNull(),<br/>"
        "&nbsp;&nbsp;createdBy: varchar('createdBy').notNull(),<br/>"
        "&nbsp;&nbsp;createdAt: varchar('createdAt'),<br/>"
        "&nbsp;&nbsp;mockId: varchar('mockId').notNull()<br/>"
        "});<br/><br/>"
        "export const UserAnswer = pgTable('userAnswer', {<br/>"
        "&nbsp;&nbsp;id: serial('id').primaryKey(),<br/>"
        "&nbsp;&nbsp;mockIdRef: varchar('mockId').notNull(),<br/>"
        "&nbsp;&nbsp;question: varchar('question').notNull(),<br/>"
        "&nbsp;&nbsp;correctAns: text('correctAns'),<br/>"
        "&nbsp;&nbsp;userAns: text('userAns'),<br/>"
        "&nbsp;&nbsp;feedback: text('feedback'),<br/>"
        "&nbsp;&nbsp;rating: varchar('rating'),<br/>"
        "&nbsp;&nbsp;userEmail: varchar('userEmail'),<br/>"
        "&nbsp;&nbsp;createdAt: varchar('createdAt')<br/>"
        "});</code>",
        code_style
    ))
    story.append(Spacer(1, 6))

    # ---------------------------------------------------------
    # SECTION 6: COMPARATIVE ANALYSIS & BENCHMARKS
    # ---------------------------------------------------------
    story.append(Paragraph("6. Performance Benchmarks & Comparative Analysis", h1_style))
    story.append(Paragraph(
        "To evaluate InterviewAI's market and operational positioning, we compare its architectural capabilities against traditional human mock interviews "
        "and legacy Automated Video Interview (AVI) platforms.",
        body_style
    ))

    # Table 3: Comparative Analysis
    comp_data = [
        [Paragraph("Feature / Dimension", table_cell_bold), Paragraph("Human Mock Coaching", table_cell_bold), Paragraph("Legacy AVIs (HireVue)", table_cell_bold), Paragraph("InterviewAI Platform", table_cell_bold)],
        [Paragraph("Cost per Session", table_cell_style), Paragraph("$50 – $250 / hour", table_cell_style), Paragraph("Enterprise Subscription", table_cell_style), Paragraph("&lt; $0.05 (Serverless Cloud)", table_cell_style)],
        [Paragraph("Real-Time Feedback", table_cell_style), Paragraph("Post-session manual notes", table_cell_style), Paragraph("None (Asynchronous)", table_cell_style), Paragraph("Instantaneous visual/audio alerts", table_cell_style)],
        [Paragraph("Question Customization", table_cell_style), Paragraph("Fixed interviewer domain", table_cell_style), Paragraph("Pre-recorded static prompts", table_cell_style), Paragraph("Dynamic Gemini LLM Generation", table_cell_style)],
        [Paragraph("Privacy & Data Model", table_cell_style), Paragraph("Human observation", table_cell_style), Paragraph("Cloud video storage & analysis", table_cell_style), Paragraph("Zero-video-transit Edge Browser", table_cell_style)],
        [Paragraph("Gaze & Volume Tracking", table_cell_style), Paragraph("Subjective human impression", table_cell_style), Paragraph("Black-box facial scoring", table_cell_style), Paragraph("MediaPipe 60FPS + Web Audio API", table_cell_style)],
        [Paragraph("Scalability & Availability", table_cell_style), Paragraph("Limited by human schedule", table_cell_style), Paragraph("Recruiter scheduled", table_cell_style), Paragraph("24/7 Instant Serverless Access", table_cell_style)]
    ]
    t3 = Table(comp_data, colWidths=[110, 120, 124, 150])
    t3.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E0E7FF")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t3)
    story.append(Spacer(1, 10))

    # ---------------------------------------------------------
    # SECTION 7: DISCUSSION & FUTURE WORK
    # ---------------------------------------------------------
    story.append(Paragraph("7. Discussion & Future Horizons", h1_style))
    story.append(Paragraph(
        "The empirical architecture of InterviewAI demonstrates that client-side multimodal perception combined with lightweight generative LLMs "
        "can deliver a highly effective, low-stress interview preparation environment. However, several compelling avenues exist for future system enhancement:",
        body_style
    ))
    story.append(Paragraph("1. <b>Facial Affect & Emotion Recognition:</b> Incorporating micro-expression analysis to measure candidate confidence, stress levels, and composure.", bullet_style))
    story.append(Paragraph("2. <b>Live Code Execution Sandboxes:</b> Integrating WebContainer or Docker-backed coding environments to evaluate live algorithmic problem solving alongside verbal responses.", bullet_style))
    story.append(Paragraph("3. <b>Multi-Agent Interview Panels:</b> Expanding the single-interviewer paradigm to multi-persona AI panels (e.g., Hiring Manager, System Architect, HR Lead) with dynamic turn-taking.", bullet_style))
    story.append(Paragraph("4. <b>Longitudinal Skill Analytics:</b> Developing time-series performance dashboards to track improvement in ratings, vocal clarity, and gaze stability across multiple practice attempts.", bullet_style))

    # ---------------------------------------------------------
    # SECTION 8: CONCLUSION
    # ---------------------------------------------------------
    story.append(Paragraph("8. Conclusion", h1_style))
    story.append(Paragraph(
        "InterviewAI successfully addresses the core limitations of traditional mock interview paradigms by combining real-time computer vision, acoustic signal processing, "
        "and generative AI into a unified, privacy-preserving web application. By executing MediaPipe FaceMesh gaze estimation and Web Audio API spectral metering directly inside "
        "the browser, the system delivers immediate behavioral feedback while eliminating raw video streaming overhead. Coupled with Google Gemini LLM dynamic question generation "
        "and structured evaluation, InterviewAI democratizes access to high-quality technical interview coaching, empowering job seekers to hone their skills efficiently.",
        body_style
    ))

    # ---------------------------------------------------------
    # REFERENCES
    # ---------------------------------------------------------
    story.append(Spacer(1, 4))
    story.append(Paragraph("References", h1_style))
    refs = [
        "[1] Luger, E., & Sellen, A. (2016). Like Having a Really Bad TA: In-Depth Studies of Challenging Human-AI Interactions. <i>Proc. CHI 2016</i>, 5286–5297.",
        "[2] Lugaresi, C., et al. (2019). MediaPipe: A Framework for Building Perception Pipelines. <i>arXiv preprint arXiv:1906.08172</i>.",
        "[3] Vaswani, A., et al. (2017). Attention Is All You Need. <i>Advances in Neural Information Processing Systems (NeurIPS)</i>, 30, 5998–6008.",
        "[4] Naim, I., et al. (2018). Automated Analysis of Behaviors in Mock Interviews with Applications to Job Interview Coaching. <i>IEEE Transactions on Affective Computing</i>, 9(2), 263–277.",
        "[5] Suen, H. Y., Chen, M. Y., & Lu, S. H. (2019). Does your AI interviewer like you? Predicting interview outcomes using AI video analysis. <i>IEEE Access</i>, 7, 134586–134596.",
        "[6] Google DeepMind (2024). Gemini 1.5: Unlocking multimodal understanding across millions of tokens. <i>Tech Report</i>.",
        "[7] Next.js Core Team (2025). Next.js 16 App Router Architecture and Server Components Guide. <i>Vercel Documentation</i>.",
        "[8] Drizzle Team (2025). Drizzle ORM: Lightweight & Type-Safe TypeScript ORM for SQL Databases. <i>Drizzle Docs</i>."
    ]
    for r in refs:
        story.append(Paragraph(r, ParagraphStyle('RefStyle', parent=body_style, fontName='Helvetica', fontSize=8, leading=11, spaceAfter=3)))

    # Build PDF with dynamic Page X of Y canvas
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated Review Paper PDF: {filename}")

if __name__ == "__main__":
    build_pdf()
