// Mapa nativo sem versao web: todo componente exportado renderiza nada.
// As chaves que o React inspeciona voltam undefined, senao ele trata o
// substituto como componente de classe e enche o console de avisos.
const REACT_KEYS = new Set([
  '$$typeof', 'then', 'type', 'render', 'compare', 'displayName', 'defaultProps', 'propTypes',
  'contextType', 'contextTypes', 'childContextTypes', 'getDerivedStateFromProps',
  'getDerivedStateFromError', 'getSnapshotBeforeUpdate', 'isReactComponent',
]);

function NativeStub() {
  return null;
}

const stub = new Proxy(NativeStub, {
  get(target, key) {
    if (key === '__esModule') return true;
    if (key === 'default') return stub;
    if (typeof key === 'symbol' || REACT_KEYS.has(key)) return undefined;
    if (key in target) return target[key];
    return stub;
  },
});

module.exports = stub;
