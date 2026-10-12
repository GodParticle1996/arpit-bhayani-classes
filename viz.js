/* =====================================================================
   Arpit Bhayani Classes — service diagram (SVG) helper
   dryrun aur flowlab dono isi se diagram banate hain.

   nodes : [{ id, label, icon, x, y, kind? }]   (viewBox 1000 × 520, x/y = centre)
   edges : [{ from, to }]                        (hamesha dikhne wali patli lines)
   state : { nodes: { id: { tone, badge } },
             flows: [{ from, to, label, tone, rate?, back? }] }

   tone: ok | slow | bad | busy | idle | new | acc
   Poori file IIFE mein — games.js ke top-level `const el` se takraav na ho.
   ===================================================================== */
(function () {
  const W = 1000, H = 520, NW = 190, NH = 70;
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function byId(nodes) {
    const m = {};
    nodes.forEach(n => { m[n.id] = n; });
    return m;
  }

  /* box ki chaudai label ki lambai se — "khanakart-core" jaisa naam bahar na nikle */
  function widthOf(n) {
    return Math.max(NW, Math.round(84 + String(n.label || '').length * 12.8));
  }

  /* line ko box ki deewar par khatam karo, centre par nahi — arrow saaf dikhe */
  function clip(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const edge = n => {
      const sx = dx === 0 ? Infinity : (widthOf(n) / 2 + 6) / Math.abs(dx);
      const sy = dy === 0 ? Infinity : (NH / 2 + 6) / Math.abs(dy);
      return Math.min(sx, sy, 0.45);
    };
    const sa = edge(a), sb = edge(b);
    return { x1: a.x + dx * sa, y1: a.y + dy * sa, x2: b.x - dx * sb, y2: b.y - dy * sb };
  }

  AB.viz = {
    W, H,
    svg(nodes, edges, state) {
      state = state || {};
      const map = byId(nodes);
      const ns = state.nodes || {};
      let out = `<svg class="ms-svg" viewBox="0 0 ${W} ${H}" role="img">
        <defs>
          <marker id="ah-ok" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ah ok"/></marker>
          <marker id="ah-bad" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ah bad"/></marker>
          <marker id="ah-slow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ah slow"/></marker>
          <marker id="ah-acc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ah acc"/></marker>
        </defs>`;

      (edges || []).forEach(e => {
        const a = map[e.from], b = map[e.to];
        if (!a || !b) return;
        const c = clip(a, b);
        out += `<line class="ms-edge${e.dashed ? ' dashed' : ''}" x1="${c.x1}" y1="${c.y1}" x2="${c.x2}" y2="${c.y2}"/>`;
      });

      const labels = [];
      (state.flows || []).forEach((f, i) => {
        const a = map[f.from], b = map[f.to];
        if (!a || !b) return;
        const tone = f.tone || 'acc';
        const off = f.back ? 12 : (f.offset || 0);
        const c = clip(a, b);
        const len = Math.hypot(c.x2 - c.x1, c.y2 - c.y1) || 1;
        const nx = -(c.y2 - c.y1) / len * off, ny = (c.x2 - c.x1) / len * off;
        const x1 = c.x1 + nx, y1 = c.y1 + ny, x2 = c.x2 + nx, y2 = c.y2 + ny;
        const rate = f.rate == null ? 0.6 : Math.max(0.05, Math.min(1, f.rate));
        const dur = (2.4 - rate * 1.8).toFixed(2);
        out += `<line class="ms-flow ${tone}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#ah-${tone === 'ok' || tone === 'bad' || tone === 'slow' ? tone : 'acc'})" style="animation-duration:${dur}s"/>`;
        if (f.label) {
          const segLen = Math.hypot(x2 - x1, y2 - y1);
          const w = Math.min(420, 20 + String(f.label).length * 10.2);
          /* chhoti arrow par label arrow ke upar uthao, warna node ke neeche chhup jaata hai */
          const lift = segLen < w + 20 ? 44 : 8;
          const mx = (x1 + x2) / 2 + nx * 1.4, my = (y1 + y2) / 2 + ny * 1.4 - lift;
          labels.push(`<g class="ms-flabel ${tone}"><rect x="${mx - w / 2}" y="${my - 17}" width="${w}" height="30" rx="8"/><text x="${mx}" y="${my + 4}">${esc(f.label)}</text></g>`);
        }
      });

      nodes.forEach(n => {
        const st = ns[n.id] || {};
        const tone = st.tone || n.tone || 'idle';
        const nw = widthOf(n);
        const x = n.x - nw / 2, y = n.y - NH / 2;
        out += `<g class="ms-node ${tone}${n.kind ? ' k-' + n.kind : ''}" data-id="${esc(n.id)}">
          <rect x="${x}" y="${y}" width="${nw}" height="${NH}" rx="${n.kind === 'db' || n.kind === 'queue' ? 24 : 12}"/>
          <text class="ms-ico" x="${x + 30}" y="${n.y + 10}">${esc(n.icon || '📦')}</text>
          <text class="ms-lbl" x="${x + 56}" y="${n.y + 8}">${esc(n.label)}</text>`;
        if (st.badge != null && st.badge !== '') {
          const bw = Math.min(360, 24 + String(st.badge).length * 9.2);
          out += `<g class="ms-badge ${tone}"><rect x="${n.x - bw / 2}" y="${n.y + NH / 2 + 6}" width="${bw}" height="28" rx="14"/><text x="${n.x}" y="${n.y + NH / 2 + 26}">${esc(st.badge)}</text></g>`;
        }
        out += `</g>`;
      });
      /* labels sabse aakhir mein — koi node unhe na dhake */
      return out + labels.join('') + '</svg>';
    },
  };
})();
