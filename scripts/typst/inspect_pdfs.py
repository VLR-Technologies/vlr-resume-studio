"""Independent inspection and deterministic thumbnails from actual fictional PDFs."""
import json
import argparse
import subprocess
from pathlib import Path
import pdfplumber
from pypdf import PdfReader
from PIL import Image, ImageOps, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument('--inspect-only', action='store_true', help='Verify regenerated PDFs without re-rasterizing unchanged layouts.')
args = parser.parse_args()

root = Path('qa-artifacts/typst-pdf')
output = Path('qa-artifacts/typst-inspection')
output.mkdir(parents=True, exist_ok=True)
previews = Path('public/templates')
previews.mkdir(parents=True, exist_ok=True)
results = []
for path in sorted(root.glob('*.pdf')):
    reader = PdfReader(path)
    embedded = True
    fonts = set()
    for page in reader.pages:
        for ref in page.get('/Resources', {}).get('/Font', {}).values():
            font = ref.get_object()
            fonts.add(str(font.get('/BaseFont')))
            for descendant in font.get('/DescendantFonts', [font]):
                descriptor = descendant.get_object().get('/FontDescriptor')
                if descriptor:
                    embedded &= any(k in descriptor.get_object() for k in ['/FontFile', '/FontFile2', '/FontFile3'])
                else:
                    embedded = False
    outside = []
    with pdfplumber.open(path) as pdf:
        for n, page in enumerate(pdf.pages, 1):
            for c in page.chars:
                if c['text'].strip() and (c['x0'] < -.5 or c['x1'] > page.width + .5 or c['top'] < -.5 or c['bottom'] > page.height + .5):
                    outside.append((n, c['text'], c['x0'], c['top'], c['x1'], c['bottom']))
    assert not outside, (path, outside[:5])
    assert embedded, path
    expected = json.loads(path.with_suffix('.json').read_text())
    assert len(reader.pages) == expected['pages']
    results.append({'file': path.name, 'pages': len(reader.pages), 'allFontsEmbedded': embedded, 'outOfBounds': len(outside), 'fonts': sorted(fonts), 'renderMs': expected['renderMs']})
    if not args.inspect_only:
        for old_page in output.glob(f'{path.stem}-*.png'):
            old_page.unlink()
        subprocess.run(['pdftoppm', '-scale-to', '850', '-png', str(path), str(output / path.stem)], check=True, capture_output=True)
        if path.stem.endswith('-gallery'):
            template = path.stem.removesuffix('-gallery')
            Image.open(output / f'{path.stem}-1.png').convert('RGB').resize((280,396)).save(previews / f'{template}.webp', quality=88)
if not args.inspect_only:
    for template in ['classic','european','modern','academic']:
        path = Path(f'qa-artifacts/pdf/{template}-one-page.pdf')
        target = output / f'{template}-preview'
        subprocess.run(['pdftoppm','-f','1','-singlefile','-scale-to','850','-png',str(path),str(target)],check=True,capture_output=True)
        Image.open(target.with_suffix('.png')).convert('RGB').resize((280,396)).save(previews / f'{template}.webp', quality=88)
    for template in sorted({r['file'].split('-student')[0] for r in results if '-student' in r['file']}):
        images = sorted(output.glob(f'{template}-*.png'))
        width, height, cols = 220, 335, 6
        sheet = Image.new('RGB', (cols*width, ((len(images)+cols-1)//cols)*height), '#ddd')
        draw = ImageDraw.Draw(sheet)
        for i, path in enumerate(images):
            thumb = ImageOps.contain(Image.open(path).convert('RGB'), (width-12,height-30))
            x,y = (i%cols)*width,(i//cols)*height
            sheet.paste(thumb,(x+6,y+24)); draw.text((x+4,y+4),path.stem.replace(template+'-',''),fill='black')
        sheet.save(output / f'{template}-contact-sheet.jpg')
summary = {'documents':len(results),'pages':sum(r['pages'] for r in results),'allFontsEmbedded':all(r['allFontsEmbedded'] for r in results),'outOfBounds':sum(r['outOfBounds'] for r in results),'documentsInspected':results}
(output/'independent-results.json').write_text(json.dumps(summary,indent=2))
print(json.dumps({k:v for k,v in summary.items() if k!='documentsInspected'},indent=2))
