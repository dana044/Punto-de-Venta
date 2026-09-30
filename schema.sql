-- ============================================================
-- Esquema de base de datos (MySQL)
-- ============================================================

CREATE DATABASE IF NOT EXISTS punto_de_venta
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE punto_de_venta;

-- ------------------------------------------------------------
-- Usuarios / Empleados
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  nombre_completo   VARCHAR(150) NOT NULL,
  correo            VARCHAR(150),
  password          VARCHAR(255) NOT NULL,
  role              ENUM('administrador', 'cajero', 'almacenista') NOT NULL,
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en         DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_correo_role (correo, role)
);

-- ------------------------------------------------------------
-- Proveedores / Distribuidores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proveedores (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(150) NOT NULL,
  direccion VARCHAR(255) NULL,
  telefono  VARCHAR(20) NULL,
  email     VARCHAR(100) NULL,
  activo    BOOLEAN NOT NULL DEFAULT TRUE
);

-- ------------------------------------------------------------
-- Un proveedor puede tener varios teléfonos y varios correos.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proveedor_telefonos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  proveedor_id  INT NOT NULL,
  telefono      VARCHAR(15) NOT NULL,
  tipo          ENUM('oficina', 'celular', 'whatsapp', 'otro') NOT NULL DEFAULT 'oficina',
  es_principal  BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE KEY uq_proveedor_telefono (proveedor_id, telefono),
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS proveedor_correos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  proveedor_id  INT NOT NULL,
  correo        VARCHAR(100) NOT NULL,
  es_principal  BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE KEY uq_proveedor_correo (proveedor_id, correo),
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Productos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS productos (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(150) NOT NULL,
  codigo_barras   VARCHAR(50) NOT NULL UNIQUE,
  categoria       VARCHAR(100),
  presentacion    VARCHAR(50),
  unidad_medida   VARCHAR(50),
  precio          DECIMAL(10,2) NOT NULL,
  stock_almacen   INT NOT NULL DEFAULT 0,
  stock_mostrador INT NOT NULL DEFAULT 0,
  fecha_caducidad DATE NULL,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en       DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Relación muchos-a-muchos: producto <-> proveedores
CREATE TABLE IF NOT EXISTS producto_proveedor (
  producto_id   INT NOT NULL,
  proveedor_id  INT NOT NULL,
  PRIMARY KEY (producto_id, proveedor_id),
  FOREIGN KEY (producto_id)  REFERENCES productos(id)   ON DELETE CASCADE,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Pedidos a proveedor
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedidos (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  folio             VARCHAR(30) NOT NULL UNIQUE,
  proveedor_id      INT NOT NULL,
  fecha             DATETIME NOT NULL,
  destino           VARCHAR(50) NOT NULL DEFAULT 'almacen',
  estado            ENUM('pendiente', 'incompleto', 'recibido') NOT NULL DEFAULT 'pendiente',
  fecha_recepcion   DATETIME NULL,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
);

-- Detalle / items de cada pedido
CREATE TABLE IF NOT EXISTS pedido_detalle (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id              INT NOT NULL,
  producto_id            INT NOT NULL,
  cantidad_solicitada    INT NOT NULL,
  cantidad_recibida      INT NOT NULL DEFAULT 0,
  costo_unitario         DECIMAL(10,2) NOT NULL,
  estado_linea           ENUM('pendiente', 'completo', 'incompleto') NOT NULL DEFAULT 'pendiente',
  FOREIGN KEY (pedido_id)   REFERENCES pedidos(id)   ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- ------------------------------------------------------------
-- Ventas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ventas (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id   INT NOT NULL,
  fecha        DATETIME DEFAULT CURRENT_TIMESTAMP,
  subtotal     DECIMAL(10,2) NOT NULL,
  descuentos   DECIMAL(10,2) NOT NULL DEFAULT 0,
  iva          DECIMAL(10,2) NOT NULL,
  total        DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Detalle / items de cada venta
CREATE TABLE IF NOT EXISTS venta_detalle (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  venta_id          INT NOT NULL,
  producto_id       INT NOT NULL,
  cantidad          INT NOT NULL,
  precio_unitario   DECIMAL(10,2) NOT NULL,
  descuento_tipo    ENUM('porcentaje', 'monto') NOT NULL DEFAULT 'monto',
  descuento_valor   DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal_linea    DECIMAL(10,2) NOT NULL,
  descuento_linea   DECIMAL(10,2) NOT NULL,
  total_linea       DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (venta_id)    REFERENCES ventas(id)    ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- ============================================================
-- Datos de prueba
-- ============================================================

INSERT IGNORE INTO usuarios (id, nombre_completo, correo, password, role, activo) VALUES
  (1, 'Administrador', 'admin@uv.mx',   'password123', 'administrador', TRUE),
  (2, 'Cajero 01',     'caja01@uv.mx',  'password123', 'cajero', TRUE),
  (3, 'Almacenista',   'almacen@uv.mx', 'password123', 'almacenista', TRUE);

INSERT IGNORE INTO proveedores (id, nombre) VALUES
  (1, 'Distribuidora Central Papelera S.A.'),
  (2, 'Abarrotes y Suministros del Golfo'),
  (3, 'Comercializadora Universitaria UV');

INSERT IGNORE INTO productos (id, nombre, codigo_barras, categoria, presentacion, unidad_medida, precio, stock_almacen, stock_mostrador, activo) VALUES
  (1, 'Agua Mineral 600ml', '7501234500016', 'Bebidas', 'Botella', 'Pieza', 15.00, 50, 10, TRUE),
  (2, 'Jugo de Naranja 1L',  '7501234500023', 'Bebidas', 'Caja',    'Litro', 28.00, 30, 5, TRUE);

INSERT IGNORE INTO producto_proveedor (producto_id, proveedor_id) VALUES
  (1, 1),
  (2, 2);

-- 1. Insertar los encabezados de los pedidos
INSERT INTO pedidos (folio, proveedor_id, fecha, destino, estado) VALUES
  ('OC-2026-001', 1, NOW(), 'almacen', 'pendiente'),
  ('OC-2026-002', 2, NOW(), 'almacen', 'pendiente');

-- 2. Insertar el detalle (los items) de cada pedido
-- Asumiendo que el pedido OC-2026-001 toma el ID 1 y el OC-2026-002 toma el ID 2
-- Asumiendo que el Agua Mineral es el producto ID 1 y el Jugo es el ID 2

INSERT INTO pedido_detalle (pedido_id, producto_id, cantidad_solicitada, cantidad_recibida, costo_unitario, estado_linea) VALUES
  -- Ítems para el pedido 1 (OC-2026-001)
  (1, 1, 50, 0, 10.00, 'pendiente'),
  (2, 1, 30, 0, 10.00, 'pendiente'),
  (2, 2, 20, 0, 18.00, 'pendiente');