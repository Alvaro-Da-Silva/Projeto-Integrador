import 'dotenv/config';
import { createApp } from './app.js';

const PORT = Number(process.env.PORT || 8080);
const app = createApp();

app.listen(PORT, process.env.HOST, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
