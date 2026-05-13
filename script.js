const dropBox      = document.getElementById('dropBox');
const inputArchivo = document.getElementById('inputArchivo');

dropBox.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropBox.classList.add('encima');
});
dropBox.addEventListener('dragleave', () => dropBox.classList.remove('encima'));
dropBox.addEventListener('drop', (e) => {
  e.preventDefault();
  dropBox.classList.remove('encima');
  if (e.dataTransfer.files[0]) procesarArchivo(e.dataTransfer.files[0]);
});
inputArchivo.addEventListener('change', (e) => {
  if (e.target.files[0]) procesarArchivo(e.target.files[0]);
});

function procesarArchivo(archivo) {
  const lector = new FileReader();
  lector.onload = (e) => {
    const datos = leerCSV(e.target.result);
    if (!datos.length) { alert('No se encontro la columna profile_ratio o no hay datos validos'); return; }
    mostrarDashboard(datos);
  };
  lector.readAsText(archivo);
}

function leerCSV(texto) {
  const lineas      = texto.trim().split('\n');
  if (lineas.length < 2) return [];
  const encabezados = lineas[0].split(',').map(h => h.trim());
  const idxRatio    = encabezados.indexOf('profile_ratio');
  const idxStatus   = encabezados.indexOf('status');
  if (idxRatio === -1) return [];

  const valores = [];
  for (let i = 1; i < lineas.length; i++) {
    const celdas = lineas[i].split(',');
    if (idxStatus !== -1 && celdas[idxStatus]?.trim() === 'self') continue;
    const numero = parseFloat(celdas[idxRatio]);
    if (!isNaN(numero) && numero > 0) valores.push(numero);
  }
  return valores;
}

function calcularStats(valores) {
  const n      = valores.length;
  const sorted = [...valores].sort((a, b) => a - b);
  const media  = valores.reduce((s, v) => s + v, 0) / n;
  const mediana = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];

  const frecMap = {};
  valores.forEach(v => frecMap[v] = (frecMap[v] || 0) + 1);
  const maxFrec = Math.max(...Object.values(frecMap));
  const modas   = Object.keys(frecMap).filter(k => frecMap[k] === maxFrec).map(Number).sort((a, b) => a - b);

  const min        = sorted[0];
  const max        = sorted[n - 1];
  const rango      = max - min;
  const varianza   = valores.reduce((s, v) => s + (v - media) ** 2, 0) / n;
  const desviacion = Math.sqrt(varianza);

  return { n, media, mediana, modas, min, max, rango, desviacion };
}

function construirTabla(valores) {
  const { n, min, max } = calcularStats(valores);
  const k     = Math.ceil(1 + 3.322 * Math.log10(n));
  const ancho = (max - min) / k;

  const filas = [];
  let acumAbs = 0;
  let acumRel = 0;

  for (let i = 0; i < k; i++) {
    const lo       = min + i * ancho;
    const hi       = min + (i + 1) * ancho;
    const esUltimo = i === k - 1;
    const fa       = valores.filter(v => esUltimo ? (v >= lo && v <= hi) : (v >= lo && v < hi)).length;
    const fr       = n > 0 ? fa / n : 0;
    acumAbs += fa;
    acumRel += fr;

    filas.push({
      clase:      `[${lo.toFixed(3)}, ${hi.toFixed(3)}${esUltimo ? ']' : ')'}`,
      marcaClase: (lo + hi) / 2,
      fa, fr,
      frPct:      fr * 100,
      acumAbs, acumRel,
      acumRelPct: acumRel * 100
    });
  }
  return filas;
}

