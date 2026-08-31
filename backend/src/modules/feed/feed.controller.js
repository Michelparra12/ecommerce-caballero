import { buildProductFeedXml } from './feed.service.js';

// Instagram/Facebook Catalog hace polling periódico de esta URL, no
// requiere autenticación (es un endpoint público de solo lectura).
export async function getProductFeedHandler(req, res) {
  const xml = await buildProductFeedXml();

  res.set('Content-Type', 'application/xml; charset=utf-8');
  res.status(200).send(xml);
}
