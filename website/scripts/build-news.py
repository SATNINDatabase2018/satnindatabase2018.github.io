"""Build the static website. The historical filename is kept for workflow compatibility."""
from pathlib import Path
import json,re,shutil
ROOT=Path(__file__).resolve().parents[1]
RETIRED={'news.js','news-reactions.js','news.css','news-reactions.css','site-news.json'}

def build():
 dist=ROOT/'_site'
 if dist.exists():shutil.rmtree(dist)
 dist.mkdir()
 for name in ['js','css','assets','data']:
  shutil.copytree(ROOT/name,dist/name,ignore=lambda directory,names:[n for n in names if n in RETIRED])
 for source in ROOT.glob('*.html'):
  if not re.fullmatch(r'index \(\d+\)\.html',source.name):shutil.copy2(source,dist/source.name)
 for source in ROOT.glob('*/index.html'):
  if source.parent.name in ['_site','node_modules']:continue
  (dist/source.parent.name).mkdir(exist_ok=True)
  shutil.copy2(source,dist/source.parent.name/'index.html')
 for source in (dist/'data').glob('*.json'):
  source.write_text(json.dumps(json.loads(source.read_text()),ensure_ascii=False,separators=(',',':'))+'\n')
 (dist/'.nojekyll').touch()
 print('Built static website. News and announcements are disabled.')

if __name__=='__main__':build()
