function troca(vet, i, j) {
  const aux = vet[i];
  vet[i] = vet[j];
  vet[j] = aux;
}

function quickSort(vet, fnComp, posIni = 0, posFim = vet.length - 1) {
  if (posFim > posIni) {
    const posPivot = posFim;
    let posDiv = posIni - 1;

    for (let i = posIni; i < posFim; i++) {
      if (fnComp(vet[posPivot], vet[i])) {
        posDiv++;
        troca(vet, i, posDiv);
      }
    }
    posDiv++;
    troca(vet, posDiv, posPivot);

    quickSort(vet, fnComp, posIni, posDiv - 1);

    quickSort(vet, fnComp, posDiv + 1, posFim);
  }
}

module.exports = {
  quickSort(vet, fnComp, posIni = 0, posFim = vet.length - 1) {
    if (posFim > posIni) {
      const posPivot = posFim;
      let posDiv = posIni - 1;

      for (let i = posIni; i < posFim; i++) {
        if (fnComp(vet[posPivot], vet[i])) {
          posDiv++;
          troca(vet, i, posDiv);
        }
      }
      posDiv++;
      troca(vet, posDiv, posPivot);

      quickSort(vet, fnComp, posIni, posDiv - 1);

      quickSort(vet, fnComp, posDiv + 1, posFim);
    }
  },
};
