// jest.config.js
module.exports = {
    testEnvironment: 'node',

    // Padrões de arquivos que o Jest deve considerar como testes
    testMatch: [
        '**/__tests__/**/*.test.js?(x)', // Procura arquivos .test.js ou .test.jsx em pastas __tests__
        '**/?(*.)+(spec|test).js?(x)',  // Procura arquivos .spec.js ou .test.js
    ],

    // Ignora a pasta node_modules e outras que não contêm testes
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],

    // Configurações para cobertura de código (opcional)
    // collectCoverage: true,
    // coverageDirectory: 'coverage',
    // coverageReporters: ['json', 'lcov', 'text', 'clover'],

    // Se você usar variáveis de ambiente nos testes, pode carregá-las aqui
    // setupFiles: ['dotenv/config'], // Exemplo: Carrega .env antes dos testes

    // Tempo máximo que um teste pode rodar (em milissegundos)
    testTimeout: 30000, // Aumenta o timeout padrão (5000ms) se seus testes demorarem mais

    // Limpa mocks entre cada teste
    clearMocks: true,
};