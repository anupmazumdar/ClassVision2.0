import re
from typing import Any, Dict, List, Optional

# Curated Knowledge Base for UEM ClassVision 2.0
KNOWLEDGE_BASE = [
    {
        "id": "intro",
        "keywords": ["what is classvision", "about classvision", "overview", "what is this app", "introduction", "how it works", "kaise kaam karta hai", "kya hai"],
        "title": "What is UEM ClassVision 2.0?",
        "reply": (
            "**UEM ClassVision 2.0** is an AI-powered smart attendance & classroom management platform engineered for the University of Engineering & Management (UEM).\n\n"
            "Key capabilities include:\n"
            "• **1-Click AI Group Scanning**: Instantly mark present students using multi-face detection.\n"
            "• **100m GPS Geofenced Self Check-in**: Students not captured in group scan can self check in at `/checkin` within 100m of the teacher.\n"
            "• **Rotating 6-Digit Rolling Code**: Live TOTP security code that changes every 30 seconds to stop proxy check-ins.\n"
            "• **Study Materials & Assignments Hub**: Upload and share Notes, PDFs, Assignments with deadlines, Tests, and Syllabus.\n"
            "• **1-Click WhatsApp Broadcasts**: Share live codes, attendance summaries, and study materials straight to class groups."
        ),
        "suggestions": ["How do students self check-in?", "How does 100m geofence work?", "How to post study materials & notes?"],
        "action": {"label": "Open Dashboard", "link": "/"}
    },
    {
        "id": "self_checkin",
        "keywords": ["self checkin", "student checkin", "student login", "how can students checkin", "mobile check in", "checkin kaise kare", "student present kaise lagaye", "phone se attendance"],
        "title": "Student Mobile Self Check-in",
        "reply": (
            "📱 **How Students Can Self Check-In on Phone:**\n\n"
            "1. Open **[ClassVision Check-in Portal](/checkin)** on your phone browser.\n"
            "2. Enter your **Enrollment Number** (e.g. `CS2024001`).\n"
            "3. Enter the **6-Digit Rolling Code** displayed on the teacher's screen.\n"
            "4. Tap **Verify GPS Location** (Make sure you are within **100 meters** of the classroom/teacher).\n"
            "5. Align your face in the camera frame and tap **Verify & Check In**.\n"
            "6. Once AI liveness and facial matching succeed, you will see a green **Check-in Successful** badge!"
        ),
        "suggestions": ["Why am I getting location error?", "What if face recognition fails?", "How often does 6-digit code rotate?"],
        "action": {"label": "Go to Student Check-in", "link": "/checkin"}
    },
    {
        "id": "geofence_100m",
        "keywords": ["100m", "geofence", "gps", "radius", "location error", "distance", "location boundary", "100 meter", "gps kaise kaam karta hai"],
        "title": "100-Meter Geofence Security",
        "reply": (
            "📍 **100-Meter GPS Geofence Mechanism:**\n\n"
            "• When a teacher starts a session, the system captures the classroom's high-precision GPS coordinates.\n"
            "• When a student attempts self check-in, their phone's GPS position is compared using the **Haversine Great-Circle formula**.\n"
            "• If the student is further than **100 meters** away, check-in is blocked automatically with an alert showing their distance from class.\n"
            "• **Tip**: Ensure Location / GPS permission is allowed in your browser settings."
        ),
        "suggestions": ["How to fix location permission on mobile?", "How to start a class session?", "How does anti-proxy device binding work?"],
        "action": {"label": "Open Student Check-in", "link": "/checkin"}
    },
    {
        "id": "classroom_hub",
        "keywords": ["classroom", "notes", "pdf", "assignment", "test", "study material", "homework", "upload notes", "notes kaise dale", "assignment kaise post kare", "materials"],
        "title": "Study Materials & Assignments Hub",
        "reply": (
            "📚 **Study Materials & Assignments Hub:**\n\n"
            "Teachers and Students have a built-in academics hub under **[Classroom](/classroom)**:\n\n"
            "1. **Study Notes & Lecture Docs**: Post topic summaries and reading handouts.\n"
            "2. **PDF Documents**: Attach Google Drive links or direct downloadable references.\n"
            "3. **Assignments**: Post homework tasks with due dates and total marks.\n"
            "4. **Class Tests & Quizzes**: Schedule exams with date, syllabus, and marks.\n"
            "5. **1-Click WhatsApp Broadcast**: Click the green WhatsApp icon on any material card to broadcast it directly to students' WhatsApp group!"
        ),
        "suggestions": ["How to post new material?", "How to filter by branch/year?", "How to share material to WhatsApp?"],
        "action": {"label": "Open Study Materials", "link": "/classroom"}
    },
    {
        "id": "whatsapp_integration",
        "keywords": ["whatsapp", "whatsapp group", "share to whatsapp", "notification", "broadcast", "whatsapp message", "group link"],
        "title": "WhatsApp Group Integration",
        "reply": (
            "💬 **1-Click WhatsApp Integration:**\n\n"
            "• **Live Session Code**: In active sessions, click *'Share to WhatsApp Group'* in the guidance banner to post the live 6-digit code and check-in link.\n"
            "• **Classroom Study Materials**: Click the WhatsApp share icon on any note, PDF, assignment, or test card to broadcast details.\n"
            "• **Attendance Summary**: In the Reports page, click *'WhatsApp'* to share full attendance statistics with student counts."
        ),
        "suggestions": ["How to start a session?", "How to view reports?", "How to join WhatsApp group?"],
        "action": {"label": "View Classroom Hub", "link": "/classroom"}
    },
    {
        "id": "student_registration",
        "keywords": ["register student", "student add", "new student", "enrollment", "biometrics", "5 angle", "face register", "student kaise banaye", "student register kaise kare"],
        "title": "Student Registration & Multi-Angle Biometrics",
        "reply": (
            "👤 **Student Registration Workflow:**\n\n"
            "1. Navigate to **[Register Student](/students/register)**.\n"
            "2. Fill in the **Mandatory Details**: Name, Enrollment Number, Course (B.Tech, BCA, etc.), Branch (CSE, ECE, etc.), Academic Year, Semester, and Admission Year.\n"
            "3. Proceed to **Step 2 (Multi-Angle Biometric Capture)**:\n"
            "   • Photo 1: Front Neutral\n"
            "   • Photo 2: Left ~20° Angle\n"
            "   • Photo 3: Right ~20° Angle\n"
            "   • Photo 4: Natural Smile\n"
            "   • Photo 5: Slight Chin Tilt\n"
            "4. Check the **Biometric Consent Checkbox** and save. Facial vectors are encrypted with **AES-128** at rest!"
        ),
        "suggestions": ["How to auto-promote student years?", "View registered students", "How to take attendance?"],
        "action": {"label": "Register Student", "link": "/students/register"}
    },
    {
        "id": "auto_promote",
        "keywords": ["auto promote", "promote year", "academic year update", "next year", "semester upgrade", "year change", "automatic update"],
        "title": "Automatic Academic Year Progression",
        "reply": (
            "🔄 **Automatic Year & Semester Progression:**\n\n"
            "• ClassVision stores each student's `admission_year` and `course` duration (e.g. 4 years for B.Tech, 3 years for BCA/Diploma, 2 years for M.Tech/MBA).\n"
            "• When a new academic year begins, an admin can click **'Auto-Update Years'** in the **[Students Directory](/students)**.\n"
            "• The system automatically recalculates each student's current year and semester (e.g. Year 1 → Year 2, Sem 1 → Sem 3)."
        ),
        "suggestions": ["View Students Directory", "Register a Student", "Classroom Hub"],
        "action": {"label": "Open Students Directory", "link": "/students"}
    },
    {
        "id": "uem_rules",
        "keywords": ["uem", "rules", "75%", "75 percent", "attendance criteria", "minimum attendance", "university policy", "attendance rule", "exam eligibility"],
        "title": "UEM 75% Attendance Requirement",
        "reply": (
            "🎓 **UEM Academic Attendance Regulations:**\n\n"
            "• **Mandatory 75% Rule**: As per University of Engineering & Management (UEM) guidelines, every student must maintain a minimum of **75% aggregate attendance** in each subject to be eligible for End-Semester Examinations.\n"
            "• **Medical Condonation**: Students with attendance between 60% and 74% due to medical emergencies must submit official medical certificates to the Dean of Academics.\n"
            "• **Real-time Tracking**: ClassVision highlights students with <75% attendance in amber/red badges in the **[Reports](/reports)** section."
        ),
        "suggestions": ["View Attendance Reports", "Check Student Summary", "How to take attendance?"],
        "action": {"label": "View Attendance Reports", "link": "/reports"}
    },
    {
        "id": "troubleshoot_camera",
        "keywords": ["camera not working", "camera error", "black screen", "webcam", "allow camera", "camera permission", "camera kaise on kare"],
        "title": "Troubleshooting Camera Access",
        "reply": (
            "📷 **Camera Troubleshooting Guide:**\n\n"
            "1. **Browser Permission**: Look for the camera icon in your browser address bar and choose *'Always allow'*.\n"
            "2. **Other Apps**: Ensure no other application (Zoom, MS Teams, Google Meet) is actively using the camera.\n"
            "3. **HTTPS / Secure Context**: On mobile devices, camera access requires an HTTPS connection (or `localhost`).\n"
            "4. **Refresh**: After granting permissions, refresh the page or tap the *'Restart Camera'* button."
        ),
        "suggestions": ["How to fix location error?", "How to self check-in?", "How to contact admin?"],
        "action": {"label": "Open Student Check-in", "link": "/checkin"}
    },
    {
        "id": "troubleshoot_gps",
        "keywords": ["location not working", "gps error", "location denied", "location permission", "allow location", "gps enable"],
        "title": "Troubleshooting GPS / Geofence Issues",
        "reply": (
            "📍 **Location Permission & GPS Fixes:**\n\n"
            "1. **Enable Device Location**: Make sure GPS / Location Services is toggled **ON** in your phone settings.\n"
            "2. **High Accuracy Mode**: In Phone Settings → Location, select *'High Accuracy'* (uses GPS + Wi-Fi).\n"
            "3. **Browser Permission**: Tap the padlock / tune icon near the URL in Chrome/Safari and ensure *Location is Allowed*.\n"
            "4. **Classroom Proximity**: Ensure you are physically inside or directly outside the classroom (<100m)."
        ),
        "suggestions": ["How to self check-in?", "How does 100m geofence work?", "Start a Session"],
        "action": {"label": "Open Student Check-in", "link": "/checkin"}
    },
    {
        "id": "login_help",
        "keywords": ["login", "password", "admin login", "teacher login", "invalid credentials", "forgot password", "login kaise kare"],
        "title": "Login & Authentication Assistance",
        "reply": (
            "🔐 **Login & Role Access:**\n\n"
            "• **Default Admin**: `admin@classvision.local` or `admin@classvission.local` (Password: `admin123`)\n"
            "• **Teacher Accounts**: Registered teachers can log in with their college email.\n"
            "• **Students**: Students do **not** need a password to check in! Simply visit **[Student Check-in](/checkin)** with your Enrollment Number and class rolling code."
        ),
        "suggestions": ["Open Login Page", "Go to Student Check-in", "What is ClassVision?"],
        "action": {"label": "Go to Login", "link": "/login"}
    },
    {
        "id": "reports_export",
        "keywords": ["report", "excel", "pdf", "export", "download report", "attendance report", "email report", "analytics"],
        "title": "Attendance Analytics & Exports",
        "reply": (
            "📊 **Reports & Export Features:**\n\n"
            "1. Visit the **[Reports](/reports)** page from the navigation bar.\n"
            "2. Click any completed session to view the full student attendance sheet.\n"
            "3. Click **Excel** to download `.xlsx` spreadsheet.\n"
            "4. Click **PDF** to download an official attendance record sheet.\n"
            "5. Click **Email** to send the attendance report directly to HODs or departmental coordinators."
        ),
        "suggestions": ["Open Reports", "What is 75% attendance rule?", "Start new Session"],
        "action": {"label": "Open Reports Page", "link": "/reports"}
    },
]


