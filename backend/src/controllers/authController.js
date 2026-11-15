export function getAuthenticatedUser(req,res) {
  res.set('Cache-Control','no-store');
  res.json(req.user);
}
