import app from "../server";

// Fallback 404 para rutas de /api/* que no coincidan en entorno serverless
app.all("/api/*", (req, res) => {
  return res.status(404).json({
    success: false,
    message: `Ruta de API no encontrada: ${req.method} ${req.originalUrl || req.path}`
  });
});

export default app;

