// Ajusta o tamanho do canvas a partir do select "palSize" (valores "widthxheight")
function updateCanvasSize() {
  const canvas = document.getElementById('palCanvas');
  const size = document.getElementById('palSize').value;
  const [width, height] = size.split('x').map(Number);
  // mantemos width/height lógicos (unidades do modelo) e guardamos para o autosize
  canvas.width = width;
  canvas.height = height;
  canvas.setAttribute('data-logical-width', width);
  canvas.setAttribute('data-logical-height', height);
  // ajusta o CSS display size para caber na viewport sem distorção
  autosizeCanvas();
  // atualiza as medidas quando a paleta é alterada
  const ctx = canvas.getContext('2d');
  drawPaletMeasurements(canvas, ctx);
}

// Garante que o canvas CSS size se ajusta à viewport mantendo a proporção lógica
function autosizeCanvas() {
  const canvas = document.getElementById('palCanvas');
  if (!canvas) return;
  const logicalW =
    parseFloat(canvas.getAttribute('data-logical-width')) || canvas.width;
  const logicalH =
    parseFloat(canvas.getAttribute('data-logical-height')) || canvas.height;
  // calcular espaço disponível dentro do wrapper, reservando espaço para as medidas externas
  const wrapper = document.querySelector('.canvas-wrapper');
  const wrapperRect = wrapper
    ? wrapper.getBoundingClientRect()
    : {
        width: Math.max(200, window.innerWidth - 32),
        height: Math.max(200, window.innerHeight - 150),
      };
  const availW = Math.max(200, wrapperRect.width - 50);
  const availH = Math.max(200, wrapperRect.height - 40);
  const scale = Math.min(availW / logicalW, availH / logicalH);
  // aplica CSS size proporcional (mantém a mesma razão para evitar ovalização)
  canvas.style.width = Math.round(logicalW * scale) + 'px';
  canvas.style.height = Math.round(logicalH * scale) + 'px';
}

// chama autosize ao redimensionar a janela
window.addEventListener('resize', autosizeCanvas);

// Mostra/oculta inputs do formulário conforme o tipo de "shape" selecionado
function toggleCylinderInputs() {
  const shape = document.getElementById('shape').value;
  document.getElementById('circleInputs').style.display =
    shape === 'circle' ? 'flex' : 'none';
  document.getElementById('cylinderInputs').style.display =
    shape === 'cylinder' ? 'flex' : 'none';
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
  const canvas = document.getElementById('palCanvas');
  const ctx = canvas.getContext('2d');
  // limpa e desenha fundo/borda da palete
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

  // Caso: bobines circulares (circle)
  if (shape === 'circle') {
    const diameter = parseInt(document.getElementById('diameter').value);
    if (diameter <= 0 || isNaN(diameter)) return alert('Diâmetro inválido.');
    const spacing = diameter;
    // colunas/linhas e offsets para centralizar a grelha de círculos
    const { count: cols, offset: offsetX } = calculateAdjustedOffset(
      canvas.width,
      spacing,
      allowExceed,
    );
    const { count: rows, offset: offsetY } = calculateAdjustedOffset(
      canvas.height,
      spacing,
      allowExceed,
    );

    // itera sobre cada célula da grelha, desenha um círculo no centro da célula
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = offsetX + col * spacing + spacing / 2;
        const y = offsetY + row * spacing + spacing / 2;
        ctx.beginPath();
        ctx.arc(x, y, diameter / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#7FB3D5';
        ctx.fill();
        ctx.stroke();
        if (!firstMeasurementDrawn) {
          drawBobineMeasurements(ctx, x, y, diameter, diameter, 'circle');
          firstMeasurementDrawn = true;
        }
        count++;
      }
    }

    // Caso: bobines em disposição "cylinder" (upright + rotacionadas)
  } else if (shape === 'cylinder') {
    const cylWidth = parseInt(document.getElementById('cylWidth').value);
    const cylHeight = parseInt(document.getElementById('cylHeight').value);
    if (cylWidth <= 0 || cylHeight <= 0 || isNaN(cylWidth) || isNaN(cylHeight))
      return alert('Dimensões inválidas.');

    // spacing para bobines upright (largura x altura)
    const spacingW = cylWidth;
    const spacingH = cylHeight;
    // colunas e offset horizontal para upright
    const { count: colsUpright, offset: offsetX } = calculateAdjustedOffset(
      canvas.width,
      spacingW,
      allowExceed,
    );
    // calcula número de linhas upright e offset centralizado vertical (caso não haja rotacionadas)
    const { count: rowsUpright, offset: offsetYCentered } =
      calculateAdjustedOffset(canvas.height, spacingH, allowExceed);

    // spacing para bobines rotacionadas (troca width/height)
    const spacingRotW = cylHeight;
    const spacingRotH = cylWidth;
    // área restante abaixo das upright e quantas linhas/colunas rotacionadas cabem
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
        ctx.fillStyle = '#F5B041';
        ctx.fill();
        ctx.stroke();
        if (!firstMeasurementDrawn) {
          drawBobineMeasurements(ctx, x, y, cylWidth, cylHeight, 'cylinder');
          firstMeasurementDrawn = true;
        }
        count++;
      }
    }

    // Calcula offset vertical para as rotacionadas: bottom-align dentro da área restante
    const offsetYRot =
      rowsUpright * spacingH +
      Math.max(0, remainingHeight - rowsRotated * spacingRotH);

    // desenha as bobines rotacionadas (elipses com rx = cylHeight/2, ry = cylWidth/2)
    for (let row = 0; row < rowsRotated; row++) {
      for (let col = 0; col < colsRotated; col++) {
        const x = offsetXRot + col * spacingRotW + spacingRotW / 2;
        const y = offsetYRot + row * spacingRotH + spacingRotH / 2;
        ctx.beginPath();
        ctx.ellipse(x, y, cylHeight / 2, cylWidth / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#F8C471';
        ctx.fill();
        ctx.stroke();
        if (!firstMeasurementDrawn) {
          drawBobineMeasurements(ctx, x, y, cylWidth, cylHeight, 'cylinder');
          firstMeasurementDrawn = true;
        }
        count++;
      }
    }
  }

  // desenha linhas de medida com as dimensões da paleta
  drawPaletMeasurements(canvas, ctx);

  // atualiza contador de bobines desenhadas no UI
  document.getElementById('bobCount').textContent = count;
}

