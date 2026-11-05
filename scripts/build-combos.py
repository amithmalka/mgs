import json,math,itertools,datetime as dt
rec={r['k']:r for r in json.load(open('/tmp/audit/rec.json'))}
RW='/private/tmp/claude-501/-Users-amitmalka/77e28b2b-9975-4d37-8a19-e18d65886f1b/scratchpad/ir/raw.json'
raw=json.load(open(RW))
def ym(ts):
    t=dt.datetime.fromtimestamp(ts,dt.UTC); return t.year*12+t.month
def s_(k): return {ym(ts):v for ts,v in raw[k]['pts'] if v and v>0}
EU,GB,IL=s_('FX_EURUSD=X'),s_('FX_GBPUSD=X'),s_('FX_ILS=X')
def cv(k,ils):
    s=s_(k);c=raw[k]['cur'];o={}
    for m,p in s.items():
        u=p if c=='USD' else (p*EU[m] if c=='EUR' and m in EU else (p*GB[m] if c=='GBP' and m in GB else (p/100*GB[m] if c=='GBp' and m in GB else None)))
        if u is None: continue
        if ils:
            if m in IL: o[m]=u*IL[m]
        else: o[m]=u
    return o
import json as _j
BUYABLE=set(_j.load(open('/tmp/audit/buyable.json')))
# **רק מה שיש לו רשומת קנייה.** XUTC נכנסה לקטלוג אף שאין לה
# אחת — הקוד עצמו מתעד שהרשומה שלה היא מחלקת זרע ש״אינה
# בת־קנייה״, והיא נמדדה על קו גרמני של מחלקה אחרת.
BAD={'XNAS'} | {'XUTC'}
U=[k for k,r in rec.items() if k in BUYABLE and k not in BAD and k!='BTC' and r['yrs']>=4.5 and r['recov']<=28 and r['open']<=12]
LAST=max(max(s_(k)) for k in U); W=LAST-59; grid=list(range(W,LAST+1))
def al(s):
    o=[];last=None
    for m in grid:
        if m in s: last=s[m]
        o.append(last)
    return o if o[0] is not None else None
Pu,Pi={},{}
for k in U:
    a,b=al(cv(k,False)),al(cv(k,True))
    if a and b: Pu[k]=a;Pi[k]=b
n=len(grid)-1
Ru={k:[Pu[k][i]/Pu[k][i-1]-1 for i in range(1,len(grid))] for k in Pu}
Ri={k:[Pi[k][i]/Pi[k][i-1]-1 for i in range(1,len(grid))] for k in Pi}
def met(R,ws):
    r=[sum(x*R[k][i] for k,x in ws) for i in range(n)]
    v=1.0;pk=1.0;dd=0.0;cum=[1.0]
    for x in r: v*=1+x;cum.append(v);pk=max(pk,v);dd=min(dd,v/pk-1)
    mu=sum(r)/n;vol=math.sqrt(sum((x-mu)**2 for x in r)/(n-1))*math.sqrt(12)
    return v**(12/n)-1,vol,dd,min(cum[i]/cum[i-12]-1 for i in range(12,len(cum)))
best={}
for sz in (2,3,4):
    for cb in itertools.combinations(sorted(Ru),sz):
        for w in itertools.product(range(10,100,10),repeat=sz):
            if sum(w)!=100: continue
            ws=[(k,x/100) for k,x in zip(cb,w)]
            c,v,dd,w12=met(Ru,ws)
            b=round(v*100)
            if 8<=b<=33 and (b not in best or c/v>best[b][0]/best[b][1]): best[b]=(c,v,dd,w12,ws)
cand=[best[b] for b in sorted(best)]
# **השכבה הכלכלית, לא הטיקר.** SPXS ו-IWDA מתואמות 0.973 — החלפה
# ביניהן אינה תמהיל אחר, היא אותו תמהיל עם שם אחר. לכן המרחק
# נמדד בין שכבות: גרעין רחב, נאסד״ק, טכנולוגיה, מוליכים למחצה,
# תשתיות.
LAYER={'CSPX':'core','VUAA':'core','SPXS':'core','SPYL':'core','MXWO':'core',
 'IWDA':'core','ACWD':'core','SSAC':'core','VWRA':'core','FWRA':'core','IWMO':'core',
 'CNDX':'ndx','EQQS':'ndx','XNAS':'ndx',
 'XLKS':'tech','IUIT':'tech','WTEC':'tech',
 'SMH':'semi','SEMI':'semi','XUTC':'infra','RBOT':'tech','ZPRR':'core',
 'NDIA':'em','KWEB':'em','BCHN':'crypto','GDX':'gold','SPGP':'gold'}
def lay(ws):
    o={}
    for k,x in ws: o[LAYER.get(k,k)]=o.get(LAYER.get(k,k),0)+round(x*100)
    return o
def dist(a,b):
    """מרחק L1 בין שני תמהילים, בשכבות — נקודות אחוז"""
    da,db=lay(a),lay(b)
    return sum(abs(da.get(k,0)-db.get(k,0)) for k in set(da)|set(db))
def tr(v): return 'flow' if v<0.145 else ('both' if v<0.225 else 'growth')
# **הסינון בתוך כל מסלול בנפרד.** מעבר גלובלי מרעיב את הקצה
# התנודתי-נמוך, כי מסלול הצמיחה פרוס על טווח רחב יותר ו״גונב״
# את המקום. לכל מסלול סולם משלו.
# **הסף שונה בתזרים, ובכוונה.** שם 90% מהתיק הוא גרעין רחב וה-10%
# הלוויני הוא הבחירה היחידה שקיימת — ולכן הפרש של 20 נקודות שכבה
# הוא בחירה אמיתית (תשתיות מול מוליכים למחצה). בשאר המסלולים
# 20 נקודות הן הזזה של מחוון, לא תמהיל אחר.
MINT={'flow':20,'both':40,'growth':40}
keep=[]
for _t in ('flow','both','growth'):
    MIN=MINT[_t]
    _g=[c for c in cand if tr(c[1])==_t]
    _k=[]
    for c in _g:
        if all(dist(c[4],x[4])>=MIN for x in _k): _k.append(c)
    keep+=_k
keep.sort(key=lambda c:c[1])
print(f"סף 20/40/40 נקודות שכבה לפי מסלול → {len(keep)} (מתוך {len(cand)})\n")
rows=[]
for c,v,dd,w12,ws in keep:
    _,vi,ddi,_=met(Ri,ws)
    naive=sum(x*met(Ru,[(k,1.0)])[1] for k,x in ws)
    mr=max(rec[k]['recov'] for k,_ in ws)
    print(f"  {tr(v):7} {v*100:4.1f}% / {c*100:5.1f}%  יחס {c/v:.3f}  נפילה {dd*100:6.1f}%  {'/'.join(f'{k}{round(x*100)}' for k,x in sorted(ws,key=lambda z:-z[1]))}")
    rows.append("  { track: '%s', vol: %.4f, cagr: %.4f, dd: %.4f, ddIls: %.4f, volIls: %.4f, w12: %.4f, recov: %d, ratio: %.3f, naive: %.4f, parts: [%s] },"%(
      tr(v),v,c,dd,ddi,vi,w12,mr,c/v,naive,
      ', '.join("{ k: '%s', w: %d }"%(k,round(x*100)) for k,x in sorted(ws,key=lambda z:-z[1]))))
for t in ('flow','both','growth'):
    print(t, sum(1 for r in rows if "'"+t+"'" in r))
open('/tmp/audit/rows3.txt','w').write('\n'.join(rows))
