const express = require('express');
     const path = require('path');
     const app = express();

     // Serve static files from the current directory
     app.use(express.static(path.join(__dirname)));

     // Handle all routes by serving index.html (for SPA routing)
     app.get('*', (req, res) => {
         res.sendFile(path.join(__dirname, 'index.html'));
     });

     // Start server on port 8080
     const PORT = 8080;
     app.listen(PORT, () => {
         console.log(`Frontend server running on http://localhost:${PORT}`);
     });