import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
    KeepTogether, PageBreak
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas

# NumberedCanvas to add "Page X of Y" and Running Header/Footer
class NumberedCanvas(canvas.Canvas):
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
            self.draw_page_number(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Top Running Header (Pages 2+)
        if self._pageNumber > 1:
            self.drawString(36, 756, "INIXA PROMPT BATTLE ARENA — OFFICIAL SYMPOSIUM RULEBOOK")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(36, 750, 576, 750)

        # Bottom Running Footer (All Pages)
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(576, 25, page_text)
        self.drawString(36, 25, "Confidential — For College Event Coordinators, Judges & Participants")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(36, 36, 576, 36)
        self.restoreState()


def build_detailed_pdf():
    pdf_path = os.path.join(os.getcwd(), "public", "INIXA_Prompt_Battle_Detailed_Rulebook.pdf")
    os.makedirs(os.path.dirname(pdf_path), exist_ok=True)

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=44,
        bottomMargin=44
    )

    styles = getSampleStyleSheet()

    # Color Palette
    PRIMARY = colors.HexColor("#1e1b4b")       # Deep Indigo
    ACCENT = colors.HexColor("#4f46e5")        # Electric Indigo
    SECONDARY = colors.HexColor("#0284c7")     # Sky Blue
    SUCCESS = colors.HexColor("#059669")       # Emerald
    WARNING = colors.HexColor("#d97706")       # Amber
    DANGER = colors.HexColor("#dc2626")        # Crimson
    DARK_TEXT = colors.HexColor("#0f172a")     # Slate Dark Text
    LIGHT_BG = colors.HexColor("#f8fafc")      # Soft Gray BG
    CALLOUT_BG = colors.HexColor("#eef2ff")    # Light Indigo BG
    BORDER_COLOR = colors.HexColor("#e2e8f0")  # Border Gray

    # Typography Styles
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

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=8
    )

    sub_heading = ParagraphStyle(
        'SubHeading',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=ACCENT,
        spaceBefore=8,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=DARK_TEXT,
        alignment=TA_JUSTIFY,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=DARK_TEXT,
        leftIndent=12,
        spaceAfter=3
    )

    code_style = ParagraphStyle(
        'CodeBlock',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#1e293b")
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#334155")
    )

    story = []

    # ═══════════════════════════════════════════════════════════════════
    # COVER / HEADER SECTION
    # ═══════════════════════════════════════════════════════════════════
    story.append(Paragraph("INIXA PROMPT BATTLE ARENA", title_style))
    story.append(Paragraph("Comprehensive College Event Rulebook, Game Specs & Host Playbook", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2.5, color=ACCENT, spaceAfter=15))

    # Executive Overview
    story.append(Paragraph("1. Executive Overview & Competition Goals", section_heading))
    overview_p = (
        "The <b>INIXA Prompt Engineering Battle</b> is a premier competitive gaming format designed for college "
        "inter-symposiums, technical fests, and AI hackathons. Unlike standard programming contests that test code syntax, "
        "the Prompt Battle evaluates participants' <b>mental model of Large Language Models (LLMs)</b>, prompt optimization "
        "techniques, constraint satisfaction, and precision AI control."
    )
    story.append(Paragraph(overview_p, body_style))

    key_outcomes = [
        "<b>Equal Playing Field:</b> All contestants utilize the INIXA AI Gateway backend, ensuring zero model bias or API key advantage.",
        "<b>Pure Technical Focus:</b> 100% focused on Text Research, Algorithmic Optimization, and Schema Transpilation (zero image/video distraction).",
        "<b>Audience Entertainment:</b> The Finals feature a 1v1 Auditorium Stage Projector view with real-time token stream & live score dials."
    ]
    for k in key_outcomes:
        story.append(Paragraph(f"• {k}", bullet_style))

    story.append(Spacer(1, 10))

    # ═══════════════════════════════════════════════════════════════════
    # SECTION 2: THE 6 DETAILED GAMES
    # ═══════════════════════════════════════════════════════════════════
    story.append(Paragraph("2. Detailed Specifications of All 6 Competition Games", section_heading))

    # --- GAME 1 ---
    story.append(Paragraph("Game 1: Unstructured Data to Typed JSON (Text Research)", sub_heading))
    story.append(Paragraph("<b>Category:</b> Text Research | <b>Difficulty:</b> Medium | <b>Time Limit:</b> 4 Minutes", body_style))
    g1_desc = (
        "<b>Goal:</b> Contestants receive a noisy support call transcript. They must write a prompt instructing the LLM to "
        "extract entity metadata into strict valid JSON format."
    )
    story.append(Paragraph(g1_desc, body_style))

    g1_input_box = [
        [Paragraph("<b>Sample Input Context:</b>", body_style)],
        [Paragraph("<i>Transcript: Customer John Doe (ID 9842) called complaining that desktop app on Windows 11 crashes when uploading > 50MB files. Agent found buffer overflow in upload streaming service. Recommending patch v2.4.1 deployment by EOD.</i>", code_style)]
    ]
    t1 = Table(g1_input_box, colWidths=[540])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 6)
    ]))
    story.append(t1)

    g1_target = [
        [Paragraph("<b>Target Goal Output:</b>", body_style)],
        [Paragraph('{\n  "userId": 9842,\n  "customerName": "John Doe",\n  "os": "Windows 11",\n  "severity": "HIGH",\n  "rootCause": "Buffer overflow in upload streaming service",\n  "recommendedFix": "Deploy patch v2.4.1"\n}', code_style)]
    ]
    t1_t = Table(g1_target, colWidths=[540])
    t1_t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), CALLOUT_BG),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 6)
    ]))
    story.append(Spacer(1, 4))
    story.append(t1_t)

    g1_constraints = [
        "Constraint 1: Output MUST be 100% valid JSON parseable by JSON.parse().",
        "Constraint 2: Do NOT wrap in markdown fences (```json ... ```).",
        "Constraint 3: Zero conversational fluff (No 'Here is your JSON:')."
    ]
    for c in g1_constraints:
        story.append(Paragraph(f"✓ {c}", bullet_style))

    story.append(Spacer(1, 10))

    # --- GAME 2 ---
    story.append(Paragraph("Game 2: Zero-Hallucination Academic Extraction (Text Research)", sub_heading))
    story.append(Paragraph("<b>Category:</b> Text Research | <b>Difficulty:</b> Hard | <b>Time Limit:</b> 5 Minutes", body_style))
    g2_desc = (
        "<b>Goal:</b> Extract exact quantitative statistics from a dense academic study summary into a GitHub Markdown table. "
        "The prompt must enforce strict zero-hallucination guardrails."
    )
    story.append(Paragraph(g2_desc, body_style))

    g2_target = [
        [Paragraph("<b>Target Goal Output:</b>", body_style)],
        [Paragraph('| Cohort | Sample Size (n) | Retention Increase (%) | Dropout Rate (%) | P-Value |\n|---|---|---|---|---|\n| Group A | 120 | 34.2% | 5% | < 0.001 |\n| Group B | 115 | 4.1% | 12% | < 0.001 |', code_style)]
    ]
    t2_t = Table(g2_target, colWidths=[540])
    t2_t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), CALLOUT_BG),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 6)
    ]))
    story.append(t2_t)

    g2_constraints = [
        "Constraint 1: Output MUST be a GitHub Markdown table only.",
        "Constraint 2: Strict zero-hallucination rule (no estimated numbers).",
        "Constraint 3: Token cap under 50 tokens total."
    ]
    for c in g2_constraints:
        story.append(Paragraph(f"✓ {c}", bullet_style))

    story.append(Spacer(1, 10))

    # --- GAME 3 ---
    story.append(Paragraph("Game 3: Constrained Roleplay & Reasoning (Text Research)", sub_heading))
    story.append(Paragraph("<b>Category:</b> Text Research | <b>Difficulty:</b> Extreme | <b>Time Limit:</b> 3 Minutes", body_style))
    g3_desc = (
        "<b>Goal:</b> Prompt the AI model to explain Quantum Entanglement to a high schooler under extreme negative constraints."
    )
    story.append(Paragraph(g3_desc, body_style))

    g3_constraints = [
        "Constraint 1: ⚠️ <b>EXTREME RULE:</b> Do NOT use the letter 'e' anywhere in the output!",
        "Constraint 2: Must explain entanglement accurately in under 60 words.",
        "Constraint 3: Maintain an encouraging mentor persona."
    ]
    for c in g3_constraints:
        story.append(Paragraph(f"✓ {c}", bullet_style))

    story.append(PageBreak())

    # --- GAME 4 ---
    story.append(Paragraph("Game 4: Algorithmic Optimization O(N^2) -> O(N) (Coding Battle)", sub_heading))
    story.append(Paragraph("<b>Category:</b> Coding Battle | <b>Difficulty:</b> Medium | <b>Time Limit:</b> 5 Minutes", body_style))
    g4_desc = (
        "<b>Goal:</b> Refactor a slow nested-loop duplicate detector function into an optimal O(N) HashMap solution in TypeScript."
    )
    story.append(Paragraph(g4_desc, body_style))

    g4_target = [
        [Paragraph("<b>Sample Input vs Target Goal:</b>", body_style)],
        [Paragraph("// Input: Slow nested loop O(N^2) function\n// Target: Optimal Set/Map TypeScript implementation achieving strictly O(N) runtime with JSDoc documentation.", code_style)]
    ]
    t4_t = Table(g4_target, colWidths=[540])
    t4_t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 6)
    ]))
    story.append(t4_t)

    g4_constraints = [
        "Constraint 1: Time complexity must be strictly O(N).",
        "Constraint 2: Must include complete JSDoc typed docstrings.",
        "Constraint 3: Must be pure TypeScript with zero npm external packages."
    ]
    for c in g4_constraints:
        story.append(Paragraph(f"✓ {c}", bullet_style))

    story.append(Spacer(1, 10))

    # --- GAME 5 ---
    story.append(Paragraph("Game 5: Reverse Code Engineering (Coding Battle)", sub_heading))
    story.append(Paragraph("<b>Category:</b> Coding Battle | <b>Difficulty:</b> Hard | <b>Time Limit:</b> 5 Minutes", body_style))
    g5_desc = (
        "<b>Goal:</b> Contestants receive input data `[1, [2, [3, 4], 5], 6]` and expected flat output `[1, 2, 3, 4, 5, 6]`. "
        "Prompt the AI to write a clean recursive flattening function."
    )
    story.append(Paragraph(g5_desc, body_style))

    g5_constraints = [
        "Constraint 1: Do NOT use built-in Array.prototype.flat() or flatMap().",
        "Constraint 2: Must handle arbitrary array nesting depth.",
        "Constraint 3: Include clear inline comments explaining recursion stack."
    ]
    for c in g5_constraints:
        story.append(Paragraph(f"✓ {c}", bullet_style))

    story.append(Spacer(1, 10))

    # --- GAME 6 ---
    story.append(Paragraph("Game 6: Zod & React Hook Form Schema Transpiler (Coding Battle)", sub_heading))
    story.append(Paragraph("<b>Category:</b> Coding Battle | <b>Difficulty:</b> Extreme | <b>Time Limit:</b> 6 Minutes", body_style))
    g6_desc = (
        "<b>Goal:</b> Transpile OpenAPI backend specifications into complete Zod validation schemas with inferred TypeScript types in one prompt."
    )
    story.append(Paragraph(g6_desc, body_style))

    g6_constraints = [
        "Constraint 1: Must export both `z.object({...})` schema AND `type UserRegistration = z.infer<typeof schema>`.",
        "Constraint 2: Include custom validation error messages.",
        "Constraint 3: 100% production ready TypeScript code."
    ]
    for c in g6_constraints:
        story.append(Paragraph(f"✓ {c}", bullet_style))

    story.append(Spacer(1, 12))

    # ═══════════════════════════════════════════════════════════════════
    # SECTION 3: PROMPT ENGINEERING CHEATSHEET
    # ═══════════════════════════════════════════════════════════════════
    story.append(Paragraph("3. Prompt Engineering Master Cheatsheet (For Participants)", section_heading))
    story.append(Paragraph("Participants should apply these core prompt engineering strategies to achieve top scores:", body_style))

    tips_data = [
        [Paragraph("<b>Technique</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=9, textColor=PRIMARY)), Paragraph("<b>Implementation Pattern</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=9, textColor=PRIMARY))],
        [Paragraph("<b>Role Assignment</b>", body_style), Paragraph("<i>'You are a Lead Data Architect. Your task is to...'</i> - Sets persona, tone, and domain expertise.", body_style)],
        [Paragraph("<b>Delimiters</b>", body_style), Paragraph("Use triple quotes <b>\"\"\"</b>, XML tags <b>&lt;context&gt;...&lt;/context&gt;</b> to isolate input data from instructions.", body_style)],
        [Paragraph("<b>Negative Guardrails</b>", body_style), Paragraph("Explicitly state <i>'DO NOT include intro text, DO NOT wrap in markdown fences'</i>.", body_style)],
        [Paragraph("<b>Few-Shot Examples</b>", body_style), Paragraph("Provide 1 or 2 sample input-output pairs inside the prompt for complex schema matching.", body_style)],
        [Paragraph("<b>Chain-of-Thought (CoT)</b>", body_style), Paragraph("Prompt the model to <i>'Think step-by-step before producing the final JSON'</i> for logic puzzles.", body_style)]
    ]

    tips_table = Table(tips_data, colWidths=[140, 400])
    tips_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), LIGHT_BG),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 5)
    ]))
    story.append(tips_table)

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════
    # SECTION 4: AI MODELS GUIDE
    # ═══════════════════════════════════════════════════════════════════
    story.append(Paragraph("4. Supported AI Models in INIXA Arena", section_heading))
    story.append(Paragraph("Contestants can select from these flagship AI models during competition rounds:", body_style))

    models_data = [
        [Paragraph("<b>Model Name</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=9, textColor=PRIMARY)), Paragraph("<b>Engine Type</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=9, textColor=PRIMARY)), Paragraph("<b>Best Used For</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=9, textColor=PRIMARY))],
        [Paragraph("<b>GPT-5.6 (UPDF Flagship)</b>", body_style), Paragraph("UPDF Stream API", body_style), Paragraph("Complex multi-step reasoning, JSON schema extraction & zero-shot tasks.", body_style)],
        [Paragraph("<b>DeepSeek V4 Pro</b>", body_style), Paragraph("G4F Dedicated", body_style), Paragraph("Deep algorithmic coding, TypeScript refactoring, and logical puzzles.", body_style)],
        [Paragraph("<b>Qwen 3.7 Max (Worker)</b>", body_style), Paragraph("Alibaba Worker", body_style), Paragraph("High speed instruction following, markdown table formatting & strict constraint matching.", body_style)],
        [Paragraph("<b>Qwen 3.7 Plus (Worker)</b>", body_style), Paragraph("Alibaba Worker", body_style), Paragraph("Ultra-low latency streaming for high-speed speed run rounds.", body_style)],
        [Paragraph("<b>Perplexity Copilot</b>", body_style), Paragraph("Direct Worker", body_style), Paragraph("Factual verification and academic data extraction.", body_style)],
        [Paragraph("<b>GPT-5.4 Mini</b>", body_style), Paragraph("Surfsense API", body_style), Paragraph("Lightweight, high-speed execution for short constrained tasks.", body_style)]
    ]

    models_table = Table(models_data, colWidths=[150, 110, 280])
    models_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), LIGHT_BG),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 5)
    ]))
    story.append(models_table)

    story.append(Spacer(1, 12))

    # ═══════════════════════════════════════════════════════════════════
    # SECTION 5: AUDITORIUM STAGE 1v1 SETUP & JUDGING RUBRIC
    # ═══════════════════════════════════════════════════════════════════
    story.append(Paragraph("5. Auditorium Stage 1v1 Setup & Official Judging Rubric", section_heading))
    story.append(Paragraph("<b>Host Playbook for Stage Finals:</b>", sub_heading))
    stage_steps = [
        "1. Open the INIXA App on the stage host computer connected to the auditorium projector.",
        "2. Click on the <b>Stage Projector (1v1)</b> toggle in the top-right header.",
        "3. Player 1 (Left Screen) and Player 2 (Right Screen) laptops connect to stream live prompt typing.",
        "4. The projector displays live split screen showing live prompt drafts, generated AI outputs, and real-time score dials.",
        "5. The Automated AI Judge computes scores immediately upon submission, announcing the round winner!"
    ]
    for s in stage_steps:
        story.append(Paragraph(s, bullet_style))

    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Weighted Scoring Rubric:</b>", sub_heading))

    rubric_data = [
        [Paragraph("<b>Evaluation Metric</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=9, textColor=PRIMARY)), Paragraph("<b>Weight</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=9, textColor=PRIMARY, alignment=TA_CENTER)), Paragraph("<b>Evaluation Standard</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=9, textColor=PRIMARY))],
        [Paragraph("<b>Target Output Accuracy</b>", body_style), Paragraph("<b>40%</b>", ParagraphStyle('C', fontName='Helvetica-Bold', fontSize=9, alignment=TA_CENTER)), Paragraph("Degree to which generated output matches target JSON/code/table specifications.", body_style)],
        [Paragraph("<b>Constraint Adherence</b>", body_style), Paragraph("<b>30%</b>", ParagraphStyle('C', fontName='Helvetica-Bold', fontSize=9, alignment=TA_CENTER)), Paragraph("100% compliance with negative rules (e.g. no letter 'e', no markdown fences, O(N)).", body_style)],
        [Paragraph("<b>Token & Speed Efficiency</b>", body_style), Paragraph("<b>20%</b>", ParagraphStyle('C', fontName='Helvetica-Bold', fontSize=9, alignment=TA_CENTER)), Paragraph("Concise prompt construction with minimal token waste and fast completion time.", body_style)],
        [Paragraph("<b>Technique & Elegance</b>", body_style), Paragraph("<b>10%</b>", ParagraphStyle('C', fontName='Helvetica-Bold', fontSize=9, alignment=TA_CENTER)), Paragraph("Use of delimiters, role assignment, and few-shot/CoT prompt engineering techniques.", body_style)]
    ]

    rubric_table = Table(rubric_data, colWidths=[150, 70, 320])
    rubric_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), LIGHT_BG),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 5)
    ]))
    story.append(rubric_table)

    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER_COLOR, spaceAfter=10))
    story.append(Paragraph("INIXA AI Studio — Designed for College Prompt Engineering Battles & Hackathons", ParagraphStyle('Footer', fontName='Helvetica-Oblique', fontSize=8, textColor=colors.HexColor("#64748b"), alignment=TA_CENTER)))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"SUCCESS: Detailed PDF generated at {pdf_path}")

if __name__ == "__main__":
    build_detailed_pdf()