function mostrarDashboard(valores) {
  const st    = calcularStats(valores);
  const filas = construirTabla(valores);

  document.getElementById('zonaSubida').style.display = 'none';
  document.getElementById('dashboard').style.display  = 'block';

  const modasTexto = st.modas.length > 5
    ? st.modas.slice(0, 4).map(m => m.toFixed(3)).join(', ') + '...'
    : st.modas.map(m => m.toFixed(3)).join(', ');

  document.getElementById('stats').innerHTML = [
    { etiqueta: 'N',          valor: st.n,                    clase: 'negro' },
    { etiqueta: 'Media',      valor: st.media.toFixed(4),     clase: 'neon'  },
    { etiqueta: 'Mediana',    valor: st.mediana.toFixed(4),   clase: 'azul'  },
    { etiqueta: 'Moda',       valor: modasTexto,              clase: 'rosa'  },
    { etiqueta: 'Minimo',     valor: st.min.toFixed(4),       clase: 'negro' },
    { etiqueta: 'Maximo',     valor: st.max.toFixed(4),       clase: 'negro' },
    { etiqueta: 'Rango',      valor: st.rango.toFixed(4),     clase: 'negro' },
    { etiqueta: 'Desv. Est.', valor: st.desviacion.toFixed(4),clase: 'azul'  },
  ].map(s => `
    <div class="stat ${s.clase}">
      <div class="etiqueta">${s.etiqueta}</div>
      <div class="valor">${s.valor}</div>
    </div>
  `).join('');

  const maxFa = Math.max(...filas.map(f => f.fa));
  let html = `
    <table>
      <tr>
        <th>Clase</th><th>Marca de clase</th><th>fa</th><th>Barra fa</th>
        <th>fr</th><th>fr %</th><th>Fa (acum)</th><th>Barra Fa</th><th>Fr % (acum)</th>
      </tr>`;

  filas.forEach(f => {
    const wFa   = maxFa > 0 ? (f.fa / maxFa * 100).toFixed(1) : 0;
    const wAcum = f.acumRelPct.toFixed(1);
    html += `
      <tr>
        <td>${f.clase}</td>
        <td class="num">${f.marcaClase.toFixed(3)}</td>
        <td class="num">${f.fa}</td>
        <td><div class="barra"><div class="barra-fill" style="width:${wFa}%"></div></div></td>
        <td>${f.fr.toFixed(4)}</td>
        <td>${f.frPct.toFixed(2)}%</td>
        <td class="num">${f.acumAbs}</td>
        <td><div class="barra"><div class="barra-fill acum" style="width:${wAcum}%"></div></div></td>
        <td>${f.acumRelPct.toFixed(2)}%</td>
      </tr>`;
  });

  const totalFa = filas.reduce((s, f) => s + f.fa, 0);
  html += `
      <tr>
        <td>TOTAL</td><td>—</td>
        <td class="num">${totalFa}</td><td></td>
        <td>1.0000</td><td>100.00%</td>
        <td class="num">${totalFa}</td><td></td>
        <td>100.00%</td>
      </tr>
    </table>`;
  document.getElementById('tablaFrec').innerHTML = html;

  const etiquetas = filas.map(f => f.clase);
  const marcas    = filas.map(f => parseFloat(f.marcaClase.toFixed(3)));
  const fasAbs    = filas.map(f => f.fa);
  const fasPct    = filas.map(f => parseFloat(f.frPct.toFixed(2)));
  const fasAcum   = filas.map(f => f.acumAbs);
  const COLORES   = ['#E8FF00','#FF3366','#00D9FF','#737373','#B8CC00','#CC2952','#00AED4','#999','#D4E600','#FF6688'];

  const ejes = {
    x: { grid: { color: '#E8E8E8' }, ticks: { font: { size: 8 }, color: '#000', maxRotation: 45 }, border: { color: '#000', width: 2 } },
    y: { grid: { color: '#E8E8E8' }, beginAtZero: true, border: { color: '#000', width: 2 } }
  };
  const tooltip = {
    backgroundColor: '#0A0A0A', titleColor: '#FAFAF9', bodyColor: '#FAFAF9',
    borderWidth: 2,
    titleFont: { family: "'EB Garamond', serif", size: 13 },
    bodyFont:  { family: "'JetBrains Mono', monospace", size: 10 }
  };

  new Chart(document.getElementById('grafBarras'), {
    type: 'bar',
    data: {
      labels: etiquetas,
      datasets: [{ label: 'fa', data: fasAbs, backgroundColor: '#E8FF0044', borderColor: '#E8FF00', borderWidth: 2 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, scales: ejes,
      plugins: {
        legend: { display: false },
        tooltip: { ...tooltip, borderColor: '#E8FF00', callbacks: {
          title: items => filas[items[0].dataIndex].clase,
          label: ctx   => [` fa: ${ctx.raw}`, ` fr: ${filas[ctx.dataIndex].frPct.toFixed(2)}%`]
        }}
      }
    }
  });

  new Chart(document.getElementById('grafPastel'), {
    type: 'doughnut',
    data: {
      labels: etiquetas,
      datasets: [{ data: fasPct, backgroundColor: COLORES, borderColor: '#000', borderWidth: 2 }]
    },
    options: {
      responsive: true, cutout: '52%',
      plugins: {
        legend: { position: 'bottom', labels: { padding: 10, font: { size: 9 }, color: '#737373' }},
        tooltip: { ...tooltip, borderColor: '#FF3366', callbacks: {
          title: items => filas[items[0].dataIndex].clase,
          label: ctx   => ` ${ctx.raw.toFixed(2)}%  (fa=${filas[ctx.dataIndex].fa})`
        }}
      }
    }
  });

  const marcasExt = [marcas[0] - (marcas[1] - marcas[0]), ...marcas, marcas[marcas.length - 1] + (marcas[1] - marcas[0])];
  const fasExt    = [0, ...fasAbs, 0];

  new Chart(document.getElementById('grafPoliAbs'), {
    type: 'line',
    data: {
      labels: marcasExt,
      datasets: [{
        label: 'fa', data: fasExt,
        borderColor: '#E8FF00', backgroundColor: '#E8FF0044', fill: true,
        tension: 0.15, pointRadius: 5, pointHoverRadius: 8,
        pointBackgroundColor: '#E8FF00', pointBorderColor: '#000', pointBorderWidth: 2, borderWidth: 3
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, scales: ejes,
      plugins: {
        legend: { display: false },
        tooltip: { ...tooltip, borderColor: '#E8FF00', callbacks: { label: ctx => ` fa: ${ctx.raw}` } }
      }
    }
  });

  new Chart(document.getElementById('grafPoliAcum'), {
    type: 'line',
    data: {
      labels: marcas,
      datasets: [{
        label: 'Fa', data: fasAcum,
        borderColor: '#00D9FF', backgroundColor: '#00D9FF33', fill: true,
        tension: 0.25, pointRadius: 5, pointHoverRadius: 8,
        pointBackgroundColor: '#00D9FF', pointBorderColor: '#000', pointBorderWidth: 2, borderWidth: 3
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, scales: ejes,
      plugins: {
        legend: { display: false },
        tooltip: { ...tooltip, borderColor: '#00D9FF', callbacks: {
          title: items => filas[items[0].dataIndex]?.clase || '',
          label: ctx   => [` Fa: ${ctx.raw}`, ` Fr%: ${filas[ctx.dataIndex]?.acumRelPct.toFixed(2)}%`]
        }}
      }
    }
  });
}

document.getElementById('btnReset').addEventListener('click', () => {
  ['grafBarras', 'grafPastel', 'grafPoliAbs', 'grafPoliAcum'].forEach(id => {
    const g = Chart.getChart(id);
    if (g) g.destroy();
  });
  document.getElementById('dashboard').style.display  = 'none';
  document.getElementById('zonaSubida').style.display = 'flex';
});
