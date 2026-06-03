const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running smoothly' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
