// Geolocalizacao em segundo plano sem versao web: toda funcao resolve vazio.
// `then` volta undefined para o modulo nao parecer uma Promise.
function nativeFn() {
  return Promise.resolve({});
}

const stub = new Proxy(nativeFn, {
  get(target, key) {
    if (key === '__esModule') return true;
    if (key === 'default') return stub;
    if (typeof key === 'symbol' || key === 'then') return undefined;
    if (key in target) return target[key];
    return stub;
  },
});

module.exports = stub;
