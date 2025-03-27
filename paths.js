// paths.js
const path = require('path');
const root = path.resolve(__dirname);

module.exports = {
    root,
    middlewares: (...p) => path.join(root, 'src', 'middlewares', ...p),
    utils: (...p) => path.join(root, 'src', 'utils', ...p)
};