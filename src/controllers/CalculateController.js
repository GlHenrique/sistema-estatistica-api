const Helper = require('../helpers/accumulator');

module.exports = {
    async calculate(request, response) {
        let {
            analyze,
            order,
            values,
            isContinue,
        } = request.body;
        let valoresOrdenados = values;
        valoresOrdenados = valoresOrdenados.sort((a, b) => a - b);
        if (analyze === 'discreteQuantitative') {
            values = values.map(item => {
                return Number(item); // Convertendo para Number
            });
            if (values.includes(NaN)) {
                return response.status(400).json({
                    content: null,
                    errors: ['Valores inválidos'],
                    statusCode: 400
                });
            }
            values.sort(
                (comparingA, comparingB) => {
                    return comparingA - comparingB;
                }
            ); // Organizando do menor para o maior
        }
        // if (analyze === 'qualitative' && order === 'false') {
        //     return response.json({
        //         arrayFormatted: values
        //     })
        // }
        if (analyze === 'qualitative' && order === 'true') {
            values.sort();
        }

        let rows = [];
        let total = values.length;

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
                accumulatedPercentageFrequency
            };
        }

        if (isContinue) {
            values = values.map(item => Number(item));
            values = values.sort((a, b) => a - b);
            let amplitude =
                values[values.length - 1] - values[0] + 1;
            const k = parseInt(Math.sqrt(total));
            const previousK = k - 1;
            const successor = k + 1;
            const arrayK = [previousK, k, successor];
            let interval;
            let linesCount;

            for (let i = 0; i < arrayK.length; i++) {
                if (amplitude % arrayK[0] === 0) {
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

            let minValue = values[0] + interval;
            let breakPoints = [minValue];

            for (let i = 0; i < linesCount; i++) {
                // rows.push(values.filter(value => {return value < minValue}));
                // rows.push([]);
                minValue += interval;
                if (breakPoints.length <= linesCount - 1) {
                    breakPoints.push(minValue);
                }
            }

            const filtredValues = [];
            var j = 0;
            for (let i of breakPoints) {
                filtredValues.push(values.filter(value => value < i));
                values.splice(0, filtredValues[j].length);
                j++;
            }

            for (let i = 0; i < filtredValues.length; i++) {
                // rows[i].values = i
                if (i === 0) {
                    rows.push(createData(`${filtredValues[i][0]} - ${breakPoints[i]}`));
                } else {
                    rows.push(createData(`${breakPoints[i - 1]} - ${breakPoints[i]}`));
                }
                rows[i].simpleFrequency = filtredValues[i].length; // Show simple Frequency
                rows[i].relativeFrequency = (filtredValues[i].length / total) * 100;
                if (i === 0) {
                    rows[i].accumulatedFrequency = rows[i].simpleFrequency; // Startpoint of accumulator
                    rows[i].accumulatedPercentageFrequency = rows[i].relativeFrequency;
                } else {
                    rows[i].accumulatedFrequency = rows[i - 1].accumulatedFrequency + rows[i].simpleFrequency;
                    rows[i].accumulatedPercentageFrequency = rows[i - 1].accumulatedPercentageFrequency + rows[i].relativeFrequency;
                }
            }

        }
        if (!isContinue) {
            const simpleFrequency = values.reduce((age, count) => {
                if (!age[count]) {
                    age[count] = 1;
                } else {
                    age[count]++;
                }
                return age;
            }, {});

            const tableRow = Object.getOwnPropertyNames(simpleFrequency);

            let simpleFrequencyValues = Object.values(simpleFrequency);
            let accumulatedFrequence = simpleFrequencyValues;

            simpleFrequencyValues = simpleFrequencyValues.map(item => {
                return Number((item / total) * 100).toFixed(2);
            });

            simpleFrequencyValues = simpleFrequencyValues.map(item => {
                item = Number(item);
                let parseItem = Math.trunc(item);
                let floatItem = Number((item - parseItem).toFixed(2));
                if (floatItem >= 0.5) {
                    return parseItem + 1;
                }
                return parseItem; // Relative Frequency
            });

            for (let i of tableRow) {
                rows.push(createData([i], simpleFrequency[i]));
            }

            for (let i = 0; i < simpleFrequencyValues.length; i++) {
                rows[i].relativeFrequency = simpleFrequencyValues[i];
            }

            accumulatedFrequence = Helper.accumulate(accumulatedFrequence);
            let accumulatedPercentageFrequency = Helper.accumulate(simpleFrequencyValues);


            for (let i = 0; i < rows.length; i++) {
                rows[i].accumulatedFrequency = accumulatedFrequence[i];
                rows[i].accumulatedPercentageFrequency =
                    accumulatedPercentageFrequency[i];
                if (rows[i].accumulatedPercentageFrequency > 100) {
                    rows[i].accumulatedPercentageFrequency = 100;
                }
            }
        }

        let media;
        let moda = [];
        let mediana;

        if (analyze === 'qualitative') {
            media = 'Não existe para varáveis qualitativas.';
            let posModa = rows.map(row => row.simpleFrequency);
            posModa = posModa.sort((a, b) => a - b);
            posModa = posModa[posModa.length - 1];
            rows.map(row => {
                if (row.simpleFrequency === posModa) {
                    moda.push(row.variableName[0]);
                }
            });
            if (moda.length === rows.length) {
                moda = [];
            };

            let posMediana = total / 2;
            mediana = values[posMediana - 1];
        }

        if (analyze === 'discreteQuantitative') {
            let xi = rows.map(row => row.variableName[0]);
            let fi = rows.map(row => row.simpleFrequency);
            let acumulador = [];
            for (let i = 0; i < xi.length; i++) {
                acumulador.push(Number(fi[i] * xi[i]));
            }
            let somaTotal = acumulador.reduce((total, acumulador) => total + acumulador, 0);
            media = somaTotal / total;
            let posModa = rows.map(row => row.simpleFrequency);
            posModa = posModa.sort((a, b) => a - b);
            posModa = posModa[posModa.length - 1];
            rows.map(row => {
                if (row.simpleFrequency === posModa) {
                    moda.push(row.variableName[0]);
                }
            });
            if (moda.length === rows.length) {
                moda = [];
            };

            let posMediana = total / 2;
            mediana = values[posMediana - 1];
        }

        if (isContinue) {
            let pontosMedios = rows.map(row => row.variableName.split('-'));
            pontosMedios = pontosMedios.map(item => (Number(item[0]) + Number(item[1])) / 2);
            let fi = rows.map(row => row.simpleFrequency);
            let acumulador = [];
            for (let i = 0; i < pontosMedios.length; i++) {
                acumulador.push(Number(fi[i] * pontosMedios[i]));
            }
            let somaTotal = acumulador.reduce((total, acumulador) => total + acumulador, 0);
            media = (somaTotal / total).toFixed(2);
            let posModa = rows.map(row => row.simpleFrequency);
            posModa = posModa.sort((a, b) => a - b);
            posModa = posModa[posModa.length - 1];
            rows.map(row => {
                if (row.simpleFrequency === posModa) {
                    let intervalos = row.variableName.split('-');
                    intervalos = intervalos.map(item => Number(item));
                    let somaTotal = intervalos.reduce((total, intervalos) => total + intervalos, 0);
                    moda.push(Math.round(somaTotal / 2));
                }
            });
            const posMediana = total / 2;
            let valorMediana = valoresOrdenados[posMediana - 1];
            let menorValorReal;
            let maiorValorReal;
            let linhaMediana = rows.map((row) => {
                let menorValor = row.variableName.split('-');
                menorValor = menorValor[0];
                let maiorValor = row.variableName.split('-');
                maiorValor = maiorValor[1];
                menorValor = Number(menorValor);
                maiorValor = Number(maiorValor);
                if (valorMediana >= menorValor && valorMediana < maiorValor) {
                    maiorValorReal = maiorValor;
                    menorValorReal = menorValor
                    return row;
                }
            });
            let posFant;
            for (let i = 0; i < linhaMediana.length; i++) {
                if (linhaMediana[i]) {
                    posFant = i - 1;
                }
            };
            let fant = rows[posFant].accumulatedFrequency;
            linhaMediana = linhaMediana.filter(item => item);
            let fimd = linhaMediana[0].simpleFrequency;
            const altura = maiorValorReal - menorValorReal;
            mediana = menorValorReal + ((posMediana - fant) / fimd) * altura;
        }

        return response.json({
            total: total,
            rows: rows,
            media,
            moda,
            mediana
        });
    },
    async ping(req, res) {
        return res.json('API OK');
    }
};
