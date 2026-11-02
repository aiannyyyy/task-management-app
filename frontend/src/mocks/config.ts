/** True when the app should serve sample data instead of calling the real API. */
export const isMockMode = (): boolean =>
  process.env.REACT_APP_USE_MOCKS === 'true';

export const MOCK_TOKEN = 'mock-portfolio-jwt-token';