// Desenha as linhas de medida nos elementos HTML fora do canvas
function drawPaletMeasurements(canvas, ctx) {
  const width = canvas.width;
  const height = canvas.height;

  const widthDiv = document.getElementById('widthMeasure');
  const heightDiv = document.getElementById('heightMeasure');

  // Posiciona as medidas externas em relação ao canvas renderizado,
  // não à largura total do wrapper.
  const canvasLeft = canvas.offsetLeft;
  const canvasTop = canvas.offsetTop;
  const canvasW = canvas.offsetWidth;
  const canvasH = canvas.offsetHeight;

  widthDiv.style.left = canvasLeft + 'px';
  widthDiv.style.width = canvasW + 'px';
  widthDiv.style.bottom = '0';
  widthDiv.style.right = 'auto';

  heightDiv.style.left = canvasLeft + canvasW + 'px';
  heightDiv.style.top = canvasTop + 'px';
  heightDiv.style.height = canvasH + 'px';
  heightDiv.style.right = 'auto';

  const textWidthPercent = 20; // percentagem de espaço para o texto
  const leftGapStart = 50 - textWidthPercent / 2;
  const leftGapEnd = 50 + textWidthPercent / 2;

  widthDiv.innerHTML = `
    <svg style="width: 100%; height: 100%; position: absolute; bottom: 0; left: 0;">
      <!-- Linha à esquerda do texto -->
      <line x1="0%" y1="50%" x2="${leftGapStart}%" y2="50%" stroke="#666" stroke-width="0.5" />
      <!-- Linha à direita do texto -->
      <line x1="${leftGapEnd}%" y1="50%" x2="100%" y2="50%" stroke="#666" stroke-width="0.5" />
      <!-- Traço perpendicular à esquerda (menor) -->
      <line x1="0%" y1="42%" x2="0%" y2="58%" stroke="#666" stroke-width="0.5" />
      <!-- Traço perpendicular à direita (menor) -->
      <line x1="100%" y1="42%" x2="100%" y2="58%" stroke="#666" stroke-width="0.5" />
      <!-- Fundo branco para o texto (sem traço por cima) -->
      <rect x="${leftGapStart}%" y="30%" width="${textWidthPercent}%" height="40%" fill="white" />
      <!-- Texto centrado -->
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="bold" fill="#666">${width} mm</text>
    </svg>
  `;

  // Altura (à direita) - linha fina ao longo da altura com gap para o texto
  const textHeightPercent = 20; // percentagem de espaço para o texto
  const topGapStart = 50 - textHeightPercent / 2;
  const topGapEnd = 50 + textHeightPercent / 2;

  heightDiv.innerHTML = `
    <svg style="width: 100%; height: 100%; position: absolute; top: 0; right: 0;">
      <!-- Linha acima do texto -->
      <line x1="50%" y1="0%" x2="50%" y2="${topGapStart}%" stroke="#666" stroke-width="0.5" />
      <!-- Linha abaixo do texto -->
      <line x1="50%" y1="${topGapEnd}%" x2="50%" y2="100%" stroke="#666" stroke-width="0.5" />
      <!-- Traço perpendicular acima (menor) -->
      <line x1="42%" y1="0%" x2="58%" y2="0%" stroke="#666" stroke-width="0.5" />
      <!-- Traço perpendicular abaixo (menor) -->
      <line x1="42%" y1="100%" x2="58%" y2="100%" stroke="#666" stroke-width="0.5" />
      <!-- Fundo branco para o texto (sem traço por cima) -->
      <rect x="30%" y="${topGapStart}%" width="40%" height="${textHeightPercent}%" fill="white" />
      <!-- Texto centrado e rotacionado -->
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="bold" fill="#666" transform="rotate(90 50% 50%)">${height} mm</text>
    </svg>
  `;
}

