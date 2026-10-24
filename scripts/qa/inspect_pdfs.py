"""Independent PDF QA. Run after npm test; requires pypdf, pdfplumber, Pillow, Poppler."""
import json
import subprocess
from pathlib import Path
import pdfplumber
from pypdf import PdfReader
from PIL import Image, ImageOps, ImageDraw

root = Path('qa-artifacts/pdf')
output = Path('qa-artifacts/inspection')
output.mkdir(parents=True, exist_ok=True)
results = []
for path in sorted(root.glob('*.pdf')):
    reader = PdfReader(path)
    fonts = set()
    embedded = True
    for page in reader.pages:
        for resource in page.get('/Resources', {}).get('/Font', {}).values():
            font = resource.get_object()
            fonts.add(str(font.get('/BaseFont')))
            for desc in font.get('/DescendantFonts', [font]):
                descriptor = desc.get_object().get('/FontDescriptor')
                if descriptor:
                    embedded &= any(key in descriptor.get_object() for key in ['/FontFile', '/FontFile2', '/FontFile3'])
    outside = []
    texts = []
    with pdfplumber.open(path) as pdf:
        for n, page in enumerate(pdf.pages, 1):
            texts.append(page.extract_text() or '')
            for char in page.chars:
                if char['text'].strip() and (char['x0'] < -0.5 or char['x1'] > page.width + 0.5 or char['top'] < -0.5 or char['bottom'] > page.height + 0.5):
                    outside.append({'page': n, 'text': char['text'], 'bounds': [char['x0'], char['top'], char['x1'], char['bottom']]})
    assert not outside, (path, outside[:5])
    assert embedded, path
    assert all(texts) or path.stem.endswith('-empty'), path
    expected = json.loads(path.with_suffix('.json').read_text())
    assert len(texts) == expected['pages']
    results.append({'file': path.name, 'pages': len(texts), 'glyphs': sum(len(t) for t in texts), 'fonts': sorted(fonts), 'embedded': embedded, 'outOfBounds': len(outside)})
    # Every template/persona plus all extremes and long documents; render every page.
    if any(path.stem.endswith('-' + s) for s in ['student', 'professional', 'researcher', 'bounds', 'compact', 'long-text', 'one-page', 'two-page']):
        subprocess.run(['pdftoppm', '-scale-to', '850', '-png', str(path), str(output / path.stem)], check=True, capture_output=True)
for template in ['classic', 'european', 'modern', 'academic']:
    images = sorted(output.glob(f'{template}-*.png'))
    width, height, cols = 220, 335, 6
    sheet = Image.new('RGB', (cols * width, ((len(images)+cols-1)//cols)*height), '#ddd')
    draw = ImageDraw.Draw(sheet)
    for i, path in enumerate(images):
        thumb = ImageOps.contain(Image.open(path).convert('RGB'), (width-12, height-30))
        x, y = (i%cols)*width, (i//cols)*height
        sheet.paste(thumb, (x+6, y+24))
        draw.text((x+4,y+4), path.stem.replace(template+'-', ''), fill='black')
    sheet.save(output / f'{template}-contact-sheet.jpg')
summary = {'documents': len(results), 'pages': sum(r['pages'] for r in results), 'allFontsEmbedded': all(r['embedded'] for r in results), 'outOfBounds': sum(r['outOfBounds'] for r in results), 'documentsInspected': results}
(output / 'independent-pdf-results.json').write_text(json.dumps(summary, indent=2))
print(json.dumps({k:v for k,v in summary.items() if k != 'documentsInspected'}, indent=2))
