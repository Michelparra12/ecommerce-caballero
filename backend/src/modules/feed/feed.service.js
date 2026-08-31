import { findFeedProducts } from './feed.repository.js';
import { env } from '../../config/env.js';

// Escapa entidades XML para que un nombre/descripción de producto con
// "&", "<", ">" etc. nunca rompa el feed ni permita inyectar markup.
function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Genera el feed RSS 2.0 con el namespace "g:" que exige Meta Commerce
 * Manager para sincronizar el catálogo con Instagram Shopping y
 * Facebook Shop. Spec: https://developers.facebook.com/docs/commerce-platform/catalog/feeds
 */
export async function buildProductFeedXml() {
  const products = await findFeedProducts();

  const items = products
    .map((p) => {
      const availability = p.stock > 0 ? 'in stock' : 'out of stock';
      const productUrl = `${env.FRONTEND_URL}/productos/${p.slug}`;

      return `
    <item>
      <g:id>${escapeXml(p.sku)}</g:id>
      <g:title>${escapeXml(p.nombre)}</g:title>
      <g:description>${escapeXml(p.descripcion_corta || p.descripcion || p.nombre)}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(p.imagen_principal_url)}</g:image_link>
      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${Number(p.precio).toFixed(2)} COP</g:price>
      <g:brand>${escapeXml(p.marca || env.COMPANY_NAME || 'Genérico')}</g:brand>
      <g:google_product_category>${escapeXml(p.categoria_nombre)}</g:google_product_category>
      <g:fb_product_category>${escapeXml(p.categoria_nombre)}</g:fb_product_category>
    </item>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Catálogo de Accesorios de Caballero</title>
    <link>${escapeXml(env.FRONTEND_URL)}</link>
    <description>Feed de productos para Instagram Shopping y Facebook Shop</description>
    ${items}
  </channel>
</rss>`;
}
