// Implementação mínima independente que desenha a palete usando empacotamento hexagonal.
// Expõe apenas fillPalHex() — não sobrescreve funções existentes em script.js.

function fillPalHex() {
  const canvas = document.getElementById("palCanvas");
  const ctx = canvas.getContext("2d");
  // limpa e desenha fundo/borda da palete (mesmo estilo do original)
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#FFFFF0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

  const shape = document.getElementById("shape").value;
  const allowExceed = document.getElementById("allowExceed").checked;
  let count = 0;

  // Gerador de centros em embalagem hexagonal dentro de um rect
  // rect: {x,y,width,height}, d = spacing/diâmetro
  function generateHexCentersInRect(rect, d) {
    const r = d / 2;
    const vStep = Math.sqrt(3) * r; // vertical spacing between rows
    const centers = [];
    // primeira linha y começando em rect.y + r
    let row = 0;
    for (let y = rect.y + r; y <= rect.y + rect.height - r + 1e-6; y += vStep, row++) {
      const shift = (row % 2 === 1) ? d / 2 : 0;
      // x inicia em rect.x + r + shift
      for (let x = rect.x + r + shift; x <= rect.x + rect.width - r + 1e-6; x += d) {
        centers.push({ x, y });
      }
    }
    // centra o conjunto de centros dentro do rect (ajusta Bounding Box)
    if (centers.length === 0) return centers;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    centers.forEach(c => {
      if (c.x < minX) minX = c.x;
      if (c.x > maxX) maxX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.y > maxY) maxY = c.y;
    });
    const targetCenterX = rect.x + rect.width / 2;
    const targetCenterY = rect.y + rect.height / 2;
    const currentCenterX = (minX + maxX) / 2;
    const currentCenterY = (minY + maxY) / 2;
    const dx = targetCenterX - currentCenterX;
    const dy = targetCenterY - currentCenterY;
    centers.forEach(c => { c.x += dx; c.y += dy; });
    // filtra centros que possam sair do rect por borda numérica
    return centers.filter(c => (c.x - r >= rect.x - 1e-6 && c.x + r <= rect.x + rect.width + 1e-6 && c.y - r >= rect.y - 1e-6 && c.y + r <= rect.y + rect.height + 1e-6));
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
  function generateDistributedRowCenters(rect, spacingW, spacingH, rows, colsPerRow, totalN) {
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

  if (shape === "circle") {
    const diameter = parseInt(document.getElementById("diameter").value, 10);
    if (diameter <= 0 || isNaN(diameter)) return alert("Diâmetro inválido.");
    const d = diameter;
    // para círculo usamos toda a área da palete
    const rect = { x: 0, y: 0, width: canvas.width, height: canvas.height };
    const centers = generateHexCentersInRect(rect, d);
    const r = d / 2;
    centers.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.fillStyle = "#7FB3D5";
      ctx.fill();
      ctx.stroke();
      count++;
    });
  } else if (shape === "cylinder") {
    const cylWidth = parseInt(document.getElementById("cylWidth").value, 10);
    const cylHeight = parseInt(document.getElementById("cylHeight").value, 10);
    if (cylWidth <= 0 || cylHeight <= 0 || isNaN(cylWidth) || isNaN(cylHeight))
      return alert("Dimensões inválidas.");

    // mantenho a mesma lógica do original para contar/cortar áreas:
    const spacingW = cylWidth;
    const spacingH = cylHeight;
    const { count: colsUpright, offset: offsetX } = calculateAdjustedOffset(
      canvas.width,
      spacingW,
      allowExceed
    );
    const { count: rowsUpright, offset: offsetYCentered } = calculateAdjustedOffset(
      canvas.height,
      spacingH,
      allowExceed
    );

    const spacingRotW = cylHeight;
    const spacingRotH = cylWidth;
    const remainingHeight = canvas.height - rowsUpright * spacingH;
    const { count: rowsRotated } = calculateAdjustedOffset(
      remainingHeight,
      spacingRotH,
      allowExceed
    );
    const { count: colsRotated, offset: offsetXRot } = calculateAdjustedOffset(
      canvas.width,
      spacingRotW,
      allowExceed
    );

    // decidir alinhamento como na versão linear: se houver rotacionadas top-align upright, senão center
    const offsetY = rowsRotated > 0 ? 0 : offsetYCentered;

    // área para upright (onde desenharemos)
    const uprightRect = { x: 0, y: offsetY, width: canvas.width, height: rowsUpright * spacingH };

    // Primeiro tenta gerar centros por hex para obter N desejado (mantém consistência com hex count)
    const hexCentersUpright = generateHexCentersInRect(uprightRect, spacingW);
    const desiredN = hexCentersUpright.length;

    // Se a altura da elipse (cylHeight) é maior do que o passo vertical do hex (causa sobreposição),
    // reorganiza em linhas retangulares distribuindo 'desiredN' entre as linhas (ex.: 4 acima, 3 abaixo).
    const hexVStepForUpright = Math.sqrt(3) / 2 * spacingW; // 0.866 * spacingW
    let centersUpright = [];
    if (cylHeight > hexVStepForUpright + 1e-6 && rowsUpright >= 1) {
      // distribuir desiredN por rowsUpright linhas, centrando cada linha horizontalmente
      centersUpright = generateDistributedRowCenters(uprightRect, spacingW, spacingH, rowsUpright, colsUpright, desiredN);
    } else {
      centersUpright = hexCentersUpright;
    }

    // Rotated area: decide similarmente se usar hex ou retangular (verifica overlap potencial)
    const hexVStepForRot = Math.sqrt(3) / 2 * spacingRotW; // vertical step if hex with d=spacingRotW
    const offsetYRot = rowsUpright * spacingH + Math.max(0, (remainingHeight - rowsRotated * spacingRotH));
    const rotRect = { x: 0, y: offsetYRot, width: canvas.width, height: rowsRotated * spacingRotH };
    let centersRot = [];
    // primeira tentativa hex to get desired count for rotated
    const hexCentersRot = generateHexCentersInRect(rotRect, spacingRotW);
    const desiredNRot = hexCentersRot.length;
    if (cylWidth > hexVStepForRot + 1e-6 && rowsRotated >= 1) {
      centersRot = generateDistributedRowCenters(rotRect, spacingRotW, spacingRotH, rowsRotated, colsRotated, desiredNRot);
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
          if (dist < (rA + rB) - 1e-6) return true;
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
        if (Math.hypot(centersUpright[i].x - centersUpright[j].x, centersUpright[i].y - centersUpright[j].y) < (rU + rU) - 1e-6) { bad = true; break; }
      }
    }
    if (!bad) bad = overlapsAny(centersUpright, rU, centersRot, rR);
    if (!bad) {
      for (let i = 0; i < centersRot.length && !bad; i++) {
        for (let j = i + 1; j < centersRot.length; j++) {
          if (Math.hypot(centersRot[i].x - centersRot[j].x, centersRot[i].y - centersRot[j].y) < (rR + rR) - 1e-6) { bad = true; break; }
        }
      }
    }
    if (bad) {
      // fallback: desenhar exactamente como a disposição linear original
      if (typeof fillPal === "function") {
        return fillPal();
      }
    }

    // desenha elipses upright (centros calculados)
    centersUpright.forEach(c => {
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, cylWidth / 2, cylHeight / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#F5B041";
      ctx.fill();
      ctx.stroke();
      count++;
    });

    centersRot.forEach(c => {
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, cylHeight / 2, cylWidth / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#F8C471";
      ctx.fill();
      ctx.stroke();
      count++;
    });
  }

  document.getElementById("bobCount").textContent = count;
}