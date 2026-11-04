"""Rebuild the bespoke Perfect Tie vector assets (fonttools + brotli).
Wordmark outlines derive from the bundled SIL-OFL Inter font; geometry is original.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/brand'
OUT.mkdir(exist_ok=True)
font = instantiateVariableFont(TTFont(ROOT/'public/fonts/InterVariable.woff2'), {'wght': 570, 'opsz': 32})
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
upm = font['head'].unitsPerEm
NAVY, IVORY, GOLD = '#111A2E', '#F8F7F4', '#B99A66'
# Optically rounded knot, asymmetric cut, and a continuous S-shaped silk fold.
KNOT = 'M22 11C34 6 62 6 74 11C78 12.5 79 16 77 20L69 35C67 39 63 40 58 41L32 47C28 48 26 46 24 42L16 21C14 16 16 13 22 11Z'
LEFT = 'M30 51C41 55 59 63 60 71C61 79 35 91 19 105L28 59C28.5 56 29 53 30 51Z'
BLADE = 'M66 46L79 101C80 105 79 108 76 111L52 135C49.5 137.5 46.5 137.5 44 135L21 112C35 98 67 85 68 73C69 62 48 54 35 50Z'
FOLD = 'M35 49L65 43L69 66C62 59 48 52 35 49Z'
# Optical reduction: broader white separation, no gold microdetail.
SMALL = 'M29 53C42 59 57 66 57 72C57 79 36 88 21 99L29 53ZM66 48L78 101Q80 106 76 110L52 134Q48 138 44 134L23 113C44 96 70 85 70 73C70 62 56 55 43 51Z'
def mark(ink=NAVY, small=False, mono=False):
 return f'<g fill="{ink}"><path d="{KNOT}"/><path d="{SMALL if small else LEFT}"/>' + ('' if small else f'<path d="{BLADE}"/>') + '</g>' + ('' if small or mono else f'<path fill="{GOLD}" d="{FOLD}"/>')
def text_paths(text, x, y, size, ink=NAVY, tracking=-.65):
 scale=size/upm; paths=[]
 for ch in text:
  name=cmap[ord(ch)]; pen=SVGPathPen(glyphs)
  glyphs[name].draw(TransformPen(pen,(scale,0,0,-scale,x,y)))
  paths.append(f'<path d="{pen.getCommands()}"/>')
  x += glyphs[name].width*scale + tracking
 return f'<g fill="{ink}">'+''.join(paths)+'</g>'
def svg(w,h,body,title):
 return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{title}">{body}</svg>'
for name, ink in [('light', NAVY), ('dark', IVORY)]:
 (OUT/f'emblem-{name}.svg').write_text(svg(96,144,mark(ink), 'Perfect Tie emblem'))
 (OUT/f'logo-{name}.svg').write_text(svg(392,104,f'<g transform="translate(0 2) scale(.68)">{mark(ink)}</g>'+text_paths('Perfect Tie',85,71,53,ink,-1.2),'Perfect Tie'))
(OUT/'emblem-mono.svg').write_text(svg(96,144,mark(NAVY,mono=True),'Perfect Tie emblem'))
for name,bg,ink in [('icon',NAVY,IVORY),('icon-light',IVORY,NAVY)]:
 body=f'<rect width="128" height="128" rx="29" fill="{bg}"/><g transform="translate(31 13) scale(.69)">{mark(ink,small=True)}</g>'
 (OUT/f'{name}.svg').write_text(svg(128,128,body,'Perfect Tie'))
(OUT/'favicon.svg').write_text(svg(32,32,f'<rect width="32" height="32" rx="7" fill="{NAVY}"/><g transform="translate(7.5 2.5) scale(.177)">{mark(IVORY,small=True)}</g>','Perfect Tie'))
body=f'<rect width="1200" height="630" fill="{IVORY}"/><path d="M80 80H1120" stroke="#DEDCD6"/><path d="M80 550H1120" stroke="#DEDCD6"/><g transform="translate(100 177) scale(1.65)">{mark()}</g>'+text_paths('Perfect Tie',315,302,94,NAVY,-2)+text_paths('Your experience. Beautifully composed.',320,366,27,'#35445E',-.35)+f'<rect x="320" y="411" width="56" height="3" rx="1.5" fill="{GOLD}"/>'
(OUT/'social-preview.svg').write_text(svg(1200,630,body,'Perfect Tie — Your experience. Beautifully composed.'))
# A tiny, editable source is the high-resolution master; exports contain no font dependency.
