-- ============================================================
-- Punto de Venta - Abarrotes
-- Esquema de base de datos (MySQL)
-- ============================================================

CREATE DATABASE IF NOT EXISTS punto_de_venta
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE punto_de_venta;

-- ------------------------------------------------------------
-- Usuarios / Empleados (reemplaza el arreglo de user.model.js)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  nombre_completo   VARCHAR(150) NOT NULL,
  puesto            VARCHAR(100),
  username          VARCHAR(100) NOT NULL UNIQUE,
  password          VARCHAR(255) NOT NULL,
  role              ENUM('administrador', 'cajero', 'almacenista') NOT NULL,
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en         DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Proveedores / Distribuidores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proveedores (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  nombre  VARCHAR(150) NOT NULL
);

-- ------------------------------------------------------------
-- Productos (con soporte para categoria, fecha_caducidad y activo)
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
  fecha_caducidad DATE NULL,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en       DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Relación muchos-a-muchos: producto <-> proveedores (HU-11)
CREATE TABLE IF NOT EXISTS producto_proveedor (
  producto_id   INT NOT NULL,
  proveedor_id  INT NOT NULL,
  PRIMARY KEY (producto_id, proveedor_id),
  FOREIGN KEY (producto_id)  REFERENCES productos(id)   ON DELETE CASCADE,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Pedidos a proveedor (HU-31 y HU-32)
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

INSERT IGNORE INTO usuarios (id, nombre_completo, puesto, username, password, role, activo) VALUES
  (1, 'Administrador', 'Administrador', 'admin@uv.mx',   'password123', 'administrador', TRUE),
  (2, 'Cajero 01',     'Cajero',        'caja01@uv.mx',  'password123', 'cajero', TRUE),
  (3, 'Almacenista',   'Almacenista',   'almacen@uv.mx', 'password123', 'almacenista', TRUE);

INSERT IGNORE INTO proveedores (id, nombre) VALUES
  (1, 'Distribuidora Central Papelera S.A.'),
  (2, 'Abarrotes y Suministros del Golfo'),
  (3, 'Comercializadora Universitaria UV');

INSERT IGNORE INTO productos (id, nombre, codigo_barras, categoria, presentacion, unidad_medida, precio, stock_almacen, activo) VALUES
  (1, 'Agua Mineral 600ml', '7501234500016', 'Bebidas', 'Botella', 'Pieza', 15.00, 50, TRUE),
  (2, 'Jugo de Naranja 1L',  '7501234500023', 'Bebidas', 'Caja',    'Litro', 28.00, 30, TRUE);

INSERT IGNORE INTO producto_proveedor (producto_id, proveedor_id) VALUES
  (1, 1),
  (2, 2);