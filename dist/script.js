function updateCanvasSize() {
  const canvas = document.getElementById("palCanvas");
  const size = document.getElementById("palSize").value;
  const [width, height] = size.split("x").map(Number);
  canvas.width = width;
  canvas.height = height;
}

function toggleCylinderInputs() {
  const shape = document.getElementById("shape").value;
  document.getElementById("circleInputs").style.display =
    shape === "circle" ? "inline" : "none";
  document.getElementById("cylinderInputs").style.display =
    shape === "cylinder" ? "inline" : "none";
}

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

function fillPal() {
  const canvas = document.getElementById("palCanvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#FFFFF0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

  const shape = document.getElementById("shape").value;
  const allowExceed = document.getElementById("allowExceed").checked;
  let count = 0;

  if (shape === "circle") {
    const diameter = parseInt(document.getElementById("diameter").value);
    if (diameter <= 0 || isNaN(diameter)) return alert("Diâmetro inválido.");
    const spacing = diameter;
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
  } else if (shape === "cylinder") {
    const cylWidth = parseInt(document.getElementById("cylWidth").value);
    const cylHeight = parseInt(document.getElementById("cylHeight").value);
    if (cylWidth <= 0 || cylHeight <= 0 || isNaN(cylWidth) || isNaN(cylHeight))
      return alert("Dimensões inválidas.");

    const spacingW = cylWidth;
    const spacingH = cylHeight;
    const { count: colsUpright, offset: offsetX } = calculateAdjustedOffset(
      canvas.width,
      spacingW,
      allowExceed
    );
    const { count: rowsUpright, offset: offsetY } = calculateAdjustedOffset(
      canvas.height,
      spacingH,
      allowExceed
    );

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

    const spacingRotW = cylHeight;
    const spacingRotH = cylWidth;
    const remainingHeight = canvas.height - rowsUpright * spacingH;
    const { count: rowsRotated, offset: offsetYRot } = calculateAdjustedOffset(
      remainingHeight,
      spacingRotH,
      allowExceed
    );
    const { count: colsRotated, offset: offsetXRot } = calculateAdjustedOffset(
      canvas.width,
      spacingRotW,
      allowExceed
    );

    for (let row = 0; row < rowsRotated; row++) {
      for (let col = 0; col < colsRotated; col++) {
        const x = offsetXRot + col * spacingRotW + spacingRotW / 2;
        const y =
          rowsUpright * spacingH +
          offsetYRot +
          row * spacingRotH +
          spacingRotH / 2;
        ctx.beginPath();
        ctx.ellipse(x, y, cylHeight / 2, cylWidth / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#F8C471";
        ctx.fill();
        ctx.stroke();
        count++;
      }
    }
  }

  document.getElementById("bobCount").textContent = count;
}

function downloadCanvas() {
  const canvas = document.getElementById("palCanvas");
  const link = document.createElement("a");
  link.download = "pal_bobs.png";
  link.href = canvas.toDataURL();
  link.click();
}

window.onload = updateCanvasSize;