function drawBobineMeasurements(
  ctx,
  centerX,
  centerY,
  width,
  height,
  shapeType,
) {
  ctx.save();
  ctx.strokeStyle = '#666';
  ctx.fillStyle = '#666';
  ctx.lineWidth = 0.5;

  const halfW = width / 2;
  const halfH = height / 2;
  const inset = Math.min(12, halfW * 0.15, halfH * 0.15);
  const leftX = centerX - halfW + inset;
  const rightX = centerX + halfW - inset;
  const topY = centerY - halfH + inset;
  const bottomY = centerY + halfH - inset;

  const widthLabel = `${Math.round(width)} mm`;
  const heightLabel = `${Math.round(height)} mm`;
  const scale = ctx.canvas.offsetWidth / ctx.canvas.width;
  const fontSize = Math.round(11 / scale);
  ctx.font = `bold ${fontSize}px sans-serif`;
  const padding = 4;
  const widthTextWidth = ctx.measureText(widthLabel).width;
  const heightTextWidth = ctx.measureText(heightLabel).width;
  const widthGap = widthTextWidth + padding * 2;
  const heightGap = heightTextWidth + padding * 2;

  // Largura (horizontal) - linha fina ao longo da largura com gap para o texto
  const widthGapEnd = rightX - 4;
  const widthGapStart = widthGapEnd - widthGap;

  // Altura (vertical) - linha fina ao longo da altura com gap para o texto
  const heightGapEnd = bottomY - 4;
  const heightGapStart = heightGapEnd - heightGap;

  // Linha horizontal com gap para o texto de largura
  ctx.beginPath();
  ctx.moveTo(leftX, centerY);
  ctx.lineTo(widthGapStart, centerY);
  ctx.moveTo(widthGapEnd, centerY);
  ctx.lineTo(rightX, centerY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(leftX, centerY - 8);
  ctx.lineTo(leftX, centerY + 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rightX, centerY - 8);
  ctx.lineTo(rightX, centerY + 8);
  ctx.stroke();

  // Linha vertical com gap para o texto de altura
  ctx.beginPath();
  ctx.moveTo(centerX, topY);
  ctx.lineTo(centerX, heightGapStart);
  ctx.moveTo(centerX, heightGapEnd);
  ctx.lineTo(centerX, bottomY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(centerX - 8, topY);
  ctx.lineTo(centerX + 8, topY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(centerX - 8, bottomY);
  ctx.lineTo(centerX + 8, bottomY);
  ctx.stroke();

  ctx.fillStyle = '#666';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(widthLabel, widthGapStart + widthGap / 2, centerY);

  const heightGapMiddle = heightGapStart + heightGap / 2;
  ctx.save();
  ctx.translate(centerX, heightGapMiddle);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(heightLabel, 0, 0);
  ctx.restore();
  ctx.restore();
}

// Gera download da imagem do canvas
function downloadCanvas() {
  const canvas = document.getElementById('palCanvas');
  const link = document.createElement('a');
  link.download = 'pal_bobs.png';
  link.href = canvas.toDataURL();
  link.click();
}

// inicializa tamanho do canvas ao carregar a página
window.onload = function () {
  updateCanvasSize();
  // ensure correct inputs visibility on load
  toggleCylinderInputs();
  // ...existing code... (se houver mais inicializações)
};
