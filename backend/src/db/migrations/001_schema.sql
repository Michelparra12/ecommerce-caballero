-- =====================================================================
-- Schema: E-commerce Accesorios de Caballero
-- Motor: PostgreSQL 14+
-- Convención: snake_case, PK como BIGSERIAL, timestamps con timezone.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- para gen_random_uuid() en slugs/tokens si se requiere

-- ---------------------------------------------------------------------
-- ENUMS: valores cerrados y validados a nivel de base de datos.
-- ---------------------------------------------------------------------
CREATE TYPE order_status AS ENUM (
  'pending_payment', -- orden creada, esperando confirmación de pasarela
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
);

CREATE TYPE payment_method AS ENUM ('pse', 'nequi', 'credit_card', 'debit_card');

-- ---------------------------------------------------------------------
-- Usuarios
-- La autenticación real vive en Firebase Auth; esta tabla es el perfil
-- de negocio, enlazado por firebase_uid (no guardamos contraseñas aquí).
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
  id              BIGSERIAL PRIMARY KEY,
  firebase_uid    VARCHAR(128) NOT NULL UNIQUE,
  email           VARCHAR(255) NOT NULL UNIQUE,
  nombre_completo VARCHAR(150) NOT NULL,
  telefono        VARCHAR(20),                 -- formato E.164, ej: +573001234567
  rol             VARCHAR(20)  NOT NULL DEFAULT 'cliente'
                    CHECK (rol IN ('cliente', 'admin')),
  activo          BOOLEAN      NOT NULL DEFAULT TRUE,
  creado_en       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_usuarios_firebase_uid ON usuarios (firebase_uid);

