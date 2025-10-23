// Ajusta o tamanho do canvas a partir do select "palSize" (valores "widthxheight")
function updateCanvasSize() {
  const canvas = document.getElementById("palCanvas");
  const size = document.getElementById("palSize").value;
  const [width, height] = size.split("x").map(Number);
  canvas.width = width;
  canvas.height = height;
}

// Mostra/oculta inputs do formulário conforme o tipo de "shape" selecionado
function toggleCylinderInputs() {
  const shape = document.getElementById("shape").value;
  document.getElementById("circleInputs").style.display =
    shape === "circle" ? "inline" : "none";
  document.getElementById("cylinderInputs").style.display =
    shape === "cylinder" ? "inline" : "none";
}

// Calcula quantas células cabem (count) e o offset para centralizar a grelha
// - canvasSize: dimensão disponível (px)
// - spacing: tamanho da célula (px)
// - allowExceed: permite exceder ligeiramente a borda (20% do spacing)
function calculateAdjustedOffset(canvasSize, spacing, allowExceed) {
  if (allowExceed) {
    const maxExceed = spacing * 0.2;
    const usableSize = canvasSize + 2 * maxExceed;
    const count = Math.floor(usableSize / spacing);
    const totalOccupied = count * spacing;
    const offset = (canvasSize - totalOccupied) / 2;
    return { count, offset };
  } else {
    const count = Math.floor(canvasSize / spacing);
    const totalOccupied = count * spacing;
    const offset = (canvasSize - totalOccupied) / 2;
    return { count, offset };
  }
}

// Desenha o conteúdo da palete no canvas conforme inputs do formulário
function fillPal() {
  const canvas = document.getElementById("palCanvas");
  const ctx = canvas.getContext("2d");
  // limpa e desenha fundo/borda da palete
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#FFFFF0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

  const shape = document.getElementById("shape").value;
  const allowExceed = document.getElementById("allowExceed").checked;
  let count = 0;

  // Caso: bobines circulares (circle)
  if (shape === "circle") {
    const diameter = parseInt(document.getElementById("diameter").value);
    if (diameter <= 0 || isNaN(diameter)) return alert("Diâmetro inválido.");
    const spacing = diameter;
    // colunas/linhas e offsets para centralizar a grelha de círculos
    const { count: cols, offset: offsetX } = calculateAdjustedOffset(
      canvas.width,
      spacing,
      allowExceed
    );
    const { count: rows, offset: offsetY } = calculateAdjustedOffset(
      canvas.height,
      spacing,
      allowExceed
    );

    // itera sobre cada célula da grelha, desenha um círculo no centro da célula
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = offsetX + col * spacing + spacing / 2;
        const y = offsetY + row * spacing + spacing / 2;
        ctx.beginPath();
        ctx.arc(x, y, diameter / 2, 0, Math.PI * 2);
        ctx.fillStyle = "#7FB3D5";
        ctx.fill();
        ctx.stroke();
        count++;
      }
    }

  // Caso: bobines em disposição "cylinder" (upright + rotacionadas)
  } else if (shape === "cylinder") {
    const cylWidth = parseInt(document.getElementById("cylWidth").value);
    const cylHeight = parseInt(document.getElementById("cylHeight").value);
    if (cylWidth <= 0 || cylHeight <= 0 || isNaN(cylWidth) || isNaN(cylHeight))
      return alert("Dimensões inválidas.");

    // spacing para bobines upright (largura x altura)
    const spacingW = cylWidth;
    const spacingH = cylHeight;
    // colunas e offset horizontal para upright
    const { count: colsUpright, offset: offsetX } = calculateAdjustedOffset(
      canvas.width,
      spacingW,
      allowExceed
    );
    // calcula número de linhas upright e offset centralizado vertical (caso não haja rotacionadas)
    const { count: rowsUpright, offset: offsetYCentered } = calculateAdjustedOffset(
      canvas.height,
      spacingH,
      allowExceed
    );

    // spacing para bobines rotacionadas (troca width/height)
    const spacingRotW = cylHeight;
    const spacingRotH = cylWidth;
    // área restante abaixo das upright e quantas linhas/colunas rotacionadas cabem
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

    // Alinhamento: se houver rotacionadas, top-align as upright (offsetY=0)
    // caso contrário centra verticalmente as upright usando offsetYCentered
    const offsetY = rowsRotated > 0 ? 0 : offsetYCentered;

    // desenha as bobines upright (elipses com rx = cylWidth/2, ry = cylHeight/2)
    for (let row = 0; row < rowsUpright; row++) {
      for (let col = 0; col < colsUpright; col++) {
        const x = offsetX + col * spacingW + spacingW / 2;
        const y = offsetY + row * spacingH + spacingH / 2;
        ctx.beginPath();
        ctx.ellipse(x, y, cylWidth / 2, cylHeight / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#F5B041";
        ctx.fill();
        ctx.stroke();
        count++;
      }
    }

    // Calcula offset vertical para as rotacionadas: bottom-align dentro da área restante
    const offsetYRot = rowsUpright * spacingH + Math.max(0, (remainingHeight - rowsRotated * spacingRotH));

    // desenha as bobines rotacionadas (elipses com rx = cylHeight/2, ry = cylWidth/2)
    for (let row = 0; row < rowsRotated; row++) {
      for (let col = 0; col < colsRotated; col++) {
        const x = offsetXRot + col * spacingRotW + spacingRotW / 2;
        const y = offsetYRot + row * spacingRotH + spacingRotH / 2;
        ctx.beginPath();
        ctx.ellipse(x, y, cylHeight / 2, cylWidth / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#F8C471";
        ctx.fill();
        ctx.stroke();
        count++;
      }
    }
  }

  // atualiza contador de bobines desenhadas no UI
  document.getElementById("bobCount").textContent = count;
}

// Gera download da imagem do canvas
function downloadCanvas() {
  const canvas = document.getElementById("palCanvas");
  const link = document.createElement("a");
  link.download = "pal_bobs.png";
  link.href = canvas.toDataURL();
  link.click();
}

// inicializa tamanho do canvas ao carregar a página
window.onload = updateCanvasSize;
