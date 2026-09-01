-- Subconjunto del schema real (001_schema.sql) usado en tests con
-- pg-mem. Solo incluye lo que order.repository.js necesita para probar
-- la transacción de stock: no incluye triggers (pg-mem no soporta
-- CREATE TRIGGER de forma confiable) ni columnas ajenas a este flujo.
-- Los tipos, CHECKs y foreign keys sí reflejan el schema real, así la
-- prueba detecta violaciones de constraint reales (no solo lógica JS).

CREATE TYPE order_status AS ENUM (
  'pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
);

CREATE TABLE usuarios (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE categorias (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL
);

CREATE TABLE productos (
  id BIGSERIAL PRIMARY KEY,
  categoria_id BIGINT NOT NULL REFERENCES categorias (id),
  nombre VARCHAR(200) NOT NULL,
  precio NUMERIC(12, 2) NOT NULL CHECK (precio >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- pg-mem no expone una secuencia con nombre para columnas BIGSERIAL
-- (nextval('tabla_id_seq') falla), pero order.repository.js depende de
-- poder hacer nextval('ordenes_id_seq') para construir numero_orden
-- ANTES del INSERT. Se crea la secuencia explícitamente para que el
-- test ejerza ese mismo camino de código real.
CREATE SEQUENCE ordenes_id_seq;

CREATE TABLE ordenes (
  id BIGINT PRIMARY KEY DEFAULT nextval('ordenes_id_seq'),
  usuario_id BIGINT NOT NULL REFERENCES usuarios (id),
  direccion_id BIGINT,
  numero_orden VARCHAR(20) NOT NULL UNIQUE,
  estado order_status NOT NULL DEFAULT 'pending_payment',
  metodo_pago VARCHAR(20),
  subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  costo_envio NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (costo_envio >= 0),
  total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
  referencia_pasarela VARCHAR(120),
  guia_envio VARCHAR(120),
  notas TEXT
);

CREATE TABLE detalle_ordenes (
  id BIGSERIAL PRIMARY KEY,
  orden_id BIGINT NOT NULL REFERENCES ordenes (id),
  producto_id BIGINT NOT NULL REFERENCES productos (id),
  variante_id BIGINT,
  nombre_producto VARCHAR(200) NOT NULL,
  precio_unitario NUMERIC(12, 2) NOT NULL CHECK (precio_unitario >= 0),
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  subtotal_linea NUMERIC(12, 2) NOT NULL CHECK (subtotal_linea >= 0)
);
