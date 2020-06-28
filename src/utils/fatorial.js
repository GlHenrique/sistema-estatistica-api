function fatorial(n) {
  if (n < 0) return 0;
  // Condição de saída
  else if (n === 0) return 1;
  // Condição de saída
  else return n * fatorial(n - 1);
}

module.exports = {
  fatorial(n) {
    if (n < 0) return 0;
    // Condição de saída
    else if (n === 0) return 1;
    // Condição de saída
    else return n * fatorial(n - 1);
  },
};
