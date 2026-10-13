"""Draws the fictional sample maps for a Campus Ready demo school (scripts/seed-demo-maps.mjs).

Everything here is invented: "Sample School", made-up streets and buildings, no real school.
Needs PyMuPDF:  python scripts/demo-maps/make_demo_maps.py
Writes: campus-map.png, main-building-floor-plan.png, evacuation-and-reunification.pdf (next to this script).
"""
import os
import fitz  # PyMuPDF

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 1400, 900
INK = (0.12, 0.14, 0.18)
WHITE = (1, 1, 1)
GREEN = (0.05, 0.45, 0.2)
RED = (0.7, 0.05, 0.05)
NOTICE = "© 2026 Emergency Preparedness Solutions LLC. Sample map for demonstration only; do not copy or redistribute."


def text(page, x, y, s, size=14, color=INK, bold=False, rotate=0):
    page.insert_text((x, y), s, fontsize=size, fontname="hebo" if bold else "helv", color=color, rotate=rotate)


def centered(page, rect, s, size=14, color=INK, bold=False):
    page.insert_textbox(fitz.Rect(rect), s, fontsize=size, fontname="hebo" if bold else "helv", color=color, align=1)


def box(page, rect, fill, label=None, size=14, stroke=INK, width=1.5, color=INK, bold=True):
    r = fitz.Rect(rect)
    page.draw_rect(r, color=stroke, fill=fill, width=width)
    if label:
        lines = label.count("\n") + 1
        top = r.y0 + (r.height - lines * size * 1.25) / 2
        centered(page, (r.x0 + 4, top, r.x1 - 4, r.y1), label, size=size, color=color, bold=bold)


def header(page, title, subtitle):
    page.draw_rect(fitz.Rect(0, 0, W, 64), color=None, fill=(0, 0.153, 0.298))
    text(page, 28, 40, title, size=26, color=WHITE, bold=True)
    text(page, W - 28 - 7 * len(subtitle), 40, subtitle, size=14, color=(0.85, 0.9, 1))


def footer(page):
    page.draw_rect(fitz.Rect(0, H - 34, W, H), color=None, fill=(0.95, 0.95, 0.95))
    text(page, 28, H - 12, NOTICE, size=11, color=(0.3, 0.3, 0.3))


def north_arrow(page, x, y):
    page.draw_polyline([(x, y - 34), (x - 14, y + 10), (x, y), (x + 14, y + 10), (x, y - 34)], color=INK, fill=INK, width=1)
    text(page, x - 5, y + 32, "N", size=16, bold=True)


def legend(page, x, y, items):
    page.draw_rect(fitz.Rect(x, y, x + 250, y + 36 + 24 * len(items)), color=INK, fill=WHITE, width=1)
    text(page, x + 12, y + 20, "LEGEND", size=12, bold=True)
    for i, (fill, label) in enumerate(items):
        yy = y + 42 + 24 * i
        page.draw_rect(fitz.Rect(x + 12, yy - 10, x + 36, yy + 6), color=INK, fill=fill, width=0.8)
        text(page, x + 46, yy + 3, label, size=12)


def save(doc, name, png=True):
    if png:
        doc[0].get_pixmap(dpi=110).save(os.path.join(HERE, name))
    else:
        doc.save(os.path.join(HERE, name), garbage=4, deflate=True)


def assembly(p, x, y, label):
    p.draw_circle((x, y), 42, color=GREEN, fill=(0.7, 0.92, 0.72), width=3)
    text(p, x - 12, y + 14, label, size=40, color=GREEN, bold=True)
    centered(p, (x - 80, y + 48, x + 80, y + 70), "ASSEMBLY POINT", size=11, color=GREEN, bold=True)


