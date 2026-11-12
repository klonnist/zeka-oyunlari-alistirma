// "Gelişimim" sayfası: prova geçmişi, grafik, karşılaştırma, tür bazında başarı
import { compareExams, fmtMs, levelOf, BADGES } from './profile.js?v=6';

const KIND = { okul: 'Okul İçi', final: 'Final' };
const dt = (t) => new Date(t).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }) + ' ' + new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
const dshort = (t) => new Date(t).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });

// Doğru / yanlış / boş çubukları + süre çizgisi (satır içi SVG)
export function examChart(exams) {
  const list = exams.slice(-12);
  if (!list.length) return '';
  const W = 640, H = 260, L = 34, R = 40, T = 16, B = 40;
  const maxN = Math.max(...list.map((e) => e.total || e.correct + e.wrong + e.empty), 1);
  const maxM = Math.max(...list.map((e) => e.ms / 60000), 1);
  const slot = (W - L - R) / list.length, bw = Math.min(16, slot / 4);
  const y = (v) => T + (H - T - B) * (1 - v / maxN);
  const ym = (m) => T + (H - T - B) * (1 - m / maxM);
  const out = [`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Prova sonuçları grafiği">`];
  for (let k = 0; k <= 4; k++) {
    const v = Math.round((maxN * k) / 4), yy = y(v);
    out.push(`<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" stroke="#ece8f7"/><text x="${L - 6}" y="${yy + 4}" class="ax" text-anchor="end">${v}</text>`);
  }
  out.push(`<text x="${W - R + 6}" y="${T + 4}" class="ax">${Math.round(maxM)} dk</text><text x="${W - R + 6}" y="${H - B}" class="ax">0</text>`);
  const pts = [];
  list.forEach((e, i) => {
    const cx = L + slot * i + slot / 2;
    [['correct', '#2a9d8f'], ['wrong', '#e4572e'], ['empty', '#b8bfcc']].forEach(([k, col], j) => {
      const v = e[k] || 0, x = cx + (j - 1.5) * bw - 1 + j * 1;
      out.push(`<rect class="bar" x="${x}" y="${y(v)}" width="${bw}" height="${Math.max(0, H - B - y(v))}" rx="3" fill="${col}" style="animation-delay:${i * 0.05}s"><title>${KIND[e.kind]} ${dshort(e.t)}: ${v} ${k === 'correct' ? 'doğru' : k === 'wrong' ? 'yanlış' : 'boş'}</title></rect>`);
    });
    out.push(`<text x="${cx}" y="${H - B + 16}" class="ax" text-anchor="middle">${dshort(e.t)}</text><text x="${cx}" y="${H - B + 30}" class="ax small" text-anchor="middle">${e.kind === 'final' ? 'F' : 'O'}·${e.level === 'orta' ? 'orta' : 'kolay'}</text>`);
    pts.push([cx, ym(e.ms / 60000), e]);
  });
  if (pts.length > 1) out.push(`<polyline points="${pts.map(([a, b]) => a + ',' + b).join(' ')}" fill="none" stroke="#5b4bdb" stroke-width="2.5" stroke-dasharray="6 4"/>`);
  for (const [a, b, e] of pts) out.push(`<circle cx="${a}" cy="${b}" r="5" fill="#fff" stroke="#5b4bdb" stroke-width="2.5"><title>Süre: ${fmtMs(e.ms)}</title></circle>`);
  out.push('</svg>');
  return out.join('') + `<div class="legend"><span><i style="background:#2a9d8f"></i>Doğru</span><span><i style="background:#e4572e"></i>Yanlış</span><span><i style="background:#b8bfcc"></i>Boş</span><span><i class="line"></i>Süre (dk)</span></div>`;
}

export function compareHtml(cur, other, label) {
  const c = compareExams(cur, other);
  if (!c) return '';
  return `<div class="cmp"><b>${label}</b> <small>(${dshort(other.t)}: ${other.correct}/${other.total}, ${fmtMs(other.ms)})</small><div class="chips">${c.parts.map((p) => `<span class="chip ${p.good === true ? 'up' : p.good === false ? 'down' : ''}">${p.text}</span>`).join('')}</div></div>`;
}

