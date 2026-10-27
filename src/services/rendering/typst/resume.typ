// VLR templates v1. Authored locally; career strings enter only via json().
#let d = json("resume.json")
#let t = d.template
#let style = t.templateId
#let accent = rgb(d.accent)
#let ink = rgb("#20242a")
#let muted = rgb("#515b65")
#let body = t.bodyFontSize * 1pt
#let spacing = t.sectionSpacing * 1mm
#let ruled = t.layout.showDividers
#let font = if t.typography == "serif" { "Noto Serif" } else { "Noto Sans" }
#set document(title: d.title, author: d.identity.at("name", default: ""), date: none)
#set page(paper: if t.pageSize == "Letter" { "us-letter" } else { "a4" }, margin: (top: t.margins.top * 1mm, right: t.margins.right * 1mm, bottom: t.margins.bottom * 1mm, left: t.margins.left * 1mm))
#set text(font: font, size: body, fill: ink, lang: "en", hyphenate: true, fallback: false)
#set par(justify: false, leading: (t.lineSpacing - 0.8) * body, spacing: 0.55em)
#set list(indent: 1em, body-indent: 0.5em, spacing: 0.3em)
#let tx(s) = text(s)
#let dim(s) = text(size: 0.88em, fill: muted, s)
#let strong-title(s) = text(weight: "bold", s)
#let rule(thickness: 0.5pt) = line(length: 100%, stroke: (paint: accent, thickness: thickness))
#let contact = {
  let items = ()
  let email = d.identity.at("email", default: "")
  if email != "" { items.push(link("mailto:" + email, tx(d.emailLabel))) }
  for key in ("phone", "location") {
    let value = d.identity.at(key, default: "")
    if value != "" { items.push(tx(value)) }
  }
  items.join([ #h(0.5em)·#h(0.5em) ])
}
#let masthead = {
  let name = d.identity.at("name", default: "")
  let headline = d.identity.at("headline", default: "")
  if style == "typst-european-classic" { text(size: 8pt, tracking: 1.2pt, fill: accent, "CURRICULUM VITAE"); parbreak() }
  if style == "typst-german-professional" { text(size: 9pt, tracking: 1.5pt, fill: accent, "LEBENSLAUF"); parbreak() }
  if style == "typst-technical-engineer" { text(size: 8pt, fill: accent, "PROFILE / ENGINEERING"); parbreak() }
  if name != "" { text(size: t.headingFontSize * 1pt, weight: "bold", fill: accent, tx(name)); parbreak() }
  if headline != "" { text(size: 1.08em, tx(headline)); parbreak() }
  if contact != [] { dim(contact); parbreak() }
}
#block(breakable: d.headerLength > 300)[
  #align(if t.headerStyle == "centered" { center } else { left }, masthead)
  #if style in ("typst-modern-executive", "typst-modern-accent") and ruled { v(2mm); rule(thickness: if style == "typst-modern-accent" { 3pt } else { 1pt }) }
]
#let entry-head(e, date: true, stacked: false) = {
  let title = strong-title(e.title)
  if stacked {
    title
    if e.subtitle != "" { parbreak(); dim(e.subtitle) }
    if date and e.date != "" { parbreak(); text(size: 0.85em, fill: accent, e.date) }
  } else {
    if date and e.date != "" {
      grid(columns: (1fr, 28mm), column-gutter: 3mm, title, align(right, dim(e.date)))
    } else { title }
    if e.subtitle != "" { parbreak(); dim(e.subtitle) }
  }
}
#let entry-body(e, tools: false) = {
  if e.summary != "" { tx(e.summary); parbreak() }
  if e.details != "" {
    if tools { block(width: 100%, inset: (left: 2mm, top: 1mm, bottom: 1mm), stroke: (left: 1pt + accent), tx(e.details)) }
    else { text(size: 0.94em, e.details); parbreak() }
  }
  if e.url != none { text(size: 0.88em, fill: accent, link(e.url, tx(e.urlLabel))); parbreak() }
  if e.bullets.len() > 0 { list(..e.bullets.map(b => tx(b.text))) }
}
#let entries(s) = {
  for (index, e) in s.entries.enumerate() {
    if index > 0 { v(2.5mm) }
    if style == "typst-european-classic" {
      // Separate ledger rows break naturally across pages; headings stick to evidence.
      block(sticky: e.title.len() + e.subtitle.len() <= 300, breakable: e.title.len() + e.subtitle.len() > 300, grid(columns: (27mm, 1fr), column-gutter: 4mm, dim(e.date), entry-head(e, date: false)))
      pad(left: 31mm, entry-body(e))
    } else if style == "typst-german-professional" {
      block(sticky: e.title.len() + e.subtitle.len() <= 300, breakable: e.title.len() + e.subtitle.len() > 300, grid(columns: (24mm, 1fr), column-gutter: 4mm, text(size: 0.85em, fill: accent, e.date), entry-head(e, date: false)))
      block(inset: (left: 3mm), stroke: (left: 0.5pt + accent), width: 100%, pad(left: 25mm, entry-body(e)))
    } else if style == "typst-ats-structured" {
      block(sticky: e.title.len() + e.subtitle.len() <= 300, breakable: e.title.len() + e.subtitle.len() > 300, entry-head(e, stacked: true))
      entry-body(e)
    } else if style == "typst-modern-accent" {
      block(sticky: e.title.len() + e.subtitle.len() <= 300, breakable: e.title.len() + e.subtitle.len() > 300, grid(columns: (3mm, 1fr), column-gutter: 2mm, text(fill: accent, "•"), entry-head(e, stacked: true)))
      pad(left: 5mm, entry-body(e))
    } else if style == "typst-academic-research" {
      block(sticky: e.title.len() + e.subtitle.len() <= 300, breakable: e.title.len() + e.subtitle.len() > 300, if s.id == "publications" { grid(columns: (7mm, 1fr), dim(str(index + 1) + "."), entry-head(e, stacked: true)) } else { entry-head(e, stacked: true) })
      entry-body(e)
    } else {
      block(sticky: e.title.len() + e.subtitle.len() <= 300, breakable: e.title.len() + e.subtitle.len() > 300, entry-head(e))
      entry-body(e, tools: style == "typst-technical-engineer")
    }
  }
}
#for (index, s) in d.sections.enumerate() {
  v(spacing)
  let heading = text(fill: accent, weight: "bold", size: 1.05em, s.title)
  let content = { if s.at("text", default: "") != "" { tx(s.text); parbreak() }; entries(s) }
  if style == "typst-modern-executive" {
    // One breakable row per section keeps the label column distinct on long CVs.
    grid(columns: (27mm, 1fr), column-gutter: 6mm, [ #text(fill: accent, size: 0.9em, weight: "bold", s.title) #if ruled { v(1mm); rule() } ], content)
  } else {
    block(sticky: true, breakable: false)[
      #if style == "typst-ats-minimal" { text(fill: accent, weight: "bold", size: 0.95em, upper(s.title)); if ruled { v(0.8mm); rule(thickness: 0.25pt) } } else if style == "typst-modern-accent" { block(width: 100%, fill: accent.lighten(93%), inset: (x: 2mm, y: 1.5mm), heading); if ruled { rule(thickness: 0.3pt) } } else if style == "typst-technical-engineer" { grid(columns: (8mm, 1fr), text(size: 0.85em, fill: accent, str(index + 1)), heading); if ruled { v(1mm); rule() } } else if style == "typst-academic-research" { heading; if ruled { v(0.7mm); rule(); v(0.5mm); rule(thickness: 0.25pt) } } else { heading; if ruled { v(1mm); rule() } }
      #v(1.5mm)
    ]
    content
  }
}
