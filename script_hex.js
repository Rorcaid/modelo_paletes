// Implementação mínima independente que desenha a palete usando empacotamento hexagonal.
// Expõe apenas fillPalHex() — não sobrescreve funções existentes em script.js.

function fillPalHex() {
  const canvas = document.getElementById('palCanvas');
  const ctx = canvas.getContext('2d');
  // limpa e desenha fundo/borda da palete (mesmo estilo do original)
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#FFFFF0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

  const shape = document.getElementById('shape').value;
  const allowExceed = document.getElementById('allowExceed').checked;
  let count = 0;
  let firstMeasurementDrawn = false;

  // Gerador de centros em embalagem hexagonal dentro de um rect
  // rect: {x,y,width,height}, d = spacing/diâmetro
  function generateHexCentersInRect(rect, d) {
    const r = d / 2;
    const step = Math.sqrt(3) * r; // passo hex entre filas/colunas

    function centerAndFilter(centers) {
      if (centers.length === 0) return centers;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      centers.forEach((c) => {
        if (c.x < minX) minX = c.x;
        if (c.x > maxX) maxX = c.x;
        if (c.y < minY) minY = c.y;
        if (c.y > maxY) maxY = c.y;
      });
      const dx = (rect.x + rect.width / 2) - (minX + maxX) / 2;
      const dy = (rect.y + rect.height / 2) - (minY + maxY) / 2;
      centers.forEach((c) => { c.x += dx; c.y += dy; });
      return centers.filter(
        (c) =>
          c.x - r >= rect.x - 1e-6 &&
          c.x + r <= rect.x + rect.width + 1e-6 &&
          c.y - r >= rect.y - 1e-6 &&
          c.y + r <= rect.y + rect.height + 1e-6,
      );
    }

    // Opção A: filas horizontais, offset alternado em x (hex standard)
    const centersA = [];
    let row = 0;
    for (let y = rect.y + r; y <= rect.y + rect.height - r + 1e-6; y += step, row++) {
      const shift = row % 2 === 1 ? d / 2 : 0;
      for (let x = rect.x + r + shift; x <= rect.x + rect.width - r + 1e-6; x += d) {
        centersA.push({ x, y });
      }
    }

    // Opção B: colunas verticais, offset alternado em y
    const centersB = [];
    let col = 0;
    for (let x = rect.x + r; x <= rect.x + rect.width - r + 1e-6; x += step, col++) {
      const shift = col % 2 === 1 ? d / 2 : 0;
      for (let y = rect.y + r + shift; y <= rect.y + rect.height - r + 1e-6; y += d) {
        centersB.push({ x, y });
      }
    }

    // Opção C: filas com spread máximo — permite círculos mais afastados entre si
    // (encontra arranjos como 2+1 ou 1+2 onde os círculos não se tocam mas cabem)
    function generateSpreadRows(W, H, swapped) {
      const maxN = Math.floor(W / d);
      if (maxN <= 0) return [];

      // x positions para n círculos espalhados da borda à borda
      function rowXs(n) {
        if (n <= 0) return null;
        if (n === 1) return [W / 2];
        const spacing = (W - d) / (n - 1);
        if (spacing < d - 1e-6) return null; // sobreposição
        const xs = [];
        for (let i = 0; i < n; i++) xs.push(r + i * spacing);
        return xs;
      }

      // y mínimo para a fila atual dadas as xs da fila anterior
      function minRowY(curXs, prevXs, prevY) {
        let minY = prevY + r;
        for (const xp of prevXs) {
          for (const xc of curXs) {
            const dx = Math.abs(xp - xc);
            if (dx < d - 1e-6) minY = Math.max(minY, prevY + Math.sqrt(d * d - dx * dx));
          }
        }
        return minY;
      }

      let best = [];
      for (let n0 = maxN; n0 >= 1; n0--) {
        const xs0 = rowXs(n0);
        if (!xs0) continue;
        const rows = [{ xs: xs0, y: r }];

        for (let level = 1; level <= 4; level++) {
          const prev = rows[level - 1];
          let nextRow = null;
          for (let n = maxN; n >= 1; n--) {
            const xs = rowXs(n);
            if (!xs) continue;
            const y = minRowY(xs, prev.xs, prev.y);
            if (y + r <= H + 1e-6) { nextRow = { xs, y }; break; }
          }
          if (!nextRow) break;
          rows.push(nextRow);
        }

        const total = rows.reduce((s, row) => s + row.xs.length, 0);
        if (total > best.length) {
          best = rows.flatMap(row =>
            swapped
              ? row.xs.map(x => ({ x: row.y, y: x }))
              : row.xs.map(x => ({ x, y: row.y }))
          );
        }
      }
      return best;
    }

    const centersC = generateSpreadRows(rect.width, rect.height, false).map(c => ({
      x: c.x + rect.x, y: c.y + rect.y,
    }));
    const centersD = generateSpreadRows(rect.height, rect.width, true).map(c => ({
      x: c.x + rect.x, y: c.y + rect.y,
    }));

    // Opção E: filas iguais com offset geral — cobre arranjos como 2+2, 4+4+4, 3+3+3+3, etc.
    // Para cada (n colunas, m filas) calcula o offset t mínimo tal que:
    //   • as m filas cabem na altura H  →  dy = (H-2r)/(m-1),  t = sqrt(d²-dy²)
    //   • as duas filas alternadas cabem na largura W  →  t ≤ W-2r-(n-1)*d
    //   • filas de mesma paridade (afastadas 2·dy) não se sobrepõem  →  2·dy ≥ d  (m>2)
    function generateEqualRowsGeneral(W, H, swapped) {
      let best = [];
      const maxN = Math.floor((W - 2 * r) / d) + 1;
      const maxM = Math.floor(H / (d / 2)) + 1;

      for (let m = maxM; m >= 1; m--) {
        for (let n = maxN; n >= 1; n--) {
          if (n * m <= best.length) continue;
          if ((n - 1) * d > W - 2 * r + 1e-6) continue;

          let t, dy;
          if (m === 1) {
            t = 0;
            dy = 0;
          } else {
            const dy_avail = (H - 2 * r) / (m - 1);
            if (dy_avail < 0) continue;
            // filas de mesma paridade estão 2·dy afastadas (mesmo x) — não podem sobrepor
            if (m > 2 && 2 * dy_avail < d - 1e-6) continue;
            if (dy_avail >= d) {
              // filas suficientemente afastadas: sem necessidade de offset horizontal
              t = 0;
              dy = dy_avail;
            } else {
              // offset mínimo para círculos adjacentes entre filas apenas se tocarem
              t = Math.sqrt(Math.max(0, d * d - dy_avail * dy_avail));
              dy = dy_avail;
              const t_max = W - 2 * r - (n - 1) * d;
              if (t > t_max + 1e-6) continue;
            }
          }

          // centrar o bbox total: fila par começa em a, fila ímpar em a+t
          const a = W / 2 - ((n - 1) * d + t) / 2;

          const centers = [];
          for (let row = 0; row < m; row++) {
            const xOff = row % 2 === 0 ? 0 : t;
            const row_y = r + row * dy;
            for (let col = 0; col < n; col++) {
              const col_x = a + xOff + col * d;
              centers.push(swapped
                ? { x: row_y + rect.x, y: col_x + rect.y }
                : { x: col_x + rect.x, y: row_y + rect.y });
            }
          }
          if (centers.length > best.length) best = centers;
        }
      }
      return best;
    }

    const centersE = generateEqualRowsGeneral(rect.width, rect.height, false);
    const centersF = generateEqualRowsGeneral(rect.height, rect.width, true);

    const candidates = [centersA, centersB, centersC, centersD, centersE, centersF]
      .map(cs => centerAndFilter(cs.map(c => ({ x: c.x, y: c.y }))));
    return candidates.reduce((a, b) => a.length >= b.length ? a : b);
  }

  // Gerador retangular centrado na área (garante espaçamento vertical = spacingH, evita sobreposição de elipses altas)
  function generateRectCentersInRect(rect, spacingW, spacingH) {
    const cols = Math.floor(rect.width / spacingW);
    const rows = Math.floor(rect.height / spacingH);
    if (cols <= 0 || rows <= 0) return [];
    const offsetX = rect.x + (rect.width - cols * spacingW) / 2;
    const offsetY = rect.y + (rect.height - rows * spacingH) / 2;
    const centers = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = offsetX + c * spacingW + spacingW / 2;
        const y = offsetY + r * spacingH + spacingH / 2;
        centers.push({ x, y });
      }
    }
    return centers;
  }

  // Distribui totalN centros em 'rows' linhas, centrando cada linha horizontalmente,
  // com no máximo colsPerRow centros por linha (colsPerRow normalmente colsUpright).
  function generateDistributedRowCenters(
    rect,
    spacingW,
    spacingH,
    rows,
    colsPerRow,
    totalN,
  ) {
    if (rows <= 0 || colsPerRow <= 0 || totalN <= 0) return [];
    const allocation = new Array(rows).fill(0);
    // distribuir totalN pelas rows: primeiras recebem 1 extra se necessário
    for (let i = 0; i < totalN; i++) allocation[i % rows]++;

    // garantir que nenhuma linha excede colsPerRow (corte se necessário)
    let assigned = allocation.reduce((s, v) => s + Math.min(v, colsPerRow), 0);
    // se cortamos, reduzir linhas adicionais a zero até assigned == totalN (rare)
    // aqui apenas garante segurança
    for (let r = 0; r < rows && assigned > totalN; r++) {
      const cut = Math.min(allocation[r], assigned - totalN);
      allocation[r] -= cut;
      assigned -= cut;
    }

    const centers = [];
    for (let r = 0; r < rows; r++) {
      const m = Math.min(allocation[r], colsPerRow);
      if (m <= 0) continue;
      // y para a linha r (mantém o espaçamento vertical regular)
      const y = rect.y + r * spacingH + spacingH / 2;
      // centro horizontal da linha
      const lineWidth = m * spacingW;
      const startX = rect.x + (rect.width - lineWidth) / 2 + spacingW / 2;
      for (let c = 0; c < m; c++) {
        const x = startX + c * spacingW;
        centers.push({ x, y });
      }
    }
    return centers;
  }

  if (shape === 'circle') {
    const diameter = parseInt(document.getElementById('diameter').value, 10);
    if (diameter <= 0 || isNaN(diameter)) return alert('Diâmetro inválido.');
    const d = diameter;
    // para círculo usamos toda a área da palete
    const rect = { x: 0, y: 0, width: canvas.width, height: canvas.height };
    const centers = generateHexCentersInRect(rect, d);
    const r = d / 2;
    centers.forEach((c) => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#7FB3D5';
      ctx.fill();
      ctx.stroke();
      if (!firstMeasurementDrawn) {
        drawBobineMeasurements(ctx, c.x, c.y, diameter, diameter, 'circle');
        firstMeasurementDrawn = true;
      }
      count++;
    });
  } else if (shape === 'cylinder') {
    const cylWidth = parseInt(document.getElementById('cylWidth').value, 10);
    const cylHeight = parseInt(document.getElementById('cylHeight').value, 10);
    if (cylWidth <= 0 || cylHeight <= 0 || isNaN(cylWidth) || isNaN(cylHeight))
      return alert('Dimensões inválidas.');

    // mantenho a mesma lógica do original para contar/cortar áreas:
    const spacingW = cylWidth;
    const spacingH = cylHeight;
    const { count: colsUpright, offset: offsetX } = calculateAdjustedOffset(
      canvas.width,
      spacingW,
      allowExceed,
    );
    const { count: rowsUpright, offset: offsetYCentered } =
      calculateAdjustedOffset(canvas.height, spacingH, allowExceed);

    const spacingRotW = cylHeight;
    const spacingRotH = cylWidth;
    const remainingHeight = canvas.height - rowsUpright * spacingH;
    const { count: rowsRotated } = calculateAdjustedOffset(
      remainingHeight,
      spacingRotH,
      allowExceed,
    );
    const { count: colsRotated, offset: offsetXRot } = calculateAdjustedOffset(
      canvas.width,
      spacingRotW,
      allowExceed,
    );

    // decidir alinhamento como na versão linear: se houver rotacionadas top-align upright, senão center
    const offsetY = rowsRotated > 0 ? 0 : offsetYCentered;

    // área para upright (onde desenharemos)
    const uprightRect = {
      x: 0,
      y: offsetY,
      width: canvas.width,
      height: rowsUpright * spacingH,
    };

    // Primeiro tenta gerar centros por hex para obter N desejado (mantém consistência com hex count)
    const hexCentersUpright = generateHexCentersInRect(uprightRect, spacingW);
    const desiredN = hexCentersUpright.length;

    // Se a altura da elipse (cylHeight) é maior do que o passo vertical do hex (causa sobreposição),
    // reorganiza em linhas retangulares distribuindo 'desiredN' entre as linhas (ex.: 4 acima, 3 abaixo).
    const hexVStepForUpright = (Math.sqrt(3) / 2) * spacingW; // 0.866 * spacingW
    let centersUpright = [];
    if (cylHeight > hexVStepForUpright + 1e-6 && rowsUpright >= 1) {
      // distribuir desiredN por rowsUpright linhas, centrando cada linha horizontalmente
      centersUpright = generateDistributedRowCenters(
        uprightRect,
        spacingW,
        spacingH,
        rowsUpright,
        colsUpright,
        desiredN,
      );
    } else {
      centersUpright = hexCentersUpright;
    }

    // Rotated area: decide similarmente se usar hex ou retangular (verifica overlap potencial)
    const hexVStepForRot = (Math.sqrt(3) / 2) * spacingRotW; // vertical step if hex with d=spacingRotW
    const offsetYRot =
      rowsUpright * spacingH +
      Math.max(0, remainingHeight - rowsRotated * spacingRotH);
    const rotRect = {
      x: 0,
      y: offsetYRot,
      width: canvas.width,
      height: rowsRotated * spacingRotH,
    };
    let centersRot = [];
    // primeira tentativa hex to get desired count for rotated
    const hexCentersRot = generateHexCentersInRect(rotRect, spacingRotW);
    const desiredNRot = hexCentersRot.length;
    if (cylWidth > hexVStepForRot + 1e-6 && rowsRotated >= 1) {
      centersRot = generateDistributedRowCenters(
        rotRect,
        spacingRotW,
        spacingRotH,
        rowsRotated,
        colsRotated,
        desiredNRot,
      );
    } else {
      centersRot = hexCentersRot;
    }

    // --- overlap detection: se hex gerou sobreposições, fallback para layout linear (fillPal)
    function overlapsAny(listA, rA, listB, rB) {
      for (let i = 0; i < listA.length; i++) {
        for (let j = 0; j < listB.length; j++) {
          const dx = listA[i].x - listB[j].x;
          const dy = listA[i].y - listB[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < rA + rB - 1e-6) return true;
        }
      }
      return false;
    }
    const rU = Math.max(cylWidth / 2, cylHeight / 2); // conservativo
    const rR = Math.max(cylHeight / 2, cylWidth / 2);
    // verificar intra-lista (upright-upright) e inter-lista (upright-rotated) e rotated-rotated
    let bad = false;
    for (let i = 0; i < centersUpright.length && !bad; i++) {
      for (let j = i + 1; j < centersUpright.length; j++) {
        if (
          Math.hypot(
            centersUpright[i].x - centersUpright[j].x,
            centersUpright[i].y - centersUpright[j].y,
          ) <
          rU + rU - 1e-6
        ) {
          bad = true;
          break;
        }
      }
    }
    if (!bad) bad = overlapsAny(centersUpright, rU, centersRot, rR);
    if (!bad) {
      for (let i = 0; i < centersRot.length && !bad; i++) {
        for (let j = i + 1; j < centersRot.length; j++) {
          if (
            Math.hypot(
              centersRot[i].x - centersRot[j].x,
              centersRot[i].y - centersRot[j].y,
            ) <
            rR + rR - 1e-6
          ) {
            bad = true;
            break;
          }
        }
      }
    }
    if (bad) {
      // fallback: desenhar exactamente como a disposição linear original
      if (typeof fillPal === 'function') {
        return fillPal();
      }
    }

    // desenha elipses upright (centros calculados)
    centersUpright.forEach((c) => {
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, cylWidth / 2, cylHeight / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#F5B041';
      ctx.fill();
      ctx.stroke();
      if (!firstMeasurementDrawn) {
        drawBobineMeasurements(ctx, c.x, c.y, cylWidth, cylHeight, 'cylinder');
        firstMeasurementDrawn = true;
      }
      count++;
    });

    centersRot.forEach((c) => {
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, cylHeight / 2, cylWidth / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#F8C471';
      ctx.fill();
      ctx.stroke();
      if (!firstMeasurementDrawn) {
        drawBobineMeasurements(ctx, c.x, c.y, cylWidth, cylHeight, 'cylinder');
        firstMeasurementDrawn = true;
      }
      count++;
    });
  }

  // desenha linhas de medida com as dimensões da paleta
  drawPaletMeasurements(canvas, ctx);

  document.getElementById('bobCount').textContent = count;
}
