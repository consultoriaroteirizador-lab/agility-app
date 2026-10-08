/* global Blob */
// No navegador, FormData.append nao entende o formato do React Native
// ({ uri, name, type }) e manda o campo vazio: o back responde "Nenhum arquivo
// enviado". Aqui a uri (blob: ou data:) vira um Blob. O XHR e sincrono porque
// append e sincrono.
if (typeof FormData !== 'undefined' && typeof XMLHttpRequest !== 'undefined' && !FormData.prototype.__webSmokeFiles) {
  const append = FormData.prototype.append;
  FormData.prototype.append = function (name, value, filename) {
    if (value && typeof value === 'object' && typeof value.uri === 'string' && !(value instanceof Blob)) {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', value.uri, false);
        xhr.overrideMimeType('text/plain; charset=x-user-defined');
        xhr.send();
        const text = xhr.responseText;
        const bytes = new Uint8Array(text.length);
        for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
        const blob = new Blob([bytes], { type: value.type || 'application/octet-stream' });
        return append.call(this, name, blob, value.name || filename || 'file');
      } catch (error) {
        console.warn('[web-smoke] FormData: nao converteu a uri em Blob', error);
      }
    }
    return append.call(this, name, value, filename);
  };
  FormData.prototype.__webSmokeFiles = true;
}
