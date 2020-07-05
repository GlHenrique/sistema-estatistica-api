const Helper = require('../helpers/accumulator');
const QuickSort = require('../utils/quick-sort');
const Fatorial = require('../utils/fatorial');
const TableZ = require('../helpers/tableZ');

module.exports = {
  async calculate(request, response) {
    let {
      analyze,
      order,
      values,
      isContinue,
      separatingMeasure,
      method,
    } = request.body;
    const valoresOrdenados = values;
    QuickSort.quickSort(valoresOrdenados, (a, b) => a > b);
    if (analyze === 'discreteQuantitative') {
      values = values.map((item) => {
        return Number(item); // Convertendo para Number
      });
      if (values.includes(NaN)) {
        return response.status(400).json({
          content: null,
          errors: ['Valores inválidos'],
          statusCode: 400,
        });
      }
      QuickSort.quickSort(values, (a, b) => a > b);
    }
    if (analyze === 'qualitative' && order === 'true') {
      QuickSort.quickSort(values, (a, b) => a > b);
    }

    const rows = [];
    const total = values.length;

    function createData(
      variableName,
      simpleFrequency,
      relativeFrequency,
      accumulatedFrequency,
      accumulatedPercentageFrequency
    ) {
      return {
        variableName,
        simpleFrequency,
        relativeFrequency,
        accumulatedFrequency,
        accumulatedPercentageFrequency,
      };
    }

    if (isContinue) {
      // Caso seja variável contínua:
      values = values.map((item) => Number(item));
      QuickSort.quickSort(values, (a, b) => a > b);
      let amplitude = values[values.length - 1] - values[0] + 1; // definindo a amplitude
      const k = parseInt(Math.sqrt(total)); // constante K
      const previousK = k - 1; // anterior de K
      const successor = k + 1; // sucessor de K
      const arrayK = [previousK, k, successor]; // anterior de K, K e sucessor de K
      let interval; // intervalo
      let linesCount; // Total de linhas

      for (let i = 0; i < arrayK.length; i++) {
        // Regra de negócio para definir
        if (amplitude % arrayK[0] === 0) {
          // quantidade de linhas
          linesCount = arrayK[0];
          interval = amplitude / arrayK[0];
          break;
        } else if (amplitude % arrayK[1] === 0) {
          interval = amplitude / arrayK[1];
          linesCount = arrayK[1];
          break;
        } else if (amplitude % arrayK[2] === 0) {
          linesCount = arrayK[2];
          interval = amplitude / arrayK[2];
          break;
        } else {
          amplitude++;
          i = 0;
        }
      }

      let minValue = values[0] + interval; // Valor mínimo
      const breakPoints = [minValue]; // As quebras para a tabela e o gráfico.

      for (let i = 0; i < linesCount; i++) {
        minValue += interval;
        if (breakPoints.length <= linesCount - 1) {
          breakPoints.push(minValue);
        }
      }

      const filtredValues = []; // Valores filtrados
      var j = 0;
      for (const i of breakPoints) {
        filtredValues.push(values.filter((value) => value < i));
        values.splice(0, filtredValues[j].length);
        j++;
      }

      for (let i = 0; i < filtredValues.length; i++) {
        if (i === 0) {
          rows.push(createData(`${filtredValues[i][0]} - ${breakPoints[i]}`)); // Criação das linhas caso seja o primeira linha
        } else {
          rows.push(createData(`${breakPoints[i - 1]} - ${breakPoints[i]}`)); // Criação das demais linhas
        }
        rows[i].simpleFrequency = filtredValues[i].length; // Valores de frequência simples
        rows[i].relativeFrequency = (filtredValues[i].length / total) * 100; // Valores de frequência relativa
        if (i === 0) {
          rows[i].accumulatedFrequency = rows[i].simpleFrequency; // Inicio do acumulador
          rows[i].accumulatedPercentageFrequency = rows[i].relativeFrequency;
        } else {
          rows[i].accumulatedFrequency =
            rows[i - 1].accumulatedFrequency + rows[i].simpleFrequency; // Acumulado frequência acumulada
          rows[i].accumulatedPercentageFrequency =
            rows[i - 1].accumulatedPercentageFrequency +
            rows[i].relativeFrequency; // Acumulado freqûencia acumulada percentual
        }
      }
    }
    if (!isContinue) {
      const simpleFrequency = values.reduce((age, count) => {
        // Criação da frquência simples
        if (!age[count]) {
          age[count] = 1;
        } else {
          age[count]++;
        }
        return age;
      }, {});

      const tableRow = Object.getOwnPropertyNames(simpleFrequency); // Criação das linhas

      let simpleFrequencyValues = Object.values(simpleFrequency); // Valores de frquência simples
      let accumulatedFrequence = simpleFrequencyValues; // Frquência acumulada

      simpleFrequencyValues = simpleFrequencyValues.map((item) => {
        // Conversão para number e formatação a 2 casas
        return Number((item / total) * 100).toFixed(2);
      });

      simpleFrequencyValues = simpleFrequencyValues.map((item) => {
        item = Number(item);
        const parseItem = Math.trunc(item);
        const floatItem = Number((item - parseItem).toFixed(2));
        if (floatItem >= 0.5) {
          return parseItem + 1; // Regra de arredondamento
        }
        return parseItem; // Relative Frequency
      });

      for (const i of tableRow) {
        rows.push(createData([i], simpleFrequency[i])); // Criação das linhas
      }

      for (let i = 0; i < simpleFrequencyValues.length; i++) {
        rows[i].relativeFrequency = simpleFrequencyValues[i]; // Valores de frquencia relativa
      }

      accumulatedFrequence = Helper.accumulate(accumulatedFrequence); // Acumulador frequência acumulada
      const accumulatedPercentageFrequency = Helper.accumulate(
        simpleFrequencyValues
      ); // Acumulador frequência acumulada percentual

      for (let i = 0; i < rows.length; i++) {
        rows[i].accumulatedFrequency = accumulatedFrequence[i];
        rows[i].accumulatedPercentageFrequency =
          accumulatedPercentageFrequency[i];
        if (rows[i].accumulatedPercentageFrequency > 100) {
          rows[i].accumulatedPercentageFrequency = 100; // Arredondamento em valores excedentes.
        }
      }
    }

    let media = '';
    let moda = [];
    let mediana = '';
    let medidaSeparatriz = '';
    let desvioPadrao = '';
    let variancia = '';

    if (analyze === 'qualitative') {
      media = 'Não existe média para variáveis qualitativas.';
      let posModa = rows.map((row) => row.simpleFrequency);
      QuickSort.quickSort(posModa, (a, b) => a > b);
      posModa = posModa[posModa.length - 1];
      rows.map((row) => {
        if (row.simpleFrequency === posModa) {
          moda.push(row.variableName[0]); // Moda p/ varáveis qualitativas
        }
      });
      if (moda.length === rows.length) {
        moda = []; // Caso todos os valores sejam iguais, não existe moda.
      }

      const posMediana = total / 2;
      mediana = values[posMediana - 1];

      const posSeparatriz = parseInt((separatingMeasure / 100) * total);
      for (let i = 1; i <= values.length; i++) {
        if (posSeparatriz === 0) {
          medidaSeparatriz = values[i];
          break;
        }
        if (i === posSeparatriz) {
          medidaSeparatriz = values[i - 1];
          break;
        }
      }
    }

    if (analyze === 'discreteQuantitative') {
      const xi = rows.map((row) => row.variableName[0]);
      const fi = rows.map((row) => row.simpleFrequency);
      const acumulador = [];
      for (let i = 0; i < xi.length; i++) {
        acumulador.push(Number(fi[i] * xi[i]));
      }
      const somaTotal = acumulador.reduce(
        (total, acumulador) => total + acumulador,
        0
      );
      media = somaTotal / total;
      let posModa = rows.map((row) => row.simpleFrequency);
      QuickSort.quickSort(posModa, (a, b) => a > b);
      posModa = posModa[posModa.length - 1];
      rows.map((row) => {
        if (row.simpleFrequency === posModa) {
          moda.push(row.variableName[0]);
        }
      });
      if (moda.length === rows.length) {
        moda = [];
      }

      const posMediana = total / 2;
      mediana = valoresOrdenados[parseInt(posMediana) - 1];

      const posSeparatriz = parseInt((separatingMeasure / 100) * total);
      for (let i = 1; i <= values.length; i++) {
        if (posSeparatriz === 0) {
          medidaSeparatriz = values[i];
          break;
        }
        if (i === posSeparatriz) {
          medidaSeparatriz = values[i - 1];
          break;
        }
      }

      const somaDesvioPadrao = [];
      for (let i = 0; i < xi.length; i++) {
        somaDesvioPadrao.push(Number((xi[i] - media) ** 2 * fi[i]).toFixed(3));
      }
      const totalSoma = somaDesvioPadrao.reduce(
        (totalSoma, item) => Number(totalSoma) + Number(item),
        0
      );
      if (method === 'population') {
        desvioPadrao = Number(Math.sqrt(totalSoma / total)).toFixed(2);
      } else {
        desvioPadrao = Number(Math.sqrt(totalSoma / (total - 1))).toFixed(2);
      }
      variancia = `${Number((desvioPadrao / media) * 100).toFixed(2)}%`;
    }

    if (isContinue) {
      let pontosMedios = rows.map((row) => row.variableName.split('-')); // Quebrando as strings das tabelas.
      pontosMedios = pontosMedios.map(
        (item) => (Number(item[0]) + Number(item[1])) / 2
      ); // Definição dos pontos médios.
      const fi = rows.map((row) => row.simpleFrequency);
      const acumulador = [];
      for (let i = 0; i < pontosMedios.length; i++) {
        acumulador.push(Number(fi[i] * pontosMedios[i]));
      }
      const somaTotal = acumulador.reduce(
        (total, acumulador) => total + acumulador,
        0
      );
      media = (somaTotal / total).toFixed(2);
      const totalSoma = pontosMedios.reduce(
        (totalSoma, item) => Number(totalSoma) + Number(item),
        0
      );
      desvioPadrao = Number(Math.sqrt(totalSoma / total)).toFixed(2);
      variancia = `${Number((desvioPadrao / media) * 100).toFixed(2)}%`;
      let posModa = rows.map((row) => row.simpleFrequency);
      QuickSort.quickSort(posModa, (a, b) => a > b);
      posModa = posModa[posModa.length - 1];
      rows.map((row) => {
        if (row.simpleFrequency === posModa) {
          let intervalos = row.variableName.split('-');
          intervalos = intervalos.map((item) => Number(item));
          const somaTotal = intervalos.reduce(
            (total, intervalos) => total + intervalos,
            0
          );
          moda.push(Math.round(somaTotal / 2));
        }
      });
      const posMediana = parseInt(total / 2);
      const valorMediana = valoresOrdenados[posMediana - 1];
      let menorValorSeparatrizReal;
      let maiorValorRealSeparatriz;
      let linhaMediana = rows.map((row) => {
        let menorValorSeparatriz = row.variableName.split('-');
        menorValorSeparatriz = menorValorSeparatriz[0];
        let maiorValorSeparatriz = row.variableName.split('-');
        maiorValorSeparatriz = maiorValorSeparatriz[1];
        menorValorSeparatriz = Number(menorValorSeparatriz);
        maiorValorSeparatriz = Number(maiorValorSeparatriz);
        if (
          Number(valorMediana) >= menorValorSeparatriz &&
          Number(valorMediana) < maiorValorSeparatriz
        ) {
          maiorValorRealSeparatriz = maiorValorSeparatriz;
          menorValorSeparatrizReal = menorValorSeparatriz;
          return row; // Definição da linhas real mediana.
        }
      });
      let posFant = '';
      linhaMediana = linhaMediana.filter((item) => item); // Limpando o array, caso haja itens inválidos (undefined).
      for (let i = 0; i < linhaMediana.length; i++) {
        if (linhaMediana[i]) {
          if (linhaMediana.length === 1) {
            posFant = i = 0;
            break;
          }
          posFant = i - 1;
          break;
        }
      }
      const fant = rows[posFant].accumulatedFrequency; // Frquencia acumulada anterior
      linhaMediana = linhaMediana.filter((item) => item); // Limpando o array.
      const fimd = linhaMediana[0].simpleFrequency; // Frquência FI linha mediana
      const altura = maiorValorRealSeparatriz - menorValorSeparatrizReal; // Constante H
      mediana =
        menorValorSeparatrizReal + ((posMediana - fant) / fimd) * altura;

      const posSeparatriz = (separatingMeasure / 100) * total;
      const valorSeparatriz = valoresOrdenados[posSeparatriz - 1];
      let linhaSeparatriz = rows.map((row) => {
        let menorValorSeparatriz = row.variableName.split('-');
        menorValorSeparatriz = menorValorSeparatriz[0];
        let maiorValorSeparatriz = row.variableName.split('-');
        maiorValorSeparatriz = maiorValorSeparatriz[1];
        menorValorSeparatriz = Number(menorValorSeparatriz);
        maiorValorSeparatriz = Number(maiorValorSeparatriz);
        if (
          Number(valorSeparatriz) >= menorValorSeparatriz &&
          Number(valorSeparatriz) < maiorValorSeparatriz
        ) {
          maiorValorRealSeparatriz = maiorValorSeparatriz;
          menorValorSeparatrizReal = menorValorSeparatriz;
          return row; // Definição da linhas real mediana.
        }
      });
      let posFantSeparatriz = '';
      linhaSeparatriz = linhaSeparatriz.filter((item) => item); // Limpando o array, caso haja itens inválidos (undefined).
      for (let i = 0; i < linhaSeparatriz.length; i++) {
        if (linhaSeparatriz[i]) {
          if (linhaSeparatriz.length === 1) {
            posFantSeparatriz = i = 0;
            break;
          }
          posFantSeparatriz = i - 1;
          break;
        }
      }
      const fantSeparatriz = rows[posFantSeparatriz].accumulatedFrequency; // Frquencia acumulada anterior
      linhaSeparatriz = linhaSeparatriz.filter((item) => item); // Limpando o array.
      const fimdSeparatriz = linhaSeparatriz[0].simpleFrequency; // Frquência FI linha mediana
      const alturaSeparatriz =
        maiorValorRealSeparatriz - menorValorSeparatrizReal; // Constante H
      medidaSeparatriz = Number(
        menorValorSeparatrizReal +
          ((posSeparatriz - fantSeparatriz) / fimdSeparatriz) * alturaSeparatriz
      ).toFixed(2);
    }
    if (mediana / 1) {
      // Verificação se é um numero que possa ser convertido
      mediana = Math.abs(mediana).toFixed(2);
    }
    if (media / 1) {
      // Verificação se é um numero que possa ser convertido
      media = Number(media).toFixed(2);
    }
    let stringModa = '';
    for (let i = 0; i < moda.length; i++) {
      // Resposta personalizada da moda.
      if (moda.length === 1) {
        stringModa = moda[i]; // Caso seja somente somente uma moda
        break;
      }
      stringModa = `${stringModa + moda[i] + ', '}`; // Concatenando modas
    }

    rows.forEach((row) => {
      row.relativeFrequency = Number(row.relativeFrequency.toFixed(2));
      row.accumulatedPercentageFrequency = Number(
        row.accumulatedPercentageFrequency.toFixed(2) // Arredondamento
      );
    });

    return response.json({
      total: total,
      rows: rows,
      media,
      moda: stringModa,
      mediana,
      medidaSeparatriz,
      variancia,
      desvioPadrao,
    });
  },
  async calculateProbability(request, response) {
    const { method } = request.body;
    let probabilidade;
    let media;
    let desvioPadrao;
    let coeficienteVariacao;
    if (method === 'binomial') {
      const { sampleSize, successRate, failRate, eventSelected } = request.body;
      const numberSampleSize = Number(sampleSize);
      const numberSuccessRate = Number(successRate);
      const numberFailRate = Number(failRate);
      const numberEventSelected = Number(eventSelected);
      const fatN = Fatorial.fatorial(numberSampleSize);
      const subtration = numberSampleSize - eventSelected;
      const combinatoryAnalisys =
        fatN /
        (Fatorial.fatorial(subtration) *
          Fatorial.fatorial(numberEventSelected));
      probabilidade =
        combinatoryAnalisys *
        Math.pow(numberSuccessRate, numberEventSelected) *
        Math.pow(numberFailRate, numberSampleSize - numberEventSelected);
      probabilidade = Number(probabilidade * 100).toFixed(2);
      probabilidade = Number(probabilidade);
    }
    if (method === 'normal') {
      const {
        moreThan,
        lessThan,
        betweenA,
        betweenB,
        media,
        desvioPadrao,
      } = request.body;
      if (moreThan) {
        console.log('maior que');
        const scoreZ = String(
          Math.abs(
            Number((moreThan - media) / desvioPadrao).toFixed(2)
          ).toPrecision()
        );
        const verticalAxie = scoreZ.substr(0, 3);
        const horizontalAxie = scoreZ[scoreZ.length - 1];
        const result = TableZ.table[verticalAxie][horizontalAxie];
        probabilidade = (0.5 - result) * 100;
        if (moreThan < media) {
          probabilidade = (0.5 + result) * 100;
        }
        probabilidade = Number(probabilidade.toFixed(2));
      }
      if (lessThan) {
        console.log('menor que');
        const scoreZ = String(
          Math.abs(
            Number((lessThan - media) / desvioPadrao).toFixed(2)
          ).toPrecision()
        );
        const verticalAxie = scoreZ.substr(0, 3);
        const horizontalAxie = scoreZ[scoreZ.length - 1];
        const result = TableZ.table[verticalAxie][horizontalAxie];
        probabilidade = (0.5 - result) * 100;
        probabilidade = Number(probabilidade.toFixed(2));
        console.log(probabilidade);
      }
      if (betweenA && betweenB) {
        console.log('entre');
        let resultA;
        let resultB;
        if (betweenA === media) {
          resultA = 0;
        } else {
          const scoreZA = String(
            Math.abs(
              Number((betweenA - media) / desvioPadrao).toFixed(2)
            ).toPrecision()
          );
          const verticalAxieA = scoreZA.substr(0, 3);
          const horizontalAxieA = scoreZA[scoreZA.length - 1];

          resultA = TableZ.table[verticalAxieA][horizontalAxieA];
          console.log(resultA);
        }

        if (betweenB === media) {
          resultB = 0;
        } else {
          const scoreZB = String(
            Math.abs(
              Number((betweenB - media) / desvioPadrao).toFixed(2)
            ).toPrecision()
          );
          const verticalAxieB = scoreZB.substr(0, 3);
          const horizontalAxieB = scoreZB[scoreZB.length - 1];

          resultB = TableZ.table[verticalAxieB][horizontalAxieB];
        }

        probabilidade = (resultA + resultB) * 100;
        probabilidade = Number(probabilidade.toFixed(2));
        if (betweenA > media && betweenB > media) {
          if (betweenB > betweenA) {
            probabilidade = (resultB - resultA) * 100;
            probabilidade = Number(probabilidade.toFixed(2));
          }
        }
      }
    }
    if (method === 'uniforme') {
      const {
        valueA,
        valueB,
        moreThan,
        lessThan,
        betweenA,
        betweenB,
      } = request.body;
      const numberValueA = Number(valueA);
      const numberValueB = Number(valueB);
      const numberMoreThan = Number(moreThan);
      const numberLessThan = Number(lessThan);
      const numberBetweenA = Number(betweenA);
      const numberBetweenB = Number(betweenB);
      media = (numberValueA + numberValueB) / 2;
      desvioPadrao = Math.sqrt(Math.pow(numberValueB - numberValueA, 2) / 12);
      coeficienteVariacao = (desvioPadrao / media) * 100;
      if (moreThan) {
        probabilidade =
          (1 / (numberValueB - numberValueA)) *
          (numberValueB - numberMoreThan) *
          100;
      }
      if (betweenA && betweenB) {
        const intervalo = numberBetweenB - numberBetweenA;

        probabilidade = (1 / (numberValueB - numberValueA)) * intervalo * 100;
      }
      if (lessThan) {
        const intervalo = numberLessThan - numberValueA;
        probabilidade = (1 / (numberValueB - numberValueA)) * intervalo * 100;
      }

      probabilidade = Number(probabilidade.toFixed(2));
      desvioPadrao = Number(desvioPadrao.toFixed(2));
      media = Number(media.toFixed(2));
      coeficienteVariacao = Number(coeficienteVariacao.toFixed(2));
    }
    return response.json({
      probabilidade,
      media,
      desvioPadrao,
      coeficienteVariacao,
    });
  },
  async calculateCorrelation(request, response) {
    const { xValues, yValues } = request.body;
    let regressaoLinear = '';
    let correlacaoLinear = '';
    const numberXValues = xValues.map((item) => Number(item));
    const numberYValues = yValues.map((item) => Number(item));
    if (xValues.length !== yValues.length) {
      return response.status(400).send(new Error('Valores inválidos'));
    }
    const totalN = numberXValues.length; // Poderia ser numberYValues também.
    const somatorioX = numberXValues.reduce(
      (somatorioX, item) => somatorioX + item,
      0
    );
    const somatorioY = numberYValues.reduce(
      (somatorioY, item) => somatorioY + item,
      0
    );

    const multiplicacaoXY = numberXValues
      .map((item, index) => item * numberYValues[index])
      .reduce((multiplicacaoXY, item) => multiplicacaoXY + item, 0);

    const quadradoX = numberXValues
      .map((item) => Math.pow(item, 2))
      .reduce((quadradoX, item) => quadradoX + item);

    const quadradoY = numberYValues
      .map((item) => Math.pow(item, 2))
      .reduce((quadradoY, item) => quadradoY + item);

    function ajuste(nr, casas) {
      const og = Math.pow(10, casas);
      return Math.floor(nr * og) / og;
    }

    const alpha = Number(
      (totalN * multiplicacaoXY - somatorioX * somatorioY) /
        (totalN * quadradoX - Math.pow(somatorioX, 2))
    );
    const mediaX = somatorioX / totalN;
    const mediaY = somatorioY / totalN;
    const beta = Number(mediaY - alpha * mediaX);

    regressaoLinear = `y = ${ajuste(alpha, 2)}.x ${ajuste(beta, 2)}`;

    // Correlação:

    const quadradoSomatorioX = Math.pow(somatorioX, 2);
    const quadradoSomatorioY = Math.pow(somatorioY, 2);

    correlacaoLinear =
      (totalN * multiplicacaoXY - somatorioX * somatorioY) /
      (Math.sqrt(totalN * quadradoX - quadradoSomatorioX) *
        Math.sqrt(totalN * quadradoY - quadradoSomatorioY));
    correlacaoLinear = Number(Math.abs(ajuste(correlacaoLinear, 2) * 100));
    if (correlacaoLinear <= 33.33) {
      correlacaoLinear = `${correlacaoLinear}% (Fraca)`;
    } else if (correlacaoLinear > 33.33 && correlacaoLinear <= 66.66) {
      correlacaoLinear = `${correlacaoLinear}% (Moderada)`;
    } else if (correlacaoLinear > 66.66 && correlacaoLinear <= 99.99) {
      correlacaoLinear = `${correlacaoLinear}% (Forte)`;
    } else {
      correlacaoLinear = `${correlacaoLinear}% (Perfeita)`;
    }

    return response.json({
      teste: 'ok',
      regressaoLinear,
      correlacaoLinear,
    });
  },
  async ping(req, res) {
    return res.json('API OK');
  },
};
