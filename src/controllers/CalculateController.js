const Helper = require('../helpers/accumulator');

module.exports = {
  async calculate(request, response) {
    let { analyze, order, values, isContinue } = request.body;
    let valoresOrdenados = values;
    valoresOrdenados = valoresOrdenados.sort((a, b) => a - b);
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
      values.sort((comparingA, comparingB) => {
        return comparingA - comparingB;
      }); // Organizando do menor para o maior
    }
    if (analyze === 'qualitative' && order === 'true') {
      values.sort();
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
      values = values.sort((a, b) => a - b);
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

    if (analyze === 'qualitative') {
      media = 'Não existe para varáveis qualitativas.';
      let posModa = rows.map((row) => row.simpleFrequency);
      posModa = posModa.sort((a, b) => a - b);
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
      posModa = posModa.sort((a, b) => a - b);
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
      let posModa = rows.map((row) => row.simpleFrequency);
      posModa = posModa.sort((a, b) => a - b);
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
      let menorValorReal;
      let maiorValorReal;
      let linhaMediana = rows.map((row) => {
        let menorValor = row.variableName.split('-');
        menorValor = menorValor[0];
        let maiorValor = row.variableName.split('-');
        maiorValor = maiorValor[1];
        menorValor = Number(menorValor);
        maiorValor = Number(maiorValor);
        if (
          Number(valorMediana) >= menorValor &&
          Number(valorMediana) < maiorValor
        ) {
          maiorValorReal = maiorValor;
          menorValorReal = menorValor;
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
      const altura = maiorValorReal - menorValorReal; // Constante H
      mediana = menorValorReal + ((posMediana - fant) / fimd) * altura;
    }
    mediana = Math.abs(mediana).toFixed(2);
    media = Number(media).toFixed(2);
    let stringModa = '';
    for (let i = 0; i < moda.length; i++) {
      // Resposta personalizada da moda.
      if (moda.length === 1) {
        stringModa = moda[i];
        break;
      }
      stringModa = `${stringModa + moda[i] + ', '}`;
    }

    return response.json({
      total: total,
      rows: rows,
      media,
      moda: stringModa,
      mediana,
    });
  },
  async ping(req, res) {
    return res.json('API OK');
  },
};
