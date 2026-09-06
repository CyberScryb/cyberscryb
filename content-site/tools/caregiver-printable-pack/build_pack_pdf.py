#!/usr/bin/env python3
"""Build the CyberScryb Caregiver Printable Pack PDF using only the stdlib.

Generates an 8-page US-Letter monochrome PDF with simple form layouts.
Usage: python build_pack_pdf.py  (writes ../caregiver-printable-pack/cyberscryb-caregiver-printable-pack.pdf)
"""
import os
import zlib

PAGE_W, PAGE_H = 612, 792  # US Letter
MARGIN = 54
CONTENT_W = PAGE_W - 2 * MARGIN

BLACK = (0, 0, 0)
GRAY = (0.35, 0.35, 0.35)
TERRA = (0.76, 0.25, 0.05)

pdf = []          # raw objects (as strings) -> will become byte objects
content = []      # current page content stream
page_objs = []    # page object ids

_fid = [1]        # next free object id


def obj_id():
    _fid[0] += 1
    return _fid[0]


def emit(obj_body):
    oid = obj_id()
    pdf.append(f"{oid} 0 obj\n{obj_body}\nendobj\n".encode("latin-1"))
    return oid


def esc(s):
    s = s.replace("\u2014", "-").replace("\u2013", "-").replace("\u2019", "'")
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def text(x, y, s, size=10, bold=False, gray=False):
    font = "/F2" if bold else "/F1"
    col = f"{GRAY[0]} {GRAY[1]} {GRAY[2]} rg" if gray else "0 0 0 rg"
    content.append(f"BT {col} {font} {size} Tf 1 0 0 1 {x:.1f} {y:.1f} Tm ({esc(s)}) Tj ET")


def line(x1, y1, x2, y2, width=0.8, gray=False):
    col = f"{GRAY[0]} {GRAY[1]} {GRAY[2]} RG" if gray else "0 0 0 RG"
    content.append(f"{col} {width} w {x1:.1f} {y1:.1f} m {x2:.1f} {y2:.1f} l S")


def rule(y, width=CONTENT_W, gray=True):
    line(MARGIN, y, MARGIN + width, y, 0.7, gray)


def new_page():
    content.append("q")
    return None


def finalize_page():
    content.append("Q")
    stream = zlib.compress(" ".join(content).encode("latin-1"))
    oid = obj_id()
    length = emit(f"<< /Length {len(stream)} >>\nstream\n".encode("latin-1") + stream + b"\nendstream")
    page_objs.append(oid)
    content.clear()


def write_cell(x, y, w, text_str, size=9, bold=False, gray=False):
    text(x + 4, y + 3, text_str, size, bold, gray)


def write_row(y, cols, row_h=16, size=9):
    line(MARGIN, y, MARGIN + CONTENT_W, y)
    for c in cols:
        write_cell(MARGIN + c[0], y, c[1], c[2], size)


def header(title, sub=None):
    text(MARGIN, PAGE_H - 54, title, 15, True)
    if sub:
        text(MARGIN, PAGE_H - 70, sub, 9, False, True)
    rule(PAGE_H - 80)


def footer(page_label):
    text(MARGIN, 36, f"CyberScryb Caregiver Printable Pack  |  {page_label}", 8, False, True)
    text(PAGE_W - MARGIN - 130, 36, "cyberscryb.com  |  free tools", 8, False, True)


def para(x, y, s, size=10, width=CONTENT_W, bold=False, gray=False, lh=14):
    words = s.split()
    line_str = ""
    yy = y
    for w in words:
        test = (line_str + " " + w).strip()
        if len(test) * size * 0.55 > width:
            text(x, yy, line_str, size, bold, gray)
            yy -= lh
            line_str = w
        else:
            line_str = test
    if line_str:
        text(x, yy, line_str, size, bold, gray)
    return yy


# ── Page 1: Cover ──────────────────────────────────────────────
new_page()
text(MARGIN, PAGE_H - 150, "CyberScryb", 13, True, True)
text(MARGIN, PAGE_H - 190, "The Caregiver", 34, True)
text(MARGIN, PAGE_H - 232, "Printable Pack", 34, True)
text(MARGIN, PAGE_H - 262, "7 templates for family caregivers, CNAs, HHAs & PCAs", 13, False, True)
rule(PAGE_H - 285)
text(MARGIN, PAGE_H - 310, "Inside this pack:", 12, True)
contents = [
    "1.  Daily Shift Report / Handoff Sheet",
    "2.  Medication Administration Log (7-day)",
    "3.  ABC Behavioral Log (memory care)",
    "4.  Vitals & Blood Pressure Tracker",
    "5.  Daily Care Checklist (AM / PM)",
    "6.  Emergency Information Card",
    "7.  Emergency Contact Sheet",
]
yy = PAGE_H - 335
for c in contents:
    text(MARGIN, yy, c, 11)
    yy -= 20