// Tür bazında başarı: prova soruları + alıştırma (ilk denemede doğru)
export function typeStats(hist, GAMES) {
  const st = Object.fromEntries(GAMES.map((g) => [g.id, { n: 0, ok: 0, ms: 0, msn: 0 }]));
  for (const e of hist.exams) for (const it of e.items || []) { if (!st[it.id] || it.spare) continue; st[it.id].n++; if (it.ok) st[it.id].ok++; }
  for (const x of hist.practice) { const s = st[x.id]; if (!s) continue; s.n++; if (x.ok1 && !x.sol) s.ok++; if (x.ms) { s.ms += x.ms; s.msn++; } }
  return GAMES.map((g) => ({ g, ...st[g.id], pct: st[g.id].n ? Math.round((st[g.id].ok / st[g.id].n) * 100) : null, avg: st[g.id].msn ? st[g.id].ms / st[g.id].msn : null }));
}

export function renderHistory(root, prof, { GAMES, byId, esc }, filter = 'hepsi') {
  const p = prof.get(), h = prof.hist();
  const lv = levelOf(p.xp);
  const exams = h.exams.filter((e) => filter === 'hepsi' || e.kind === filter);
  const last = exams[exams.length - 1];
  const prev = last ? exams.slice(0, -1).filter((e) => e.kind === last.kind).pop() : null;
  const best = last ? exams.filter((e) => e.kind === last.kind && e !== last).sort((a, b) => b.correct - a.correct || a.ms - b.ms)[0] : null;
  const bestAll = (k) => h.exams.filter((e) => e.kind === k).sort((a, b) => b.correct - a.correct)[0];
  const solvedPr = h.practice.length;
  const okPr = h.practice.filter((x) => x.ok1 && !x.sol).length;
  const avgPr = h.practice.filter((x) => x.ms).reduce((s, x, _, a) => s + x.ms / a.length, 0);
  const stats = typeStats(h, GAMES);
  const weak = stats.filter((s) => s.n >= 2).sort((a, b) => a.pct - b.pct).slice(0, 3);

  root.innerHTML = `
    <h1 class="gtitle">📈 ${p.name ? esc(p.name) + ' — ' : ''}Gelişimim</h1>
    <div class="stats">
      <div class="stat"><b>${lv.icon} ${lv.name}</b><span>${p.xp} puan</span></div>
      <div class="stat"><b>${h.exams.length}</b><span>prova</span></div>
      <div class="stat"><b>${bestAll('okul') ? bestAll('okul').correct + '/' + bestAll('okul').total : '—'}</b><span>en iyi okul içi</span></div>
      <div class="stat"><b>${bestAll('final') ? bestAll('final').correct + '/' + bestAll('final').total : '—'}</b><span>en iyi final</span></div>
      <div class="stat"><b>${solvedPr}</b><span>alıştırma sorusu</span></div>
      <div class="stat"><b>${solvedPr ? Math.round((okPr / solvedPr) * 100) + '%' : '—'}</b><span>ilk denemede doğru</span></div>
      <div class="stat"><b>${avgPr ? fmtMs(avgPr) : '—'}</b><span>ortalama çözüm süresi</span></div>
      <div class="stat"><b>🔥 ${p.streak?.count || 0}</b><span>gün serisi (en iyi ${p.streak?.best || 0})</span></div>
    </div>

    <section class="panel">
      <div class="phead"><h2>🏁 Prova sonuçları</h2>
        <div class="seg">${['hepsi', 'okul', 'final'].map((k) => `<button data-f="${k}" class="${k === filter ? 'on' : ''}">${k === 'hepsi' ? 'Hepsi' : KIND[k]}</button>`).join('')}</div>
      </div>
      ${exams.length ? examChart(exams) : '<p class="muted">Henüz prova yok. Bir <a href="#/prova/okul">Okul İçi provası</a> bitirince sonuçların burada görünecek.</p>'}
      ${last ? `<div class="cmpbox"><div class="cmphead">Son prova (${KIND[last.kind]}, ${dt(last.t)}): <b>${last.correct}/${last.total}</b> doğru, ${fmtMs(last.ms)}</div>
        ${prev ? compareHtml(last, prev, 'Bir önceki provaya göre:') : '<p class="muted">Karşılaştırma için aynı türden bir prova daha bitir.</p>'}
        ${best && best !== prev ? compareHtml(last, best, 'En iyi provana göre:') : ''}</div>` : ''}
      ${exams.length ? `<div class="tablewrap"><table class="htable"><thead><tr><th>Tarih</th><th>Prova</th><th>Seviye</th><th>✅</th><th>❌</th><th>⬜</th><th>Süre</th><th>%</th></tr></thead><tbody>
        ${exams.slice().reverse().map((e, i) => `<tr data-x="${exams.length - 1 - i}" tabindex="0"><td>${dt(e.t)}</td><td>${KIND[e.kind]}</td><td>${e.level === 'orta' ? 'Orta' : 'Kolay'}</td><td class="g">${e.correct}</td><td class="r">${e.wrong}</td><td>${e.empty}</td><td>${fmtMs(e.ms)}</td><td><b>${e.total ? Math.round((e.correct / e.total) * 100) : 0}</b></td></tr>
          <tr class="detail" hidden><td colspan="8">${(e.items || []).filter((x) => !x.spare).map((x) => `<span class="chip ${x.ok ? 'up' : x.ans ? 'down' : ''}">${byId[x.id]?.icon || ''} ${byId[x.id]?.name || x.id}</span>`).join('')}</td></tr>`).join('')}
      </tbody></table><p class="muted small">Bir satıra dokun: o provada hangi türleri bildiğini gör.</p></div>` : ''}
    </section>

    <section class="panel">
      <h2>🧩 Oyun türlerine göre başarı</h2>
      ${weak.length ? `<div class="weak">Bunlara biraz daha çalışalım: ${weak.map((s) => `<a class="chip down" href="#/ders/${s.g.id}">${s.g.icon} ${s.g.name} (%${s.pct})</a>`).join('')}</div>` : ''}
      <div class="tstats">${stats.map((s) => `<div class="trow"><span class="tname">${s.g.icon} ${s.g.name}</span>
        <span class="tbar"><i style="width:${s.pct ?? 0}%;background:${s.pct == null ? '#ddd' : s.pct >= 75 ? '#2a9d8f' : s.pct >= 50 ? '#ffbe0b' : '#e4572e'}"></i></span>
        <span class="tval">${s.pct == null ? '—' : '%' + s.pct}</span><span class="tval muted">${s.avg ? fmtMs(s.avg) : ''}</span></div>`).join('')}</div>
      <p class="muted small">Yüzde: provalarda doğru cevaplar + alıştırmada ilk denemede bilinen sorular. Süre: alıştırmada ortalama çözüm süresi.</p>
    </section>

    <section class="panel">
      <h2>🏅 Rozetler <small class="muted">${Object.keys(p.badges).length}/${BADGES.length}</small></h2>
      <div class="badges">${BADGES.map((b) => `<div class="badge ${p.badges[b.id] ? 'got' : ''}" title="${esc(b.desc)}"><span>${b.icon}</span><b>${b.name}</b><small>${b.desc}</small></div>`).join('')}</div>
    </section>

    <section class="panel">
      <h2>💾 Yedekle / taşı</h2>
      <p class="muted">Sonuçlar bu cihazda saklanır. Başka cihaza taşımak için yedeği indir, diğer cihazda “Yedeği yükle” ile aç.</p>
      <div class="actions left"><button class="btn" data-a="export">⬇ Yedeği indir</button><label class="btn ghost">⬆ Yedeği yükle<input type="file" accept="application/json,.json" hidden data-a="import"></label><button class="btn ghost danger" data-a="reset">🗑 Her şeyi sil</button></div>
    </section>`;

  root.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => renderHistory(root, prof, { GAMES, byId, esc }, b.dataset.f)));
  root.querySelectorAll('tr[data-x]').forEach((tr) => {
    const tog = () => { const d = tr.nextElementSibling; d.hidden = !d.hidden; tr.classList.toggle('open', !d.hidden); };
    tr.addEventListener('click', tog);
    tr.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); tog(); } });
  });
  root.querySelector('[data-a="export"]').addEventListener('click', () => {
    const blob = new Blob([prof.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `zeka-oyunlari-yedek-${(p.name || 'cocuk').replace(/[^\p{L}\p{N}]+/gu, '-')}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  root.querySelector('[data-a="import"]').addEventListener('change', async (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    try {
      const text = await f.text();
      if (!confirm('Yedek yüklenirse bu cihazdaki mevcut sonuçların yerine geçer. Devam edilsin mi?')) return;
      prof.importJSON(text);
      alert('Yedek yüklendi.');
      renderHistory(root, prof, { GAMES, byId, esc }, 'hepsi');
    } catch (e) { alert('Yedek yüklenemedi: ' + e.message); }
  });
  root.querySelector('[data-a="reset"]').addEventListener('click', () => {
    if (!confirm('İsim, puanlar, rozetler ve bütün geçmiş bu cihazdan silinecek. Bu geri alınamaz. Emin misin?')) return;
    prof.resetAll();
    location.hash = '#/';
    location.reload();
  });
}