-- Direcciones de envío (1 usuario -> N direcciones)
CREATE TABLE direcciones (
  id              BIGSERIAL PRIMARY KEY,
  usuario_id      BIGINT NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  etiqueta        VARCHAR(50)  NOT NULL DEFAULT 'Principal',
  ciudad          VARCHAR(100) NOT NULL,
  departamento    VARCHAR(100) NOT NULL,
  direccion_linea VARCHAR(255) NOT NULL,
  codigo_postal   VARCHAR(20),
  es_predeterminada BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_direcciones_usuario ON direcciones (usuario_id);

-- ---------------------------------------------------------------------
-- Categorías (auto-referenciada para soportar subcategorías,
-- ej: "Relojes" -> "Relojes automáticos")
-- ---------------------------------------------------------------------
CREATE TABLE categorias (
  id               BIGSERIAL PRIMARY KEY,
  nombre           VARCHAR(100) NOT NULL,
  slug             VARCHAR(120) NOT NULL UNIQUE, -- usado en la URL SEO-friendly
  categoria_padre_id BIGINT REFERENCES categorias (id) ON DELETE SET NULL,
  descripcion      TEXT,
  activa           BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categorias_padre ON categorias (categoria_padre_id);
CREATE INDEX idx_categorias_slug ON categorias (slug);

-- ---------------------------------------------------------------------
-- Productos
-- ---------------------------------------------------------------------
CREATE TABLE productos (
  id                BIGSERIAL PRIMARY KEY,
  categoria_id      BIGINT NOT NULL REFERENCES categorias (id) ON DELETE RESTRICT,
  sku               VARCHAR(50)  NOT NULL UNIQUE,
  nombre            VARCHAR(200) NOT NULL,
  slug              VARCHAR(220) NOT NULL UNIQUE, -- URL SEO: /productos/reloj-automatico-acero
  descripcion_corta VARCHAR(300),
  descripcion       TEXT,
  marca             VARCHAR(100),
  precio            NUMERIC(12, 2) NOT NULL CHECK (precio >= 0),
  precio_comparacion NUMERIC(12, 2) CHECK (precio_comparacion IS NULL OR precio_comparacion >= precio),
  stock             INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  peso_gramos       INTEGER,                     -- usado para cálculo de envío
  imagen_principal_url VARCHAR(500),              -- WebP servido vía CDN
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  destacado         BOOLEAN NOT NULL DEFAULT FALSE,
  meta_title        VARCHAR(160),                 -- override SEO opcional
  meta_description  VARCHAR(320),
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_productos_categoria ON productos (categoria_id);
CREATE INDEX idx_productos_slug ON productos (slug);
CREATE INDEX idx_productos_activo_destacado ON productos (activo, destacado);
-- Búsqueda de texto (nombre + marca) para el filtro de catálogo.
CREATE INDEX idx_productos_busqueda ON productos
  USING GIN (to_tsvector('spanish', nombre || ' ' || COALESCE(marca, '')));

-- Galería de imágenes adicionales por producto (1 -> N)
CREATE TABLE producto_imagenes (
  id          BIGSERIAL PRIMARY KEY,
  producto_id BIGINT NOT NULL REFERENCES productos (id) ON DELETE CASCADE,
  url         VARCHAR(500) NOT NULL,
  orden       SMALLINT NOT NULL DEFAULT 0,
  texto_alt   VARCHAR(200) -- accesibilidad + SEO de imágenes
);

CREATE INDEX idx_producto_imagenes_producto ON producto_imagenes (producto_id);

-- Variantes (talla/color) — necesario para zapatos y pulseras.
CREATE TABLE producto_variantes (
  id            BIGSERIAL PRIMARY KEY,
  producto_id   BIGINT NOT NULL REFERENCES productos (id) ON DELETE CASCADE,
  talla         VARCHAR(20),
  color         VARCHAR(50),
  sku_variante  VARCHAR(60) NOT NULL UNIQUE,
  stock         INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  UNIQUE (producto_id, talla, color)
);

-- ---------------------------------------------------------------------
-- Órdenes
-- ---------------------------------------------------------------------
CREATE TABLE ordenes (
  id                  BIGSERIAL PRIMARY KEY,
  usuario_id          BIGINT NOT NULL REFERENCES usuarios (id) ON DELETE RESTRICT,
  direccion_id         BIGINT REFERENCES direcciones (id) ON DELETE SET NULL,
  numero_orden        VARCHAR(20) NOT NULL UNIQUE, -- ej: ORD-2026-000123, visible al cliente
  estado              order_status NOT NULL DEFAULT 'pending_payment',
  metodo_pago         payment_method,
  subtotal            NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  costo_envio         NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (costo_envio >= 0),
  total               NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
  referencia_pasarela  VARCHAR(120), -- id de transacción en Wompi/Mercado Pago
  guia_envio           VARCHAR(120),
  notas                TEXT,
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ordenes_usuario ON ordenes (usuario_id);
CREATE INDEX idx_ordenes_estado ON ordenes (estado);
CREATE INDEX idx_ordenes_numero ON ordenes (numero_orden);

-- Detalle de orden: snapshot del producto al momento de compra
-- (precio_unitario y nombre_producto se congelan aquí para que un
-- cambio futuro de precio no altere órdenes históricas).
CREATE TABLE detalle_ordenes (
  id               BIGSERIAL PRIMARY KEY,
  orden_id         BIGINT NOT NULL REFERENCES ordenes (id) ON DELETE CASCADE,
  producto_id      BIGINT NOT NULL REFERENCES productos (id) ON DELETE RESTRICT,
  variante_id      BIGINT REFERENCES producto_variantes (id) ON DELETE RESTRICT,
  nombre_producto  VARCHAR(200) NOT NULL,
  precio_unitario  NUMERIC(12, 2) NOT NULL CHECK (precio_unitario >= 0),
  cantidad         INTEGER NOT NULL CHECK (cantidad > 0),
  subtotal_linea   NUMERIC(12, 2) NOT NULL CHECK (subtotal_linea >= 0)
);

CREATE INDEX idx_detalle_ordenes_orden ON detalle_ordenes (orden_id);
CREATE INDEX idx_detalle_ordenes_producto ON detalle_ordenes (producto_id);

-- ---------------------------------------------------------------------
-- Reseñas (soporta el Schema Markup "Review" / "AggregateRating")
-- ---------------------------------------------------------------------
CREATE TABLE resenas (
  id           BIGSERIAL PRIMARY KEY,
  producto_id  BIGINT NOT NULL REFERENCES productos (id) ON DELETE CASCADE,
  usuario_id   BIGINT NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  calificacion SMALLINT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
  comentario   TEXT,
  aprobada     BOOLEAN NOT NULL DEFAULT FALSE, -- moderación antes de publicar
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (producto_id, usuario_id) -- una reseña por cliente por producto
);

CREATE INDEX idx_resenas_producto_aprobada ON resenas (producto_id, aprobada);

-- ---------------------------------------------------------------------
-- Trigger genérico para mantener actualizado_en al día.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_actualizado_en
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

CREATE TRIGGER trg_productos_actualizado_en
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

CREATE TRIGGER trg_ordenes_actualizado_en
  BEFORE UPDATE ON ordenes
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
