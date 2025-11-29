// script.js

let horariosBase = [
  { nome: "23h – 00h", porcentagem: 13.31, cor: "#00dff0" },
  { nome: "00h – 01h", porcentagem: 20.13, cor: "#ff6bcb" },
  { nome: "01h – 02h", porcentagem: 17.86, cor: "#7bff9e" },
  { nome: "03h – 04h", porcentagem: 14.61, cor: "#ffd56b" },
  { nome: "05h – 06h", porcentagem: 21.10, cor: "#b58bff" },

];
let extraHorario = { nome: "02h – 03h", porcentagem: 10.5, cor: "#00ffc4" };

const calcularDistribuicao = (total, incluirExtra) => {
  let horarios = [...horariosBase];
  if (incluirExtra) horarios.splice(3, 0, extraHorario);

  let distribuicao = horarios.map(h => {
    let qtd = Math.floor(total * h.porcentagem / 100);
    return { ...h, quantidade: qtd };
  });

  let totalDistribuido = distribuicao.reduce((s, h) => s + h.quantidade, 0);
  let sobra = total - totalDistribuido;

  // distribuir sobra aos maiores percentuais primeiro
  let ordenado = [...distribuicao].sort((a, b) => b.porcentagem - a.porcentagem);
  for (let i = 0; sobra > 0; i = (i + 1) % ordenado.length) {
    ordenado[i].quantidade++;
    sobra--;
  }

  // map back to original order
  return ordenado
    .map(o => ({ ...o }))
    .sort((a, b) => {
      // preserve original schedule order by name index
      let getIndex = name => {
        return horarios.findIndex(h => h.nome === name);
      };
      return getIndex(a.nome) - getIndex(b.nome);
    });
};

let chartInstance = null;

const easeNumber = (el, from, to, ms = 700) => {
  const start = performance.now();
  const diff = to - from;
  const step = (t) => {
    const now = performance.now();
    const pct = Math.min(1, (now - start) / ms);
    el.textContent = Math.round(from + diff * (1 - Math.cos(pct * Math.PI)) / 2);
    if (pct < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

document.getElementById('btnCalcular').addEventListener('click', () => {
  const total = Number(document.getElementById('total').value);
  const incluirExtra = document.getElementById('addExtra').checked;

  if (!total || total < 1 || total > 1000000) {
    alert('Insira um número válido entre 1 e 1.000.000');
    return;
  }

  const dados = calcularDistribuicao(total, incluirExtra);
  const tabela = document.getElementById('tabelaResultados');
  tabela.innerHTML = '';

  // atualizar stats
  document.getElementById('statTotal').textContent = '0';
  document.getElementById('statMedia').textContent = '0';
  document.getElementById('statCount').textContent = dados.length;

  // criar linhas com animação em cascata
  dados.forEach((h, idx) => {
    const tr = document.createElement('tr');
    tr.style.opacity = 0;
    tr.style.transform = 'translateY(8px)';
    tr.innerHTML = `
      <td>
        <span class="dot" style="background:${h.cor}"></span>
        <strong>${h.nome}</strong>
      </td>
      <td title="Quantidade"><strong>${h.quantidade}</strong></td>
      <td>${h.porcentagem.toFixed(2)}%</td>
      <td>
        <div class="progress" aria-hidden="true">
          <i style="width:0%" data-target="${h.porcentagem}"></i>
        </div>
      </td>
    `;
    tabela.appendChild(tr);

    // animate entry
    setTimeout(() => {
      tr.style.transition = 'all 600ms cubic-bezier(.2,.9,.2,1)';
      tr.style.opacity = 1;
      tr.style.transform = 'none';
    }, 90 * idx);
  });

  // animação das barras (usa porcentagem relativa)
  setTimeout(() => {
    const totalPct = dados.reduce((s, d) => s + d.porcentagem, 0);
    document.querySelectorAll('.progress > i').forEach((bar, i) => {
      const targetPct = (dados[i].porcentagem / totalPct) * 100;
      // set width with a tiny delay to trigger transition
      setTimeout(() => bar.style.width = `${targetPct.toFixed(2)}%`, 60 * i);
    });
  }, 120);

  // atualizar números com easing
  easeNumber(document.getElementById('statTotal'), 0, dados.reduce((s, d) => s + d.quantidade, 0), 800);
  easeNumber(document.getElementById('statMedia'), 0, Math.round(total / dados.length), 700);

  // mostrar resultado
  document.getElementById('resultado').hidden = false;

  // atualizar gráfico (Chart.js)
  const ctx = document.getElementById('pizzaChart').getContext('2d');
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: dados.map(d => d.nome),
      datasets: [{
        data: dados.map(d => d.quantidade),
        backgroundColor: dados.map(d => d.cor),
        borderColor: 'rgba(0,0,0,0.25)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#cfeeff', boxWidth:14 } },
        title: { display: true, text: 'Distribuição por Horário', color:'#dff8ff' },
        datalabels: {
          color: '#00121a',
          backgroundColor: function(context) { return context.dataset.backgroundColor[context.dataIndex]; },
          borderRadius: 6,
          font: { weight: '700' },
          formatter: (value, ctx) => {
            const total = ctx.chart.data.datasets[0].data.reduce((a,b)=>a+b,0);
            return (value/total*100).toFixed(1) + '%';
          },
          padding:6
        }
      },
      animation: { animateScale: true, duration: 900 }
    },
    plugins: [ChartDataLabels]
  });

});
