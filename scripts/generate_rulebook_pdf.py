import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

def build_pdf():
    pdf_filename = os.path.join(os.getcwd(), "public", "INIXA_Prompt_Battle_Rulebook.pdf")
    os.makedirs(os.path.dirname(pdf_filename), exist_ok=True)

    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom Color Palette
    PRIMARY = colors.HexColor("#1e1b4b")       # Deep Navy/Indigo
    ACCENT = colors.HexColor("#4f46e5")        # Bright Indigo
    SECONDARY = colors.HexColor("#0284c7")     # Ocean Blue
    DARK_TEXT = colors.HexColor("#0f172a")     # Charcoal Text
    LIGHT_BG = colors.HexColor("#f8fafc")      # Soft Gray BG
    BORDER_COLOR = colors.HexColor("#cbd5e1")  # Light Gray Border
    GOLD_ACCENT = colors.HexColor("#d97706")   # Amber Gold

    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=PRIMARY,
        alignment=TA_CENTER,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=ACCENT,
        alignment=TA_CENTER,
        spaceAfter=15
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=8
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=DARK_TEXT,
        alignment=TA_JUSTIFY,
        spaceAfter=6
    )

    step_style = ParagraphStyle(
        'Step_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=DARK_TEXT
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#334155")
    )

    story = []

    # Title & Header
    story.append(Paragraph("INIXA PROMPT BATTLE ARENA", title_style))
    story.append(Paragraph("Official College Symposium Tournament Rulebook & Game Guide", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=ACCENT, spaceAfter=15))

    # Section 1: Overview
    story.append(Paragraph("1. Event Overview & Core Concept", h2_style))
    overview_text = (
        "The <b>INIXA Prompt Engineering Battle</b> is a real-time technical competition designed for college "
        "symposiums. Participants compete under time pressure to craft instructions (prompts) that force Large "
        "Language Models (LLMs) to solve complex <b>Text Research</b> and <b>Coding Challenges</b> with extreme precision."
    )
    story.append(Paragraph(overview_text, body_style))

    # Section 2: All 6 Games Detailed
    story.append(Paragraph("2. Available Competition Games & Challenges (6 Games)", h2_style))
    
    games_data = [
        [
            Paragraph("<b>Category</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=9, textColor=PRIMARY)),
            Paragraph("<b>Game Title & Difficulty</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=9, textColor=PRIMARY)),
            Paragraph("<b>Target Objective & Constraints</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=9, textColor=PRIMARY))
        ],
        [
            Paragraph("<b>Text Research</b>", body_style),
            Paragraph("<b>1. Unstructured Data to Typed JSON</b><br/><font color='#2563eb'>[Medium | 4 mins]</font>", body_style),
            Paragraph("Extract key support transcript metadata into valid JSON. <i>Constraints: Strict JSON schema, no markdown fences, no conversational filler.</i>", body_style)
        ],
        [
            Paragraph("<b>Text Research</b>", body_style),
            Paragraph("<b>2. Zero-Hallucination Extraction</b><br/><font color='#d97706'>[Hard | 5 mins]</font>", body_style),
            Paragraph("Format medical study quantitative findings into Markdown tables. <i>Constraints: Zero hallucination, strictly < 50 output tokens.</i>", body_style)
        ],
        [
            Paragraph("<b>Text Research</b>", body_style),
            Paragraph("<b>3. Constrained Roleplay & Reasoning</b><br/><font color='#dc2626'>[Extreme | 3 mins]</font>", body_style),
            Paragraph("Explain Quantum Entanglement to high schoolers. <i>Constraints: Do NOT use the letter 'e' anywhere in explanation (< 60 words).</i>", body_style)
        ],
        [
            Paragraph("<b>Coding Battle</b>", body_style),
            Paragraph("<b>4. Algorithmic Optimization O(N^2)->O(N)</b><br/><font color='#2563eb'>[Medium | 5 mins]</font>", body_style),
            Paragraph("Refactor slow nested loop duplicate finder into O(N) HashMap. <i>Constraints: Strict O(N) complexity, JSDoc comments included.</i>", body_style)
        ],
        [
            Paragraph("<b>Coding Battle</b>", body_style),
            Paragraph("<b>5. Reverse Code Engineering</b><br/><font color='#d97706'>[Hard | 5 mins]</font>", body_style),
            Paragraph("Generate clean tail-recursive deep array flattener from trace. <i>Constraints: No Array.prototype.flat(), handle arbitrary depth.</i>", body_style)
        ],
        [
            Paragraph("<b>Coding Battle</b>", body_style),
            Paragraph("<b>6. Zod Schema Transpiler</b><br/><font color='#dc2626'>[Extreme | 6 mins]</font>", body_style),
            Paragraph("Transpile OpenAPI paths into complete Zod validation schemas. <i>Constraints: Export Zod schema + inferred TS type definitions.</i>", body_style)
        ]
    ]

    games_table = Table(games_data, colWidths=[90, 160, 290])
    games_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(games_table)

    # Section 3: How to Play Instructions
    story.append(Spacer(1, 10))
    story.append(Paragraph("3. Step-by-Step Playing Instructions", h2_style))
    
    steps = [
        "<b>Step 1: Select Game Category:</b> Choose between Text Research & Reasoning or Coding Battle.",
        "<b>Step 2: Pick AI Model:</b> Select from GPT-5.6 (UPDF), DeepSeek V4 Pro, Qwen 3.7 Max, Perplexity Copilot, or GPT-5.4 Mini.",
        "<b>Step 3: Analyze Constraints:</b> Review sample input context & mandatory rules (JSON only, O(N) complexity, zero letter 'e').",
        "<b>Step 4: Execute Prompt:</b> Construct prompt in editor & click 'Execute Prompt'. Watch live real-time token stream output.",
        "<b>Step 5: Automated AI Judge Score:</b> Click 'AI Judge Score' to receive an instant 0-100 score breakdown across Accuracy, Constraints, and Token Efficiency."
    ]

    for s in steps:
        story.append(Paragraph(f"• {s}", step_style))
        story.append(Spacer(1, 4))

    # Section 4: Stage 1v1 Auditorium Setup & Scoring
    story.append(Spacer(1, 10))
    story.append(Paragraph("4. Auditorium Stage 1v1 & Official Scoring Rubric", h2_style))
    
    rubric_data = [
        [
            Paragraph("<b>Evaluation Metric</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=9, textColor=PRIMARY)),
            Paragraph("<b>Weightage</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=9, textColor=PRIMARY, alignment=TA_CENTER)),
            Paragraph("<b>Criteria Description</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=9, textColor=PRIMARY))
        ],
        [
            Paragraph("<b>Target Output Accuracy</b>", body_style),
            Paragraph("<b>40%</b>", ParagraphStyle('C', fontName='Helvetica-Bold', fontSize=9.5, alignment=TA_CENTER)),
            Paragraph("Output precision matching JSON schema, table structure, or refactored algorithm.", body_style)
        ],
        [
            Paragraph("<b>Constraint Adherence</b>", body_style),
            Paragraph("<b>30%</b>", ParagraphStyle('C', fontName='Helvetica-Bold', fontSize=9.5, alignment=TA_CENTER)),
            Paragraph("100% compliance with negative constraints (no letter 'e', no markdown fences, O(N)).", body_style)
        ],
        [
            Paragraph("<b>Token & Speed Efficiency</b>", body_style),
            Paragraph("<b>20%</b>", ParagraphStyle('C', fontName='Helvetica-Bold', fontSize=9.5, alignment=TA_CENTER)),
            Paragraph("Concise prompt construction with minimal token waste and fast completion time.", body_style)
        ],
        [
            Paragraph("<b>Technique & Elegance</b>", body_style),
            Paragraph("<b>10%</b>", ParagraphStyle('C', fontName='Helvetica-Bold', fontSize=9.5, alignment=TA_CENTER)),
            Paragraph("Use of delimiters, role assignment, and few-shot/CoT prompt engineering techniques.", body_style)
        ]
    ]

    rubric_table = Table(rubric_data, colWidths=[150, 80, 310])
    rubric_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(rubric_table)

    story.append(Spacer(1, 15))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER_COLOR, spaceAfter=10))
    story.append(Paragraph("INIXA AI Studio — Official College Symposium Edition Rulebook", ParagraphStyle('Footer', fontName='Helvetica-Oblique', fontSize=8, textColor=colors.HexColor("#64748b"), alignment=TA_CENTER)))

    doc.build(story)
    print(f"SUCCESS: PDF generated at {pdf_filename}")

if __name__ == "__main__":
    build_pdf()
