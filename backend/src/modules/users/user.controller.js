// req.user ya fue resuelto y adjuntado por el middleware requireAuth,
// así que este handler es solo una proyección del perfil autenticado.
export async function getMeHandler(req, res) {
  res.status(200).json({ data: req.user });
}
