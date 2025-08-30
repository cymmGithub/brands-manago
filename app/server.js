const express = require('express');
const path = require('path');
const config = require('./config');

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));
app.use('/js', express.static(path.join(__dirname, '..', 'frontend', 'src', 'js')));

const productRoutes = require('./routes/product-routes');
app.use('/api', productRoutes);

app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'index.html'));
});

app.use((err, req, res) => {
	console.error(err.stack);
	res.status(500).json({
		success: false,
		message: 'Something went wrong!',
	});
});

const port = config.port;
app.listen(port, () => {
	console.log(`🚀 Forma'Sint server running at http://localhost:${port}`);
	console.log(`📁 Serving static files from: ${path.join(__dirname, '..', 'frontend', 'public')}`);
	console.log(`🔌 API endpoints available at: http://localhost:${port}/api`);
});

module.exports = app;
