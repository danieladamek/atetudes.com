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
  const ms={bpm:opts.bpm??72,meter:opts.meter??4,running:false,anchor:0,nextIdx:0,
    meterStart:0,pendingMeter:null};
  const spb=()=>60/ms.bpm;
  return {
    get running(){return ms.running;}, get bpm(){return ms.bpm;}, get meter(){return ms.meter;},
    get pendingMeter(){return ms.pendingMeter;},
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
        out.push({time:ms.anchor+i*spb(),index:i,
          bar:Math.floor(rel/ms.meter),beat:rel%ms.meter});
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
