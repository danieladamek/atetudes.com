/* metronome.mjs — the shared metronome core (component v1).
 *
 * The canonical source of the metronome every At-Etudes app carries. Pure timing
 * math with injected time — no AudioContext, no DOM — so the grid is testable
 * headless. Apps bind it to Web Audio and UI themselves.
 *
 * The clock OWNS the grid; étude transports are subscribers that join at bar
 * boundaries. This is the two-consumer architecture from Triadetudes v0.5.1,
 * inverted to its correct final form (Daniel, 2026-08-08): the metronome is the
 * master, the player syncs to it.
 *
 * Until Phase B's build step inlines modules automatically, apps carry a
 * hand-inlined copy of this file's three definitions between markers; the test
 * suite asserts the copies are verbatim-identical to this module (anti-drift).
 */

export function createMetroCore(opts={}){
  const ms={bpm:opts.bpm??72,meter:opts.meter??4,sub:opts.sub??1,running:false,anchor:0,nextIdx:0,
    meterStart:0,pendingMeter:null};
  const spb=()=>60/ms.bpm;
  // SUBDIVISION LIVES HERE (260929, night 35b): the one home for the concept.
  // Two hand-authored pages scheduled SUB_OFFSETS themselves and the door's
  // card validated the value and discarded it — Subdivision did nothing on
  // every door-built page. A subdivision the table does not define is
  // refused BY NAME, so a meaningless one cannot be selected silently.
  const subOffsets=()=>{const o=SUB_OFFSETS[ms.sub]; if(!o||typeof ms.sub!=="number")throw new Error("unknown subdivision: "+ms.sub); return o;};
  return {
    get running(){return ms.running;}, get bpm(){return ms.bpm;}, get meter(){return ms.meter;},
    get sub(){return ms.sub;},
    get pendingMeter(){return ms.pendingMeter;},
    setSub(n){
      // takes effect from the next beat emitted: a beat's sub events are
      // scheduled with the beat, never retroactively between two beats
      if(typeof n!=="number"||!SUB_OFFSETS[n])throw new Error("unknown subdivision: "+n);
      ms.sub=n;
    },
    start(now){
      if(ms.pendingMeter!==null){ms.meter=ms.pendingMeter;ms.pendingMeter=null;}
      ms.running=true;ms.anchor=now;ms.nextIdx=0;ms.meterStart=0;
    },
    stop(){ms.running=false;ms.pendingMeter=null;},
    setMeter(m){
      // mid-run, a meter change is a musical event: it lands on the NEXT bar
      // line, never mid-bar — the lamp and the clock must always agree. Beat
      // indices stay continuous (subscribers keep their join points); only the
      // bar/beat numbering rebases from the boundary where the change lands.
      if(ms.running&&ms.nextIdx>ms.meterStart){
        if(m===ms.meter)ms.pendingMeter=null; else ms.pendingMeter=m;
      }else{ms.meter=m;ms.meterStart=ms.nextIdx;}
    },
    setBpm(bpm){
      if(ms.running&&ms.nextIdx>0){
        // re-anchor so the next beat lands one new-spb after the last emitted beat:
        // tempo changes bend the grid forward, never tear it
        const last=ms.anchor+(ms.nextIdx-1)*spb();
        ms.bpm=bpm; ms.anchor=last-(ms.nextIdx-1)*(60/bpm);
      } else ms.bpm=bpm;
    },
    pump(now,ahead){
      if(!ms.running)return[];
      const out=[];
      while(ms.anchor+ms.nextIdx*spb()<now+ahead){
        const i=ms.nextIdx;
        if(ms.pendingMeter!==null&&i>ms.meterStart&&(i-ms.meterStart)%ms.meter===0){
          ms.meter=ms.pendingMeter;ms.pendingMeter=null;ms.meterStart=i;
        }
        ms.nextIdx++;
        const rel=i-ms.meterStart;
        const t=ms.anchor+i*spb(), bar=Math.floor(rel/ms.meter), beat=rel%ms.meter;
        out.push({time:t,index:i,bar,beat,sub:0});
        // the beat's sub events, at SUB_OFFSETS' fractions of THIS beat's
        // length: they carry the beat's index/bar/beat (they are not beats —
        // the index grid, joins and bar lines are untouched) and sub = 1..k
        subOffsets().forEach((o,k)=>out.push({time:t+o*spb(),index:i,bar,beat,sub:k+1}));
      }
      return out;
    },
    nextBarStartIndex(){
      const rel=ms.nextIdx-ms.meterStart;
      return rel%ms.meter===0?ms.nextIdx:ms.nextIdx+(ms.meter-rel%ms.meter);
    },
  };
}

export function createTapTempo(o={}){
  const maxGap=o.maxGap??2.5,win=o.window??4,taps=[];
  return(now)=>{
    if(taps.length&&now-taps[taps.length-1]>maxGap)taps.length=0;
    taps.push(now);
    if(taps.length<2)return null;
    const r=taps.slice(-win),iv=(r[r.length-1]-r[0])/(r.length-1);
    return Math.round(Math.min(300,Math.max(15,60/iv)));
  };
}

export const SUB_OFFSETS={1:[],2:[0.5],3:[1/3,2/3],4:[0.25,0.5,0.75]};
