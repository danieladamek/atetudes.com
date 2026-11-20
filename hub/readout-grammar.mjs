/* readout-grammar.mjs — THE READOUT'S TYPE, stated once (moved verbatim from hub/tools/build.mjs's READOUT_GRAMMAR on
 * 261119, shell 1.0.0). The door build ships it only to a door that reaches the readout helper, which is why it is its
 * own file and not part of card-shell.mjs: card-shell is inlined into every door, and these tokens must stay out of the
 * doors that prune the readout. RiffRaft takes it from the shell bundle (hub/tools/vendor.mjs, the shell kind).
 *
 *   .readhead   the header row: title · box · spacer · (a board's mini, in flow)
 *   .readbox    the box; .readtext the inner ellipsis span; .readdot the root's
 *               degree colour from the one palette; .readchord / .readmode
 * The 66px is the band the shell's ⓘ and ▾ occupy at the header's right. At phone width the header wraps (night 63).
 */
export const READOUT_CSS = `
.board .bh.readhead{gap:10px;min-width:0;justify-content:flex-start;padding-right:66px}
.board .bh.readhead>span:first-child{flex:0 0 auto}
.headspace{flex:1 1 0;min-width:0}
.readbox{flex:0 1 auto;min-width:0;max-width:100%;
  border:1px solid var(--edge);border-radius:8px;background:#fff;padding:3px 12px;
  font-size:15px;font-weight:bold;color:var(--ink);letter-spacing:0;text-transform:none;
  white-space:nowrap;overflow:hidden;line-height:1.3}
.readbox .readtext{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.readbox .readchord{color:var(--ink)}
.readbox .readdot{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:7px;vertical-align:-1px}
.readbox .readmode{font-weight:600}
@media (max-width:480px){
  /* NIGHT 63 (261014d — measured): with repeat the mini is five buttons, 158 px, and a readout sharing its row
   * at 390 shrank to 98 px and ellipsised the CHORD ("Bbm…") on the staff and the keys — the shrink night 62
   * refused for the neck; and a fixed grid cannot serve all three boards, because the staff's long title
   * ("The étude — end to end") leaves a shared row 93 px for the box. So the header WRAPS: the box stays beside
   * its title where it has room (at least 140 px — the neck, the keys) and drops to a full row of its own where
   * it has not (the staff); the mini ALWAYS takes a full row below — stack, do not shrink, derived from the
   * content, never a per-board rule. */
  .board .bh.readhead{display:flex!important;flex-wrap:wrap;align-items:center}
  .board .bh.readhead .headspace{display:none}
  .board .bh.readhead .readbox{flex:1 1 140px}
  /* right, as at every width (injection 261015): margin-left:auto seats the mini at the row's right whatever its
   * width — a board's own #xxMini{flex:0 0 auto} (an id) out-ranks a class rule's basis, so a full-row basis
   * could not be relied on; at 390 no five-button mini fits beside a 140 px box, so it wraps to its own row */
  .board .bh.readhead .mini{flex:0 0 auto;margin-left:auto;margin-top:4px}
}
.clpsd>.bh.readhead .mini{display:none!important}
`;
