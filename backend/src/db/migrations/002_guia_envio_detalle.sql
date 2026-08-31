-- Amplía la información de envío de una orden: la columna original
-- guia_envio pasa a ser solo el número de guía; se agregan transportadora
-- y URL de seguimiento para poder armar el mensaje de WhatsApp completo
-- (evento 'guia.enviada' hacia n8n).
ALTER TABLE ordenes
  ADD COLUMN transportadora VARCHAR(100),
  ADD COLUMN url_seguimiento VARCHAR(500);

COMMENT ON COLUMN ordenes.guia_envio IS 'Número de guía de la transportadora (ej: 1234567890)';