# ---------------------------------------------------------------- Campus map
def campus():
    doc = fitz.open()
    p = doc.new_page(width=W, height=H)
    p.draw_rect(fitz.Rect(0, 0, W, H), color=None, fill=(0.9, 0.95, 0.88))
    header(p, "Sample School - Campus Map", "Fictional sample")
    road = (0.36, 0.38, 0.42)
    box(p, (0, 780, W, 850), road, stroke=road)
    text(p, 540, 822, "S C H O O L   R O A D", size=16, color=WHITE, bold=True)
    box(p, (1290, 64, 1350, 780), road, stroke=road)
    text(p, 1328, 520, "M A P L E   S T R E E T", size=16, color=WHITE, bold=True, rotate=90)
    # Buildings and grounds
    box(p, (430, 430, 980, 640), (0.72, 0.84, 0.95), "MAIN BUILDING", size=28)
    box(p, (430, 250, 700, 430), (0.95, 0.88, 0.75), "GYMNASIUM", size=20)
    box(p, (720, 150, 960, 260), (0.86, 0.9, 0.96), "PORTABLE\nCLASSROOMS", size=14)
    box(p, (60, 130, 360, 330), (0.78, 0.9, 0.78), "ATHLETIC FIELD", size=20)
    box(p, (60, 400, 330, 560), (0.82, 0.82, 0.88), "STAFF AND\nVISITOR PARKING", size=16)
    box(p, (1020, 430, 1260, 600), (0.92, 0.88, 0.96), "PLAYGROUND", size=18)
    # Bus loop and car line along the front of the main building
    box(p, (430, 660, 980, 720), (0.62, 0.64, 0.7), "BUS LOOP AND FAMILY CAR LINE", size=14, color=WHITE, stroke=(0.45, 0.47, 0.52))
    # Entrances
    p.draw_rect(fitz.Rect(690, 626, 722, 640), color=INK, fill=(0.1, 0.35, 0.75), width=1)
    centered(p, (640, 596, 772, 625), "MAIN ENTRANCE", size=10, bold=True)
    assembly(p, 200, 700, "A")
    assembly(p, 1130, 700, "B")
    # Off-site reunification note
    p.draw_rect(fitz.Rect(740, 270, 1250, 360), color=GREEN, fill=(0.95, 1, 0.95), width=2)
    text(p, 756, 298, "OFF-SITE REUNIFICATION", size=14, color=GREEN, bold=True)
    text(p, 756, 322, "If the campus cannot be used, families are directed to", size=12)
    text(p, 756, 340, "the site named in the Reunification tile.", size=12)
    north_arrow(p, 1230, 130)
    legend(p, 400, 100, [((0.72, 0.84, 0.95), "Building"), ((0.7, 0.92, 0.72), "Assembly point"), ((0.1, 0.35, 0.75), "Entrance")])
    footer(p)
    save(doc, "campus-map.png")


# ---------------------------------------------------------------- Floor plans
def floor_base(p):
    p.draw_rect(fitz.Rect(0, 0, W, H), color=None, fill=(0.98, 0.98, 0.97))
    p.draw_rect(fitz.Rect(70, 100, 1330, 790), color=INK, fill=(0.93, 0.93, 0.93), width=3)
    box(p, (70, 300, 1330, 400), (0.99, 0.99, 0.99), None, stroke=(0.7, 0.7, 0.7), width=0.8)
    text(p, 330, 388, "MAIN CORRIDOR", size=14, color=(0.5, 0.5, 0.5))
    text(p, 960, 388, "MAIN CORRIDOR", size=14, color=(0.5, 0.5, 0.5))


def exit_sign(p, x, y):
    p.draw_rect(fitz.Rect(x, y, x + 56, y + 22), color=GREEN, fill=(0.1, 0.65, 0.3), width=1)
    text(p, x + 12, y + 16, "EXIT", size=12, color=WHITE, bold=True)


def aed(p, x, y):
    p.draw_circle((x, y), 13, color=RED, fill=(0.9, 0.2, 0.2), width=1)
    centered(p, (x - 13, y - 4, x + 13, y + 10), "AED", size=7, color=WHITE, bold=True)