text(MARGIN, yy - 16, "Print the pages you need. Fill in the blanks. Pass to the next shift.", 10, False, True)
footer("Cover")
finalize_page()

# ── Page 2: Daily Shift Report ─────────────────────────────────
new_page()
header("Daily Shift Report", "One sheet per shift — the handoff that keeps everyone safe.")
y = PAGE_H - 110
write_row(y, [(0, 160, "Date:"), (160, 220, "Patient / Client:"), (0, 0, "")])
y -= 18
write_row(y, [(0, 160, "Caregiver:"), (160, 220, "Shift:  [ ] Day   [ ] Evening   [ ] Night"), (0, 0, "")])
y -= 30
sections = [
    ("Meals / Intake", "What did they eat / drink?  Amounts."),
    ("Medications Given", "List meds, dose, time given."),
    ("Toileting / Incontinence", "Times, output, accidents."),
    ("Mood & Behavior", "Mood, agitation, sundowning, what helped."),
    ("Sleep", "Bedtime, wake-ups, naps."),
    ("Activities / Mobility", "Walked, exercised, PT, outings."),
    ("Skin / Pain Check", "Redness, sores, pain complaints (0-10)."),
    ("Notes / Concerns", "Anything the next shift must know."),
]
for name, hint in sections:
    text(MARGIN, y, name, 10, True)
    text(MARGIN + 170, y, hint, 8.5, False, True)
    y -= 22
    rule(y - 8)
    line(MARGIN + 150, y - 6, MARGIN + 150, y - 8 + 22)
    y -= 22
y -= 6
text(MARGIN, y, "Handoff to next shift (important):", 10, True)
y -= 18
rule(y)
y -= 40
rule(y)
footer("Page 1 of 7")
finalize_page()