def answer_assistant_query(query: str, history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
    """
    NLP search and response generator for UEM ClassVision assistant.
    """
    clean_query = query.strip().lower()

    if not clean_query:
        return {
            "reply": "👋 Hello! I am your **UEM ClassVision AI Assistant**. How can I help you today? You can ask me about student attendance, 100m geofence self-checkin, classroom notes, assignments, or university rules.",
            "suggestions": [
                "How do students self check-in?",
                "How does 100m geofence work?",
                "How to use Google Classroom hub?",
                "What is the 75% attendance rule?",
            ],
            "action": None,
        }

    # Direct greetings
    if clean_query in ["hi", "hello", "hey", "namaste", "halo", "help", "kese ho", "kaise ho", "start"]:
        return {
            "reply": (
                "👋 Hello! Welcome to **UEM ClassVision 2.0 Assistant**! 🎓\n\n"
                "I can guide you with:\n"
                "• Taking attendance via AI scan or 100m mobile check-in\n"
                "• Uploading study notes, PDFs, and assignments in Classroom\n"
                "• 1-Click WhatsApp group broadcasts\n"
                "• Student registration and auto-year updates\n"
                "• UEM 75% attendance criteria and troubleshooting\n\n"
                "What would you like assistance with?"
            ),
            "suggestions": [
                "How to self check-in on phone?",
                "How to post notes & assignments?",
                "How does 100m geofencing work?",
                "Troubleshooting camera / GPS",
            ],
            "action": None,
        }

    # Best match scoring
    best_item = None
    best_score = 0

    query_tokens = set(re.findall(r"\w+", clean_query))

    for item in KNOWLEDGE_BASE:
        score = 0
        for kw in item["keywords"]:
            kw_tokens = set(re.findall(r"\w+", kw))
            # Exact phrase match
            if kw in clean_query:
                score += 15
            # Token overlap match
            overlap = query_tokens.intersection(kw_tokens)
            if overlap:
                score += len(overlap) * 3

        if score > best_score:
            best_score = score
            best_item = item

    if best_item and best_score >= 3:
        return {
            "reply": best_item["reply"],
            "suggestions": best_item.get("suggestions", []),
            "action": best_item.get("action"),
            "matched_id": best_item["id"],
        }

    # Fallback with helpful general response
    return {
        "reply": (
            f"🤖 I searched our knowledge base for: *\"{query}\"*\n\n"
            "Here is what you can do in **UEM ClassVision 2.0**:\n"
            "• **Self Check-in**: Visit `/checkin` with your 6-digit rolling code within 100m of the classroom.\n"
            "• **Classroom Hub**: Go to `/classroom` to access or publish Notes, PDFs, Assignments, and Tests.\n"
            "• **WhatsApp Broadcast**: Share attendance records and study materials to WhatsApp groups with 1 click.\n"
            "• **Attendance Rules**: UEM mandates a minimum of 75% attendance for semester exams.\n\n"
            "Try one of the quick suggestions below or rephrase your question!"
        ),
        "suggestions": [
            "How do students self check-in?",
            "How does 100m geofence work?",
            "How to post notes & assignments?",
            "What is the 75% attendance rule?",
            "Troubleshooting camera / GPS",
        ],
        "action": {"label": "Go to Dashboard", "link": "/"},
        "matched_id": "fallback",
    }


def get_all_faqs() -> List[Dict[str, Any]]:
    """
    Returns categorized FAQs for the assistant widget.
    """
    return [
        {
            "category": "Attendance & Geofencing",
            "items": [
                {"question": "How do students check in on their mobile phones?", "answer": KNOWLEDGE_BASE[1]["reply"]},
                {"question": "How does the 100-meter GPS geofence work?", "answer": KNOWLEDGE_BASE[2]["reply"]},
                {"question": "How often does the 6-digit code rotate?", "answer": "The 6-digit code rotates every 30 seconds using TOTP cryptography to prevent proxy check-ins."},
            ]
        },
        {
            "category": "Classroom & WhatsApp",
            "items": [
                {"question": "How to upload Notes, PDFs & Assignments?", "answer": KNOWLEDGE_BASE[3]["reply"]},
                {"question": "How to broadcast notifications to WhatsApp?", "answer": KNOWLEDGE_BASE[4]["reply"]},
            ]
        },
        {
            "category": "Student Management & Rules",
            "items": [
                {"question": "How to register a new student?", "answer": KNOWLEDGE_BASE[5]["reply"]},
                {"question": "How does auto-academic year promotion work?", "answer": KNOWLEDGE_BASE[6]["reply"]},
                {"question": "What is the UEM 75% attendance rule?", "answer": KNOWLEDGE_BASE[7]["reply"]},
            ]
        },
        {
            "category": "Troubleshooting",
            "items": [
                {"question": "Camera is showing black screen or error", "answer": KNOWLEDGE_BASE[8]["reply"]},
                {"question": "GPS Location error during check-in", "answer": KNOWLEDGE_BASE[9]["reply"]},
            ]
        }
    ]