def rooms(p):
    top = [(70, 280, "MAIN\nOFFICE", (1, 0.92, 0.75)), (280, 420, "NURSE", (1, 0.88, 0.88)),
           (420, 700, "LIBRARY", (0.92, 0.88, 0.96)), (700, 840, "ROOM\n101", (0.9, 0.95, 1)),
           (840, 980, "ROOM\n102", (0.9, 0.95, 1)), (980, 1120, "ROOM\n103", (0.9, 0.95, 1)),
           (1120, 1330, "ROOM\n104", (0.9, 0.95, 1))]
    for x0, x1, label, fill in top:
        box(p, (x0, 100, x1, 300), fill, label, size=15)
    box(p, (70, 400, 520, 790), (0.97, 0.94, 0.88), "GYMNASIUM", size=22)
    box(p, (520, 400, 860, 640), (0.9, 0.96, 0.9), "CAFETERIA", size=20)
    box(p, (520, 640, 860, 790), (0.88, 0.93, 1.0), "ENTRANCE LOBBY\nAND VISITOR CHECK-IN", size=14)
    box(p, (860, 400, 1030, 560), (0.9, 0.95, 1), "ROOM\n105", size=15)
    box(p, (1030, 400, 1180, 560), (0.9, 0.95, 1), "ROOM\n106", size=15)
    box(p, (1180, 400, 1330, 560), (0.9, 0.95, 1), "ROOM\n107", size=15)
    box(p, (860, 560, 1000, 790), (0.88, 0.88, 0.88), "RESTROOMS", size=13)
    box(p, (1000, 560, 1330, 790), (0.95, 0.92, 0.85), "ART AND\nMUSIC ROOM", size=16)


def floor_legend(p):
    aed(p, 450, 842)
    text(p, 470, 847, "AED location", size=12)
    p.draw_rect(fitz.Rect(600, 832, 656, 854), color=GREEN, fill=(0.1, 0.65, 0.3), width=1)
    text(p, 612, 848, "EXIT", size=12, color=WHITE, bold=True)
    text(p, 664, 847, "Exit", size=12)


def floor_plan():
    doc = fitz.open()
    p = doc.new_page(width=W, height=H)
    floor_base(p)
    header(p, "Main Building - Floor Plan", "Fictional sample")
    rooms(p)
    for (x, y) in [(8, 340), (1336, 340)]:
        exit_sign(p, x, y)
    for (x, y) in [(215, 792), (700, 792), (1080, 792)]:
        exit_sign(p, x, y)
    for (x, y) in [(190, 350), (560, 330), (880, 330), (1220, 350), (560, 450)]:
        aed(p, x, y)
    north_arrow(p, 1362, 160)
    floor_legend(p)
    footer(p)
    save(doc, "main-building-floor-plan.png")


def arrow(p, points):
    p.draw_polyline(points, color=GREEN, width=5)
    (x0, y0), (x1, y1) = points[-2], points[-1]
    dx = 1 if x1 > x0 else -1 if x1 < x0 else 0
    dy = 1 if y1 > y0 else -1 if y1 < y0 else 0
    if dx:
        p.draw_polyline([(x1, y1), (x1 - 16 * dx, y1 - 11), (x1 - 16 * dx, y1 + 11), (x1, y1)], color=GREEN, fill=GREEN)
    else:
        p.draw_polyline([(x1, y1), (x1 - 11, y1 - 16 * dy), (x1 + 11, y1 - 16 * dy), (x1, y1)], color=GREEN, fill=GREEN)


def evacuation():
    doc = fitz.open()
    p = doc.new_page(width=W, height=H)
    floor_base(p)
    header(p, "Main Building - Evacuation and Reunification", "Fictional sample")
    rooms(p)
    arrow(p, [(640, 332), (160, 332)])
    arrow(p, [(760, 332), (1240, 332)])
    arrow(p, [(300, 520), (300, 410)])
    arrow(p, [(728, 742), (728, 786)])
    arrow(p, [(1100, 702), (1100, 786)])
    arrow(p, [(215, 742), (215, 786)])
    exit_sign(p, 8, 340)
    exit_sign(p, 1336, 340)
    exit_sign(p, 215, 792)
    exit_sign(p, 700, 792)
    exit_sign(p, 1080, 792)
    text(p, 70, 830, "Evacuate: leave by the nearest exit and go to Assembly Point A (athletic field) or B (north lot). Teachers take attendance on arrival.", size=12)
    text(p, 70, 846, "Do not re-enter until the all clear is given.", size=12)
    text(p, 70, 862, "Reunification: families check in at the Entrance Lobby with photo ID; students are released only to approved adults.", size=12, color=RED, bold=True)
    north_arrow(p, 1362, 160)
    footer(p)
    save(doc, "evacuation-and-reunification.pdf", png=False)


if __name__ == "__main__":
    campus()
    floor_plan()
    evacuation()
    for name in ("campus-map.png", "main-building-floor-plan.png", "evacuation-and-reunification.pdf"):
        print(name, os.path.getsize(os.path.join(HERE, name)) // 1024, "KB")
