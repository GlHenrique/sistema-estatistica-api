module.exports = {
  accumulate(vet) {
    for (let i = 0; i < vet.length; i++) {
      if (i > 0) {
        vet[i] += vet[i - 1];
      }
    }
    return vet;
  },
};
