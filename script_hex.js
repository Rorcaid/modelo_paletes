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

    // Opção E: filas iguais com espaçamento óptimo — encontra arranjos como 2+2
    // onde o hex standard não cabe centrado mas um S ligeiramente maior cabe
    function generateEqualRowsOptimal(W, H, swapped) {
      const maxN = Math.floor(W / d);
      let best = [];
      for (let n = maxN; n >= 1; n--) {
        // Bounding box das 2 filas (fila 0: n círculos; fila 1 offset: n círculos)
        // x1 = W/2 - (2n-1)*S/4   (centra o bbox)
        // Restrição altura: sqrt(d²-(S/2)²) ≤ H-2r  →  S ≥ 2*sqrt(d²-(H-2r)²)
        const H_slack = H - 2 * r;
        const S_min_h = H_slack >= d ? 0 : 2 * Math.sqrt(d * d - H_slack * H_slack);
        const S_min = Math.max(d, S_min_h); // não pode sobrepor dentro da fila
        // Restrição largura: x1 ≥ r  →  S ≤ 4*(W/2-r)/(2n-1)
        const S_max = 4 * (W / 2 - r) / (2 * n - 1);
        if (S_min > S_max + 1e-6) continue;

        const S = S_min;
        const x1 = W / 2 - (2 * n - 1) * S / 4;
        const dy = Math.sqrt(Math.max(0, d * d - (S / 2) * (S / 2)));

        const centers = [];
        let y = r;
        let parity = 0;
        while (y + r <= H + 1e-6) {
          const xOff = parity === 1 ? S / 2 : 0;
          for (let i = 0; i < n; i++) {
            centers.push(swapped
              ? { x: y, y: x1 + xOff + i * S }
              : { x: x1 + xOff + i * S, y });
          }
          y += dy > 1e-6 ? dy : H + 1; // evita loop infinito
          parity = 1 - parity;
        }
        if (centers.length > best.length) best = centers;
      }
      return best.map(c => ({ x: c.x + rect.x, y: c.y + rect.y }));
    }

    const centersE = generateEqualRowsOptimal(rect.width, rect.height, false);
    const centersF = generateEqualRowsOptimal(rect.height, rect.width, true);

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
