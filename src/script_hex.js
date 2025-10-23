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
    const boxW = maxX - minX;
    const boxH = maxY - minY;
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

    // área para upright (onde desenharemos com hex packing usando d = spacingW horizontal)
    const uprightRect = { x: 0, y: offsetY, width: canvas.width, height: rowsUpright * spacingH };
    // gerar centros hex usando d = spacingW (usa cilindro largura como "diâmetro" de célula)
    const centersUpright = generateHexCentersInRect(uprightRect, spacingW);
    // desenha elipses upright (centros hex, elipses rx = cylWidth/2, ry = cylHeight/2)
    centersUpright.forEach(c => {
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, cylWidth / 2, cylHeight / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#F5B041";
      ctx.fill();
      ctx.stroke();
      count++;
    });

    // área para rotacionadas: colocadas na parte inferior da área restante (bottom-align)
    const offsetYRot = rowsUpright * spacingH + Math.max(0, (remainingHeight - rowsRotated * spacingRotH));
    const rotRect = { x: 0, y: offsetYRot, width: canvas.width, height: rowsRotated * spacingRotH };
    // usar d = spacingRotW (cylHeight) para hex packing das rotacionadas
    const centersRot = generateHexCentersInRect(rotRect, spacingRotW);
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