# ── Page 3: Medication Administration Log ───────────────────────
new_page()
header("Medication Administration Log (MAR)", "7-day grid — one row per medication.")
y = PAGE_H - 110
cols_widths = [150, 60, 54, 54, 54, 54, 54, 54, 66]
headers = ["Medication / Dose", "Time", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun / Notes"]
x = MARGIN
for i, h in enumerate(headers):
    write_cell(x, y, cols_widths[i], h, 8.5, True)
    x += cols_widths[i]
line(MARGIN, y - 2, MARGIN + CONTENT_W, y - 2)
y -= 18
for r in range(10):
    line(MARGIN, y, MARGIN + CONTENT_W, y)
    x = MARGIN
    for w in cols_widths:
        if w > 54:
            line(x + w - 1, y, x + w - 1, y + 18)
        x += w
    y -= 18
line(MARGIN, y, MARGIN + CONTENT_W, y)
y -= 24
para(MARGIN, y, "Rules that keep people safe: 1) Only give meds you are allowed and trained to give. 2) Check the label three times — right med, right dose, right person. 3) Write the time you actually gave it, not the time you planned it. 4) If a dose is missed or refused, tell the nurse / supervisor and write it in Notes.", 9, width=CONTENT_W, gray=True)
footer("Page 2 of 7")
finalize_page()

# ── Page 4: ABC Behavioral Log ──────────────────────────────────
new_page()
header("ABC Behavioral Log", "Antecedent -> Behavior -> Consequence. The gold standard for memory care.")
cols = [(0, CONTENT_W / 3, "A — ANTECEDENT"), (CONTENT_W / 3, CONTENT_W / 3, "B — BEHAVIOR"), (2 * CONTENT_W / 3, CONTENT_W / 3, "C — CONSEQUENCE")]
x = MARGIN
for c in cols:
    text(x + 4, PAGE_H - 112, c[2], 9, True)
    x += c[1]
line(MARGIN, PAGE_H - 118, MARGIN + CONTENT_W, PAGE_H - 118)
y = PAGE_H - 118
row_h = 92
for r in range(5):
    y -= row_h
    line(MARGIN, y, MARGIN + CONTENT_W, y)
    for c in cols:
        line(MARGIN + c[1], y, MARGIN + c[1], y + row_h)
    text(MARGIN + 4, y - 12, f"Event {r + 1}   Time: ____________", 8.5, False, True)
text(MARGIN, y - 34, "What triggered it?", 9, True)
text(MARGIN + CONTENT_W / 3, y - 34, "What exactly happened?", 9, True)
text(MARGIN + 2 * CONTENT_W / 3, y - 34, "How did staff / family respond?", 9, True)
y -= 60
rule(y)
para(MARGIN, y - 12, "In dementia care, most behaviors are communication. Track what happened before the behavior to find the root cause — pain, hunger, bathroom needs, noise, or overstimulation. Find the cause and you can often prevent the behavior.", 9, width=CONTENT_W, gray=True)
footer("Page 3 of 7")
finalize_page()

# ── Page 5: Vitals Tracker ──────────────────────────────────────
new_page()
header("Vitals & Blood Pressure Tracker", "Record readings, spot trends, share with the doctor.")
vcols = [70, 70, 60, 60, 60, 60, 50, 100]
vheaders = ["Date", "Time", "BP", "Pulse/HR", "Resp", "Temp", "SpO2", "Pain / Notes"]
x = MARGIN
for i, h in enumerate(vheaders):
    write_cell(x, PAGE_H - 110, vcols[i], h, 8.5, True)
    x += vcols[i]
line(MARGIN, PAGE_H - 116, MARGIN + CONTENT_W, PAGE_H - 116)
y = PAGE_H - 116
for r in range(12):
    y -= 20
    line(MARGIN, y, MARGIN + CONTENT_W, y)
y -= 22
para(MARGIN, y, "Take vitals at the same time each day when possible. Note whether the reading was taken while resting. Flag anything outside the range your provider gave you.", 9, width=CONTENT_W, gray=True)
footer("Page 4 of 7")
finalize_page()

# ── Page 6: Daily Care Checklist ────────────────────────────────
new_page()
header("Daily Care Checklist", "AM / PM routine — mark it done, hand it off.")
text(MARGIN, PAGE_H - 112, "MORNING", 11, True)
am_items = ["Medications given", "Bathing / washing up", "Dressing", "Teeth / mouth care", "Breakfast / fluids", "Skin check (redness, sores)", "Incontinence care", "Morning meds documented"]
y = PAGE_H - 132
for it in am_items:
    text(MARGIN, y, "[  ]  " + it, 10)
    y -= 20
text(MARGIN, y - 8, "EVENING", 11, True)
y -= 28
pm_items = ["Medications given", "Dinner / fluids", "Teeth / mouth care", "Change to night clothes", "Incontinence care", "Sundowning check (agitated?)", "Evening meds documented", "Night light / call light within reach"]
for it in pm_items:
    text(MARGIN, y, "[  ]  " + it, 10)
    y -= 20
y -= 6
line(MARGIN, y, MARGIN + CONTENT_W, y)
text(MARGIN, y - 16, "Date: __________________      Caregiver: __________________", 10)
footer("Page 5 of 7")
finalize_page()

# ── Page 7: Emergency Information Card ──────────────────────────
new_page()
header("Emergency Information Card", "Fill out once, keep a copy on the fridge and in the care bag.")
info = [
    ("Patient full name:", "____________________________"),
    ("Date of birth / age:", "____________________________"),
    ("Allergies (important!):", "____________________________"),
    ("Current conditions:", "____________________________"),
    ("Current medications:", "____________________________"),
    ("Primary doctor:", "____________________________  Phone: ______________"),
    ("Pharmacy:", "____________________________  Phone: ______________"),
    ("Insurance / ID#:", "____________________________"),
]
y = PAGE_H - 112
for label, _ in info:
    text(MARGIN, y, label, 10, True)
    y -= 16
    rule(y)
    y -= 14
text(MARGIN, y - 10, "EMERGENCY CONTACTS", 11, True)
y -= 30
text(MARGIN, y, "Contact 1: Name ________________  Relationship ________  Phone ________________", 10)
y -= 22
text(MARGIN, y, "Contact 2: Name ________________  Relationship ________  Phone ________________", 10)
y -= 30
para(MARGIN, y, "If the patient is confused or nonverbal, this card tells first responders what they need in the first minutes. Keep an updated copy in the car, the diaper bag, and with any sitter.", 9, width=CONTENT_W, gray=True)
footer("Page 6 of 7")
finalize_page()

# ── Page 8: Emergency Contact Sheet + back ─────────────────────
new_page()
header("Emergency Contact Sheet", "The full team, all in one place.")
contacts = ["Family / next of kin", "Primary doctor", "Specialist", "Pharmacy", "Home care agency", "Neighbor / backup", "Poison control", "Closest hospital / ER"]
y = PAGE_H - 112
for c in contacts:
    text(MARGIN, y, c, 10, True)
    text(MARGIN + 190, y, "Name: ______________________________  Phone: ______________________________", 9.5)
    y -= 20
    rule(y)
    y -= 14
y -= 16
text(MARGIN, y, "Poison Control:  1-800-222-1222     Emergency:  911", 10, True)
y -= 34
para(MARGIN, y, "How to use this pack: print the pages you need, write in the blanks, and keep the current day's sheet where you do your documentation. If you are a professional caregiver, follow your employer's and state's documentation requirements — these sheets are a helpful tool, not a substitute for official charts.", 9.5, width=CONTENT_W, gray=True, lh=15)
y -= 120
line(MARGIN, y, MARGIN + CONTENT_W, y)
text(MARGIN, y - 16, "Made by a caregiver, for caregivers.", 10, True, gray=True)
text(MARGIN, y - 34, "More free tools:  cyberscryb.com — Shift Report Generator, Med Log, ABC Behavioral Log & more.", 9, False, True)
text(MARGIN, y - 58, "© 2026 CyberScryb. Free to print, copy, and share for personal / care use.", 8, False, True)
footer("Page 7 of 7")
finalize_page()

# ── Assemble PDF ────────────────────────────────────────────────
catalog_id = obj_id()
pages_id = obj_id()
pdf.insert(0, f"{catalog_id} 0 obj\n<< /Type /Catalog /Pages {pages_id} 0 R >>\nendobj\n".encode("latin-1"))
kids = " ".join(f"{oid} 0 R" for oid in page_objs)
pdf.insert(1, f"{pages_id} 0 obj\n<< /Type /Pages /Kids [{kids}] /Count {len(page_objs)} >>\nendobj\n".encode("latin-1"))

font_ids = {}
font_ids["F1"] = emit("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
font_ids["F2"] = emit("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")

# Re-map each page object to reference font resources
out = []
for oid in page_objs:
    pass
# simpler: rebuild page objects with resources + contents markers
# We already created streams; now emit page objects pointing to streams + fonts.
# To keep ordering simple, rewrite: page objects reference stream ids recorded in page_stream_ids.
page_stream_ids = [oid for oid in page_objs]  # stream ids were stored in page_objs

# rebuild: emit page objects AFTER streams; fonts emitted; catalog/pages already at front, order:
# 1 catalog, 2 pages, ... streams ... fonts ... page objs. Kids reference page objs -> fine.

page_objs_final = []
for stream_id in page_stream_ids:
    po = emit(f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 {PAGE_W} {PAGE_H}] /Resources << /Font << /F1 {font_ids['F1']} 0 R /F2 {font_ids['F2']} 0 R >> >> /Contents {stream_id} 0 R >>")
    page_objs_final.append(po)
kids2 = " ".join(f"{oid} 0 R" for oid in page_objs_final)
# patch pages object (index 1) with correct kids
pdf[1] = f"{pages_id} 0 obj\n<< /Type /Pages /Kids [{kids2}] /Count {len(page_objs_final)} >>\nendobj\n".encode("latin-1")

data = b"%PDF-1.4\n" + b"".join(pdf)
xref_pos = len(data)
n_objs = _fid[0] + 1
offsets = {}
# We can't easily recover offsets; rebuild properly:
data = b"%PDF-1.4\n"
offsets = {0: 0}
for i, blob in enumerate(pdf):
    offsets[i + 1] = len(data)
    data += blob
xref_pos = len(data)
data += f"xref\n0 {len(pdf) + 1}\n".encode("latin-1")
data += b"0000000000 65535 f \n"
for i in range(1, len(pdf) + 1):
    data += f"{offsets[i]:010d} 00000 n \n".encode("latin-1")
data += f"trailer\n<< /Size {len(pdf) + 1} /Root {catalog_id} 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode("latin-1")

out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cyberscryb-caregiver-printable-pack.pdf")
with open(out_path, "wb") as f:
    f.write(data)
print("Wrote", out_path, len(data), "bytes")