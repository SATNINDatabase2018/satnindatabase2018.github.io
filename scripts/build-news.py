"""Generate public website release summaries and a static Pages deployment."""
from pathlib import Path
import subprocess,json,datetime,shutil
ROOT=Path(__file__).resolve().parents[1]
PATHS=['*.html','js','css','assets','data','scripts/build-news.py','.github/workflows/deploy-pages.yml']
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT,text=True).strip()
def runtime(name):
 return (name.endswith('.html') or name.startswith(('js/','css/','assets/','data/'))) and name!='data/site-news.json'
def releases():
 posts=[]
 for sha in git('log','-n','150','--format=%H','--',*PATHS).splitlines():
  changed=[p for p in git('diff-tree','--root','--no-commit-id','--name-only','-r',sha).splitlines() if runtime(p)]
  if not changed:continue
  areas=[]
  if any(p.startswith('data/') for p in changed):areas.append('database files')
  if any(p.startswith('css/') for p in changed):areas.append('appearance and layout')
  if any(p.startswith('js/') for p in changed):areas.append('website features')
  if any(p.endswith('.html') for p in changed):areas.append('website pages')
  if any(p.startswith('assets/') for p in changed):areas.append('website images and artwork')
  posts.append({'id':'release:'+sha,'source':'website','title':'Website updated','body':'Updated '+', '.join(areas)+'.','created_at':git('show','-s','--format=%cI',sha)})
  if len(posts)==30:break
 return posts
if __name__=='__main__':
 posts=releases()
 (ROOT/'data/site-news.json').write_text(json.dumps(posts,ensure_ascii=False,indent=2)+'\n')
 dist=ROOT/'_site'
 if dist.exists():shutil.rmtree(dist)
 dist.mkdir()
 for name in ['js','css','assets','data']:shutil.copytree(ROOT/name,dist/name)
 for p in ROOT.glob('*.html'):shutil.copy2(p,dist/p.name)
 for p in ROOT.glob('*/index.html'):
  if p.parent.name in ['_site','node_modules']:continue
  (dist/p.parent.name).mkdir(exist_ok=True);shutil.copy2(p,dist/p.parent.name/'index.html')
 (dist/'.nojekyll').touch()
 print(f'Built website with {len(posts)} automatic release summaries. No private account data or commit messages published.')
